import { requireAuth } from "@/lib/auth";
import { getTenantById } from "@/lib/tenant";
import {
  getTenantFaqs,
  getTenantBusiness,
  addTenantFaq,
  updateTenantFaq,
  deleteTenantFaq,
  updateTenantBusiness,
} from "@/lib/tenant-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const faqs = getTenantFaqs(auth.tenant.id);
    const business = getTenantBusiness(auth.tenant.id);
    return Response.json({ ok: true, faqs, business, total: faqs.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch FAQs";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();

    if (body.action === "update_business") {
      const { business } = body;
      if (!business) {
        return Response.json({ error: "Business data required" }, { status: 400 });
      }

      const updatedBusiness = updateTenantBusiness(auth.tenant.id, business);
      return Response.json({ ok: true, business: updatedBusiness });
    }

    const { keywords, question, answer } = body;

    if (!question || !answer) {
      return Response.json(
        { error: "Question and answer are required" },
        { status: 400 }
      );
    }

    // Check FAQ limit (limit applies per tenant, use maxProducts as proxy since FAQs don't have their own limit)
    const tenant = getTenantById(auth.tenant.id);
    const faqs = getTenantFaqs(auth.tenant.id);
    const maxFaqs = tenant?.limits?.maxProducts ?? 20;
    if (maxFaqs !== -1 && faqs.length >= maxFaqs) {
      return Response.json(
        { error: `FAQ limit reached (${maxFaqs}). Upgrade your plan to add more.` },
        { status: 403 }
      );
    }

    const faq = addTenantFaq(auth.tenant.id, {
      keywords: keywords || [],
      question,
      answer,
    });

    return Response.json({ ok: true, faq });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add FAQ";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const faqId = url.searchParams.get("id");

    if (!faqId) {
      return Response.json({ error: "FAQ ID is required" }, { status: 400 });
    }

    const deleted = deleteTenantFaq(auth.tenant.id, faqId);
    if (!deleted) {
      return Response.json({ error: "FAQ not found" }, { status: 404 });
    }

    return Response.json({ ok: true, message: "FAQ deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete FAQ";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();
    const { faqId, question, answer, keywords } = body;

    if (!faqId) {
      return Response.json({ error: "FAQ ID is required" }, { status: 400 });
    }

    const updated = updateTenantFaq(auth.tenant.id, faqId, {
      question,
      answer,
      keywords: keywords || [],
    });

    if (!updated) {
      return Response.json({ error: "FAQ not found" }, { status: 404 });
    }

    return Response.json({ ok: true, faq: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update FAQ";
    return Response.json({ error: message }, { status: 500 });
  }
}
