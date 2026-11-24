import React from "react"
import { Card } from "../ui/Card"
import { cn } from "../../lib/utils"

export interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
  variant?: "default" | "success" | "warning" | "danger"
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
}: StatCardProps) {
  const iconStyle = {
    default: "bg-obsidian-950 text-white dark:bg-obsidian-800",
    success: "bg-emerald-600 text-white",
    warning: "ordan-icon-glow text-white",
    danger: "ordan-icon-glow text-white",
  }

  return (
    <Card className="relative overflow-hidden group hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-pantry-muted uppercase tracking-wider">
            {title}
          </p>
          <p className="text-4xl font-semibold text-pantry-text mt-2 tracking-tight font-mono">
            {value}
          </p>
          {subtitle && <p className="text-xs text-pantry-muted mt-1.5">{subtitle}</p>}
        </div>
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
            iconStyle[variant],
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}
