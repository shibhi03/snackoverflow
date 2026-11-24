"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../../context/AuthContext"
import { Header } from "./Header"
import { BasketDrawer } from "../basket/BasketDrawer"
import { useRealtimeEvents } from "../../hooks/useRealtimeEvents"
import { Loader2 } from "lucide-react"

interface AppShellProps {
  children: React.ReactNode
  requireAdmin?: boolean
  requireMember?: boolean
}

export function AppShell({
  children,
  requireAdmin = false,
  requireMember = false,
}: AppShellProps) {
  const { user, isLoading, isAdmin } = useAuth()
  const router = useRouter()

  useRealtimeEvents()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (!isLoading && user) {
      if (requireAdmin && !isAdmin) {
        router.replace("/snacks")
      } else if (requireMember && isAdmin) {
        router.replace("/dashboard")
      }
    }
  }, [user, isLoading, requireAdmin, requireMember, isAdmin, router])

  if (isLoading || !user || (requireAdmin && !isAdmin) || (requireMember && isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center ordan-mesh-bg">
        <div className="flex flex-col items-center gap-4 ordan-card rounded-4xl px-8 py-6">
          <Loader2 className="w-7 h-7 text-coral animate-spin" />
          <p className="text-xs font-semibold text-pantry-text uppercase tracking-[0.2em]">
            Loading Snack Overflow
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-pantry-bg transition-colors relative overflow-x-clip">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {children}
      </main>

      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="ordan-divider mb-6" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-pantry-muted">
          <span className="font-semibold text-pantry-text">
            Snack<span className="text-coral">Overflow</span>
          </span>
          <span>Concurrency-safe office pantry tracker</span>
        </div>
      </footer>

      <BasketDrawer />
    </div>
  )
}
