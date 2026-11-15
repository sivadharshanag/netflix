import rateLimit from "express-rate-limit";

/**
 * A factory, not a shared singleton: each call gets its own in-memory store.
 * This matters for tests that build multiple app instances in the same
 * process (and is harmless in production, where only one app is ever built).
 */
export function createLoginRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many attempts. Please try again later." },
    skipSuccessfulRequests: true,
  });
}
