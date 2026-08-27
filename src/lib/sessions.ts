"use client";

const STORAGE_KEY = "ai-agent-sessions-v1";
const ACTIVE_KEY = "ai-agent-active-v1";
const VOICE_KEY = "ai-agent-voice-v1";
const MAX_SESSIONS = 60;

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  actions?: ChatAction[];
  error?: boolean;
  time: number;
};

export type ChatSource = {
  title: string;
  url: string;
  snippet: string;
};

export type ChatAction = {
  label: string;
  url: string;
};

export type Session = {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  summary?: string;
};

export type AppState = {
  sessions: Session[];
  activeId: string;
  voiceOn: boolean;
};

export function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is Session =>
        s && typeof s.id === "string" && Array.isArray(s.messages)
    );
  } catch {
    return [];
  }
}

export function createNewSession(): Session {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    updatedAt: Date.now(),
  };
}

export function bootstrap(): AppState {
  const loaded = loadSessions();
  const sessions = loaded.length > 0 ? loaded : [createNewSession()];
  const savedActive =
    typeof window !== "undefined" ? localStorage.getItem(ACTIVE_KEY) ?? "" : "";
  const activeId = sessions.some((s) => s.id === savedActive)
    ? savedActive
    : [...sessions].sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
  const voiceOn = localStorage.getItem(VOICE_KEY) === "on";
  return { sessions, activeId, voiceOn };
}

export function saveSessions(sessions: Session[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(sessions.slice(0, MAX_SESSIONS))
    );
  } catch {}
}

export function saveActiveId(activeId: string): void {
  try {
    localStorage.setItem(ACTIVE_KEY, activeId);
  } catch {}
}

export function saveVoiceState(voiceOn: boolean): void {
  try {
    localStorage.setItem(VOICE_KEY, voiceOn ? "on" : "off");
  } catch {}
}

export function generateSessionTitle(content: string): string {
  const lower = content.toLowerCase();

  if (lower.includes("order") || lower.includes("ORD-")) {
    const match = content.match(/ORD-\d+/i);
    return match ? `Order ${match[0]}` : "Order Inquiry";
  }

  if (lower.includes("ticket") || lower.includes("TCK-")) {
    const match = content.match(/TCK-\d+/i);
    return match ? `Ticket ${match[0]}` : "Support Ticket";
  }

  if (lower.includes("price") || lower.includes("kitne")) {
    return "Price Inquiry";
  }

  if (lower.includes("book") || lower.includes("reserve")) {
    return "Booking Request";
  }

  if (lower.includes("weather") || lower.includes("mausam")) {
    return "Weather Check";
  }

  return content.length > 40 ? `${content.slice(0, 40)}...` : content;
}
