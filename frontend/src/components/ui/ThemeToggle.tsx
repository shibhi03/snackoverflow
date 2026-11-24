"use client"

import React, { useState, useRef, useEffect } from "react"
import { useTheme, Theme } from "../../context/ThemeContext"
import { Sun, Moon, Laptop, Check } from "lucide-react"
import { cn } from "../../lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const options: Array<{ id: Theme; label: string; icon: React.ReactNode }> = [
    { id: "light", label: "Light", icon: <Sun className="w-4 h-4 text-coral" /> },
    { id: "dark", label: "Dark", icon: <Moon className="w-4 h-4 text-pantry-muted" /> },
    {
      id: "system",
      label: "System",
      icon: <Laptop className="w-4 h-4 text-pantry-muted" />,
    },
  ]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle color theme"
        title={`Theme: ${theme} (${resolvedTheme})`}
        className={cn(
          "p-2 rounded-full ordan-btn-light transition-all duration-150 flex items-center justify-center",
          className,
        )}
      >
        {resolvedTheme === "dark" ? (
          <Moon className="w-4 h-4 text-coral" />
        ) : (
          <Sun className="w-4 h-4 text-coral" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-36 rounded-3xl ordan-card p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-pantry-muted px-2.5 py-1">
            Theme
          </div>
          {options.map((opt) => {
            const isSelected = theme === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTheme(opt.id)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between px-2.5 py-1.5 rounded-2xl text-xs font-semibold transition-colors",
                  isSelected
                    ? "bg-black/[0.06] dark:bg-white/[0.08] text-pantry-text"
                    : "text-pantry-muted hover:text-pantry-text hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
                )}
              >
                <div className="flex items-center gap-2">
                  {opt.icon}
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-coral shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
