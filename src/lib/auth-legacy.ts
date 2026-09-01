import { getTenantById, getTenantByApiKey, type Tenant } from "./tenant";

export type AuthContext = {
  tenant: Tenant;
  source: "session" | "apikey";
};

export function authenticateRequest(
  request: Request,
  sessionTenantId?: string
): AuthContext | null {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    const tenant = getTenantByApiKey(apiKey);
    if (tenant) {
      return { tenant, source: "apikey" };
    }
  }

  const sessionHeader = request.headers.get("x-tenant-id") || sessionTenantId;
  if (sessionHeader) {
    const tenant = getTenantById(sessionHeader);
    if (tenant && tenant.isActive) {
      return { tenant, source: "session" };
    }
  }

  return null;
}

export function requireAuth(
  request: Request,
  sessionTenantId?: string
): AuthContext {
  const auth = authenticateRequest(request, sessionTenantId);
  if (!auth) {
    throw new Error("Unauthorized: Valid API key or session required");
  }
  return auth;
}

export function isValidApiKey(apiKey: string): boolean {
  return getTenantByApiKey(apiKey) !== null;
}
