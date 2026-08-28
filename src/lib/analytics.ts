import fs from "node:fs";
import path from "node:path";

const STORE_DIR = path.join(process.cwd(), ".runtime");
const ANALYTICS_FILE = path.join(STORE_DIR, "analytics.json");

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

function readStore(): AnalyticsEvent[] {
  try {
    const raw = fs.readFileSync(ANALYTICS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeStore(events: AnalyticsEvent[]): void {
  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(events, null, 2), "utf8");
}

export function trackEvent(
  event: Omit<AnalyticsEvent, "id" | "timestamp">
): void {
  const events = readStore();
  events.push({
    ...event,
    id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  writeStore(events);
}

export function getAnalytics(days: number = 7): AnalyticsSnapshot {
  const events = readStore();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  const recent = events.filter((e) => e.timestamp >= cutoffStr);

  const messages = recent.filter((e) => e.type === "message");
  const toolCalls = recent.filter((e) => e.type === "tool_call");
  const tickets = recent.filter((e) => e.type === "ticket_created");
  const orders = recent.filter((e) => e.type === "order_created");
  const searches = recent.filter((e) => e.type === "search");
  const sentiments = recent.filter((e) => e.type === "sentiment");

  // Sentiment distribution
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  let sentimentSum = 0;
  for (const s of sentiments) {
    const score = (s.data.score as number) ?? 0;
    sentimentSum += score;
    if (score > 0.2) sentimentCounts.positive++;
    else if (score < -0.2) sentimentCounts.negative++;
    else sentimentCounts.neutral++;
  }

  // Top products
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

  // Top intents
  const intentCounts: Record<string, number> = {};
  for (const m of messages) {
    const intent = String(m.data.intent ?? "general");
    intentCounts[intent] = (intentCounts[intent] ?? 0) + 1;
  }
  const topIntents = Object.entries(intentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([intent, count]) => ({ intent, count }));

  // Messages over time
  const dateCounts: Record<string, number> = {};
  for (const m of messages) {
    const date = m.timestamp.slice(0, 10);
    dateCounts[date] = (dateCounts[date] ?? 0) + 1;
  }
  const messagesOverTime = Object.entries(dateCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, count]) => ({ date, count }));

  // Messages by hour
  const hourCounts: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourCounts[h] = 0;
  for (const m of messages) {
    const hour = new Date(m.timestamp).getHours();
    hourCounts[hour]++;
  }
  const messagesByHour = Object.entries(hourCounts).map(([hour, count]) => ({
    hour: Number(hour),
    count,
  }));

  // Active sessions
  const sessionSet = new Set(
    messages.filter((m) => m.sessionId).map((m) => m.sessionId)
  );

  // Satisfaction rate (based on sentiment scores)
  const avgSentiment =
    sentiments.length > 0 ? sentimentSum / sentiments.length : 0;
  const satisfactionRate =
    sentiments.length > 0
      ? Math.round((sentimentCounts.positive / sentiments.length) * 100)
      : 75;

  // Avg response time (estimate from tool call durations)
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

export function getRecentEvents(limit: number = 50): AnalyticsEvent[] {
  const events = readStore();
  return events.slice(-limit).reverse();
}
