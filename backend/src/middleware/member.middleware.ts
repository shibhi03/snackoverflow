import { Request, Response, NextFunction } from "express"
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js"

/**
 * Enforces that only pantry consumers (MEMBER role) can execute member-specific
 * operations such as multi-snack basket consumption and personal history viewing.
 * Under this product policy, Administrators manage the pantry rather than consume from it.
 */
export function requireMember(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError("Authentication required."))
    return
  }

  if (req.user.role !== "MEMBER") {
    next(
      new ForbiddenError(
        "Only office pantry members can perform snack consumption operations.",
        "MEMBER_ROLE_REQUIRED",
      ),
    )
    return
  }

  next()
}
