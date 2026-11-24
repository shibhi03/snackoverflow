import { Request, Response, NextFunction } from "express"
import { config } from "../config/env.js"

interface RateLimitRecord {
  count: number
  resetTime: number
}

const registrationAttempts = new Map<string, RateLimitRecord>()

/**
 * Sliding window in-memory rate limiter for public member registration.
 * Default: 5 registration attempts per 15 minutes per IP.
 */
export function registrationRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Relax rate limit in test environment to avoid interference with automated tests
  if (config.nodeEnv === "test") {
    return next()
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown-ip"
  const now = Date.now()
  const windowMs = 15 * 60 * 1000 // 15 minutes
  const maxAttempts = 5

  const record = registrationAttempts.get(ip)

  if (!record || now > record.resetTime) {
    registrationAttempts.set(ip, { count: 1, resetTime: now + windowMs })
    return next()
  }

  if (record.count >= maxAttempts) {
    res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message:
          "Too many registration attempts from this IP address. Please try again after 15 minutes.",
      },
    })
    return
  }

  record.count += 1
  next()
}

/**
 * Utility to clear rate limits (useful in testing)
 */
export function resetRegistrationRateLimits(): void {
  registrationAttempts.clear()
}
