import { getAnalytics, getRecentEvents } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") ?? "7", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  const snapshot = getAnalytics(days);
  const recentEvents = getRecentEvents(limit);

  return Response.json({ snapshot, recentEvents });
}
