import crypto from "node:crypto";
import { getDb } from "../db/client";

// ============================================
// TYPES
// ============================================

export type UserRole = "owner" | "admin" | "developer" | "agent_manager" | "support" | "marketer" | "viewer" | "billing";

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  isActive: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  id: string;
  userId: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
};

export type OrganizationMembership = {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
};

// ============================================
// PASSWORD UTILITIES
// ============================================

const SALT_ROUNDS = 10;

export function hashPassword(password: string): string {
  // Using SHA-256 for simplicity; in production use bcrypt/argon2
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  // Support both old format (plain sha256) and new format (salt:hash)
  if (storedHash.includes(":")) {
    const [salt, hash] = storedHash.split(":");
    const verifyHash = crypto.createHash("sha256").update(salt + password).digest("hex");
    return hash === verifyHash;
  }
  // Legacy format compatibility
  const legacyHash = crypto.createHash("sha256").update(password).digest("hex");
  return legacyHash === storedHash;
}

// ============================================
// SESSION UTILITIES
// ============================================

export function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  expiresInDays: number = 7
): Session {
  const db = getDb();
  const id = `SES-${crypto.randomUUID().slice(0, 8)}`;
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

  db.prepare(`
    INSERT INTO sessions (id, user_id, token, ip_address, user_agent, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, token, ipAddress || null, userAgent || null, expiresAt.toISOString(), now.toISOString());

  return {
    id,
    userId,
    token,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };
}

export function getSessionByToken(token: string): Session | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')
  `).get(token) as any;
  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    token: row.token,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export function deleteSession(sessionId: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  return result.changes > 0;
}

export function deleteAllUserSessions(userId: string): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  return result.changes;
}

// ============================================
// USER OPERATIONS
// ============================================

export function createUser(data: {
  email: string;
  name: string;
  password: string;
}): User {
  const db = getDb();

  // Check if email exists
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(data.email);
  if (existing) {
    throw new Error("Email already registered");
  }

  const id = `USR-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  const passwordHash = hashPassword(data.password);

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, data.email, data.name, passwordHash, now, now);

  return {
    id,
    email: data.email,
    name: data.name,
    avatar: null,
    isActive: true,
    mfaEnabled: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    isActive: row.is_active === 1,
    mfaEnabled: row.mfa_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getUserByEmail(email: string): User | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    isActive: row.is_active === 1,
    mfaEnabled: row.mfa_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function authenticateUser(
  email: string,
  password: string
): { user: User; session: Session } | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ? AND is_active = 1").get(email) as any;
  if (!row) return null;

  if (!verifyPassword(password, row.password_hash)) {
    return null;
  }

  const user: User = {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    isActive: row.is_active === 1,
    mfaEnabled: row.mfa_enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const session = createSession(user.id);

  return { user, session };
}

export function updateUser(
  id: string,
  data: Partial<Omit<User, "id" | "createdAt">>
): User | null {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.email !== undefined) {
    updates.push("email = ?");
    values.push(data.email);
  }
  if (data.avatar !== undefined) {
    updates.push("avatar = ?");
    values.push(data.avatar);
  }
  if (data.isActive !== undefined) {
    updates.push("is_active = ?");
    values.push(data.isActive ? 1 : 0);
  }
  if (data.mfaEnabled !== undefined) {
    updates.push("mfa_enabled = ?");
    values.push(data.mfaEnabled ? 1 : 0);
  }

  if (updates.length === 0) return getUserById(id);

  updates.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`
    UPDATE users SET ${updates.join(", ")} WHERE id = ?
  `).run(...values);

  return getUserById(id);
}

export function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): boolean {
  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId) as any;
  if (!row) return false;

  if (!verifyPassword(currentPassword, row.password_hash)) {
    return false;
  }

  const newHash = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, userId);
  return true;
}

// ============================================
// ORGANIZATION MEMBERSHIP
// ============================================

export function addUserToOrganization(
  userId: string,
  organizationId: string,
  role: UserRole = "viewer"
): OrganizationMembership {
  const db = getDb();

  // Check if already a member
  const existing = db.prepare(`
    SELECT id FROM organization_members WHERE user_id = ? AND organization_id = ?
  `).get(userId, organizationId);
  if (existing) {
    throw new Error("User is already a member of this organization");
  }

  const id = `MEM-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const defaultPermissions = getDefaultPermissions(role);

  db.prepare(`
    INSERT INTO organization_members (id, user_id, organization_id, role, permissions, invited_at, joined_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, organizationId, role, JSON.stringify(defaultPermissions), now, now, 1);

  return {
    id,
    userId,
    organizationId,
    role,
    permissions: defaultPermissions,
    isActive: true,
  };
}

export function getUserOrganizations(userId: string): OrganizationMembership[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM organization_members WHERE user_id = ? AND is_active = 1
  `).all(userId) as any[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    role: row.role as UserRole,
    permissions: JSON.parse(row.permissions || "[]"),
    isActive: row.is_active === 1,
  }));
}

export function getOrganizationMembers(organizationId: string): (OrganizationMembership & { user: User })[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT om.*, u.email, u.name, u.avatar
    FROM organization_members om
    JOIN users u ON u.id = om.user_id
    WHERE om.organization_id = ? AND om.is_active = 1
  `).all(organizationId) as any[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    role: row.role as UserRole,
    permissions: JSON.parse(row.permissions || "[]"),
    isActive: row.is_active === 1,
    user: {
      id: row.user_id,
      email: row.email,
      name: row.name,
      avatar: row.avatar,
      isActive: true,
      mfaEnabled: false,
      createdAt: "",
      updatedAt: "",
    },
  }));
}

export function updateUserRole(
  userId: string,
  organizationId: string,
  role: UserRole
): boolean {
  const db = getDb();
  const permissions = getDefaultPermissions(role);
  const result = db.prepare(`
    UPDATE organization_members SET role = ?, permissions = ? WHERE user_id = ? AND organization_id = ?
  `).run(role, JSON.stringify(permissions), userId, organizationId);
  return result.changes > 0;
}

export function removeUserFromOrganization(userId: string, organizationId: string): boolean {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM organization_members WHERE user_id = ? AND organization_id = ?
  `).run(userId, organizationId);
  return result.changes > 0;
}

// ============================================
// PERMISSIONS
// ============================================

function getDefaultPermissions(role: UserRole): string[] {
  const permissions: Record<UserRole, string[]> = {
    owner: [
      "agent.read", "agent.write", "agent.execute",
      "customer.read", "customer.write",
      "ticket.read", "ticket.manage",
      "campaign.create", "campaign.send",
      "integration.connect", "integration.disconnect",
      "billing.read", "billing.manage",
      "admin.audit.read", "admin.members.manage",
      "admin.settings.manage",
    ],
    admin: [
      "agent.read", "agent.write", "agent.execute",
      "customer.read", "customer.write",
      "ticket.read", "ticket.manage",
      "campaign.create", "campaign.send",
      "integration.connect", "integration.disconnect",
      "billing.read",
      "admin.audit.read",
    ],
    developer: [
      "agent.read", "agent.write", "agent.execute",
      "customer.read",
      "ticket.read",
    ],
    agent_manager: [
      "agent.read", "agent.write", "agent.execute",
      "customer.read", "customer.write",
      "ticket.read", "ticket.manage",
    ],
    support: [
      "customer.read", "customer.write",
      "ticket.read", "ticket.manage",
    ],
    marketer: [
      "customer.read",
      "campaign.create", "campaign.send",
    ],
    viewer: [
      "agent.read",
      "customer.read",
      "ticket.read",
    ],
    billing: [
      "billing.read", "billing.manage",
    ],
  };

  return permissions[role] || permissions.viewer;
}

export function hasPermission(
  membership: OrganizationMembership,
  permission: string
): boolean {
  return membership.permissions.includes(permission);
}

export function checkPermission(
  userId: string,
  organizationId: string,
  permission: string
): boolean {
  const db = getDb();
  const row = db.prepare(`
    SELECT permissions FROM organization_members
    WHERE user_id = ? AND organization_id = ? AND is_active = 1
  `).get(userId, organizationId) as any;

  if (!row) return false;

  const permissions = JSON.parse(row.permissions || "[]");
  return permissions.includes(permission);
}

// ============================================
// AUTH MIDDLEWARE HELPER
// ============================================

export function authenticateRequest(
  cookieToken?: string,
  apiKey?: string
): { userId: string; organizationId?: string; session?: Session } | null {
  // Try session token first
  if (cookieToken) {
    const session = getSessionByToken(cookieToken);
    if (session) {
      return { userId: session.userId, session };
    }
  }

  // Try API key
  if (apiKey) {
    const db = getDb();
    const row = db.prepare(`
      SELECT organization_id FROM api_keys WHERE hash = ? AND revoked_at IS NULL
    `).get(apiKey) as any;
    if (row) {
      // For API key auth, we need to find a user in that org
      const member = db.prepare(`
        SELECT user_id FROM organization_members WHERE organization_id = ? AND is_active = 1 LIMIT 1
      `).get(row.organization_id) as any;
      if (member) {
        return { userId: member.user_id, organizationId: row.organization_id };
      }
    }
  }

  return null;
}

// ============================================
// BACKWARD COMPATIBILITY - Request-based auth
// ============================================

export type AuthContext = {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    branding: any;
    limits: any;
    settings: any;
    isActive: boolean;
  };
  userId: string;
  organizationId: string;
  source: "session" | "apikey";
};

export function requireAuth(
  request: Request,
  sessionTenantId?: string
): AuthContext {
  // Check API key header
  const apiKey = request.headers.get("x-api-key");
  const cookieHeader = request.headers.get("cookie") || "";
  const sessionToken = cookieHeader.match(/session_token=([^;]+)/)?.[1];

  const auth = authenticateRequest(sessionToken || undefined, apiKey || undefined);
  if (!auth) {
    throw new Error("Unauthorized: Valid API key or session required");
  }

  // Also check x-tenant-id header for backward compatibility
  const tenantId = request.headers.get("x-tenant-id") || sessionTenantId || auth.organizationId;
  if (!tenantId) {
    throw new Error("Unauthorized: No organization context");
  }

  // Get tenant (organization) details
  const { getTenantById } = require("../tenant");
  const tenant = getTenantById(tenantId);
  if (!tenant) {
    throw new Error("Unauthorized: Invalid organization");
  }

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      branding: tenant.branding,
      limits: tenant.limits,
      settings: tenant.settings,
      isActive: tenant.isActive,
    },
    userId: auth.userId,
    organizationId: tenantId,
    source: apiKey ? "apikey" : "session",
  };
}

export function isValidApiKey(apiKey: string): boolean {
  const db = getDb();
  const row = db.prepare(`
    SELECT id FROM api_keys WHERE hash = ? AND revoked_at IS NULL
  `).get(apiKey);
  return row !== undefined;
}
