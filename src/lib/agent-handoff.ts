import fs from "node:fs";
import path from "node:path";

const STORE_DIR = path.join(process.cwd(), ".runtime");
const HANDOFF_FILE = path.join(STORE_DIR, "agent-handoffs.json");

export type AgentHandoff = {
  id: string;
  sessionId: string;
  customerId?: string;
  customerName: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  status: "waiting" | "connected" | "resolved" | "transferred";
  assignedAgent?: string;
  messages: HandoffMessage[];
  createdAt: string;
  resolvedAt?: string;
  context: string;
};

export type HandoffMessage = {
  role: "customer" | "agent";
  content: string;
  timestamp: string;
};

function readStore(): AgentHandoff[] {
  try {
    const raw = fs.readFileSync(HANDOFF_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AgentHandoff[]) : [];
  } catch {
    return [];
  }
}

function writeStore(handoffs: AgentHandoff[]): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(HANDOFF_FILE, JSON.stringify(handoffs, null, 2), "utf8");
}

export function createHandoff(input: {
  sessionId: string;
  customerId?: string;
  customerName: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  context: string;
}): AgentHandoff {
  const handoffs = readStore();
  const handoff: AgentHandoff = {
    id: `HND-${String(handoffs.length + 1).padStart(4, "0")}`,
    sessionId: input.sessionId,
    customerId: input.customerId,
    customerName: input.customerName,
    reason: input.reason,
    urgency: input.urgency,
    status: "waiting",
    messages: [],
    createdAt: new Date().toISOString(),
    context: input.context,
  };
  handoffs.push(handoff);
  writeStore(handoffs);
  return handoff;
}

export function getActiveHandoffs(): AgentHandoff[] {
  return readStore().filter(
    (h) => h.status === "waiting" || h.status === "connected"
  );
}

export function connectAgent(
  handoffId: string,
  agentName: string
): AgentHandoff | undefined {
  const handoffs = readStore();
  const handoff = handoffs.find((h) => h.id === handoffId);
  if (handoff && handoff.status === "waiting") {
    handoff.status = "connected";
    handoff.assignedAgent = agentName;
    writeStore(handoffs);
    return handoff;
  }
  return undefined;
}

export function resolveHandoff(handoffId: string): void {
  const handoffs = readStore();
  const handoff = handoffs.find((h) => h.id === handoffId);
  if (handoff) {
    handoff.status = "resolved";
    handoff.resolvedAt = new Date().toISOString();
    writeStore(handoffs);
  }
}

export function getHandoffById(id: string): AgentHandoff | undefined {
  return readStore().find((h) => h.id === id);
}

export function getAllHandoffs(): AgentHandoff[] {
  return readStore();
}

export function shouldEscalateToAgent(
  message: string,
  sentimentScore: number,
  repeatComplaints: number
): { escalate: boolean; reason: string; urgency: "low" | "medium" | "high" } {
  const lower = message.toLowerCase();

  // Strong negative sentiment
  if (sentimentScore < -0.6) {
    return {
      escalate: true,
      reason: "Customer sentiment is very negative",
      urgency: "high",
    };
  }

  // Explicit request for human agent
  if (
    /\b(human|agent|representative|manager|person|insaan|banda|admi)\b/i.test(
      lower
    )
  ) {
    return {
      escalate: true,
      reason: "Customer explicitly requested a human agent",
      urgency: "medium",
    };
  }

  // Repeat complaints
  if (repeatComplaints >= 3) {
    return {
      escalate: true,
      reason: `Customer has filed ${repeatComplaints} complaints`,
      urgency: "high",
    };
  }

  // Legal/fraud threats
  if (
    /\b(law|legal|court|fraud|scam|report|police|consumer court)\b/i.test(
      lower
    )
  ) {
    return {
      escalate: true,
      reason: "Customer mentioned legal action or fraud",
      urgency: "high",
    };
  }

  return { escalate: false, reason: "", urgency: "low" };
}
