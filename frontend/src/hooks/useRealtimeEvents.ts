"use client"

import { useEffect, useState, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "../context/AuthContext"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

export function useRealtimeEvents() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Only connect if user is authenticated in browser environment
    if (!user || typeof window === "undefined") {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
        setIsConnected(false)
      }
      return
    }

    const eventsUrl = `${API_BASE_URL}/events`
    const eventSource = new EventSource(eventsUrl, { withCredentials: true })
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      // Browser EventSource automatically attempts to reconnect on transient errors
    }

    // Generic invalidation helper for inventory & voting changes
    const handleInvalidation = (invalidateActivity = false) => {
      queryClient.invalidateQueries({ queryKey: ["snacks"] })
      queryClient.invalidateQueries({ queryKey: ["summary"] })
      queryClient.invalidateQueries({ queryKey: ["favourites"] })
      if (invalidateActivity) {
        queryClient.invalidateQueries({ queryKey: ["activities"] })
        queryClient.invalidateQueries({ queryKey: ["my-activities"] })
      }
    }

    // Specific event listeners
    eventSource.addEventListener("SNACK_CREATED", () => handleInvalidation())
    eventSource.addEventListener("SNACK_UPDATED", () => handleInvalidation())
    eventSource.addEventListener("SNACK_DELETED", () => handleInvalidation())
    eventSource.addEventListener("SNACK_RESTOCKED", () => handleInvalidation(true))
    eventSource.addEventListener("SNACK_CONSUMED", () => handleInvalidation(true))
    eventSource.addEventListener("BASKET_CONSUMED", () => handleInvalidation(true))
    eventSource.addEventListener("VOTE_ADDED", () => handleInvalidation())
    eventSource.addEventListener("VOTE_REMOVED", () => handleInvalidation())

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [user, queryClient])

  return { isConnected }
}
