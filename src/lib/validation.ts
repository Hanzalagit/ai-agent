import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10000),
  image: z.string().optional(),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(100),
});

export const HealthCheckSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string(),
  version: z.string(),
  uptime: z.number(),
  checks: z.object({
    gemini: z.boolean(),
    search: z.boolean(),
    database: z.boolean(),
  }),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  PUBLIC_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ENABLE_LIVE_SEARCH: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SEARCH_PROVIDER: z
    .enum(["serper", "brave", "tavily"])
    .default("serper"),
  SERPER_API_KEY: z.string().optional(),
  BRAVE_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  LOCAL_AGENT_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  ENABLE_SHELL_COMMANDS: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  SHOPIFY_STORE_DOMAIN: z.string().optional(),
  SHOPIFY_ADMIN_API_TOKEN: z.string().optional(),
  SHOPIFY_API_VERSION: z.string().default("2025-01"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues
        .filter((i) => i.code === "too_small")
        .map((i) => i.path.join("."));
      if (missing.length > 0) {
        console.error(`Missing required env vars: ${missing.join(", ")}`);
      }
    }
    cachedEnv = envSchema.parse({
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
      GEMINI_MODEL: process.env.GEMINI_MODEL,
      PUBLIC_MODE: process.env.PUBLIC_MODE,
      ENABLE_LIVE_SEARCH: process.env.ENABLE_LIVE_SEARCH,
      SEARCH_PROVIDER: process.env.SEARCH_PROVIDER,
      LOCAL_AGENT_ENABLED: process.env.LOCAL_AGENT_ENABLED,
      ENABLE_SHELL_COMMANDS: process.env.ENABLE_SHELL_COMMANDS,
      SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION,
    });
    return cachedEnv;
  }
}

/**
 * Sanitize user input to prevent injection attacks.
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

/**
 * Validate and sanitize a URL.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Check if a URL is safe (not pointing to local/private addresses).
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      return false;
    }

    if (parsed.protocol === "file:") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
