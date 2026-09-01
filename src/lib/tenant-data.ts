import crypto from "node:crypto";
import { getDb } from "./db/client";

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// ============================================
// TYPES
// ============================================

export type TenantProduct = {
  id: string;
  name: string;
  category: string;
  shades?: string[];
  size?: string;
  pricePKR: number;
  stock: "in_stock" | "low_stock" | "out_of_stock";
  description: string;
};

export type TenantFaq = {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
};

export type TenantBusiness = {
  name: string;
  hours: string;
  city: string;
  whatsapp: string;
};

export type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
};

// ============================================
// PRODUCTS
// ============================================

export function getTenantProducts(tenantId: string): TenantProduct[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM products WHERE organization_id = ? ORDER BY created_at DESC"
  ).all(tenantId) as any[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    shades: JSON.parse(row.shades || "[]"),
    size: row.size || undefined,
    pricePKR: row.price_pkr,
    stock: row.stock as TenantProduct["stock"],
    description: row.description || "",
  }));
}

export function searchTenantProducts(
  tenantId: string,
  query: string
): TenantProduct[] {
  const products = getTenantProducts(tenantId);
  const q = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.shades?.some((s) => s.toLowerCase().includes(q))
  );
}

export function addTenantProduct(
  tenantId: string,
  product: Omit<TenantProduct, "id">
): TenantProduct {
  const db = getDb();
  const id = generateId("PRD");
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO products (id, organization_id, name, category, shades, size, price_pkr, stock, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    tenantId,
    product.name,
    product.category,
    JSON.stringify(product.shades || []),
    product.size || null,
    product.pricePKR,
    product.stock || "in_stock",
    product.description || "",
    now,
    now
  );

  return { ...product, id };
}

export function updateTenantProduct(
  tenantId: string,
  productId: string,
  updates: Partial<TenantProduct>
): TenantProduct | null {
  const db = getDb();
  const existing = db.prepare(
    "SELECT * FROM products WHERE id = ? AND organization_id = ?"
  ).get(productId, tenantId) as any;

  if (!existing) return null;

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    setClauses.push("name = ?");
    values.push(updates.name);
  }
  if (updates.category !== undefined) {
    setClauses.push("category = ?");
    values.push(updates.category);
  }
  if (updates.shades !== undefined) {
    setClauses.push("shades = ?");
    values.push(JSON.stringify(updates.shades));
  }
  if (updates.size !== undefined) {
    setClauses.push("size = ?");
    values.push(updates.size);
  }
  if (updates.pricePKR !== undefined) {
    setClauses.push("price_pkr = ?");
    values.push(updates.pricePKR);
  }
  if (updates.stock !== undefined) {
    setClauses.push("stock = ?");
    values.push(updates.stock);
  }
  if (updates.description !== undefined) {
    setClauses.push("description = ?");
    values.push(updates.description);
  }

  if (setClauses.length === 0) {
    return {
      id: existing.id,
      name: existing.name,
      category: existing.category,
      shades: JSON.parse(existing.shades || "[]"),
      size: existing.size || undefined,
      pricePKR: existing.price_pkr,
      stock: existing.stock,
      description: existing.description || "",
    };
  }

  setClauses.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(productId);

  db.prepare(
    `UPDATE products SET ${setClauses.join(", ")} WHERE id = ?`
  ).run(...values);

  const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as any;
  return {
    id: updated.id,
    name: updated.name,
    category: updated.category,
    shades: JSON.parse(updated.shades || "[]"),
    size: updated.size || undefined,
    pricePKR: updated.price_pkr,
    stock: updated.stock,
    description: updated.description || "",
  };
}

export function deleteTenantProduct(
  tenantId: string,
  productId: string
): boolean {
  const db = getDb();
  const result = db.prepare(
    "DELETE FROM products WHERE id = ? AND organization_id = ?"
  ).run(productId, tenantId);
  return result.changes > 0;
}

// ============================================
// FAQS
// ============================================

export function getTenantFaqs(tenantId: string): TenantFaq[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM faqs WHERE organization_id = ? ORDER BY created_at DESC"
  ).all(tenantId) as any[];

  return rows.map((row) => ({
    id: row.id,
    keywords: JSON.parse(row.keywords || "[]"),
    question: row.question,
    answer: row.answer,
  }));
}

export function addTenantFaq(
  tenantId: string,
  faq: Omit<TenantFaq, "id">
): TenantFaq {
  const db = getDb();
  const id = generateId("FAQ");
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO faqs (id, organization_id, keywords, question, answer, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    tenantId,
    JSON.stringify(faq.keywords || []),
    faq.question,
    faq.answer,
    now,
    now
  );

  return { ...faq, id };
}

export function deleteTenantFaq(tenantId: string, faqId: string): boolean {
  const db = getDb();
  const result = db.prepare(
    "DELETE FROM faqs WHERE id = ? AND organization_id = ?"
  ).run(faqId, tenantId);
  return result.changes > 0;
}

export function updateTenantFaq(
  tenantId: string,
  faqId: string,
  updates: Partial<Omit<TenantFaq, "id">>
): TenantFaq | null {
  const db = getDb();
  const existing = db.prepare(
    "SELECT * FROM faqs WHERE id = ? AND organization_id = ?"
  ).get(faqId, tenantId) as any;

  if (!existing) return null;

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.keywords !== undefined) {
    setClauses.push("keywords = ?");
    values.push(JSON.stringify(updates.keywords));
  }
  if (updates.question !== undefined) {
    setClauses.push("question = ?");
    values.push(updates.question);
  }
  if (updates.answer !== undefined) {
    setClauses.push("answer = ?");
    values.push(updates.answer);
  }

  if (setClauses.length === 0) {
    return {
      id: existing.id,
      keywords: JSON.parse(existing.keywords || "[]"),
      question: existing.question,
      answer: existing.answer,
    };
  }

  setClauses.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(faqId);

  db.prepare(
    `UPDATE faqs SET ${setClauses.join(", ")} WHERE id = ?`
  ).run(...values);

  const updated = db.prepare("SELECT * FROM faqs WHERE id = ?").get(faqId) as any;
  return {
    id: updated.id,
    keywords: JSON.parse(updated.keywords || "[]"),
    question: updated.question,
    answer: updated.answer,
  };
}

// ============================================
// BUSINESS INFO
// ============================================

export function getTenantBusiness(tenantId: string): TenantBusiness {
  const db = getDb();
  const row = db.prepare(
    "SELECT * FROM business_info WHERE organization_id = ?"
  ).get(tenantId) as any;

  if (!row) {
    return { name: "", hours: "", city: "", whatsapp: "" };
  }

  return {
    name: row.name || "",
    hours: row.hours || "",
    city: row.city || "",
    whatsapp: row.whatsapp || "",
  };
}

export function updateTenantBusiness(
  tenantId: string,
  business: Partial<TenantBusiness>
): TenantBusiness {
  const db = getDb();
  const existing = db.prepare(
    "SELECT * FROM business_info WHERE organization_id = ?"
  ).get(tenantId) as any;

  const now = new Date().toISOString();

  if (!existing) {
    db.prepare(`
      INSERT INTO business_info (id, organization_id, name, hours, city, whatsapp, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      generateId("BIZ"),
      tenantId,
      business.name || "",
      business.hours || "",
      business.city || "",
      business.whatsapp || "",
      now
    );
  } else {
    db.prepare(`
      UPDATE business_info SET 
        name = COALESCE(?, name),
        hours = COALESCE(?, hours),
        city = COALESCE(?, city),
        whatsapp = COALESCE(?, whatsapp),
        updated_at = ?
      WHERE organization_id = ?
    `).run(
      business.name ?? null,
      business.hours ?? null,
      business.city ?? null,
      business.whatsapp ?? null,
      now,
      tenantId
    );
  }

  return getTenantBusiness(tenantId);
}

// ============================================
// KNOWLEDGE BASE
// ============================================

export function getTenantKnowledge(tenantId: string): KnowledgeEntry[] {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM knowledge_sources WHERE organization_id = ? AND is_active = 1 ORDER BY created_at DESC"
  ).all(tenantId) as any[];

  return rows.map((row) => ({
    id: row.id,
    title: row.name,
    content: row.content,
    category: row.type,
    tags: JSON.parse(row.metadata || "{}").tags || [],
    createdAt: row.created_at,
  }));
}

export function searchTenantKnowledge(
  tenantId: string,
  query: string
): KnowledgeEntry[] {
  const entries = getTenantKnowledge(tenantId);
  const q = query.toLowerCase();
  return entries.filter(
    (e) =>
      e.title.toLowerCase().includes(q) ||
      e.content.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function addTenantKnowledge(
  tenantId: string,
  entry: Omit<KnowledgeEntry, "id" | "createdAt">
): KnowledgeEntry {
  const db = getDb();
  const id = generateId("KB");
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO knowledge_sources (id, organization_id, name, type, content, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    tenantId,
    entry.title,
    entry.category,
    entry.content,
    JSON.stringify({ tags: entry.tags }),
    now,
    now
  );

  return { ...entry, id, createdAt: now };
}

export function deleteTenantKnowledge(
  tenantId: string,
  entryId: string
): boolean {
  const db = getDb();
  const result = db.prepare(
    "DELETE FROM knowledge_sources WHERE id = ? AND organization_id = ?"
  ).run(entryId, tenantId);
  return result.changes > 0;
}

export function updateTenantKnowledge(
  tenantId: string,
  entryId: string,
  updates: Partial<Omit<KnowledgeEntry, "id" | "createdAt">>
): KnowledgeEntry | null {
  const db = getDb();
  const existing = db.prepare(
    "SELECT * FROM knowledge_sources WHERE id = ? AND organization_id = ?"
  ).get(entryId, tenantId) as any;

  if (!existing) return null;

  const setClauses: string[] = [];
  const values: any[] = [];

  if (updates.title !== undefined) {
    setClauses.push("name = ?");
    values.push(updates.title);
  }
  if (updates.category !== undefined) {
    setClauses.push("type = ?");
    values.push(updates.category);
  }
  if (updates.content !== undefined) {
    setClauses.push("content = ?");
    values.push(updates.content);
  }
  if (updates.tags !== undefined) {
    setClauses.push("metadata = ?");
    values.push(JSON.stringify({ tags: updates.tags }));
  }

  if (setClauses.length === 0) {
    return {
      id: existing.id,
      title: existing.name,
      content: existing.content,
      category: existing.type,
      tags: JSON.parse(existing.metadata || "{}").tags || [],
      createdAt: existing.created_at,
    };
  }

  setClauses.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(entryId);

  db.prepare(
    `UPDATE knowledge_sources SET ${setClauses.join(", ")} WHERE id = ?`
  ).run(...values);

  const updated = db.prepare("SELECT * FROM knowledge_sources WHERE id = ?").get(entryId) as any;
  return {
    id: updated.id,
    title: updated.name,
    content: updated.content,
    category: updated.type,
    tags: JSON.parse(updated.metadata || "{}").tags || [],
    createdAt: updated.created_at,
  };
}

// ============================================
// MESSAGE COUNTS
// ============================================

function getCurrentYearMonth(): string {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

export function getMessageCount(tenantId: string): number {
  const db = getDb();
  const yearMonth = getCurrentYearMonth();

  const row = db.prepare(
    "SELECT count FROM message_counts WHERE organization_id = ? AND year_month = ?"
  ).get(tenantId, yearMonth) as any;

  return row?.count || 0;
}

export function incrementMessageCount(tenantId: string): number {
  const db = getDb();
  const yearMonth = getCurrentYearMonth();
  const now = new Date().toISOString();

  // Upsert: insert or increment
  db.prepare(`
    INSERT INTO message_counts (id, organization_id, year_month, count, created_at, updated_at)
    VALUES (?, ?, ?, 1, ?, ?)
    ON CONFLICT(organization_id, year_month) DO UPDATE SET 
      count = count + 1,
      updated_at = ?
  `).run(
    generateId("MSG"),
    tenantId,
    yearMonth,
    now,
    now,
    now
  );

  return getMessageCount(tenantId);
}
