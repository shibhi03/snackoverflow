import React from "react"
import { cn } from "../../lib/utils"
import { SnackCategory, SnackStatus, Role } from "../../types/index"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react"

export function StatusBadge({
  status,
  className,
}: {
  status: SnackStatus
  className?: string
}) {
  if (status === "STOCKED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 dark:bg-emerald-500/15 dark:text-emerald-300",
          className,
        )}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        Stocked
      </span>
    )
  }

  if (status === "RUNNING_LOW") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-amber-500/15 text-amber-800 border border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300",
          className,
        )}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        Running Low
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-coral/12 text-coral border border-coral/30",
        className,
      )}
    >
      <XCircle className="w-3.5 h-3.5 text-coral" />
      Gone
    </span>
  )
}

export function CategoryBadge({
  category,
  className,
}: {
  category: SnackCategory
  className?: string
}) {
  const configs: Record<SnackCategory, { label: string; icon: string }> = {
    SWEET: { label: "Sweet", icon: "🍫" },
    SAVOURY: { label: "Savoury", icon: "🥨" },
    DRINK: { label: "Drink", icon: "🧃" },
    HEALTHY_ISH: { label: "Healthy-ish", icon: "🥗" },
  }

  const config = configs[category] || { label: category, icon: "🍿" }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-pantry-elevated text-pantry-text border border-pantry-border",
        className,
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  if (role === "ADMIN") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-obsidian-950 text-white border border-obsidian-700",
          className,
        )}
      >
        <ShieldCheck className="w-3 h-3 text-coral" />
        Admin
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ordan-eyebrow",
        className,
      )}
    >
      <UserIcon className="w-3 h-3 text-coral" />
      Member
    </span>
  )
}
