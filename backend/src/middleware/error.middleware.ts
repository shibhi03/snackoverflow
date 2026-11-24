import { Request, Response, NextFunction } from "express"
import { Prisma } from "@prisma/client"
import { AppError } from "../utils/errors.js"
import { config } from "../config/env.js"

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. Handled Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    })
    return
  }

  // 2. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002": {
        const target = (err.meta?.target as string[])?.join(", ") || "field"
        res.status(409).json({
          error: {
            code: "DUPLICATE_RESOURCE",
            message: `A record with this ${target} already exists.`,
          },
        })
        return
      }
      case "P2025": {
        res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "Target resource not found.",
          },
        })
        return
      }
      case "P2003": {
        res.status(409).json({
          error: {
            code: "FOREIGN_KEY_RESTRICTED",
            message:
              "Operation violates referential integrity or is restricted by related records.",
          },
        })
        return
      }
      default:
        break
    }
  }

  // 3. PostgreSQL Raw Query Errors (e.g. from atomic queries or CHECK constraint violations)
  if ("code" in err && typeof (err as any).code === "string") {
    const pgCode = (err as any).code
    if (pgCode === "23514") {
      // CHECK constraint violation
      res.status(400).json({
        error: {
          code: "CHECK_CONSTRAINT_VIOLATION",
          message:
            "Operation violates database integrity rules (e.g. non-negative stock or positive amount).",
        },
      })
      return
    }
    if (pgCode === "23505") {
      // Unique violation
      res.status(409).json({
        error: {
          code: "DUPLICATE_RESOURCE",
          message: "Duplicate entry violates unique constraint.",
        },
      })
      return
    }
    if (pgCode === "23503") {
      // Foreign key restrict violation
      res.status(409).json({
        error: {
          code: "RESTRICTED_OPERATION",
          message: "Cannot delete record with dependent activity history.",
        },
      })
      return
    }
  }

  // 4. JSON body parse error
  if (err instanceof SyntaxError && "status" in err && (err as any).status === 400) {
    res.status(400).json({
      error: {
        code: "MALFORMED_JSON",
        message: "Malformed request JSON payload.",
      },
    })
    return
  }

  // 5. Unhandled Server Error (Logged server-side, sanitized to client)
  if (config.nodeEnv !== "test") {
    console.error("[Unhandled Server Error]:", err)
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected internal error occurred on the server.",
    },
  })
}
