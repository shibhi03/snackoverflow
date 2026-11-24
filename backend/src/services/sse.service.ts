import { Response, Request } from "express"

export type SseEventType =
  | "CONNECTED"
  | "HEARTBEAT"
  | "SNACK_CREATED"
  | "SNACK_UPDATED"
  | "SNACK_DELETED"
  | "SNACK_RESTOCKED"
  | "SNACK_CONSUMED"
  | "BASKET_CONSUMED"
  | "VOTE_ADDED"
  | "VOTE_REMOVED"

export interface SseEvent {
  type: SseEventType
  snackId?: string
  snackIds?: string[]
  timestamp: string
}

interface SseClient {
  id: string
  res: Response
  userId: string
}

export class SseService {
  private clients: Map<string, SseClient> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startHeartbeat()
  }

  /**
   * Registers a new authenticated SSE client stream.
   */
  addClient(req: Request, res: Response, userId: string): string {
    const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

    // Set standard SSE streaming response headers
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache, no-transform")
    res.setHeader("Connection", "keep-alive")
    res.setHeader("X-Accel-Buffering", "no") // Disable Nginx reverse-proxy buffering
    res.flushHeaders?.()

    const client: SseClient = {
      id: clientId,
      res,
      userId,
    }

    this.clients.set(clientId, client)

    // Send initial connection acknowledgement event
    this.sendToClient(client, {
      type: "CONNECTED",
      timestamp: new Date().toISOString(),
    })

    // Cleanup client on socket close or abort
    req.on("close", () => {
      this.removeClient(clientId)
    })

    req.on("error", () => {
      this.removeClient(clientId)
    })

    return clientId
  }

  /**
   * Removes a disconnected client from the active subscription set.
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId)
    if (client) {
      try {
        if (!client.res.writableEnded) {
          client.res.end()
        }
      } catch {
        // Ignore socket teardown errors
      }
      this.clients.delete(clientId)
    }
  }

  /**
   * Broadcasts a real-time event to all connected authenticated clients.
   * Payloads are strictly sanitized: only event type, relevant snackId(s), and timestamp.
   */
  broadcast(event: SseEvent): void {
    const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`

    for (const [clientId, client] of this.clients.entries()) {
      try {
        if (client.res.writableEnded || client.res.destroyed) {
          this.clients.delete(clientId)
          continue
        }
        client.res.write(payload)
      } catch {
        this.clients.delete(clientId)
      }
    }
  }

  /**
   * Returns total active connected clients.
   */
  getClientCount(): number {
    return this.clients.size
  }

  /**
   * Closes all active client connections (for testing and teardown).
   */
  closeAll(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    for (const client of this.clients.values()) {
      try {
        client.res.end()
      } catch {
        // Ignore
      }
    }
    this.clients.clear()
  }

  /**
   * Periodically emits a heartbeat ping to keep intermediate reverse proxies and browsers alive.
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) return

    // Send heartbeat every 20 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.clients.size === 0) return

      const heartbeat = `: heartbeat ${new Date().toISOString()}\n\n`
      for (const [clientId, client] of this.clients.entries()) {
        try {
          if (client.res.writableEnded || client.res.destroyed) {
            this.clients.delete(clientId)
            continue
          }
          client.res.write(heartbeat)
        } catch {
          this.clients.delete(clientId)
        }
      }
    }, 20000)

    // Unref so heartbeat interval does not prevent Node process from exiting
    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref()
    }
  }

  private sendToClient(client: SseClient, event: SseEvent): void {
    try {
      const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
      client.res.write(payload)
    } catch {
      this.clients.delete(client.id)
    }
  }
}

export const sseService = new SseService()
