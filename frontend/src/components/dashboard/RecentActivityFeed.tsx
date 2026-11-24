import React from "react"
import { Card, CardHeader, CardTitle } from "../ui/Card"
import { ShoppingBag, PlusCircle } from "lucide-react"
import { cn } from "../../lib/utils"

interface ActivityItem {
  id: string
  action: "CONSUMED" | "RESTOCKED"
  amount: number
  snackName: string
  userName: string
  createdAt: string | Date
}

export function RecentActivityFeed({ activities }: { activities: ActivityItem[] }) {
  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-obsidian-950 dark:bg-white" />
          <CardTitle>Recent Pantry Activity</CardTitle>
        </div>
      </CardHeader>

      {activities.length === 0 ? (
        <div className="text-center py-8 text-pantry-muted">
          <p className="text-sm font-semibold text-pantry-text">No recent activity</p>
          <p className="text-xs mt-1">
            Snack consumptions and restocks will appear here live.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activities.map((act) => {
            const isConsumed = act.action === "CONSUMED"
            return (
              <div
                key={act.id}
                className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-3xl bg-pantry-elevated border border-pantry-border/80 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-2xl flex items-center justify-center shrink-0",
                      isConsumed
                        ? "bg-coral/12 text-coral"
                        : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    {isConsumed ? (
                      <ShoppingBag className="w-4 h-4" />
                    ) : (
                      <PlusCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-pantry-text truncate">
                      {act.userName}{" "}
                      <span className="font-normal text-pantry-muted">
                        {isConsumed ? "consumed" : "restocked"}
                      </span>{" "}
                      <span className="font-mono font-semibold text-pantry-text">
                        {act.amount}×
                      </span>{" "}
                      {act.snackName}
                    </p>
                    <p className="text-[11px] font-mono text-pantry-muted mt-0.5">
                      {formatTime(act.createdAt)}
                    </p>
                  </div>
                </div>

                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider text-[10px] shrink-0",
                    isConsumed
                      ? "bg-coral/12 text-coral border border-coral/25"
                      : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25",
                  )}
                >
                  {act.action}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
