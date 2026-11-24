import { Request, Response, NextFunction } from "express"
import crypto from "crypto"
import { ForbiddenError } from "../utils/errors.js"
import { config } from "../config/env.js"

/**
 * Generates a cryptographically random CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString("hex")
}

/**
 * Validates Origin and CSRF Token on all mutating HTTP requests (POST, PUT, PATCH, DELETE).
 */
export function verifyCsrf(req: Request, _res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase()

  // Safe read-only HTTP methods do not require CSRF token validation
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return next()
  }

  // 1. Origin & Referer Validation
  const origin = req.headers.origin
  const referer = req.headers.referer

  if (origin && !config.allowedOrigins.includes(origin)) {
    return next(
      new ForbiddenError(
        "Cross-Origin request blocked. Origin mismatch.",
        "CSRF_ORIGIN_INVALID",
      ),
    )
  }

  if (referer && !config.allowedOrigins.some((allowed) => referer.startsWith(allowed))) {
    return next(
      new ForbiddenError(
        "Cross-Origin request blocked. Referer mismatch.",
        "CSRF_REFERER_INVALID",
      ),
    )
  }

  // 2. Synchronizer CSRF Token Validation
  // Check header 'x-csrf-token' against cookie 'snack_csrf'
  const headerToken =
    (req.headers["x-csrf-token"] as string) || (req.headers["x-xsrf-token"] as string)
  const cookieToken = req.cookies?.[config.csrfCookieName]
  const hasSessionCookie = Boolean(req.cookies?.[config.cookieName])

  // When cookie credentials are present or in production, CSRF validation is strictly required
  if (hasSessionCookie || cookieToken || config.nodeEnv === "production") {
    if (!cookieToken || !headerToken) {
      return next(
        new ForbiddenError(
          "CSRF token missing from request header or cookie.",
          "CSRF_TOKEN_MISSING",
        ),
      )
    }
  }

  if (cookieToken && headerToken) {
    try {
      // Use constant-time comparison to prevent timing attacks
      const cookieBuf = Buffer.from(cookieToken)
      const headerBuf = Buffer.from(headerToken)

      if (
        cookieBuf.length !== headerBuf.length ||
        !crypto.timingSafeEqual(cookieBuf, headerBuf)
      ) {
        return next(new ForbiddenError("Invalid CSRF token.", "CSRF_TOKEN_INVALID"))
      }
    } catch {
      return next(new ForbiddenError("Invalid CSRF token format.", "CSRF_TOKEN_INVALID"))
    }
  }

  next()
}
