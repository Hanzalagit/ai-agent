// In-memory rate limiter (can be upgraded to Redis later)

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60_000);

// Default rate limits for different endpoints
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Chat API: 20 requests per minute
  chat: { windowMs: 60_000, maxRequests: 20 },
  // Login: 5 attempts per 10 minutes
  login: { windowMs: 600_000, maxRequests: 5 },
  // Register: 3 attempts per hour
  register: { windowMs: 3_600_000, maxRequests: 3 },
  // General API: 60 requests per minute
  api: { windowMs: 60_000, maxRequests: 60 },
  // Image generation: 10 per minute
  image: { windowMs: 60_000, maxRequests: 10 },
  // Video generation: 5 per minute
  video: { windowMs: 60_000, maxRequests: 5 },
  // Web search: 30 per minute
  search: { windowMs: 60_000, maxRequests: 30 },
};

// Backward-compatible version: checkRateLimit(key) with default chat limit
export function checkRateLimit(
  key: string,
  config?: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number } {
  if (!config) {
    config = RATE_LIMITS.chat;
  }
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New window
    store.set(key, {
      count: 1,
      resetAt: now + config!.windowMs,
    });
    return {
      allowed: true,
      remaining: config!.maxRequests - 1,
      resetAt: now + config!.windowMs,
      retryAfter: Math.ceil(config!.windowMs / 1000),
    };
  }

  if (entry.count >= config!.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config!.maxRequests - entry.count,
    resetAt: entry.resetAt,
    retryAfter: Math.ceil((entry.resetAt - now) / 1000),
  };
}

export function getRateLimitHeaders(
  result: ReturnType<typeof checkRateLimit>
): Record<string, string> {
  return {
    "X-RateLimit-Limited": result.allowed ? "false" : "true",
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

// Helper to get client IP
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

// Create rate limit key from IP + endpoint
export function createRateLimitKey(ip: string, endpoint: string, orgId?: string): string {
  return `rl:${endpoint}:${orgId || ip}`;
}
