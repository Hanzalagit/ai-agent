import { getDb } from "./db/client";
import crypto from "node:crypto";
import { getToolById, type ToolDefinition } from "./tools/registry";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export interface ApprovalRequest {
  id: string;
  organizationId: string;
  requestedBy: string;
  toolName: string;
  arguments: Record<string, any>;
  argumentsHash: string;
  riskLevel: number;
  status: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  expiresAt: string;
  metadata: Record<string, any>;
  createdAt: string;
}

function hashArguments(args: Record<string, any>): string {
  const sorted = Object.keys(args)
    .sort()
    .reduce((acc, key) => {
      acc[key] = args[key];
      return acc;
    }, {} as Record<string, any>);
  return crypto.createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

export function createApprovalRequest(data: {
  organizationId: string;
  requestedBy: string;
  toolName: string;
  arguments: Record<string, any>;
  expiresInMinutes?: number;
}): ApprovalRequest {
  const db = getDb();
  const tool = getToolById(data.toolName);

  const id = `APR-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date();
  const expiresIn = data.expiresInMinutes || 30;
  const expiresAt = new Date(now.getTime() + expiresIn * 60 * 1000);

  const approval: ApprovalRequest = {
    id,
    organizationId: data.organizationId,
    requestedBy: data.requestedBy,
    toolName: data.toolName,
    arguments: data.arguments,
    argumentsHash: hashArguments(data.arguments),
    riskLevel: tool?.riskLevel || 0,
    status: "pending",
    expiresAt: expiresAt.toISOString(),
    metadata: {},
    createdAt: now.toISOString(),
  };

  db.prepare(`
    INSERT INTO approvals (id, organization_id, requested_by, tool_name, arguments, arguments_hash, risk_level, status, expires_at, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    approval.id,
    approval.organizationId,
    approval.requestedBy,
    approval.toolName,
    JSON.stringify(approval.arguments),
    approval.argumentsHash,
    approval.riskLevel,
    approval.status,
    approval.expiresAt,
    JSON.stringify(approval.metadata),
    approval.createdAt
  );

  return approval;
}

export function approveRequest(
  approvalId: string,
  approvedBy: string,
  modifiedArguments?: Record<string, any>
): ApprovalRequest | null {
  const db = getDb();

  const existing = db.prepare(`
    SELECT * FROM approvals WHERE id = ? AND status = 'pending'
  `).get(approvalId) as any;

  if (!existing) return null;

  if (new Date(existing.expires_at) < new Date()) {
    db.prepare(`
      UPDATE approvals SET status = 'expired' WHERE id = ?
    `).run(approvalId);
    return null;
  }

  if (modifiedArguments) {
    const newHash = hashArguments(modifiedArguments);
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE approvals SET status = 'approved', approved_by = ?, approved_at = ? WHERE id = ?
  `).run(approvedBy, now, approvalId);

  return getApprovalById(approvalId);
}

export function rejectRequest(
  approvalId: string,
  rejectedBy: string,
  reason?: string
): ApprovalRequest | null {
  const db = getDb();

  const existing = db.prepare(`
    SELECT * FROM approvals WHERE id = ? AND status = 'pending'
  `).get(approvalId) as any;

  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE approvals SET status = 'rejected', approved_by = ?, approved_at = ? WHERE id = ?
  `).run(rejectedBy, now, approvalId);

  if (reason) {
    db.prepare(`
      UPDATE approvals SET metadata = json_set(metadata, '$.rejectionReason', ?) WHERE id = ?
    `).run(reason, approvalId);
  }

  return getApprovalById(approvalId);
}

export function getApprovalById(id: string): ApprovalRequest | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM approvals WHERE id = ?").get(id) as any;
  if (!row) return null;

  return {
    id: row.id,
    organizationId: row.organization_id,
    requestedBy: row.requested_by,
    toolName: row.tool_name,
    arguments: JSON.parse(row.arguments || "{}"),
    argumentsHash: row.arguments_hash,
    riskLevel: row.risk_level,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
    metadata: JSON.parse(row.metadata || "{}"),
    createdAt: row.created_at,
  };
}

export function getPendingApprovals(organizationId: string): ApprovalRequest[] {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE approvals SET status = 'expired'
    WHERE organization_id = ? AND status = 'pending' AND expires_at < ?
  `).run(organizationId, now);

  const rows = db.prepare(`
    SELECT * FROM approvals
    WHERE organization_id = ? AND status = 'pending'
    ORDER BY created_at DESC
  `).all(organizationId) as any[];

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    requestedBy: row.requested_by,
    toolName: row.tool_name,
    arguments: JSON.parse(row.arguments || "{}"),
    argumentsHash: row.arguments_hash,
    riskLevel: row.risk_level,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
    metadata: JSON.parse(row.metadata || "{}"),
    createdAt: row.created_at,
  }));
}

export function getApprovalHistory(
  organizationId: string,
  limit: number = 50
): ApprovalRequest[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT * FROM approvals
    WHERE organization_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(organizationId, limit) as any[];

  return rows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    requestedBy: row.requested_by,
    toolName: row.tool_name,
    arguments: JSON.parse(row.arguments || "{}"),
    argumentsHash: row.arguments_hash,
    riskLevel: row.risk_level,
    status: row.status,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    expiresAt: row.expires_at,
    metadata: JSON.parse(row.metadata || "{}"),
    createdAt: row.created_at,
  }));
}

export function needsApproval(toolName: string): boolean {
  const tool = getToolById(toolName);
  if (!tool) return true;
  return tool.riskLevel >= 2;
}
