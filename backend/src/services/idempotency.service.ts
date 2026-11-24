import crypto from "crypto"
import { prisma } from "../config/database.js"
import { ConflictError, BadRequestError } from "../utils/errors.js"
import { Prisma } from "@prisma/client"

export interface IdempotentResult<T> {
  statusCode: number
  data: T
  replayed: boolean
}

export class IdempotencyService {
  /**
   * Generates a deterministic SHA-256 hash of the canonical request (operation + sorted payload).
   */
  computeRequestHash(operation: string, payload: unknown): string {
    const canonicalPayload = this.canonicalize(payload)
    const content = `${operation.toUpperCase()}:${canonicalPayload}`
    return crypto.createHash("sha256").update(content).digest("hex")
  }

  /**
   * Recursively sorts object keys for canonical serialization.
   */
  private canonicalize(obj: unknown): string {
    if (obj === null || typeof obj !== "object") {
      return JSON.stringify(obj)
    }
    if (Array.isArray(obj)) {
      return "[" + obj.map((item) => this.canonicalize(item)).join(",") + "]"
    }
    const keys = Object.keys(obj as Record<string, unknown>).sort()
    const sortedEntries = keys.map(
      (k) =>
        `${JSON.stringify(k)}:${this.canonicalize((obj as Record<string, unknown>)[k])}`,
    )
    return "{" + sortedEntries.join(",") + "}"
  }

  /**
   * Coordinates request execution with PostgreSQL-backed idempotency tracking.
   * If key is omitted, executes operation directly.
   */
  async executeIdempotent<T>(
    key: string | undefined,
    userId: string,
    operation: string,
    payload: unknown,
    executor: () => Promise<{ statusCode: number; data: T }>,
  ): Promise<IdempotentResult<T>> {
    // 1. If no key is provided, execute standard operation (backwards compatible)
    if (!key || !key.trim()) {
      const res = await executor()
      return {
        statusCode: res.statusCode,
        data: res.data,
        replayed: false,
      }
    }

    const trimmedKey = key.trim()
    if (trimmedKey.length > 255) {
      throw new BadRequestError("Idempotency-Key header cannot exceed 255 characters.")
    }

    const requestHash = this.computeRequestHash(operation, payload)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24-hour expiration

    // 2. Try to reserve idempotency slot as PROCESSING
    let recordId: string | null = null
    try {
      const created = await prisma.idempotencyKey.create({
        data: {
          key: trimmedKey,
          userId,
          operation,
          requestHash,
          status: "PROCESSING",
          expiresAt,
        },
      })
      recordId = created.id
    } catch (err: unknown) {
      // Unique constraint violation: Key already exists for this user
      if (
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") ||
        (err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "23505")
      ) {
        // Retrieve existing record
        const existing = await prisma.idempotencyKey.findUnique({
          where: {
            unique_user_idempotency_key: {
              userId,
              key: trimmedKey,
            },
          },
        })

        if (!existing) {
          throw new ConflictError(
            "Concurrent idempotency request collision. Please retry.",
          )
        }

        // Validate payload match
        if (existing.requestHash !== requestHash) {
          throw new ConflictError(
            "Idempotency key reuse with different request payload.",
            "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
          )
        }

        // If completed, return cached response
        if (existing.status === "COMPLETED" && existing.responseBody) {
          return {
            statusCode: existing.statusCode || 200,
            data: JSON.parse(existing.responseBody) as T,
            replayed: true,
          }
        }

        // If currently PROCESSING, await resolution (up to 4 seconds)
        if (existing.status === "PROCESSING") {
          const resolved = await this.awaitInFlightRequest<T>(
            userId,
            trimmedKey,
            requestHash,
          )
          if (resolved) {
            return resolved
          }
          throw new ConflictError(
            "A request with this Idempotency-Key is currently being processed.",
            "IDEMPOTENCY_KEY_IN_PROGRESS",
          )
        }

        // If previous attempt failed, remove stale record so retry can execute
        if (existing.status === "FAILED") {
          await prisma.idempotencyKey
            .delete({
              where: { id: existing.id },
            })
            .catch(() => {})
          // Retry self recursively now that failed lock is removed
          return this.executeIdempotent(trimmedKey, userId, operation, payload, executor)
        }
      }
      throw err
    }

    // 3. Execute the actual inventory mutation
    try {
      const res = await executor()

      // 4. Update idempotency record to COMPLETED with response payload
      await prisma.idempotencyKey.update({
        where: { id: recordId },
        data: {
          status: "COMPLETED",
          statusCode: res.statusCode,
          responseBody: JSON.stringify(res.data),
          updatedAt: new Date(),
        },
      })

      return {
        statusCode: res.statusCode,
        data: res.data,
        replayed: false,
      }
    } catch (execError) {
      // 5. On failure, remove the PROCESSING record so retry is permitted
      if (recordId) {
        await prisma.idempotencyKey
          .delete({
            where: { id: recordId },
          })
          .catch(() => {})
      }
      throw execError
    }
  }

  /**
   * Polls for completion of a concurrent in-flight request with the same idempotency key.
   */
  private async awaitInFlightRequest<T>(
    userId: string,
    key: string,
    expectedHash: string,
  ): Promise<IdempotentResult<T> | null> {
    const maxWaitMs = 4000
    const intervalMs = 150
    const start = Date.now()

    while (Date.now() - start < maxWaitMs) {
      await new Promise((r) => setTimeout(r, intervalMs))

      const poll = await prisma.idempotencyKey.findUnique({
        where: {
          unique_user_idempotency_key: {
            userId,
            key,
          },
        },
      })

      if (!poll) {
        return null
      }

      if (poll.requestHash !== expectedHash) {
        throw new ConflictError(
          "Idempotency key reuse with different request payload.",
          "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH",
        )
      }

      if (poll.status === "COMPLETED" && poll.responseBody) {
        return {
          statusCode: poll.statusCode || 200,
          data: JSON.parse(poll.responseBody) as T,
          replayed: true,
        }
      }

      if (poll.status === "FAILED") {
        return null
      }
    }

    return null
  }
}

export const idempotencyService = new IdempotencyService()
