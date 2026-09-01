import { requireAuth } from "@/lib/auth";
import { getEmailConfig, saveEmailConfig, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const config = getEmailConfig(auth.tenant.id);

    if (!config) {
      return Response.json({
        ok: true,
        configured: false,
        message: "Email not configured",
      });
    }

    const safeConfig = {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUser: config.smtpUser,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      useTls: config.useTls,
      configured: true,
    };

    return Response.json({ ok: true, config: safeConfig });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch email config";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();

    const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName, useTls } = body;

    if (!smtpHost || !smtpUser || !smtpPass || !fromEmail) {
      return Response.json(
        { error: "SMTP host, user, password, and from email are required" },
        { status: 400 }
      );
    }

    saveEmailConfig(auth.tenant.id, {
      smtpHost,
      smtpPort: smtpPort || 587,
      smtpUser,
      smtpPass,
      fromEmail,
      fromName: fromName || fromEmail,
      useTls: useTls !== false,
    });

    return Response.json({
      ok: true,
      message: "Email configured successfully",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save email config";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();

    const { action, to, subject, html, text } = body;

    if (action === "send") {
      if (!to || !subject || !html) {
        return Response.json(
          { error: "Recipient, subject, and HTML content are required" },
          { status: 400 }
        );
      }

      const result = await sendEmail(auth.tenant.id, {
        to,
        subject,
        html,
        text,
      });

      return Response.json({ ok: result.success, ...result });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process email action";
    return Response.json({ error: message }, { status: 500 });
  }
}
