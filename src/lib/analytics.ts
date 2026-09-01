import crypto from "node:crypto";
import { getDb } from "./db/client";

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export type AnalyticsEvent = {
  id: string;
  type:
    | "message"
    | "tool_call"
    | "ticket_created"
    | "order_created"
    | "search"
    | "sentiment";
  timestamp: string;
  sessionId?: string;
  tenantId?: string;
  data: Record<string, unknown>;
};

export type AnalyticsSnapshot = {
  totalMessages: number;
  totalToolCalls: number;
  totalTickets: number;
  totalOrders: number;
  totalSearches: number;
  avgSentiment: number;
  topProducts: Array<{ name: string; count: number }>;
  topIntents: Array<{ intent: string; count: number }>;
  messagesOverTime: Array<{ date: string; count: number }>;
  activeSessions: number;
  satisfactionRate: number;
  avgResponseTime: number;
  messagesByHour: Array<{ hour: number; count: number }>;
  sentimentDistribution: { positive: number; neutral: number; negative: number };
};

export function trackEvent(
  event: Omit<AnalyticsEvent, "id" | "timestamp">
): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO audit_logs (id, organization_id, action, target_type, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    generateId("EVT"),
    event.tenantId || null,
    `analytics_${event.type}`,
    "analytics",
    JSON.stringify({
      ...event.data,
      sessionId: event.sessionId,
    }),
    now
  );
}

export function getAnalytics(
  tenantId?: string,
  days: number = 7
): AnalyticsSnapshot {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  const baseQuery = tenantId
    ? "SELECT * FROM audit_logs WHERE organization_id = ? AND created_at >= ? AND action LIKE 'analytics_%'"
    : "SELECT * FROM audit_logs WHERE created_at >= ? AND action LIKE 'analytics_%'";

  const params = tenantId ? [tenantId, cutoffStr] : [cutoffStr];
  const events = db.prepare(baseQuery).all(...params) as any[];

  const parsedEvents = events.map((e) => ({
    ...e,
    data: JSON.parse(e.metadata || "{}"),
    type: e.action.replace("analytics_", "") as AnalyticsEvent["type"],
  }));

  const messages = parsedEvents.filter((e) => e.type === "message");
  const toolCalls = parsedEvents.filter((e) => e.type === "tool_call");
  const tickets = parsedEvents.filter((e) => e.type === "ticket_created");
  const orders = parsedEvents.filter((e) => e.type === "order_created");
  const searches = parsedEvents.filter((e) => e.type === "search");
  const sentiments = parsedEvents.filter((e) => e.type === "sentiment");

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  let sentimentSum = 0;
  for (const s of sentiments) {
    const score = (s.data.score as number) ?? 0;
    sentimentSum += score;
    if (score > 0.2) sentimentCounts.positive++;
    else if (score < -0.2) sentimentCounts.negative++;
    else sentimentCounts.neutral++;
  }

  const productCounts: Record<string, number> = {};
  for (const tc of toolCalls) {
    if (tc.data.tool === "product_search") {
      const query = String(tc.data.query ?? "");
      const products = tc.data.results as string[] | undefined;
      if (products) {
        for (const p of products) {
          productCounts[p] = (productCounts[p] ?? 0) + 1;
        }
      } else {
        productCounts[query] = (productCounts[query] ?? 0) + 1;
      }
    }
  }
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const intentCounts: Record<string, number> = {};
  for (const m of messages) {
    const intent = String(m.data.intent ?? "general");
    intentCounts[intent] = (intentCounts[intent] ?? 0) + 1;
  }
  const topIntents = Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([intent, count]) => ({ intent, count }));

  const dateCounts: Record<string, number> = {};
  for (const m of messages) {
    const date = m.created_at.slice(0, 10);
    dateCounts[date] = (dateCounts[date] ?? 0) + 1;
  }
  const messagesOverTime = Object.entries(dateCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  const hourCounts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCounts[h] = 0;
  for (const m of messages) {
    const hour = new Date(m.created_at).getHours();
    hourCounts[hour]++;
  }
  const messagesByHour = Object.entries(hourCounts).map(([hour, count]) => ({
    hour: Number(hour),
    count,
  }));

  const sessionSet = new Set(
    messages.filter((m) => m.data.sessionId).map((m) => m.data.sessionId)
  );

  const avgSentiment =
    sentiments.length > 0 ? sentimentSum / sentiments.length : 0;
  const satisfactionRate =
    sentiments.length > 0
      ? Math.round((sentimentCounts.positive / sentiments.length) * 100)
      : 75;

  const responseTimes = toolCalls
    .map((t) => (t.data.duration as number) ?? 0)
    .filter((d) => d > 0);
  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 1200;

  return {
    totalMessages: messages.length,
    totalToolCalls: toolCalls.length,
    totalTickets: tickets.length,
    totalOrders: orders.length,
    totalSearches: searches.length,
    avgSentiment: Math.round(avgSentiment * 100) / 100,
    topProducts,
    topIntents,
    messagesOverTime,
    activeSessions: sessionSet.size,
    satisfactionRate,
    avgResponseTime: Math.round(avgResponseTime),
    messagesByHour,
    sentimentDistribution: sentimentCounts,
  };
}

export function getRecentEvents(
  tenantId?: string,
  limit: number = 50
): AnalyticsEvent[] {
  const db = getDb();

  let query = "SELECT * FROM audit_logs WHERE action LIKE 'analytics_%'";
  const params: any[] = [];

  if (tenantId) {
    query += " AND organization_id = ?";
    params.push(tenantId);
  }

  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const events = db.prepare(query).all(...params) as any[];

  return events.map((e) => ({
    id: e.id,
    type: e.action.replace("analytics_", "") as AnalyticsEvent["type"],
    timestamp: e.created_at,
    tenantId: e.organization_id,
    data: JSON.parse(e.metadata || "{}"),
  }));
}
