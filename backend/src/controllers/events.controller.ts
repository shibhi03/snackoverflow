import { Request, Response } from "express"
import { sseService } from "../services/sse.service.js"

export class EventsController {
  /**
   * Establishes a persistent Server-Sent Events stream for authenticated users.
   */
  subscribe(req: Request, res: Response): void {
    const userId = req.user!.id
    sseService.addClient(req, res, userId)
  }
}

export const eventsController = new EventsController()
