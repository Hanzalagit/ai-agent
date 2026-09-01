import { verifyAdminSession } from "@/lib/admin-auth";
import {
  createCampaign,
  getAllCampaignsAdmin,
  getMessageTemplates,
  executeCampaignAdmin,
} from "@/lib/campaign";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "list";

    if (action === "templates") {
      return Response.json({ ok: true, templates: getMessageTemplates() });
    }

    const campaigns = getAllCampaignsAdmin();
    return Response.json({ ok: true, campaigns, total: campaigns.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch campaigns";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { name, message, targetAudience, customPhones, scheduledAt, type } = body;

    if (!name || !message) {
      return Response.json(
        { error: "name and message are required" },
        { status: 400 }
      );
    }

    const campaign = createCampaign({
      name,
      type: type || "whatsapp",
      message,
      targetAudience: targetAudience ?? "all",
      customPhones,
      scheduledAt,
    });

    return Response.json({ ok: true, campaign });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = verifyAdminSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const { action, campaignId } = body;

    if (action === "execute") {
      if (!campaignId) {
        return Response.json(
          { error: "campaignId is required" },
          { status: 400 }
        );
      }

      const result = await executeCampaignAdmin(campaignId);
      return Response.json({ ok: result.success, ...result });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to execute campaign";
    return Response.json({ error: message }, { status: 500 });
  }
}
