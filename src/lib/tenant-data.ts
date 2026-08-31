import fs from "node:fs";
import { getTenantDataPath } from "./tenant";

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

export type TenantProductsFile = {
  products: TenantProduct[];
};

function readTenantFile<T>(tenantId: string, filename: string, fallback: T): T {
  try {
    const filePath = getTenantDataPath(tenantId, filename);
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeTenantFile<T>(
  tenantId: string,
  filename: string,
  data: T
): void {
  const filePath = getTenantDataPath(tenantId, filename);
  fs.mkdirSync(require("node:path").dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// ============= Products =============

export function getTenantProducts(tenantId: string): TenantProduct[] {
  const file = readTenantFile<TenantProductsFile>(tenantId, "products.json", {
    products: [],
  });
  return file.products;
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
  const file = readTenantFile<TenantProductsFile>(tenantId, "products.json", {
    products: [],
  });
  const newProduct: TenantProduct = {
    ...product,
    id: `PRD-${Date.now().toString(36).toUpperCase()}`,
  };
  file.products.push(newProduct);
  writeTenantFile(tenantId, "products.json", file);
  return newProduct;
}

export function updateTenantProduct(
  tenantId: string,
  productId: string,
  updates: Partial<TenantProduct>
): TenantProduct | null {
  const file = readTenantFile<TenantProductsFile>(tenantId, "products.json", {
    products: [],
  });
  const index = file.products.findIndex((p) => p.id === productId);
  if (index === -1) return null;
  file.products[index] = { ...file.products[index], ...updates };
  writeTenantFile(tenantId, "products.json", file);
  return file.products[index];
}

export function deleteTenantProduct(
  tenantId: string,
  productId: string
): boolean {
  const file = readTenantFile<TenantProductsFile>(tenantId, "products.json", {
    products: [],
  });
  const filtered = file.products.filter((p) => p.id !== productId);
  if (filtered.length === file.products.length) return false;
  file.products = filtered;
  writeTenantFile(tenantId, "products.json", file);
  return true;
}

// ============= FAQs =============

export type TenantFaq = {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
};

export type TenantCustomerData = {
  business: {
    name: string;
    hours: string;
    city: string;
    whatsapp: string;
  };
  faqs: TenantFaq[];
  orders: any[];
  tickets: any[];
};

export function getTenantFaqs(tenantId: string): TenantFaq[] {
  const data = readTenantFile<TenantCustomerData>(tenantId, "customer-data.json", {
    business: { name: "", hours: "", city: "", whatsapp: "" },
    faqs: [],
    orders: [],
    tickets: [],
  });
  return data.faqs;
}

export function getTenantBusiness(tenantId: string) {
  const data = readTenantFile<TenantCustomerData>(tenantId, "customer-data.json", {
    business: { name: "", hours: "", city: "", whatsapp: "" },
    faqs: [],
    orders: [],
    tickets: [],
  });
  return data.business;
}

export function addTenantFaq(
  tenantId: string,
  faq: Omit<TenantFaq, "id">
): TenantFaq {
  const data = readTenantFile<TenantCustomerData>(tenantId, "customer-data.json", {
    business: { name: "", hours: "", city: "", whatsapp: "" },
    faqs: [],
    orders: [],
    tickets: [],
  });
  const newFaq: TenantFaq = {
    ...faq,
    id: `FAQ-${Date.now().toString(36).toUpperCase()}`,
  };
  data.faqs.push(newFaq);
  writeTenantFile(tenantId, "customer-data.json", data);
  return newFaq;
}

export function deleteTenantFaq(tenantId: string, faqId: string): boolean {
  const data = readTenantFile<TenantCustomerData>(tenantId, "customer-data.json", {
    business: { name: "", hours: "", city: "", whatsapp: "" },
    faqs: [],
    orders: [],
    tickets: [],
  });
  const filtered = data.faqs.filter((f) => f.id !== faqId);
  if (filtered.length === data.faqs.length) return false;
  data.faqs = filtered;
  writeTenantFile(tenantId, "customer-data.json", data);
  return true;
}

export function updateTenantFaq(
  tenantId: string,
  faqId: string,
  updates: Partial<Omit<TenantFaq, "id">>
): TenantFaq | null {
  const data = readTenantFile<TenantCustomerData>(tenantId, "customer-data.json", {
    business: { name: "", hours: "", city: "", whatsapp: "" },
    faqs: [],
    orders: [],
    tickets: [],
  });
  const index = data.faqs.findIndex((f) => f.id === faqId);
  if (index === -1) return null;
  data.faqs[index] = { ...data.faqs[index], ...updates };
  writeTenantFile(tenantId, "customer-data.json", data);
  return data.faqs[index];
}

// ============= Knowledge Base =============

export type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
};

export function getTenantKnowledge(tenantId: string): KnowledgeEntry[] {
  const file = readTenantFile<{ entries: KnowledgeEntry[] }>(
    tenantId,
    "knowledge.json",
    { entries: [] }
  );
  return file.entries;
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
  const file = readTenantFile<{ entries: KnowledgeEntry[] }>(
    tenantId,
    "knowledge.json",
    { entries: [] }
  );
  const newEntry: KnowledgeEntry = {
    ...entry,
    id: `KB-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  file.entries.push(newEntry);
  writeTenantFile(tenantId, "knowledge.json", file);
  return newEntry;
}

export function deleteTenantKnowledge(
  tenantId: string,
  entryId: string
): boolean {
  const file = readTenantFile<{ entries: KnowledgeEntry[] }>(
    tenantId,
    "knowledge.json",
    { entries: [] }
  );
  const filtered = file.entries.filter((e) => e.id !== entryId);
  if (filtered.length === file.entries.length) return false;
  file.entries = filtered;
  writeTenantFile(tenantId, "knowledge.json", file);
  return true;
}

export function updateTenantKnowledge(
  tenantId: string,
  entryId: string,
  updates: Partial<Omit<KnowledgeEntry, "id" | "createdAt">>
): KnowledgeEntry | null {
  const file = readTenantFile<{ entries: KnowledgeEntry[] }>(
    tenantId,
    "knowledge.json",
    { entries: [] }
  );
  const index = file.entries.findIndex((e) => e.id === entryId);
  if (index === -1) return null;
  file.entries[index] = { ...file.entries[index], ...updates };
  writeTenantFile(tenantId, "knowledge.json", file);
  return file.entries[index];
}

// --- Message tracking ---

type MessageCountFile = { count: number; lastReset: string };

export function getMessageCount(tenantId: string): number {
  const file = readTenantFile<MessageCountFile>(tenantId, "messages.json", {
    count: 0,
    lastReset: new Date().toISOString().slice(0, 7), // YYYY-MM
  });

  // Auto-reset monthly
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (file.lastReset !== currentMonth) {
    writeTenantFile(tenantId, "messages.json", { count: 0, lastReset: currentMonth });
    return 0;
  }
  return file.count;
}

export function incrementMessageCount(tenantId: string): number {
  const count = getMessageCount(tenantId);
  const newCount = count + 1;
  const currentMonth = new Date().toISOString().slice(0, 7);
  writeTenantFile(tenantId, "messages.json", { count: newCount, lastReset: currentMonth });
  return newCount;
}
