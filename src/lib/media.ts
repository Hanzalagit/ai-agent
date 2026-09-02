import crypto from "node:crypto";
import { getDb } from "./db/client";

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export type MediaGenerationResult = {
  id: string;
  type: "image" | "video";
  url: string;
  prompt: string;
  model: string;
  provider: string;
  status: "pending" | "generating" | "completed" | "failed";
  error?: string;
  metadata?: Record<string, unknown>;
};

const IMAGE_MODELS = {
  "flux": { name: "Flux Schnell", quality: "fast" },
  "flux-2-dev": { name: "Flux 2 Dev", quality: "high" },
  "imagen-4": { name: "Imagen 4", quality: "high" },
  "gptimage": { name: "GPT Image", quality: "high" },
  "gptimage-large": { name: "GPT Image 1.5", quality: "best" },
  "kontext": { name: "Kontext", quality: "high" },
  "nanobanana": { name: "Gemini Flash", quality: "high" },
  "nanobanana-2": { name: "Gemini 3.1 Flash", quality: "high" },
  "zimage": { name: "Z-Image", quality: "fast" },
} as const;

const VIDEO_MODELS = {
  "cogvideox-flash": { name: "CogVideoX Flash (Free)" },
} as const;

function saveGeneratedAsset(tenantId: string, result: MediaGenerationResult): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO generated_assets (id, organization_id, type, prompt, model, provider, url, status, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    result.id, tenantId, result.type, result.prompt, result.model,
    result.provider, result.url, result.status,
    JSON.stringify(result.metadata || {}), now, now
  );
}

function updateAssetStatus(id: string, status: MediaGenerationResult["status"], url?: string, error?: string): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE generated_assets SET status = ?, url = ?, metadata = json_set(COALESCE(metadata, '{}'), '$.error', ?), updated_at = ?
    WHERE id = ?
  `).run(status, url || null, error || null, now, id);
}

export async function generateImage(
  tenantId: string,
  prompt: string,
  options?: { width?: number; height?: number; seed?: number; model?: string }
): Promise<MediaGenerationResult> {
  const id = generateId("IMG");
  const width = options?.width || 1024;
  const height = options?.height || 1024;
  const seed = options?.seed || Math.floor(Math.random() * 999999);
  const model = options?.model || "flux-2-dev";
  const safePrompt = typeof prompt === "string" ? prompt.trim() : String(prompt || "").trim();

  const result: MediaGenerationResult = {
    id, type: "image", url: "", prompt: safePrompt, model,
    provider: "pollinations", status: "generating",
  };

  saveGeneratedAsset(tenantId, result);

  try {
    const encodedPrompt = encodeURIComponent(safePrompt);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true&enhance=true`;

    const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });

    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      throw new Error("Invalid response type from image API");
    }

    const imageBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    updateAssetStatus(id, "completed", dataUrl);

    return {
      ...result, url: dataUrl, status: "completed",
      metadata: { width, height, seed, modelName: IMAGE_MODELS[model as keyof typeof IMAGE_MODELS]?.name || model },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Image generation failed";
    updateAssetStatus(id, "failed", undefined, errorMsg);
    return { ...result, status: "failed", error: errorMsg };
  }
}

export async function generateVideo(
  tenantId: string,
  prompt: string,
  options?: { duration?: number; model?: string }
): Promise<MediaGenerationResult> {
  const id = generateId("VID");
  const model = options?.model || "cogvideox-flash";
  const duration = Math.min(options?.duration || 4, 10);
  const safePrompt = typeof prompt === "string" ? prompt.trim() : String(prompt || "").trim();

  const result: MediaGenerationResult = {
    id, type: "video", url: "", prompt: safePrompt, model,
    provider: "cogvideox", status: "generating",
  };

  saveGeneratedAsset(tenantId, result);

  const apiKey = process.env.COGVIDEOX_API_KEY;
  if (!apiKey) {
    const errorMsg = "Video generation not configured. Get free key at https://aiapi-pro.com";
    updateAssetStatus(id, "failed", undefined, errorMsg);
    return { ...result, status: "failed", error: errorMsg };
  }

  try {
    const baseUrl = "https://aiapi-pro.com/v1";

    const jobRes = await fetch(`${baseUrl}/video/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "cogvideox-flash",
        prompt: safePrompt,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const jobData = await jobRes.json();

    if (!jobRes.ok || jobData.detail) {
      const errMsg = jobData.detail || jobData.error?.message || `Failed: ${jobRes.status}`;
      throw new Error(errMsg);
    }

    const jobId = jobData.id;
    if (!jobId) throw new Error("No job ID returned");

    let videoUrl = null;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 5000));

      const pollRes = await fetch(`${baseUrl}/video/generations/${jobId}?model=cogvideox-flash`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      });

      const pollData = await pollRes.json();

      if (pollData.error) {
        throw new Error(pollData.error.message || "Video generation failed");
      }

      if (pollData.status === "succeeded") {
        videoUrl = pollData.content?.video_url || pollData.video_url || pollData.url;
        break;
      }

      if (pollData.status === "failed") {
        throw new Error(pollData.error || "Video generation failed");
      }
    }

    if (!videoUrl) {
      throw new Error("Video generation timed out (5 minutes)");
    }

    updateAssetStatus(id, "completed", videoUrl);

    return {
      ...result, url: videoUrl, status: "completed",
      metadata: { duration, modelName: "CogVideoX Flash" },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Video generation failed";
    updateAssetStatus(id, "failed", undefined, errorMsg);
    return { ...result, status: "failed", error: errorMsg };
  }
}

export function getGeneratedAssets(tenantId: string, type?: "image" | "video", limit: number = 50): MediaGenerationResult[] {
  const db = getDb();
  const query = type
    ? `SELECT * FROM generated_assets WHERE organization_id = ? AND type = ? ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM generated_assets WHERE organization_id = ? ORDER BY created_at DESC LIMIT ?`;
  const params = type ? [tenantId, type, limit] : [tenantId, limit];
  const rows = db.prepare(query).all(...params) as any[];

  return rows.map((row) => ({
    id: row.id, type: row.type, url: row.url || "", prompt: row.prompt,
    model: row.model || "", provider: row.provider || "", status: row.status,
    metadata: JSON.parse(row.metadata || "{}"),
  }));
}

export function getGeneratedAssetById(tenantId: string, id: string): MediaGenerationResult | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM generated_assets WHERE id = ? AND organization_id = ?").get(id, tenantId) as any;
  if (!row) return null;
  return {
    id: row.id, type: row.type, url: row.url || "", prompt: row.prompt,
    model: row.model || "", provider: row.provider || "", status: row.status,
    metadata: JSON.parse(row.metadata || "{}"),
  };
}

export function deleteGeneratedAsset(tenantId: string, id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM generated_assets WHERE id = ? AND organization_id = ?").run(id, tenantId);
  return result.changes > 0;
}

export function getMediaStats(tenantId: string): { totalImages: number; totalVideos: number; completedImages: number; completedVideos: number } {
  const db = getDb();
  const imageStats = db.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM generated_assets WHERE organization_id = ? AND type = 'image'
  `).get(tenantId) as any;
  const videoStats = db.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM generated_assets WHERE organization_id = ? AND type = 'video'
  `).get(tenantId) as any;
  return {
    totalImages: imageStats?.total || 0, totalVideos: videoStats?.total || 0,
    completedImages: imageStats?.completed || 0, completedVideos: videoStats?.completed || 0,
  };
}
