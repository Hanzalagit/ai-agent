import { getDb } from "./db/client";
import crypto from "node:crypto";

export type AuditAction =
  | "login"
  | "logout"
  | "register"
  | "password_change"
  | "mfa_enable"
  | "mfa_disable"
  | "member_invite"
  | "member_remove"
  | "role_change"
  | "api_key_create"
  | "api_key_revoke"
  | "integration_connect"
  | "integration_disconnect"
  | "agent_create"
  | "agent_update"
  | "agent_delete"
  | "tool_approve"
  | "tool_reject"
  | "campaign_send"
  | "data_export"
  | "settings_change"
  | "billing_change"
  | "dangerous_action";

export type AuditTargetType =
  | "user"
  | "organization"
  | "agent"
  | "conversation"
  | "tool_run"
  | "approval"
  | "integration"
  | "campaign"
  | "api_key"
  | "session";

export interface AuditLogEntry {
  id: string;
  organizationId?: string;
  userId?: string;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export function createAuditLog(data: {
  organizationId?: string;
  userId?: string;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}): AuditLogEntry {
  const db = getDb();
  const id = `AUD-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO audit_logs (id, organization_id, user_id, action, target_type, target_id, metadata, ip_address, user_agent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    data.organizationId || null,
    data.userId || null,
    data.action,
    data.targetType || null,
    data.targetId || null,
    JSON.stringify(data.metadata || {}),
    data.ipAddress || null,
    data.userAgent || null,
    now
  );

  return {
    id,
    organizationId: data.organizationId,
    userId: data.userId,
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId,
    metadata: data.metadata,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    createdAt: now,
  };
}

export function getAuditLogs(filters: {
  organizationId?: string;
  userId?: string;
  action?: AuditAction;
  targetType?: AuditTargetType;
  limit?: number;
  offset?: number;
}): AuditLogEntry[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.organizationId) {
    conditions.push("organization_id = ?");
    params.push(filters.organizationId);
  }
  if (filters.userId) {
    conditions.push("user_id = ?");
    params.push(filters.userId);
  }
  if (filters.action) {
    conditions.push("action = ?");
    params.push(filters.action);
  }
  if (filters.targetType) {
    conditions.push("target_type = ?");
    params.push(filters.targetType);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  const rows = db.prepare(`
    SELECT * FROM audit_logs ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as any[];

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: JSON.parse(row.metadata || "{}"),
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}

export function getAuditLogCount(organizationId: string): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM audit_logs WHERE organization_id = ?
  `).get(organizationId) as any;
  return result?.count || 0;
}
