import { getTenantBySlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get("slug");

    if (!slug) {
      return Response.json({ error: "Slug is required" }, { status: 400 });
    }

    const tenant = getTenantBySlug(slug);
    if (!tenant || !tenant.isActive) {
      return Response.json({ error: "Business not found" }, { status: 404 });
    }

    return Response.json({
      ok: true,
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        branding: tenant.branding,
      },
    });
  } catch {
    return Response.json({ error: "Failed to load config" }, { status: 500 });
  }
}
