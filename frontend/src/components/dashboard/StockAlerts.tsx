import React from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle } from "../ui/Card"
import { StatusBadge } from "../ui/Badge"
import { AlertCircle, ArrowUpRight } from "lucide-react"
import { SnackCategory, SnackStatus } from "../../types/index"

interface AlertItem {
  id: string
  name: string
  category: SnackCategory
  quantity: number
  lowStockThreshold: number
  status: SnackStatus
}

export function StockAlerts({ alerts }: { alerts: AlertItem[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-coral" />
          <CardTitle>Inventory Alerts</CardTitle>
        </div>
        <Link
          href="/admin"
          className="text-xs font-semibold text-pantry-text hover:text-coral inline-flex items-center gap-1 transition-colors"
        >
          Manage inventory <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-pantry-muted">
          <p className="text-sm font-semibold text-pantry-text">
            All snacks are well-stocked
          </p>
          <p className="text-xs mt-1">
            No items are currently at or below their reorder threshold.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {alerts.map((item) => (
            <div
              key={item.id}
              className="px-4 py-3.5 rounded-3xl bg-pantry-elevated border border-pantry-border/80 flex items-center justify-between gap-4 transition-colors hover:border-coral/40"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AlertCircle
                  className={
                    item.status === "GONE"
                      ? "w-4 h-4 text-coral shrink-0"
                      : "w-4 h-4 text-amber-500 shrink-0"
                  }
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pantry-text truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-pantry-muted">
                    <span className="font-mono font-semibold text-pantry-text">
                      {item.quantity}
                    </span>{" "}
                    left · threshold {item.lowStockThreshold}
                  </p>
                </div>
              </div>
              <StatusBadge status={item.status} />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
