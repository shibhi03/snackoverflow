import { Router } from "express"
import { eventsController } from "../controllers/events.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"

export const eventsRouter = Router()

// GET /api/events - Authenticated SSE stream for inventory & voting real-time updates
eventsRouter.get("/", authenticate, (req, res) => eventsController.subscribe(req, res))
