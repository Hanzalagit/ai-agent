import {
  getActiveHandoffs,
  connectAgent,
  resolveHandoff,
  getAllHandoffs,
} from "@/lib/agent-handoff";
import { verifyAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "all";

  if (action === "active") {
    return Response.json({ handoffs: getActiveHandoffs() });
  }

  return Response.json({ handoffs: getAllHandoffs() });
}

export async function POST(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { action, handoffId, agentName } = body;

  if (action === "connect") {
    const handoff = connectAgent(handoffId, agentName);
    if (!handoff) {
      return Response.json(
        { error: "Handoff not found or already connected" },
        { status: 404 }
      );
    }
    return Response.json({ handoff });
  }

  if (action === "resolve") {
    resolveHandoff(handoffId);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
