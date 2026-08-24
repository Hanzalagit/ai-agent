import fs from "node:fs";
import path from "node:path";
import demoData from "@/data/customer-data.json";

export type StoredTicket = {
  id: string;
  order_id: string;
  subject: string;
  status: string;
  updated: string;
  note: string;
};

const STORE_DIR = path.join(process.cwd(), ".runtime");
const STORE_FILE = path.join(STORE_DIR, "tickets.json");

function readStore(): StoredTicket[] {
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredTicket[]) : [];
  } catch {
    return [];
  }
}

function writeStore(tickets: StoredTicket[]): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(tickets, null, 2), "utf8");
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, "").trim();
}

function numericId(id: string): number {
  const match = /TCK-(\d+)/i.exec(id.trim());
  return match ? Number(match[1]) : 0;
}

function nextTicketId(existing: StoredTicket[]): string {
  const demoMax = (demoData.tickets as { id: string }[]).reduce(
    (max, t) => Math.max(max, numericId(t.id)),
    200
  );
  const createdMax = existing.reduce((max, t) => Math.max(max, numericId(t.id)), demoMax);
  return `TCK-${createdMax + 1}`;
}

export function createdTickets(): StoredTicket[] {
  return readStore();
}

export function findCreatedTicket(id: string): StoredTicket | undefined {
  const clean = normalize(id);
  return readStore().find(
    (t) => normalize(t.id) === clean || normalize(t.id.replace("TCK-", "")) === clean
  );
}

export function createTicket(input: {
  order_id?: string;
  subject: string;
  description?: string;
  contact?: string;
}): StoredTicket {
  const existing = readStore();
  const ticket: StoredTicket = {
    id: nextTicketId(existing),
    order_id: input.order_id?.trim().toUpperCase() ?? "",
    subject: input.subject.trim(),
    status: "Open",
    updated: new Date().toISOString().slice(0, 10),
    note:
      input.description?.trim() ||
      input.contact?.trim() ||
      "Submitted by customer via chat assistant.",
  };
  writeStore([...existing, ticket]);
  return ticket;
}
