const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@urbanhive.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme123";

export type AdminSession = {
  email: string;
  loggedInAt: string;
};

export function authenticateAdmin(
  email: string,
  password: string
): AdminSession | null {
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return {
      email,
      loggedInAt: new Date().toISOString(),
    };
  }
  return null;
}

export function verifyAdminSession(request: Request): AdminSession | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionMatch = cookieHeader.match(/admin_session=([^;]+)/);
  
  if (!sessionMatch) return null;
  
  try {
    const session = JSON.parse(decodeURIComponent(sessionMatch[1]));
    if (session.email && session.loggedInAt) {
      return session;
    }
    return null;
  } catch {
    return null;
  }
}
