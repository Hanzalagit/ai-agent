import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const STORE_DIR = path.join(process.cwd(), ".runtime");
const TENANTS_FILE = path.join(STORE_DIR, "tenants.json");

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
  settings: {
    enableWebSearch: boolean;
    enableSentiment: boolean;
    enableLoyalty: boolean;
    enablePCControl: boolean;
    publicMode: boolean;
  };
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

function readStore(): Tenant[] {
  try {
    const raw = fs.readFileSync(TENANTS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Tenant[]) : [];
  } catch {
    return [];
  }
}

function writeStore(tenants: Tenant[]): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(TENANTS_FILE, JSON.stringify(tenants, null, 2), "utf8");
}

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function createTenant(data: {
  name: string;
  email: string;
  password: string;
  slug?: string;
  plan?: TenantPlan;
}): Tenant {
  const tenants = readStore();

  if (tenants.some((t) => t.email === data.email)) {
    throw new Error("Email already registered");
  }

  const slug =
    data.slug ||
    data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  if (tenants.some((t) => t.slug === slug)) {
    throw new Error("Business name already taken");
  }

  const plan = data.plan || "free";
  const now = new Date().toISOString();

  const tenant: Tenant = {
    id: `TNT-${crypto.randomUUID().slice(0, 8)}`,
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
    apiKeys: [`ak_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`],
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

  tenants.push(tenant);
  writeStore(tenants);

  const tenantDir = path.join(STORE_DIR, "tenants", tenant.id);
  fs.mkdirSync(tenantDir, { recursive: true });

  fs.writeFileSync(
    path.join(tenantDir, "products.json"),
    JSON.stringify({ products: [] }, null, 2)
  );
  fs.writeFileSync(
    path.join(tenantDir, "customer-data.json"),
    JSON.stringify(
      {
        business: { name: data.name, hours: "Mon-Sat, 9am-6pm", city: "", whatsapp: "" },
        faqs: [],
        orders: [],
        tickets: [],
      },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(tenantDir, "knowledge.json"),
    JSON.stringify({ entries: [] }, null, 2)
  );
  fs.writeFileSync(
    path.join(tenantDir, "crm.json"),
    JSON.stringify([], null, 2)
  );
  fs.writeFileSync(
    path.join(tenantDir, "analytics.json"),
    JSON.stringify([], null, 2)
  );

  return tenant;
}

export function authenticateTenant(
  email: string,
  password: string
): Tenant | null {
  const tenants = readStore();
  const tenant = tenants.find(
    (t) => t.email === email && t.passwordHash === hashPassword(password)
  );
  return tenant && tenant.isActive ? tenant : null;
}

export function getTenantById(id: string): Tenant | null {
  const tenants = readStore();
  return tenants.find((t) => t.id === id) || null;
}

export function getTenantBySlug(slug: string): Tenant | null {
  const tenants = readStore();
  return tenants.find((t) => t.slug === slug) || null;
}

export function getTenantByApiKey(apiKey: string): Tenant | null {
  const tenants = readStore();
  return tenants.find((t) => t.apiKeys.includes(apiKey) && t.isActive) || null;
}

export function updateTenant(
  id: string,
  data: Partial<Omit<Tenant, "id" | "createdAt">>
): Tenant | null {
  const tenants = readStore();
  const index = tenants.findIndex((t) => t.id === id);
  if (index === -1) return null;

  tenants[index] = {
    ...tenants[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (data.plan && data.plan !== tenants[index].plan) {
    tenants[index].limits = PLAN_LIMITS[data.plan as TenantPlan] || tenants[index].limits;
    tenants[index].settings = {
      ...tenants[index].settings,
      enableWebSearch: data.plan !== "free",
      enableLoyalty: data.plan !== "free",
    };
  }

  writeStore(tenants);
  return tenants[index];
}

export function generateApiKey(tenantId: string): string | null {
  const tenants = readStore();
  const tenant = tenants.find((t) => t.id === tenantId);
  if (!tenant) return null;

  const newKey = `ak_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`;
  tenant.apiKeys.push(newKey);
  tenant.updatedAt = new Date().toISOString();
  writeStore(tenants);
  return newKey;
}

export function getAllTenants(): Tenant[] {
  return readStore();
}

export function getTenantDataPath(tenantId: string, filename: string): string {
  return path.join(STORE_DIR, "tenants", tenantId, filename);
}

export function getTenantDir(tenantId: string): string {
  return path.join(STORE_DIR, "tenants", tenantId);
}

export function deleteTenant(id: string): boolean {
  const tenants = readStore();
  const filtered = tenants.filter((t) => t.id !== id);
  if (filtered.length === tenants.length) return false;

  writeStore(filtered);

  const tenantDir = path.join(STORE_DIR, "tenants", id);
  if (fs.existsSync(tenantDir)) {
    fs.rmSync(tenantDir, { recursive: true, force: true });
  }

  return true;
}
