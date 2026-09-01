import crypto from "node:crypto";
import { getDb } from "./db/client";

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export type CustomerProfile = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  tags: string[];
  notes: string[];
  interactions: CustomerInteraction[];
  firstSeen: string;
  lastSeen: string;
  sentiment: "positive" | "neutral" | "negative";
  satisfactionScore: number;
  repeatCustomer: boolean;
};

export type CustomerInteraction = {
  id: string;
  type: "chat" | "order" | "ticket" | "call" | "whatsapp";
  summary: string;
  sentiment?: number;
  timestamp: string;
  sessionId?: string;
};

export function findCustomerByPhone(
  tenantId: string,
  phone: string
): CustomerProfile | null {
  const db = getDb();
  const clean = phone.replace(/\D/g, "");

  const row = db.prepare(`
    SELECT * FROM contacts 
    WHERE organization_id = ? AND phone IS NOT NULL 
    AND (REPLACE(REPLACE(phone, '-', ''), ' ', '') LIKE ? OR ? LIKE '%' || REPLACE(REPLACE(phone, '-', ''), ' ', ''))
    LIMIT 1
  `).get(tenantId, `%${clean}%`, clean) as any;

  if (!row) return null;

  return mapRowToCustomer(tenantId, row);
}

export function findCustomerById(
  tenantId: string,
  id: string
): CustomerProfile | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM contacts WHERE id = ? AND organization_id = ?"
  ).get(id, tenantId) as any;

  if (!row) return null;

  return mapRowToCustomer(tenantId, row);
}

export function upsertCustomer(
  data: {
    tenantId?: string;
    name?: string;
    phone?: string;
    email?: string;
    city?: string;
    interaction?: CustomerInteraction;
  }
): CustomerProfile {
  const db = getDb();
  const now = new Date().toISOString();
  const tenantId = data.tenantId || "default";

  let existing: any = null;
  if (data.phone) {
    const clean = data.phone.replace(/\D/g, "");
    existing = db.prepare(`
      SELECT * FROM contacts 
      WHERE organization_id = ? AND phone IS NOT NULL 
      AND (REPLACE(REPLACE(phone, '-', ''), ' ', '') LIKE ? OR ? LIKE '%' || REPLACE(REPLACE(phone, '-', ''), ' ', ''))
      LIMIT 1
    `).get(tenantId, `%${clean}%`, clean) as any;
  }

  if (existing) {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.email) {
      updates.push("email = ?");
      values.push(data.email);
    }
    if (data.city) {
      updates.push("metadata = json_set(COALESCE(metadata, '{}'), '$.city', ?)");
      values.push(data.city);
    }

    updates.push("updated_at = ?");
    values.push(now);
    values.push(existing.id);

    db.prepare(
      `UPDATE contacts SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values);

    if (data.interaction) {
      addCrmEvent(tenantId, existing.id, data.interaction);
    }

    return findCustomerById(tenantId, existing.id)!;
  }

  const id = generateId("CTX");
  const metadata = {
    city: data.city || "",
    loyaltyPoints: 10,
    totalOrders: 0,
    totalSpent: 0,
    repeatCustomer: false,
    sentiment: "neutral",
    satisfactionScore: 0,
  };

  db.prepare(`
    INSERT INTO contacts (id, organization_id, name, phone, email, tags, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    tenantId,
    data.name || "Anonymous",
    data.phone || null,
    data.email || null,
    JSON.stringify([]),
    JSON.stringify(metadata),
    now,
    now
  );

  if (data.interaction) {
    addCrmEvent(tenantId, id, data.interaction);
  }

  return findCustomerById(tenantId, id)!;
}

export function addLoyaltyPoints(
  phone: string,
  points: number,
  tenantId?: string
): void {
  const db = getDb();
  
  let customer: CustomerProfile | null = null;
  if (tenantId) {
    customer = findCustomerByPhone(tenantId, phone);
  } else {
    const clean = phone.replace(/\D/g, "");
    const row = db.prepare(`
      SELECT * FROM contacts 
      WHERE phone IS NOT NULL 
      AND (REPLACE(REPLACE(phone, '-', ''), ' ', '') LIKE ? OR ? LIKE '%' || REPLACE(REPLACE(phone, '-', ''), ' ', ''))
      LIMIT 1
    `).get(`%${clean}%`, clean) as any;
    
    if (row) {
      customer = mapRowToCustomer(row.organization_id, row);
    }
  }
  
  if (!customer) return;

  const metadata = JSON.parse(
    db.prepare("SELECT metadata FROM contacts WHERE id = ?").get(customer.id) as any
  ).metadata || {};

  metadata.loyaltyPoints = (metadata.loyaltyPoints || 0) + points;

  db.prepare("UPDATE contacts SET metadata = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(metadata),
    new Date().toISOString(),
    customer.id
  );
}

export function addOrderToCustomer(
  tenantId: string,
  phone: string,
  orderId: string,
  amount: number
): void {
  const customer = findCustomerByPhone(tenantId, phone);
  if (!customer) return;

  const db = getDb();
  const metadata = JSON.parse(
    db.prepare("SELECT metadata FROM contacts WHERE id = ?").get(customer.id) as any
  ).metadata || {};

  metadata.totalOrders = (metadata.totalOrders || 0) + 1;
  metadata.totalSpent = (metadata.totalSpent || 0) + amount;
  metadata.loyaltyPoints = (metadata.loyaltyPoints || 0) + Math.floor(amount / 100);

  if (metadata.totalOrders > 1) {
    metadata.repeatCustomer = true;
  }

  if (metadata.totalSpent > 10000) {
    const tags = JSON.parse(
      db.prepare("SELECT tags FROM contacts WHERE id = ?").get(customer.id) as any
    ).tags || [];
    if (!tags.includes("vip")) {
      tags.push("vip");
      db.prepare("UPDATE contacts SET tags = ? WHERE id = ?").run(
        JSON.stringify(tags),
        customer.id
      );
    }
  }

  db.prepare("UPDATE contacts SET metadata = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(metadata),
    new Date().toISOString(),
    customer.id
  );

  addCrmEvent(tenantId, customer.id, {
    id: generateId("EVT"),
    type: "order",
    summary: `Order ${orderId} - Amount: ${amount}`,
    timestamp: new Date().toISOString(),
  });
}

export function getAllCustomers(tenantId: string): CustomerProfile[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM contacts WHERE organization_id = ? ORDER BY updated_at DESC"
  ).all(tenantId) as any[];

  return rows.map((row) => mapRowToCustomer(tenantId, row));
}

export function getTopCustomers(
  tenantId: string,
  limit: number = 10
): CustomerProfile[] {
  const customers = getAllCustomers(tenantId);
  return customers
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}

export function getCustomerStats(tenantId: string): {
  total: number;
  newThisMonth: number;
  repeatRate: number;
  avgSatisfaction: number;
  vipCount: number;
  totalRevenue: number;
} {
  const db = getDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const total = db.prepare(
    "SELECT COUNT(*) as count FROM contacts WHERE organization_id = ?"
  ).get(tenantId) as any;

  const newThisMonth = db.prepare(
    "SELECT COUNT(*) as count FROM contacts WHERE organization_id = ? AND created_at >= ?"
  ).get(tenantId, monthStart) as any;

  const customers = getAllCustomers(tenantId);
  const repeatCustomers = customers.filter((c) => c.repeatCustomer).length;
  const vipCount = customers.filter((c) => c.tags.includes("vip")).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgSatisfaction =
    customers.length > 0
      ? customers.reduce((sum, c) => sum + c.satisfactionScore, 0) /
        customers.length
      : 0;

  return {
    total: total?.count || 0,
    newThisMonth: newThisMonth?.count || 0,
    repeatRate:
      total?.count > 0
        ? Math.round((repeatCustomers / total.count) * 100)
        : 0,
    avgSatisfaction: Math.round(avgSatisfaction * 100) / 100,
    vipCount,
    totalRevenue,
  };
}

export function getAllCustomersAdmin(): CustomerProfile[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM contacts ORDER BY updated_at DESC"
  ).all() as any[];

  return rows.map((row) => mapRowToCustomer(row.organization_id, row));
}

export function getTopCustomersAdmin(limit: number = 10): CustomerProfile[] {
  const customers = getAllCustomersAdmin();
  return customers
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}

export function getCustomerStatsAdmin(): {
  total: number;
  newThisMonth: number;
  repeatRate: number;
  avgSatisfaction: number;
  vipCount: number;
  totalRevenue: number;
} {
  const db = getDb();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const total = db.prepare(
    "SELECT COUNT(*) as count FROM contacts"
  ).get() as any;

  const newThisMonth = db.prepare(
    "SELECT COUNT(*) as count FROM contacts WHERE created_at >= ?"
  ).get(monthStart) as any;

  const customers = getAllCustomersAdmin();
  const repeatCustomers = customers.filter((c) => c.repeatCustomer).length;
  const vipCount = customers.filter((c) => c.tags.includes("vip")).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgSatisfaction =
    customers.length > 0
      ? customers.reduce((sum, c) => sum + c.satisfactionScore, 0) /
        customers.length
      : 0;

  return {
    total: total?.count || 0,
    newThisMonth: newThisMonth?.count || 0,
    repeatRate:
      total?.count > 0
        ? Math.round((repeatCustomers / total.count) * 100)
        : 0,
    avgSatisfaction: Math.round(avgSatisfaction * 100) / 100,
    vipCount,
    totalRevenue,
  };
}

export function findCustomerByIdAdmin(id: string): CustomerProfile | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM contacts WHERE id = ?"
  ).get(id) as any;

  if (!row) return null;

  return mapRowToCustomer(row.organization_id, row);
}

function addCrmEvent(
  tenantId: string,
  contactId: string,
  interaction: CustomerInteraction
): void {
  const db = getDb();

  db.prepare(`
    INSERT INTO crm_events (id, contact_id, type, content, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    interaction.id || generateId("EVT"),
    contactId,
    interaction.type,
    interaction.summary,
    JSON.stringify({
      sentiment: interaction.sentiment,
      sessionId: interaction.sessionId,
    }),
    interaction.timestamp
  );
}

function mapRowToCustomer(tenantId: string, row: any): CustomerProfile {
  const metadata = JSON.parse(row.metadata || "{}");
  const tags = JSON.parse(row.tags || "[]");

  const db = getDb();
  const events = db.prepare(
    "SELECT * FROM crm_events WHERE contact_id = ? ORDER BY created_at DESC LIMIT 50"
  ).all(row.id) as any[];

  const interactions: CustomerInteraction[] = events.map((event) => ({
    id: event.id,
    type: event.type,
    summary: event.content,
    sentiment: JSON.parse(event.metadata || "{}").sentiment,
    timestamp: event.created_at,
    sessionId: JSON.parse(event.metadata || "{}").sessionId,
  }));

  return {
    id: row.id,
    name: row.name,
    phone: row.phone || "",
    email: row.email || undefined,
    city: metadata.city || undefined,
    loyaltyPoints: metadata.loyaltyPoints || 0,
    totalOrders: metadata.totalOrders || 0,
    totalSpent: metadata.totalSpent || 0,
    tags,
    notes: [],
    interactions,
    firstSeen: row.created_at,
    lastSeen: row.updated_at,
    sentiment: metadata.sentiment || "neutral",
    satisfactionScore: metadata.satisfactionScore || 0,
    repeatCustomer: metadata.repeatCustomer || false,
  };
}
