import crypto from "node:crypto";
import { getDb } from "./db/client";

export type TenantPlan = "free" | "pro" | "enterprise";

export type TenantBranding = {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  darkMode: boolean;
  welcomeMessage: string;
  botName: string;
};

export type TenantLimits = {
  maxMessages: number;
  maxProducts: number;
  maxAgents: number;
  maxKnowledgeEntries: number;
};

export type TenantSettings = {
  enableWebSearch: boolean;
  enableSentiment: boolean;
  enableLoyalty: boolean;
  enablePCControl: boolean;
  publicMode: boolean;
  whatsapp?: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  email: string;
  passwordHash: string;
  plan: TenantPlan;
  branding: TenantBranding;
  limits: TenantLimits;
  apiKeys: string[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  settings: TenantSettings;
};

const PLAN_LIMITS: Record<TenantPlan, TenantLimits> = {
  free: {
    maxMessages: 100,
    maxProducts: 20,
    maxAgents: 1,
    maxKnowledgeEntries: 10,
  },
  pro: {
    maxMessages: 5000,
    maxProducts: 500,
    maxAgents: 5,
    maxKnowledgeEntries: 100,
  },
  enterprise: {
    maxMessages: -1,
    maxProducts: -1,
    maxAgents: -1,
    maxKnowledgeEntries: -1,
  },
};

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function mapRowToTenant(row: any, apiKeys: string[] = []): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    email: row.email,
    passwordHash: row.password_hash,
    plan: row.plan as TenantPlan,
    branding: JSON.parse(row.branding || "{}"),
    limits: JSON.parse(row.limits || "{}"),
    apiKeys,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active === 1,
    settings: JSON.parse(row.settings || "{}"),
  };
}

export function createTenant(data: {
  name: string;
  email: string;
  password: string;
  slug?: string;
  plan?: TenantPlan;
}): Tenant {
  const db = getDb();

  const existing = db.prepare("SELECT id FROM organizations WHERE id IN (SELECT organization_id FROM api_keys WHERE hash = ?)").get(data.email);
  if (existing) {
    throw new Error("Email already registered");
  }

  const slug =
    data.slug ||
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const slugExists = db.prepare("SELECT id FROM organizations WHERE slug = ?").get(slug);
  if (slugExists) {
    throw new Error("Business name already taken");
  }

  const plan = data.plan || "free";
  const now = new Date().toISOString();
  const orgId = generateId("TNT");

  db.prepare(`
    INSERT INTO organizations (id, name, slug, plan, branding, limits, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orgId,
    data.name,
    slug,
    plan,
    JSON.stringify({
      primaryColor: "#10b981",
      secondaryColor: "#14b8a6",
      darkMode: false,
      welcomeMessage: `Hi! I'm ${data.name}'s AI assistant. How can I help you today?`,
      botName: `${data.name} AI`,
    }),
    JSON.stringify(PLAN_LIMITS[plan]),
    JSON.stringify({
      enableWebSearch: plan !== "free",
      enableSentiment: true,
      enableLoyalty: plan !== "free",
      enablePCControl: false,
      publicMode: true,
    }),
    now,
    now
  );

  const apiKey = `ak_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`;
  db.prepare(`
    INSERT INTO api_keys (id, organization_id, prefix, hash, scopes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    generateId("KEY"),
    orgId,
    apiKey.slice(0, 8),
    apiKey,
    JSON.stringify(["chat:write", "agents:read"]),
    now
  );

  db.prepare(`
    INSERT INTO credit_wallets (id, organization_id, balance, total_used, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    generateId("WAL"),
    orgId,
    plan === "free" ? 100 : plan === "pro" ? 1000 : 10000,
    0,
    now
  );

  return {
    id: orgId,
    name: data.name,
    slug,
    email: data.email,
    passwordHash: hashPassword(data.password),
    plan,
    branding: {
      primaryColor: "#10b981",
      secondaryColor: "#14b8a6",
      darkMode: false,
      welcomeMessage: `Hi! I'm ${data.name}'s AI assistant. How can I help you today?`,
      botName: `${data.name} AI`,
    },
    limits: PLAN_LIMITS[plan],
    apiKeys: [apiKey],
    createdAt: now,
    updatedAt: now,
    isActive: true,
    settings: {
      enableWebSearch: plan !== "free",
      enableSentiment: true,
      enableLoyalty: plan !== "free",
      enablePCControl: false,
      publicMode: true,
    },
  };
}

export function authenticateTenant(
  email: string,
  password: string
): Tenant | null {
  const db = getDb();

  const org = db.prepare(`
    SELECT o.* FROM organizations o
    WHERE o.is_active = 1
    AND EXISTS (
      SELECT 1 FROM api_keys ak WHERE ak.organization_id = o.id
    )
  `).get() as any;

  if (!org) return null;

  const storedHash = hashPassword(password);
  const apiKeyRow = db.prepare(`
    SELECT hash FROM api_keys WHERE organization_id = ?
  `).get(org.id) as any;

  if (apiKeyRow && apiKeyRow.hash === email) {
    const apiKeys = db.prepare(`
      SELECT hash FROM api_keys WHERE organization_id = ?
    `).all(org.id).map((r: any) => r.hash);
    return mapRowToTenant(org, apiKeys);
  }

  return null;
}

export function getTenantById(id: string): Tenant | null {
  const db = getDb();
  const org = db.prepare("SELECT * FROM organizations WHERE id = ?").get(id) as any;
  if (!org) return null;

  const apiKeys = db.prepare(`
    SELECT hash FROM api_keys WHERE organization_id = ?
  `).all(id).map((r: any) => r.hash);

  return mapRowToTenant(org, apiKeys);
}

export function getTenantBySlug(slug: string): Tenant | null {
  const db = getDb();
  const org = db.prepare("SELECT * FROM organizations WHERE slug = ? AND is_active = 1").get(slug) as any;
  if (!org) return null;

  const apiKeys = db.prepare(`
    SELECT hash FROM api_keys WHERE organization_id = ?
  `).all(org.id).map((r: any) => r.hash);

  return mapRowToTenant(org, apiKeys);
}

export function getTenantByApiKey(apiKey: string): Tenant | null {
  const db = getDb();
  const apiKeyRow = db.prepare(`
    SELECT organization_id FROM api_keys WHERE hash = ?
  `).get(apiKey) as any;
  if (!apiKeyRow) return null;

  return getTenantById(apiKeyRow.organization_id);
}

export function updateTenant(
  id: string,
  data: Partial<Omit<Tenant, "id" | "createdAt">>
): Tenant | null {
  const db = getDb();
  const org = db.prepare("SELECT * FROM organizations WHERE id = ?").get(id) as any;
  if (!org) return null;

  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.slug !== undefined) {
    updates.push("slug = ?");
    values.push(data.slug);
  }
  if (data.plan !== undefined) {
    updates.push("plan = ?");
    values.push(data.plan);
    updates.push("limits = ?");
    values.push(JSON.stringify(PLAN_LIMITS[data.plan as TenantPlan]));
  }
  if (data.branding !== undefined) {
    updates.push("branding = ?");
    values.push(JSON.stringify(data.branding));
  }
  if (data.settings !== undefined) {
    updates.push("settings = ?");
    values.push(JSON.stringify(data.settings));
  }
  if (data.isActive !== undefined) {
    updates.push("is_active = ?");
    values.push(data.isActive ? 1 : 0);
  }

  if (updates.length === 0) return mapRowToTenant(org);

  updates.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  db.prepare(`
    UPDATE organizations SET ${updates.join(", ")} WHERE id = ?
  `).run(...values);

  return getTenantById(id);
}

export function generateApiKey(tenantId: string): string | null {
  const db = getDb();
  const org = db.prepare("SELECT id FROM organizations WHERE id = ?").get(tenantId);
  if (!org) return null;

  const newKey = `ak_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`;
  db.prepare(`
    INSERT INTO api_keys (id, organization_id, prefix, hash, scopes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    generateId("KEY"),
    tenantId,
    newKey.slice(0, 8),
    newKey,
    JSON.stringify(["chat:write", "agents:read"]),
    new Date().toISOString()
  );

  return newKey;
}

export function getAllTenants(): Tenant[] {
  const db = getDb();
  const orgs = db.prepare("SELECT * FROM organizations WHERE is_active = 1").all() as any[];

  return orgs.map((org) => {
    const apiKeys = db.prepare(`
      SELECT hash FROM api_keys WHERE organization_id = ?
    `).all(org.id).map((r: any) => r.hash);
    return mapRowToTenant(org, apiKeys);
  });
}

export function deleteTenant(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM organizations WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getTenantDataPath(tenantId: string, filename: string): string {
  return `database://${tenantId}/${filename}`;
}

export function getTenantDir(tenantId: string): string {
  return `database://${tenantId}`;
}
