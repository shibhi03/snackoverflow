"use client"

import React from "react"
import { cn } from "../../lib/utils"
import { Loader2 } from "lucide-react"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "coral" | "danger" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
  icon?: React.ReactNode
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-coral/50 disabled:opacity-45 disabled:cursor-not-allowed select-none active:scale-[0.98]"

    const variants = {
      primary: "ordan-btn-dark",
      secondary: "ordan-btn-light",
      coral: "ordan-btn-brand",
      danger:
        "bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.98] focus:ring-rose-500",
      outline: "ordan-btn-light",
      ghost:
        "text-pantry-muted hover:text-coral hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-full",
    }

    const sizes = {
      sm: "text-xs px-4 py-2 gap-1.5",
      md: "text-sm px-5 py-2.5 gap-2",
      lg: "text-base px-7 py-3.5 gap-2.5",
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
      </button>
    )
  },
)

Button.displayName = "Button"
