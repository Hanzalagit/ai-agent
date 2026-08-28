import {
  addKnowledge,
  getAllKnowledge,
  searchKnowledge,
  deleteKnowledge,
} from "@/lib/knowledge-base";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");

  if (query) {
    return Response.json({ results: searchKnowledge(query) });
  }

  return Response.json({ entries: getAllKnowledge() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, content, category, tags } = body;

  if (!title || !content) {
    return Response.json(
      { error: "title and content are required" },
      { status: 400 }
    );
  }

  const entry = addKnowledge({ title, content, category, tags, source: "manual" });
  return Response.json({ entry });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  const deleted = deleteKnowledge(id);
  return Response.json({ deleted });
}
