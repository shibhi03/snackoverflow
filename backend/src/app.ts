import express, { Express, Request, Response } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { apiRouter } from "./routes/index.js"
import { errorHandler } from "./middleware/error.middleware.js"
import { config } from "./config/env.js"

export function createApp(): Express {
  const app = express()

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: config.allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-CSRF-Token",
        "X-Requested-With",
        "Idempotency-Key",
      ],
      exposedHeaders: ["Idempotency-Key", "Idempotency-Replayed"],
    }),
  )

  // Parsers
  app.use(cookieParser())
  app.use(express.json())

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() })
  })

  // REST API Routes
  app.use("/api", apiRouter)

  // Centralized Error Handler (Must be registered after routes)
  app.use(errorHandler)

  return app
}

export default createApp
