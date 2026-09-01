import { verifyWebhook, processWebhookMessage } from "@/lib/whatsapp";
import { getTenantById } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const tenantId = url.searchParams.get("tenant_id");

  if (!mode || !token || !challenge || !tenantId) {
    return Response.json({ error: "Missing parameters" }, { status: 400 });
  }

  const tenant = getTenantById(tenantId);
  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Get verify token from tenant's WhatsApp config
  const { getWhatsAppConfig } = await import("@/lib/whatsapp");
  const config = getWhatsAppConfig(tenantId);
  if (!config) {
    return Response.json({ error: "WhatsApp not configured" }, { status: 400 });
  }

  const result = verifyWebhook(mode, token, challenge, config.verifyToken);
  if (result) {
    return new Response(result, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return Response.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const tenantId = url.searchParams.get("tenant_id") || request.headers.get("x-tenant-id");

    if (!tenantId) {
      return Response.json({ error: "Missing tenant_id" }, { status: 400 });
    }

    const tenant = getTenantById(tenantId);
    if (!tenant) {
      return Response.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Process webhook entries
    if (body.entry) {
      for (const entry of body.entry) {
        const messages = processWebhookMessage(tenantId, entry);

        // Forward messages to AI agent for auto-reply
        for (const msg of messages) {
          if (msg.type === "text") {
            // Queue message for AI processing
            await processIncomingMessage(tenantId, msg.from, msg.message);
          }
        }
      }
    }

    return Response.json({ status: "ok" });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return Response.json({ status: "ok" }); // Always return 200 to WhatsApp
  }
}

async function processIncomingMessage(
  tenantId: string,
  from: string,
  message: string
): Promise<void> {
  // Import chat processing logic
  const { getTenantById } = await import("@/lib/tenant");
  const { sendWhatsAppMessage } = await import("@/lib/whatsapp");

  const tenant = getTenantById(tenantId);
  if (!tenant) return;

  // Simple auto-reply for now
  // In production, this would call the AI agent
  const autoReply = `Thank you for your message! Our team will get back to you shortly.\n\nBusiness: ${tenant.name}`;

  await sendWhatsAppMessage(tenantId, from, autoReply);
}
