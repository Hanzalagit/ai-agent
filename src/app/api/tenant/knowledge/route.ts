import { requireAuth } from "@/lib/auth";
import { getTenantById } from "@/lib/tenant";
import {
  getTenantKnowledge,
  searchTenantKnowledge,
  addTenantKnowledge,
  updateTenantKnowledge,
  deleteTenantKnowledge,
} from "@/lib/tenant-data";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    if (query) {
      const results = searchTenantKnowledge(auth.tenant.id, query);
      return Response.json({ ok: true, results, query });
    }

    const entries = getTenantKnowledge(auth.tenant.id);
    return Response.json({ ok: true, entries, total: entries.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch knowledge";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();
    const tenant = getTenantById(auth.tenant.id);

    const { title, content, category, tags } = body;

    if (!title || !content) {
      return Response.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const entries = getTenantKnowledge(auth.tenant.id);
    const maxEntries = tenant?.limits?.maxKnowledgeEntries ?? 10;
    if (maxEntries !== -1 && entries.length >= maxEntries) {
      return Response.json(
        { error: `Knowledge limit reached (${maxEntries}). Upgrade your plan to add more.` },
        { status: 403 }
      );
    }

    const entry = addTenantKnowledge(auth.tenant.id, {
      title,
      content,
      category: category || "general",
      tags: tags || [],
    });

    return Response.json({ ok: true, entry });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add entry";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const entryId = url.searchParams.get("id");

    if (!entryId) {
      return Response.json({ error: "Entry ID is required" }, { status: 400 });
    }

    const deleted = deleteTenantKnowledge(auth.tenant.id, entryId);
    if (!deleted) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    return Response.json({ ok: true, message: "Entry deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete entry";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();
    const { entryId, title, content, category, tags } = body;

    if (!entryId) {
      return Response.json({ error: "Entry ID is required" }, { status: 400 });
    }

    const updated = updateTenantKnowledge(auth.tenant.id, entryId, {
      title,
      content,
      category: category || "general",
      tags: tags || [],
    });

    if (!updated) {
      return Response.json({ error: "Entry not found" }, { status: 404 });
    }

    return Response.json({ ok: true, entry: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update entry";
    return Response.json({ error: message }, { status: 500 });
  }
}
