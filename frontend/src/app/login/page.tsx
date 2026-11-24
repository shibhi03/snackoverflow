"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { Button } from "../../components/ui/Button"
import { Input } from "../../components/ui/Input"
import { ThemeToggle } from "../../components/ui/ThemeToggle"
import {
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  Sparkles,
  UserCheck,
  CheckCircle2,
} from "lucide-react"

export default function LoginPage() {
  const { user, login, isLoading: authLoading } = useAuth()
  const { error: toastError } = useToast()
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("registered") === "true") {
        setSuccessMessage(
          "Account created successfully! Please sign in with your new credentials.",
        )
      }
    }
  }, [])

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "ADMIN") {
        router.push("/dashboard")
      } else {
        router.push("/snacks")
      }
    }
  }, [user, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.")
      return
    }

    try {
      setIsSubmitting(true)
      await login(email, password)
    } catch (err: unknown) {
      let msg = "Failed to sign in. Please verify your credentials."
      if (err instanceof Error) {
        msg = err.message
      }
      setErrorMessage(msg)
      toastError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePreFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setErrorMessage("")
  }

  if (authLoading || user) {
    return null
  }

  return (
    <div className="min-h-screen ordan-mesh-bg flex flex-col justify-center items-center p-4 sm:p-6 relative transition-colors">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full">
        {/* Eyebrow & Hero Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg ordan-eyebrow text-xs font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
            Office Pantry Platform
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] ordan-heading-gradient">
            Snack Overflow
          </h1>
          <p className="text-sm text-pantry-muted mt-2">
            Real-time, concurrency-safe snack inventory for teams.
          </p>
        </div>

        {/* Tactile Auth Card */}
        <div className="ordan-card rounded-4xl p-7 sm:p-8 transition-colors">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-pantry-text tracking-tight">
              Sign in
            </h2>
            <p className="text-xs text-pantry-muted mt-1">
              Use your work email or pick a demo account below.
            </p>
          </div>

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-coral/10 border border-coral/30 flex items-start gap-2.5 text-xs text-pantry-text">
              <ShieldAlert className="w-4 h-4 text-coral shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              autoComplete="email"
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-9 text-pantry-muted hover:text-coral transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
              >
                Sign In to Pantry
              </Button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-pantry-muted">
              New to the team?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-coral hover:underline transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>

          {/* Demo Accounts */}
          <div className="mt-7 pt-6 relative">
            <div className="ordan-divider absolute top-0 left-0 right-0" />
            <div className="flex items-center gap-2 mb-3 text-[11px] font-semibold text-pantry-muted uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-coral" />
              <span>Seeded Demo Accounts</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handlePreFill("admin@example.com", "Admin1234!")}
                className="flex items-center gap-2.5 p-3 rounded-3xl ordan-btn-light text-left transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-obsidian-950 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                  A
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-pantry-text">Admin</div>
                  <div className="text-[11px] text-pantry-muted truncate">
                    admin@example.com
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePreFill("member@example.com", "Member1234!")}
                className="flex items-center gap-2.5 p-3 rounded-3xl ordan-btn-light text-left transition-all"
              >
                <div className="w-8 h-8 rounded-full ordan-icon-glow flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-pantry-text">Member</div>
                  <div className="text-[11px] text-pantry-muted truncate">
                    member@example.com
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-pantry-muted flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-coral" />
          <span>HTTP-only Session · CSRF Protected · Atomic PostgreSQL</span>
        </div>
      </div>
    </div>
  )
}
