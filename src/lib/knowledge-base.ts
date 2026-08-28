import fs from "node:fs";
import path from "node:path";

const STORE_DIR = path.join(process.cwd(), ".runtime");
const KB_FILE = path.join(STORE_DIR, "knowledge-base.json");

export type KnowledgeEntry = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  source: "manual" | "uploaded" | "auto";
  embedding?: number[]; // For semantic search (placeholder)
};

function readStore(): KnowledgeEntry[] {
  try {
    const raw = fs.readFileSync(KB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as KnowledgeEntry[]) : [];
  } catch {
    return [];
  }
}

function writeStore(entries: KnowledgeEntry[]): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(KB_FILE, JSON.stringify(entries, null, 2), "utf8");
}

export function addKnowledge(input: {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  source?: "manual" | "uploaded" | "auto";
}): KnowledgeEntry {
  const entries = readStore();
  const now = new Date().toISOString();
  const entry: KnowledgeEntry = {
    id: `KB-${String(entries.length + 1).padStart(4, "0")}`,
    title: input.title,
    content: input.content,
    category: input.category ?? "general",
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
    source: input.source ?? "manual",
  };
  entries.push(entry);
  writeStore(entries);
  return entry;
}

export function searchKnowledge(query: string): KnowledgeEntry[] {
  const entries = readStore();
  const words = query.toLowerCase().split(/\s+/);

  return entries
    .map((entry) => {
      const text = `${entry.title} ${entry.content} ${entry.tags.join(" ")}`.toLowerCase();
      let score = 0;
      for (const word of words) {
        if (text.includes(word)) score++;
      }
      return { entry, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((e) => e.entry);
}

export function getAllKnowledge(): KnowledgeEntry[] {
  return readStore();
}

export function deleteKnowledge(id: string): boolean {
  const entries = readStore();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) return false;
  writeStore(filtered);
  return true;
}

export function getKnowledgeByCategory(category: string): KnowledgeEntry[] {
  return readStore().filter((e) => e.category === category);
}
