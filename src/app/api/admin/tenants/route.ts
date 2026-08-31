import {
  getAllTenants,
  getTenantById,
  updateTenant,
  deleteTenant,
  createTenant,
  type TenantPlan,
} from "@/lib/tenant";
import { getTenantProducts } from "@/lib/tenant-data";
import { getTenantFaqs } from "@/lib/tenant-data";
import { getTenantKnowledge } from "@/lib/tenant-data";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

function enrichTenant(tenant: any) {
  const tenantDir = path.join(process.cwd(), ".runtime", "tenants", tenant.id);
  let productCount = 0;
  let faqCount = 0;
  let knowledgeCount = 0;
  let messageCount = 0;

  try {
    const products = getTenantProducts(tenant.id);
    productCount = products.length;
  } catch {}

  try {
    const faqs = getTenantFaqs(tenant.id);
    faqCount = faqs.length;
  } catch {}

  try {
    const knowledge = getTenantKnowledge(tenant.id);
    knowledgeCount = knowledge.length;
  } catch {}

  try {
    const analyticsFile = path.join(tenantDir, "analytics.json");
    if (fs.existsSync(analyticsFile)) {
      const raw = fs.readFileSync(analyticsFile, "utf8");
      const events = JSON.parse(raw);
      messageCount = Array.isArray(events)
        ? events.filter((e: any) => e.type === "message").length
        : 0;
    }
  } catch {}

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    email: tenant.email,
    plan: tenant.plan,
    isActive: tenant.isActive,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    branding: tenant.branding,
    settings: tenant.settings,
    limits: tenant.limits,
    apiKeys: tenant.apiKeys,
    stats: { productCount, faqCount, knowledgeCount, messageCount },
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const tenant = getTenantById(id);
      if (!tenant) {
        return Response.json({ error: "Tenant not found" }, { status: 404 });
      }
      return Response.json({ ok: true, tenant: enrichTenant(tenant) });
    }

    const tenants = getAllTenants();
    const enriched = tenants.map(enrichTenant);
    return Response.json({ ok: true, tenants: enriched });
  } catch {
    return Response.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, password, slug, plan } = await request.json();

    if (!name || !email || !password) {
      return Response.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    const validPlans: TenantPlan[] = ["free", "pro", "enterprise"];
    const selectedPlan: TenantPlan = validPlans.includes(plan) ? plan : "free";

    const tenant = createTenant({ name, email, password, slug, plan: selectedPlan });
    return Response.json({ ok: true, tenant: enrichTenant(tenant) });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to create tenant" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();

    if (!id) {
      return Response.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    const allowedFields: Record<string, any> = {};
    if (data.plan !== undefined) allowedFields.plan = data.plan;
    if (data.isActive !== undefined) allowedFields.isActive = data.isActive;
    if (data.name !== undefined) allowedFields.name = data.name;
    if (data.branding !== undefined) allowedFields.branding = data.branding;

    const updated = updateTenant(id, allowedFields);
    if (!updated) {
      return Response.json({ error: "Tenant not found" }, { status: 404 });
    }

    return Response.json({ ok: true, tenant: enrichTenant(updated) });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to update tenant" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Tenant ID is required" }, { status: 400 });
    }

    const deleted = deleteTenant(id);
    if (!deleted) {
      return Response.json({ error: "Tenant not found" }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to delete tenant" },
      { status: 500 }
    );
  }
}
