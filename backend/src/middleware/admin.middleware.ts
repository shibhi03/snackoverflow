import { Request, Response, NextFunction } from "express"
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js"

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new UnauthorizedError("Authentication required."))
    return
  }

  if (req.user.role !== "ADMIN") {
    next(new ForbiddenError("Administrative privileges required for this operation."))
    return
  }

  next()
}
