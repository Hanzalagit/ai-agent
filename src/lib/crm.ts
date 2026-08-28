import fs from "node:fs";
import path from "node:path";

const STORE_DIR = path.join(process.cwd(), ".runtime");
const CRM_FILE = path.join(STORE_DIR, "crm-customers.json");

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

function readStore(): CustomerProfile[] {
  try {
    const raw = fs.readFileSync(CRM_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomerProfile[]) : [];
  } catch {
    return [];
  }
}

function writeStore(customers: CustomerProfile[]): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(CRM_FILE, JSON.stringify(customers, null, 2), "utf8");
}

export function findCustomerByPhone(
  phone: string
): CustomerProfile | undefined {
  const clean = phone.replace(/\D/g, "");
  return readStore().find(
    (c) => c.phone.replace(/\D/g, "").includes(clean) || clean.includes(c.phone.replace(/\D/g, ""))
  );
}

export function findCustomerById(
  id: string
): CustomerProfile | undefined {
  return readStore().find((c) => c.id === id);
}

export function upsertCustomer(data: {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  interaction?: CustomerInteraction;
}): CustomerProfile {
  const customers = readStore();
  const now = new Date().toISOString();

  let existing: CustomerProfile | undefined;
  if (data.phone) {
    existing = findCustomerByPhone(data.phone);
  }

  if (existing) {
    if (data.name) existing.name = data.name;
    if (data.email) existing.email = data.email;
    if (data.city) existing.city = data.city;
    existing.lastSeen = now;
    if (data.interaction) {
      existing.interactions.push(data.interaction);
      // Update sentiment based on rolling average
      const recentSentiments = existing.interactions
        .filter((i) => i.sentiment !== undefined)
        .slice(-5)
        .map((i) => i.sentiment!);
      if (recentSentiments.length > 0) {
        const avg =
          recentSentiments.reduce((a, b) => a + b, 0) /
          recentSentiments.length;
        existing.satisfactionScore = Math.round(avg * 100) / 100;
        if (avg > 0.2) existing.sentiment = "positive";
        else if (avg < -0.2) existing.sentiment = "negative";
        else existing.sentiment = "neutral";
      }
    }
    // Auto-tag repeat customer
    if (existing.totalOrders > 1) existing.repeatCustomer = true;

    writeStore(customers);
    return existing;
  }

  // Create new customer
  const newCustomer: CustomerProfile = {
    id: `CUS-${String(customers.length + 1).padStart(4, "0")}`,
    name: data.name ?? "Anonymous",
    phone: data.phone ?? "",
    email: data.email,
    city: data.city,
    loyaltyPoints: 10, // Welcome bonus
    totalOrders: 0,
    totalSpent: 0,
    tags: [],
    notes: [],
    interactions: data.interaction ? [data.interaction] : [],
    firstSeen: now,
    lastSeen: now,
    sentiment: "neutral",
    satisfactionScore: 0,
    repeatCustomer: false,
  };

  customers.push(newCustomer);
  writeStore(customers);
  return newCustomer;
}

export function addLoyaltyPoints(phone: string, points: number): void {
  const customer = findCustomerByPhone(phone);
  if (customer) {
    customer.loyaltyPoints += points;
    const customers = readStore();
    writeStore(customers);
  }
}

export function addOrderToCustomer(
  phone: string,
  orderId: string,
  amount: number
): void {
  const customer = findCustomerByPhone(phone);
  if (customer) {
    customer.totalOrders += 1;
    customer.totalSpent += amount;
    customer.loyaltyPoints += Math.floor(amount / 100); // 1 point per 100 PKR
    if (customer.totalOrders > 1) customer.repeatCustomer = true;
    // Auto-tag VIP
    if (customer.totalSpent > 10000 && !customer.tags.includes("vip")) {
      customer.tags.push("vip");
    }
    const customers = readStore();
    writeStore(customers);
  }
}

export function getAllCustomers(): CustomerProfile[] {
  return readStore();
}

export function getTopCustomers(limit: number = 10): CustomerProfile[] {
  return readStore()
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}

export function getCustomerStats(): {
  total: number;
  newThisMonth: number;
  repeatRate: number;
  avgSatisfaction: number;
  vipCount: number;
  totalRevenue: number;
} {
  const customers = readStore();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const newThisMonth = customers.filter((c) => c.firstSeen >= monthStart).length;
  const repeatCustomers = customers.filter((c) => c.repeatCustomer).length;
  const vipCount = customers.filter((c) => c.tags.includes("vip")).length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const avgSatisfaction =
    customers.length > 0
      ? customers.reduce((sum, c) => sum + c.satisfactionScore, 0) /
        customers.length
      : 0;

  return {
    total: customers.length,
    newThisMonth,
    repeatRate:
      customers.length > 0
        ? Math.round((repeatCustomers / customers.length) * 100)
        : 0,
    avgSatisfaction: Math.round(avgSatisfaction * 100) / 100,
    vipCount,
    totalRevenue,
  };
}
