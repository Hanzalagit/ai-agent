import { requireAuth } from "@/lib/auth";
import { getTenantById, updateTenant, generateApiKey } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const tenant = getTenantById(auth.tenant.id);

    if (!tenant) {
      return Response.json({ error: "Tenant not found" }, { status: 404 });
    }

    return Response.json({
      ok: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        email: tenant.email,
        plan: tenant.plan,
        branding: tenant.branding,
        limits: tenant.limits,
        settings: tenant.settings,
        apiKeys: tenant.apiKeys.map((k) => k.slice(0, 8) + "..."),
        createdAt: tenant.createdAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();

    const allowedUpdates = [
      "name",
      "branding",
      "settings",
      "plan",
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const updated = updateTenant(auth.tenant.id, updates);
    if (!updated) {
      return Response.json({ error: "Tenant not found" }, { status: 404 });
    }

    return Response.json({
      ok: true,
      tenant: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        plan: updated.plan,
        branding: updated.branding,
        settings: updated.settings,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();

    if (body.action === "generate_api_key") {
      const newKey = generateApiKey(auth.tenant.id);
      if (!newKey) {
        return Response.json(
          { error: "Failed to generate API key" },
          { status: 500 }
        );
      }
      return Response.json({ ok: true, apiKey: newKey });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Operation failed";
    return Response.json({ error: message }, { status: 401 });
  }
}
