import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const startTime = Date.now();

export async function GET() {
  const checks = {
    gemini: false,
    search: false,
    database: true,
  };

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { method: "GET", signal: AbortSignal.timeout(5000) }
      );
      checks.gemini = res.ok;
    }
  } catch {
    checks.gemini = false;
  }

  try {
    if (process.env.ENABLE_LIVE_SEARCH === "true") {
      const provider = process.env.SEARCH_PROVIDER || "serper";
      if (provider === "serper" && process.env.SERPER_API_KEY) {
        checks.search = true;
      } else if (provider === "brave" && process.env.BRAVE_API_KEY) {
        checks.search = true;
      } else if (provider === "tavily" && process.env.TAVILY_API_KEY) {
        checks.search = true;
      }
    } else {
      checks.search = true;
    }
  } catch {
    checks.search = false;
  }

  const allHealthy = checks.gemini && checks.search && checks.database;
  const anyHealthy = checks.gemini || checks.database;

  const status = allHealthy ? "healthy" : anyHealthy ? "degraded" : "unhealthy";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
      environment: {
        publicMode: process.env.PUBLIC_MODE === "true",
        liveSearch: process.env.ENABLE_LIVE_SEARCH === "true",
        model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      },
    },
    {
      status: status === "unhealthy" ? 503 : 200,
      headers: {
        "Cache-Control": "no-cache, no-store",
      },
    }
  );
}
