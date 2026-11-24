"use client"

import React, { useEffect } from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: "sm" | "md" | "lg"
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    if (isOpen) {
      document.body.style.overflow = "hidden"
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => {
      document.body.style.overflow = "unset"
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-obsidian-950/55 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      <div
        className={cn(
          "relative w-full rounded-4xl ordan-card p-6 sm:p-7 z-10 animate-in fade-in zoom-in-95 duration-150",
          maxWidthClasses[maxWidth],
        )}
      >
        <div className="flex items-start justify-between pb-4 relative">
          <div>
            <h3 className="text-xl font-semibold text-pantry-text tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-pantry-muted mt-1">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-pantry-muted hover:text-coral hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="ordan-divider absolute bottom-0 left-0 right-0" />
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  )
}
