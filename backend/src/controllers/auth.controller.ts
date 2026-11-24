import { Request, Response, NextFunction } from "express"
import { authService } from "../services/auth.service.js"
import { generateCsrfToken } from "../middleware/csrf.middleware.js"
import { config } from "../config/env.js"

export class AuthController {
  /**
   * Issues a session-bound CSRF token for mutating requests.
   */
  async getCsrfToken(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const csrfToken = generateCsrfToken()

      // Set cookie readable by frontend / client for synchronizer pattern
      res.cookie(config.csrfCookieName, csrfToken, {
        httpOnly: false, // Readable by client JS so it can send X-CSRF-Token header
        secure: config.cookieSecure,
        sameSite: "lax",
        path: "/",
        maxAge: config.sessionMaxAgeMs,
      })

      res.status(200).json({ csrfToken })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Logs in user, creates server-side session, sets secure HTTP-only session cookie.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body
      const userAgent = req.headers["user-agent"]
      const ipAddress = req.ip || req.socket.remoteAddress

      const { user, rawToken, expiresAt } = await authService.login(
        email,
        password,
        userAgent,
        ipAddress,
      )

      // Set HTTP-only session cookie containing high-entropy raw token
      res.cookie(config.cookieName, rawToken, {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      })

      // Also ensure CSRF token is refreshed
      const csrfToken = generateCsrfToken()
      res.cookie(config.csrfCookieName, csrfToken, {
        httpOnly: false,
        secure: config.cookieSecure,
        sameSite: "lax",
        path: "/",
        expires: expiresAt,
      })

      res.status(200).json({
        user,
        csrfToken,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Revokes session in PostgreSQL and clears authentication cookies.
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let rawToken = req.cookies?.[config.cookieName]
      if (!rawToken && req.headers.authorization?.startsWith("Bearer ")) {
        rawToken = req.headers.authorization.slice(7).trim()
      }
      await authService.logout(rawToken)

      res.clearCookie(config.cookieName, {
        httpOnly: true,
        secure: config.cookieSecure,
        sameSite: "lax",
        path: "/",
      })

      res.clearCookie(config.csrfCookieName, {
        path: "/",
      })

      res.status(200).json({
        message: "Successfully logged out and session revoked.",
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Returns authenticated user profile.
   */
  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getCurrentUser(req.user!.id)
      res.status(200).json({ user })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Registers a new Member account (Public).
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body
      const user = await authService.register(name, email, password)

      res.status(201).json({
        message: "Account created successfully. You can now sign in.",
        user,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Checks whether public registration is open or disabled.
   */
  async getRegistrationStatus(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const enabled = authService.isRegistrationEnabled()
      res.status(200).json({ registrationEnabled: enabled })
    } catch (error) {
      next(error)
    }
  }
}

export const authController = new AuthController()
