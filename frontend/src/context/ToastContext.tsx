"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react"
import { cn } from "../lib/utils"

export type ToastType = "success" | "error" | "warning" | "info"

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { id, message, type }])

      setTimeout(() => {
        removeToast(id)
      }, duration)
    },
    [removeToast],
  )

  const success = useCallback((msg: string) => showToast(msg, "success"), [showToast])
  const error = useCallback((msg: string) => showToast(msg, "error", 6000), [showToast])
  const warning = useCallback(
    (msg: string) => showToast(msg, "warning", 5000),
    [showToast],
  )
  const info = useCallback((msg: string) => showToast(msg, "info"), [showToast])

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-2 sm:p-0">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-coral shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
            info: <Info className="w-5 h-5 text-zinc-300 shrink-0" />,
          }

          return (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-3xl ordan-card-dark text-white transition-all animate-in slide-in-from-bottom-2 fade-in",
              )}
            >
              <div className="pt-0.5">{icons[toast.type]}</div>
              <p className="text-xs font-medium leading-relaxed flex-1 text-zinc-100">
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-400 hover:text-white transition-colors p-0.5"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
