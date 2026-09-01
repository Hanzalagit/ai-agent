import { requireAuth } from "@/lib/auth";
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  sendWhatsAppMessage,
  broadcastWhatsAppMessage,
  getWhatsAppTemplates,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const config = getWhatsAppConfig(auth.tenant.id);

    if (!config) {
      return Response.json({
        ok: true,
        configured: false,
        message: "WhatsApp not configured",
      });
    }

    // Don't expose access token
    const safeConfig = {
      phoneNumberId: config.phoneNumberId,
      businessAccountId: config.businessAccountId,
      apiVersion: config.apiVersion,
      configured: true,
    };

    return Response.json({ ok: true, config: safeConfig });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch WhatsApp config";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();

    const { phoneNumberId, accessToken, businessAccountId, verifyToken, apiVersion } = body;

    if (!phoneNumberId || !accessToken || !businessAccountId) {
      return Response.json(
        { error: "Phone Number ID, Access Token, and Business Account ID are required" },
        { status: 400 }
      );
    }

    saveWhatsAppConfig(auth.tenant.id, {
      phoneNumberId,
      accessToken,
      businessAccountId,
      verifyToken: verifyToken || `verify_${auth.tenant.id}`,
      apiVersion: apiVersion || "v21.0",
    });

    return Response.json({
      ok: true,
      message: "WhatsApp configured successfully",
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/whatsapp?tenant_id=${auth.tenant.id}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save WhatsApp config";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();

    const { action, to, message, templateName, languageCode, recipients } = body;

    if (action === "send") {
      if (!to || !message) {
        return Response.json(
          { error: "Recipient and message are required" },
          { status: 400 }
        );
      }

      const result = await sendWhatsAppMessage(auth.tenant.id, to, message);
      return Response.json({ ok: result.success, ...result });
    }

    if (action === "broadcast") {
      if (!recipients || !Array.isArray(recipients) || !message) {
        return Response.json(
          { error: "Recipients array and message are required" },
          { status: 400 }
        );
      }

      const result = await broadcastWhatsAppMessage(auth.tenant.id, recipients, message);
      return Response.json({ ok: true, ...result });
    }

    if (action === "templates") {
      const templates = await getWhatsAppTemplates(auth.tenant.id);
      return Response.json({ ok: true, templates });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process WhatsApp action";
    return Response.json({ error: message }, { status: 500 });
  }
}
