import fs from "node:fs";
import path from "node:path";
import { verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

function getTenantAnalytics(tenantId: string, days: number) {
  const tenantDir = path.join(process.cwd(), ".runtime", "tenants", tenantId);
  const analyticsFile = path.join(tenantDir, "analytics.json");

  if (!fs.existsSync(analyticsFile)) {
    return {
      totalMessages: 0,
      totalToolCalls: 0,
      totalSearches: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      topIntents: [],
      messagesByHour: [],
      activeSessions: 0,
      satisfactionRate: 0,
    };
  }

  try {
    const raw = fs.readFileSync(analyticsFile, "utf8");
    const events = JSON.parse(raw);
    if (!Array.isArray(events)) return null;

    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const recent = events.filter((e: any) => e.timestamp >= cutoff);

    const totalMessages = recent.filter((e: any) => e.type === "message").length;
    const totalToolCalls = recent.filter((e: any) => e.type === "tool_call").length;
    const totalSearches = recent.filter((e: any) => e.type === "search").length;

    const sentiments = recent
      .filter((e: any) => e.type === "sentiment" && e.data?.score !== undefined)
      .map((e: any) => e.data.score);

    const positive = sentiments.filter((s: number) => s > 0.3).length;
    const negative = sentiments.filter((s: number) => s < -0.3).length;
    const neutral = sentiments.length - positive - negative;

    const intentCounts: Record<string, number> = {};
    recent
      .filter((e: any) => e.type === "message" && e.data?.intent)
      .forEach((e: any) => {
        intentCounts[e.data.intent] = (intentCounts[e.data.intent] || 0) + 1;
      });

    const topIntents = Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([intent, count]) => ({ intent, count }));

    const hourCounts: Record<number, number> = {};
    recent
      .filter((e: any) => e.type === "message")
      .forEach((e: any) => {
        const hour = new Date(e.timestamp).getUTCHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

    const messagesByHour = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts[i] || 0,
    }));

    const sessionIds = new Set(
      recent
        .filter((e: any) => e.type === "message" && e.data?.sessionId)
        .map((e: any) => e.data.sessionId)
    );

    const satisfactionRate =
      sentiments.length > 0 ? Math.round((positive / sentiments.length) * 100) : 0;

    return {
      totalMessages,
      totalToolCalls,
      totalSearches,
      sentimentDistribution: { positive, neutral, negative },
      topIntents,
      messagesByHour,
      activeSessions: sessionIds.size,
      satisfactionRate,
    };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");
    const days = parseInt(searchParams.get("days") || "7", 10);

    if (!tenantId) {
      return Response.json({ error: "tenantId is required" }, { status: 400 });
    }

    const analytics = getTenantAnalytics(tenantId, days);
    if (analytics === null) {
      return Response.json({ error: "Tenant not found" }, { status: 404 });
    }

    return Response.json({ ok: true, analytics });
  } catch {
    return Response.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
