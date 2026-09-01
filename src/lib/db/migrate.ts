import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getDb } from "./client";
import { initializeDatabase } from "./schema";

const RUNTIME_DIR = path.join(process.cwd(), ".runtime");
const TENANTS_FILE = path.join(RUNTIME_DIR, "tenants.json");

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

interface OldTenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  passwordHash: string;
  plan: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    darkMode: boolean;
    welcomeMessage: string;
    botName: string;
  };
  limits: {
    maxMessages: number;
    maxProducts: number;
    maxAgents: number;
    maxKnowledgeEntries: number;
  };
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
}

export async function migrateData(): Promise<void> {
  console.log("Starting data migration...");

  // Initialize database
  initializeDatabase();

  const db = getDb();

  // Read existing tenants
  if (!fs.existsSync(TENANTS_FILE)) {
    console.log("No tenants.json found, skipping migration");
    return;
  }

  const raw = fs.readFileSync(TENANTS_FILE, "utf8");
  const tenants: OldTenant[] = JSON.parse(raw);

  if (!Array.isArray(tenants) || tenants.length === 0) {
    console.log("No tenants to migrate");
    return;
  }

  console.log(`Found ${tenants.length} tenants to migrate`);

  // Create a default user for existing tenants
  const defaultUserId = generateId("USR");
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, name, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    defaultUserId,
    "admin@urbanhive.com",
    "Admin",
    hashPassword("admin@123"),
    new Date().toISOString(),
    new Date().toISOString()
  );

  // Migrate each tenant to an organization
  const insertOrg = db.prepare(`
    INSERT OR IGNORE INTO organizations (id, name, slug, plan, branding, limits, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMember = db.prepare(`
    INSERT OR IGNORE INTO organization_members (id, user_id, organization_id, role, permissions, invited_at, joined_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertApiKey = db.prepare(`
    INSERT OR IGNORE INTO api_keys (id, organization_id, prefix, hash, scopes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Transaction for batch insert
  const migrateTransaction = db.transaction(() => {
    for (const tenant of tenants) {
      const orgId = tenant.id; // Keep same ID for compatibility

      // Insert organization
      insertOrg.run(
        orgId,
        tenant.name,
        tenant.slug,
        tenant.plan,
        JSON.stringify(tenant.branding),
        JSON.stringify(tenant.limits),
        JSON.stringify(tenant.settings),
        tenant.createdAt,
        tenant.updatedAt
      );

      // Insert admin member
      insertMember.run(
        generateId("MEM"),
        defaultUserId,
        orgId,
        "owner",
        JSON.stringify([
          "agent.read", "agent.write", "agent.execute",
          "customer.read", "customer.write",
          "ticket.read", "ticket.manage",
          "campaign.create", "campaign.send",
          "integration.connect", "integration.disconnect",
          "billing.read", "billing.manage",
          "admin.audit.read"
        ]),
        tenant.createdAt,
        tenant.createdAt,
        1
      );

      // Insert API keys
      for (const apiKey of tenant.apiKeys) {
        insertApiKey.run(
          generateId("KEY"),
          orgId,
          apiKey.slice(0, 8),
          apiKey, // In production, this should be hashed
          JSON.stringify(["chat:write", "agents:read"]),
          tenant.createdAt
        );
      }

      // Migrate tenant data files
      const tenantDir = path.join(RUNTIME_DIR, "tenants", tenant.id);
      if (fs.existsSync(tenantDir)) {
        // Migrate products to new products table
        const productsFile = path.join(tenantDir, "products.json");
        if (fs.existsSync(productsFile)) {
          const productsData = JSON.parse(fs.readFileSync(productsFile, "utf8"));
          if (productsData.products && Array.isArray(productsData.products)) {
            for (const product of productsData.products) {
              db.prepare(`
                INSERT OR IGNORE INTO products (id, organization_id, name, category, shades, size, price_pkr, stock, description, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                product.id || generateId("PRD"),
                orgId,
                product.name || "Product",
                product.category || "General",
                JSON.stringify(product.shades || []),
                product.size || null,
                product.pricePKR || product.price_pkr || 0,
                product.stock || "in_stock",
                product.description || "",
                tenant.createdAt
              );
            }
          }
        }

        // Migrate knowledge
        const knowledgeFile = path.join(tenantDir, "knowledge.json");
        if (fs.existsSync(knowledgeFile)) {
          const knowledgeData = JSON.parse(fs.readFileSync(knowledgeFile, "utf8"));
          if (knowledgeData.entries && Array.isArray(knowledgeData.entries)) {
            for (const entry of knowledgeData.entries) {
              db.prepare(`
                INSERT OR IGNORE INTO knowledge_sources (id, organization_id, name, type, content, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(
                entry.id || generateId("KB"),
                orgId,
                entry.title || "FAQ",
                "faq",
                entry.content || "",
                JSON.stringify({ category: entry.category, tags: entry.tags }),
                entry.createdAt || tenant.createdAt
              );
            }
          }
        }

        // Migrate customer data
        const customerFile = path.join(tenantDir, "customer-data.json");
        if (fs.existsSync(customerFile)) {
          const customerData = JSON.parse(fs.readFileSync(customerFile, "utf8"));

          // Migrate FAQs to new faqs table
          if (customerData.faqs && Array.isArray(customerData.faqs)) {
            for (const faq of customerData.faqs) {
              db.prepare(`
                INSERT OR IGNORE INTO faqs (id, organization_id, keywords, question, answer, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
              `).run(
                faq.id || generateId("FAQ"),
                orgId,
                JSON.stringify(faq.keywords || []),
                faq.question || "FAQ",
                faq.answer || "",
                tenant.createdAt
              );
            }
          }

          // Migrate business info
          if (customerData.business) {
            db.prepare(`
              INSERT OR IGNORE INTO business_info (id, organization_id, name, hours, city, whatsapp, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              generateId("BIZ"),
              orgId,
              customerData.business.name || "",
              customerData.business.hours || "",
              customerData.business.city || "",
              customerData.business.whatsapp || "",
              tenant.createdAt
            );
          }

          // Migrate orders
          if (customerData.orders && Array.isArray(customerData.orders)) {
            for (const order of customerData.orders) {
              db.prepare(`
                INSERT OR IGNORE INTO orders (id, organization_id, external_id, status, total, items, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                order.id || generateId("ORD"),
                orgId,
                order.externalId || null,
                order.status || "pending",
                order.total || 0,
                JSON.stringify(order.items || []),
                JSON.stringify(order.metadata || {}),
                order.createdAt || tenant.createdAt
              );
            }
          }

          // Migrate tickets
          if (customerData.tickets && Array.isArray(customerData.tickets)) {
            for (const ticket of customerData.tickets) {
              db.prepare(`
                INSERT OR IGNORE INTO tickets (id, organization_id, subject, description, status, priority, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(
                ticket.id || generateId("TKT"),
                orgId,
                ticket.subject || "Support Ticket",
                ticket.description || "",
                ticket.status || "open",
                ticket.priority || "medium",
                ticket.createdAt || tenant.createdAt
              );
            }
          }
        }
      }

      console.log(`Migrated tenant: ${tenant.name} (${tenant.id})`);
    }
  });

  migrateTransaction();

  console.log("Migration completed successfully!");
  console.log(`Migrated ${tenants.length} tenants to organizations`);
}

// Run if called directly
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log("Migration finished");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
