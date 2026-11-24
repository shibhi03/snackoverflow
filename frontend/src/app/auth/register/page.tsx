"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { authService } from "../../../services/auth.service"
import { useAuth } from "../../../context/AuthContext"
import { useToast } from "../../../context/ToastContext"
import { Button } from "../../../components/ui/Button"
import { Input } from "../../../components/ui/Input"
import { ThemeToggle } from "../../../components/ui/ThemeToggle"
import {
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Check,
} from "lucide-react"

export default function RegisterPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { success: toastSuccess, error: toastError } = useToast()
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isRegistrationEnabled, setIsRegistrationEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === "ADMIN") {
        router.push("/dashboard")
      } else {
        router.push("/snacks")
      }
    }
  }, [user, authLoading, router])

  useEffect(() => {
    let isMounted = true
    authService
      .getRegistrationStatus()
      .then((res) => {
        if (isMounted) setIsRegistrationEnabled(res.registrationEnabled)
      })
      .catch(() => {
        if (isMounted) setIsRegistrationEnabled(true)
      })
    return () => {
      isMounted = false
    }
  }, [])

  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const isPasswordValid =
    hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecial
  const doPasswordsMatch =
    password.length > 0 && confirmPassword.length > 0 && password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")

    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage("Please fill in all required fields.")
      return
    }

    if (name.trim().length < 2) {
      setErrorMessage("Full name must be at least 2 characters.")
      return
    }

    if (!isPasswordValid) {
      setErrorMessage("Password must meet all complexity requirements listed below.")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.")
      return
    }

    try {
      setIsSubmitting(true)
      await authService.register(name, email, password, confirmPassword)
      toastSuccess("Account created successfully! Please sign in with your credentials.")
      router.push("/login?registered=true")
    } catch (err: unknown) {
      let msg = "Failed to create account. Please try again."
      if (err instanceof Error) {
        msg = err.message
      }
      setErrorMessage(msg)
      toastError(msg)
    } finally {
      setIsSubmitting(false)
    }
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg ordan-eyebrow text-xs font-semibold mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
            Member Registration
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.03em] ordan-heading-gradient">
            Snack Overflow
          </h1>
          <p className="text-sm text-pantry-muted mt-2">
            Create your office pantry account in seconds.
          </p>
        </div>

        <div className="ordan-card rounded-4xl p-7 sm:p-8 transition-colors">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-pantry-text tracking-tight">
                Create account
              </h2>
              <p className="text-xs text-pantry-muted mt-1">
                New accounts are provisioned with Member permissions.
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl ordan-icon-glow flex items-center justify-center shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>

          {isRegistrationEnabled === false && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-pantry-text">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Public Registration Disabled</p>
                <p className="mt-0.5 text-pantry-muted">
                  Please contact your pantry administrator for access.
                </p>
              </div>
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
              label="Full name"
              type="text"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting || isRegistrationEnabled === false}
              autoComplete="name"
              required
            />

            <Input
              label="Work email"
              type="email"
              placeholder="jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || isRegistrationEnabled === false}
              autoComplete="email"
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting || isRegistrationEnabled === false}
                autoComplete="new-password"
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

            {password.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-pantry-elevated border border-pantry-border text-[11px] space-y-1">
                <p className="font-semibold text-pantry-text mb-1">
                  Password requirements:
                </p>
                <div className="grid grid-cols-2 gap-1 text-pantry-muted">
                  <div
                    className={`flex items-center gap-1 ${hasMinLength ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}
                  >
                    {hasMinLength ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="w-3">·</span>
                    )}
                    <span>8+ characters</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 ${hasUppercase ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}
                  >
                    {hasUppercase ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="w-3">·</span>
                    )}
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 ${hasLowercase ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}
                  >
                    {hasLowercase ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="w-3">·</span>
                    )}
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 ${hasDigit ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}
                  >
                    {hasDigit ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="w-3">·</span>
                    )}
                    <span>Number (0-9)</span>
                  </div>
                  <div
                    className={`flex items-center gap-1 col-span-2 ${hasSpecial ? "text-emerald-600 dark:text-emerald-400 font-medium" : ""}`}
                  >
                    {hasSpecial ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="w-3">·</span>
                    )}
                    <span>Special character (!@#$%^&*)</span>
                  </div>
                </div>
              </div>
            )}

            <div className="relative">
              <Input
                label="Confirm password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting || isRegistrationEnabled === false}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-9 text-pantry-muted hover:text-coral transition-colors"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {confirmPassword.length > 0 && (
              <div className="text-[11px] flex items-center gap-1.5 px-1">
                {doPasswordsMatch ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
                  </span>
                ) : (
                  <span className="text-coral font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                  </span>
                )}
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isSubmitting}
                disabled={isRegistrationEnabled === false || isSubmitting}
              >
                Create Account
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 relative text-center">
            <div className="ordan-divider absolute top-0 left-0 right-0" />
            <p className="text-xs text-pantry-muted">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-coral hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-pantry-muted flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-coral" />
          <span>Bcrypt Hashed · CSRF Protected · Rate Limited</span>
        </div>
      </div>
    </div>
  )
}
