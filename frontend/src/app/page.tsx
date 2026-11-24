"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../context/AuthContext"
import { Loader2 } from "lucide-react"

export default function RootPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        if (user.role === "ADMIN") {
          router.replace("/dashboard")
        } else {
          router.replace("/snacks")
        }
      } else {
        router.replace("/login")
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-pantry-bg">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-coral animate-spin" />
        <p className="text-xs font-bold text-pantry-text uppercase tracking-widest">
          Loading Snack Overflow...
        </p>
      </div>
    </div>
  )
}
