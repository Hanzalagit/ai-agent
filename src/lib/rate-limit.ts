type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
};

const store = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60_000);

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  chat: { windowMs: 60_000, maxRequests: 20 },
  login: { windowMs: 600_000, maxRequests: 5 },
  register: { windowMs: 3_600_000, maxRequests: 3 },
  api: { windowMs: 60_000, maxRequests: 60 },
  image: { windowMs: 60_000, maxRequests: 10 },
  video: { windowMs: 60_000, maxRequests: 5 },
  search: { windowMs: 60_000, maxRequests: 30 },
};

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

export function createRateLimitKey(ip: string, endpoint: string, orgId?: string): string {
  return `rl:${endpoint}:${orgId || ip}`;
}
