import { getAnalytics, getRecentEvents } from "@/lib/analytics";
import { verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get("days") ?? "7", 10);
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

    const snapshot = getAnalytics(undefined, days);
    const recentEvents = getRecentEvents(undefined, limit);

    return Response.json({ ok: true, snapshot, recentEvents });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch analytics";
    return Response.json({ error: message }, { status: 500 });
  }
}
