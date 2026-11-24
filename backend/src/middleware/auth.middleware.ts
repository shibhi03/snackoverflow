import { Request, Response, NextFunction } from "express"
import { prisma } from "../config/database.js"
import { config } from "../config/env.js"
import { hashToken } from "../utils/session.js"
import { UnauthorizedError } from "../utils/errors.js"

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // 1. Extract raw token from cookie or Authorization header (for testing convenience)
    let rawToken = req.cookies?.[config.cookieName]

    if (!rawToken && req.headers.authorization?.startsWith("Bearer ")) {
      rawToken = req.headers.authorization.slice(7).trim()
    }

    if (!rawToken) {
      throw new UnauthorizedError("Authentication required. No session token provided.")
    }

    // 2. Compute SHA-256 hash
    const tokenHash = hashToken(rawToken)

    // 3. Look up active session in PostgreSQL
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    })

    if (!session) {
      throw new UnauthorizedError("Invalid or expired session. Please log in.")
    }

    if (session.revokedAt !== null) {
      throw new UnauthorizedError("Session has been revoked. Please log in again.")
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError("Session has expired. Please log in again.")
    }

    // 4. Attach user context to request
    req.user = session.user
    req.sessionId = session.id

    next()
  } catch (error) {
    next(error)
  }
}
