import crypto from "node:crypto";
import { getDb } from "./db/client";
import { sendEmail, generateTicketCreatedEmail, generateTicketUpdatedEmail } from "./email";

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// ============================================
// TYPES
// ============================================

export type Ticket = {
  id: string;
  contactId?: string;
  subject: string;
  description?: string;
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

// ============================================
// CRUD OPERATIONS
// ============================================

export function createTicket(
  data: {
    tenantId?: string;
    contactId?: string;
    subject: string;
    description?: string;
    order_id?: string;
    contact?: string;
    priority?: Ticket["priority"];
    assignedTo?: string;
    tags?: string[];
  }
): Ticket {
  const db = getDb();
  const id = generateId("TKT");
  const now = new Date().toISOString();
  const tenantId = data.tenantId || "default";

  db.prepare(`
    INSERT INTO tickets (id, organization_id, contact_id, subject, description, status, priority, assigned_to, tags, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    tenantId,
    data.contactId || null,
    data.subject,
    data.description || "",
    "open",
    data.priority || "medium",
    data.assignedTo || null,
    JSON.stringify(data.tags || []),
    now,
    now
  );

  // Send email notification if tenantId is provided
  if (data.tenantId) {
    sendTicketNotification(tenantId, id, "created", {
      subject: data.subject,
      description: data.description,
    });
  }

  return {
    id,
    contactId: data.contactId,
    subject: data.subject,
    description: data.description,
    status: "open",
    priority: data.priority || "medium",
    assignedTo: data.assignedTo,
    tags: data.tags || [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getTickets(
  tenantId: string,
  filters?: {
    status?: Ticket["status"];
    priority?: Ticket["priority"];
    assignedTo?: string;
  }
): Ticket[] {
  const db = getDb();

  let query = "SELECT * FROM tickets WHERE organization_id = ?";
  const params: any[] = [tenantId];

  if (filters?.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }

  if (filters?.priority) {
    query += " AND priority = ?";
    params.push(filters.priority);
  }

  if (filters?.assignedTo) {
    query += " AND assigned_to = ?";
    params.push(filters.assignedTo);
  }

  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params) as any[];

  return rows.map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getTicketById(
  tenantId: string,
  ticketId: string
): Ticket | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM tickets WHERE id = ? AND organization_id = ?"
  ).get(ticketId, tenantId) as any;

  if (!row) return null;

  return {
    id: row.id,
    contactId: row.contact_id,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function updateTicket(
  tenantId: string,
  ticketId: string,
  updates: Partial<Omit<Ticket, "id" | "createdAt" | "updatedAt">>
): Ticket | null {
  const db = getDb();
  const existing = db.prepare(
    "SELECT * FROM tickets WHERE id = ? AND organization_id = ?"
  ).get(ticketId, tenantId) as any;

  if (!existing) return null;

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.status !== undefined) {
    setClauses.push("status = ?");
    values.push(updates.status);
  }

  if (updates.priority !== undefined) {
    setClauses.push("priority = ?");
    values.push(updates.priority);
  }

  if (updates.assignedTo !== undefined) {
    setClauses.push("assigned_to = ?");
    values.push(updates.assignedTo);
  }

  if (updates.tags !== undefined) {
    setClauses.push("tags = ?");
    values.push(JSON.stringify(updates.tags));
  }

  if (setClauses.length === 0) {
    return getTicketById(tenantId, ticketId);
  }

  setClauses.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(ticketId);

  db.prepare(
    `UPDATE tickets SET ${setClauses.join(", ")} WHERE id = ?`
  ).run(...values);

  // Send email notification for status changes
  if (updates.status && updates.status !== existing.status) {
    sendTicketNotification(tenantId, ticketId, "updated", {
      subject: existing.subject,
      status: updates.status,
      priority: updates.priority || existing.priority,
    });
  }

  return getTicketById(tenantId, ticketId);
}

export function deleteTicket(
  tenantId: string,
  ticketId: string
): boolean {
  const db = getDb();
  const result = db.prepare(
    "DELETE FROM tickets WHERE id = ? AND organization_id = ?"
  ).run(ticketId, tenantId);
  return result.changes > 0;
}

export function findCreatedTicket(ticketId: string): Ticket | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM tickets WHERE id = ?").get(ticketId) as any;

  if (!row) return null;

  return {
    id: row.id,
    contactId: row.contact_id,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================
// ADMIN OPERATIONS (no tenant filtering)
// ============================================

export function getTicketsAdmin(
  filters?: {
    status?: Ticket["status"];
    priority?: Ticket["priority"];
    assignedTo?: string;
  }
): Ticket[] {
  const db = getDb();

  let query = "SELECT * FROM tickets WHERE 1=1";
  const params: any[] = [];

  if (filters?.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }

  if (filters?.priority) {
    query += " AND priority = ?";
    params.push(filters.priority);
  }

  if (filters?.assignedTo) {
    query += " AND assigned_to = ?";
    params.push(filters.assignedTo);
  }

  query += " ORDER BY created_at DESC";

  const rows = db.prepare(query).all(...params) as any[];

  return rows.map((row) => ({
    id: row.id,
    contactId: row.contact_id,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function getTicketByIdAdmin(ticketId: string): Ticket | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM tickets WHERE id = ?"
  ).get(ticketId) as any;

  if (!row) return null;

  return {
    id: row.id,
    contactId: row.contact_id,
    subject: row.subject,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function updateTicketAdmin(
  ticketId: string,
  updates: Partial<Omit<Ticket, "id" | "createdAt" | "updatedAt">>
): Ticket | null {
  const db = getDb();
  const existing = db.prepare(
    "SELECT * FROM tickets WHERE id = ?"
  ).get(ticketId) as any;

  if (!existing) return null;

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.status !== undefined) {
    setClauses.push("status = ?");
    values.push(updates.status);
  }

  if (updates.priority !== undefined) {
    setClauses.push("priority = ?");
    values.push(updates.priority);
  }

  if (updates.assignedTo !== undefined) {
    setClauses.push("assigned_to = ?");
    values.push(updates.assignedTo);
  }

  if (updates.tags !== undefined) {
    setClauses.push("tags = ?");
    values.push(JSON.stringify(updates.tags));
  }

  if (setClauses.length === 0) {
    return getTicketByIdAdmin(ticketId);
  }

  setClauses.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(ticketId);

  db.prepare(
    `UPDATE tickets SET ${setClauses.join(", ")} WHERE id = ?`
  ).run(...values);

  return getTicketByIdAdmin(ticketId);
}

export function deleteTicketAdmin(ticketId: string): boolean {
  const db = getDb();
  const result = db.prepare(
    "DELETE FROM tickets WHERE id = ?"
  ).run(ticketId);
  return result.changes > 0;
}

// ============================================
// TICKET MESSAGES
// ============================================

export function addTicketMessage(
  tenantId: string,
  ticketId: string,
  role: "user" | "agent" | "system",
  content: string
): void {
  const db = getDb();

  db.prepare(`
    INSERT INTO ticket_messages (id, ticket_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    generateId("TMSG"),
    ticketId,
    role,
    content,
    new Date().toISOString()
  );
}

export function getTicketMessages(
  tenantId: string,
  ticketId: string
): Array<{ id: string; role: string; content: string; createdAt: string }> {
  const db = getDb();

  const rows = db.prepare(`
    SELECT tm.* FROM ticket_messages tm
    JOIN tickets t ON tm.ticket_id = t.id
    WHERE tm.ticket_id = ? AND t.organization_id = ?
    ORDER BY tm.created_at ASC
  `).all(ticketId, tenantId) as any[];

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

// ============================================
// EMAIL NOTIFICATIONS
// ============================================

async function sendTicketNotification(
  tenantId: string,
  ticketId: string,
  action: "created" | "updated",
  data: {
    subject: string;
    description?: string;
    status?: string;
    priority?: string;
  }
): Promise<void> {
  try {
    // Get tenant admin email
    const db = getDb();
    const org = db.prepare(
      "SELECT name FROM organizations WHERE id = ?"
    ).get(tenantId) as any;

    if (!org) return;

    // Get admin email from users table
    const admin = db.prepare(`
      SELECT u.email FROM users u
      JOIN organization_members om ON u.id = om.user_id
      WHERE om.organization_id = ? AND om.role = 'owner'
      LIMIT 1
    `).get(tenantId) as any;

    if (!admin?.email) return;

    let email;
    if (action === "created") {
      email = generateTicketCreatedEmail(
        ticketId,
        data.subject,
        "Customer",
        data.description || "No description"
      );
    } else {
      email = generateTicketUpdatedEmail(
        ticketId,
        data.subject,
        data.status || "open",
        data.priority || "medium"
      );
    }

    email.to = admin.email;
    await sendEmail(tenantId, email);
  } catch (error) {
    console.error("Failed to send ticket notification:", error);
  }
}
