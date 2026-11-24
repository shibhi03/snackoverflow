import { Request, Response, NextFunction } from "express"
import { snackService } from "../services/snack.service.js"
import { voteService } from "../services/vote.service.js"
import { summaryService } from "../services/summary.service.js"
import { idempotencyService } from "../services/idempotency.service.js"
import { sseService } from "../services/sse.service.js"

export class SnackController {
  async listSnacks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await snackService.listSnacks(req.query as any, req.user?.id)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  async getSnackById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const snack = await snackService.getSnackById(req.params.id, req.user?.id)
      res.status(200).json(snack)
    } catch (error) {
      next(error)
    }
  }

  async createSnack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const snack = await snackService.createSnack(req.body)
      sseService.broadcast({
        type: "SNACK_CREATED",
        snackId: snack.id,
        timestamp: new Date().toISOString(),
      })
      res.status(201).json(snack)
    } catch (error) {
      next(error)
    }
  }

  async updateSnack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const snack = await snackService.updateSnack(req.params.id, req.body)
      sseService.broadcast({
        type: "SNACK_UPDATED",
        snackId: snack.id,
        timestamp: new Date().toISOString(),
      })
      res.status(200).json(snack)
    } catch (error) {
      next(error)
    }
  }

  async deleteSnack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await snackService.deleteSnack(req.params.id)
      sseService.broadcast({
        type: "SNACK_DELETED",
        snackId: req.params.id,
        timestamp: new Date().toISOString(),
      })
      res.status(200).json({ message: "Snack deleted successfully." })
    } catch (error) {
      next(error)
    }
  }

  async consumeSnack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { amount } = req.body
      const idempotencyKey = (req.headers["idempotency-key"] as string) || undefined
      const snackId = req.params.id
      const userId = req.user!.id

      const result = await idempotencyService.executeIdempotent(
        idempotencyKey,
        userId,
        "CONSUME_SNACK",
        { snackId, amount },
        async () => {
          const consumeResult = await snackService.consumeSnack(snackId, amount, userId)
          return {
            statusCode: 200,
            data: {
              message: "Snack consumed successfully.",
              snack: consumeResult.snack,
              consumedAmount: consumeResult.consumedAmount,
            },
          }
        },
      )

      // Broadcast real-time inventory event only on actual execution (not cache replay)
      if (!result.replayed) {
        sseService.broadcast({
          type: "SNACK_CONSUMED",
          snackId,
          timestamp: new Date().toISOString(),
        })
      }

      res.setHeader("Idempotency-Replayed", result.replayed ? "true" : "false")
      res.status(result.statusCode).json(result.data)
    } catch (error) {
      next(error)
    }
  }

  async consumeBasket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { items } = req.body
      const idempotencyKey = (req.headers["idempotency-key"] as string) || undefined
      const userId = req.user!.id

      const result = await idempotencyService.executeIdempotent(
        idempotencyKey,
        userId,
        "CONSUME_BASKET",
        { items },
        async () => {
          const basketResult = await snackService.consumeBasket(items, userId)
          return {
            statusCode: 200,
            data: basketResult,
          }
        },
      )

      // Broadcast real-time inventory event only on actual execution (not cache replay)
      if (!result.replayed) {
        sseService.broadcast({
          type: "BASKET_CONSUMED",
          snackIds: items.map((i: any) => i.snackId),
          timestamp: new Date().toISOString(),
        })
      }

      res.setHeader("Idempotency-Replayed", result.replayed ? "true" : "false")
      res.status(result.statusCode).json(result.data)
    } catch (error) {
      next(error)
    }
  }

  async listFavourites(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = { ...(req.query as any), onlyFavourites: true }
      const result = await snackService.listSnacks(query, req.user!.id)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  async restockSnack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { amount } = req.body
      const result = await snackService.restockSnack(req.params.id, amount, req.user!.id)
      sseService.broadcast({
        type: "SNACK_RESTOCKED",
        snackId: req.params.id,
        timestamp: new Date().toISOString(),
      })
      res.status(200).json({
        message: "Snack restocked successfully.",
        snack: result.snack,
        restockedAmount: result.restockedAmount,
      })
    } catch (error) {
      next(error)
    }
  }

  async vote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await voteService.castVote(req.params.id, req.user!.id)
      sseService.broadcast({
        type: "VOTE_ADDED",
        snackId: req.params.id,
        timestamp: new Date().toISOString(),
      })
      res.status(201).json({
        message: "Vote recorded successfully.",
        voteCount: result.voteCount,
        hasVoted: result.hasVoted,
      })
    } catch (error) {
      next(error)
    }
  }

  async unvote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await voteService.removeVote(req.params.id, req.user!.id)
      sseService.broadcast({
        type: "VOTE_REMOVED",
        snackId: req.params.id,
        timestamp: new Date().toISOString(),
      })
      res.status(200).json({
        message: "Vote removed successfully.",
        voteCount: result.voteCount,
        hasVoted: result.hasVoted,
      })
    } catch (error) {
      next(error)
    }
  }

  async getSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await summaryService.getDashboardSummary()
      res.status(200).json(summary)
    } catch (error) {
      next(error)
    }
  }
}

export const snackController = new SnackController()
