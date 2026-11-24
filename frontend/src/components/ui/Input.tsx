"use client"

import React from "react"
import { cn } from "../../lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || props.name

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-pantry-text tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-2xl">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-pantry-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "block w-full rounded-2xl border bg-pantry-elevated px-4 py-2.5 text-sm text-pantry-text placeholder:text-pantry-muted/70 transition-all",
              "focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              error
                ? "border-coral focus:ring-coral/40 bg-coral/5"
                : "border-pantry-border hover:border-obsidian-600/50",
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs font-medium text-coral mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-pantry-muted mt-1">{helperText}</p>
        )}
      </div>
    )
  },
)

Input.displayName = "Input"
