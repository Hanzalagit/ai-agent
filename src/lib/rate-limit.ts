type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60000); // Clean every minute

export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60000, // 1 minute
};

/**
 * Check if a request is rate-limited.
 * Returns { allowed: true } if OK, or { allowed: false, retryAfter } if limited.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { allowed: true };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count += 1;
  return { allowed: true };
}

/**
 * Get rate limit status for an identifier.
 */
export function getRateLimitStatus(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { remaining: number; resetAt: number } {
  const entry = rateLimitMap.get(identifier);
  const now = Date.now();

  if (!entry || now > entry.resetAt) {
    return { remaining: config.maxRequests, resetAt: now + config.windowMs };
  }

  return {
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for an identifier (useful for testing).
 */
export function resetRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}
