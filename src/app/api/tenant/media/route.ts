import { requireAuth } from "@/lib/auth";
import {
  generateImage,
  generateVideo,
  getGeneratedAssets,
  getGeneratedAssetById,
  deleteGeneratedAsset,
  getMediaStats,
} from "@/lib/media";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const type = url.searchParams.get("type") as "image" | "video" | null;
    const id = url.searchParams.get("id");

    if (id) {
      const asset = getGeneratedAssetById(auth.tenant.id, id);
      if (!asset) {
        return Response.json({ error: "Asset not found" }, { status: 404 });
      }
      return Response.json({ ok: true, asset });
    }

    if (url.searchParams.get("stats") === "true") {
      const stats = getMediaStats(auth.tenant.id);
      return Response.json({ ok: true, stats });
    }

    const assets = getGeneratedAssets(auth.tenant.id, type || undefined);
    return Response.json({ ok: true, assets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch media";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request);
    const body = await request.json();
    const { action, prompt, type, width, height, seed, model, duration } = body;

    const safePrompt = typeof prompt === "string" ? prompt.trim() : prompt ? String(prompt).trim() : "";

    if (!safePrompt) {
      return Response.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (safePrompt.length > 2000) {
      return Response.json(
        { error: "Prompt must be under 2000 characters" },
        { status: 400 }
      );
    }

    if (type === "video") {
      const result = await generateVideo(auth.tenant.id, safePrompt, {
        duration: duration || 4,
        model,
      });

      return Response.json({
        ok: result.status === "completed",
        asset: result,
      });
    }

    const result = await generateImage(auth.tenant.id, safePrompt, {
      width: width || 1024,
      height: height || 1024,
      seed,
      model,
    });

    return Response.json({
      ok: result.status === "completed",
      asset: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate media";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = requireAuth(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Asset ID is required" }, { status: 400 });
    }

    const deleted = deleteGeneratedAsset(auth.tenant.id, id);
    if (!deleted) {
      return Response.json({ error: "Asset not found" }, { status: 404 });
    }

    return Response.json({ ok: true, message: "Asset deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete asset";
    return Response.json({ error: message }, { status: 500 });
  }
}
