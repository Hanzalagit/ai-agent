import {
  createCampaign,
  getAllCampaigns,
  getMessageTemplates,
} from "@/lib/campaign";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "list";

  if (action === "templates") {
    return Response.json({ templates: getMessageTemplates() });
  }

  return Response.json({ campaigns: getAllCampaigns() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, message, targetAudience, customPhones, scheduledAt } = body;

  if (!name || !message) {
    return Response.json(
      { error: "name and message are required" },
      { status: 400 }
    );
  }

  const campaign = createCampaign({
    name,
    message,
    targetAudience: targetAudience ?? "all",
    customPhones,
    scheduledAt,
  });

  return Response.json({ campaign });
}
