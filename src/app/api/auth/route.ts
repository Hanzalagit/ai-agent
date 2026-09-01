import { createTenant, authenticateTenant, type TenantPlan } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, name, slug, plan } = body;

    const validPlans: TenantPlan[] = ["free", "pro", "enterprise"];
    const selectedPlan: TenantPlan = validPlans.includes(plan) ? plan : "free";

    if (action === "register") {
      if (!email || !password || !name) {
        return Response.json(
          { error: "Name, email and password are required" },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return Response.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      const tenant = createTenant({ name, email, password, slug, plan: selectedPlan });

      return Response.json({
        ok: true,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          email: tenant.email,
          plan: tenant.plan,
          branding: tenant.branding,
          settings: tenant.settings,
          apiKeys: tenant.apiKeys,
        },
      });
    }

    if (action === "login") {
      if (!email || !password) {
        return Response.json(
          { error: "Email and password are required" },
          { status: 400 }
        );
      }

      const tenant = authenticateTenant(email, password);
      if (!tenant) {
        return Response.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
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
          settings: tenant.settings,
          apiKeys: tenant.apiKeys,
        },
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("Auth error:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Authentication failed" },
      { status: 500 }
    );
  }
}
