"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { activityService } from "../../services/activity.service"
import { AppShell } from "../../components/layout/AppShell"
import { Button } from "../../components/ui/Button"
import { Skeleton } from "../../components/ui/Skeleton"
import {
  History,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Utensils,
  PackagePlus,
  AlertCircle,
} from "lucide-react"
import { ActivityAction } from "../../types/index"

export default function ActivitiesPage() {
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState<ActivityAction | "">("")
  const limit = 20

  const { data, isLoading, isRefetching, refetch, isError } = useQuery({
    queryKey: ["admin-activities", page, limit],
    queryFn: () => activityService.listActivities(page, limit),
  })

  const rawActivities = data?.data ?? []
  const pagination = data?.pagination

  const activities = actionFilter
    ? rawActivities.filter((act) => act.action === actionFilter)
    : rawActivities

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <AppShell requireAdmin>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg ordan-eyebrow text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-coral" />
              Audit Trail
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] ordan-heading-gradient">
              Activity Log
            </h1>
            <p className="text-sm text-pantry-muted mt-2">
              Immutable ledger of all snack consumptions and administrative restocks.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            icon={
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin" : ""}`}
              />
            }
          >
            Refresh
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActionFilter("")}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              actionFilter === "" ? "ordan-btn-dark text-white" : "ordan-btn-light"
            }`}
          >
            All ({rawActivities.length})
          </button>
          <button
            onClick={() => setActionFilter("CONSUMED")}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              actionFilter === "CONSUMED"
                ? "ordan-btn-brand text-white"
                : "ordan-btn-light"
            }`}
          >
            Consumed
          </button>
          <button
            onClick={() => setActionFilter("RESTOCKED")}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              actionFilter === "RESTOCKED"
                ? "bg-emerald-600 text-white shadow-sm"
                : "ordan-btn-light"
            }`}
          >
            Restocked
          </button>
        </div>

        {isLoading && (
          <div className="ordan-card rounded-4xl p-5 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="p-8 rounded-4xl ordan-card border-coral/35 text-center">
            <AlertCircle className="w-8 h-8 text-coral mx-auto mb-2" />
            <h3 className="text-base font-semibold text-pantry-text">
              Unable to load activity log
            </h3>
            <p className="text-xs text-pantry-muted mt-1">
              Please try refreshing the page.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => refetch()}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && activities.length === 0 && (
          <div className="ordan-card rounded-4xl p-12 text-center">
            <History className="w-8 h-8 text-pantry-muted mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-pantry-text">
              No activity records found
            </h4>
            <p className="text-xs text-pantry-muted mt-1">
              Events appear as members consume or admins restock pantry snacks.
            </p>
          </div>
        )}

        {!isLoading && !isError && activities.length > 0 && (
          <div className="ordan-card rounded-4xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-pantry-border bg-pantry-elevated/70 text-pantry-muted font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Action</th>
                    <th className="py-4 px-6">Snack Item</th>
                    <th className="py-4 px-6">Delta</th>
                    <th className="py-4 px-6">User</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pantry-border/60">
                  {activities.map((act) => {
                    const isConsumed = act.action === "CONSUMED"
                    return (
                      <tr
                        key={act.id}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="py-4 px-6 font-mono text-pantry-muted whitespace-nowrap">
                          {formatTimestamp(act.createdAt)}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${
                              isConsumed
                                ? "bg-coral/12 text-coral border-coral/25"
                                : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                            }`}
                          >
                            {isConsumed ? (
                              <Utensils className="w-3 h-3" />
                            ) : (
                              <PackagePlus className="w-3 h-3" />
                            )}
                            {act.action}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-pantry-text text-sm">
                          {act.snackName}
                          {!act.snackId && (
                            <span className="ml-2 text-[10px] font-medium text-pantry-muted bg-pantry-elevated px-2 py-0.5 rounded-full border border-pantry-border">
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`font-mono font-semibold text-sm ${
                              isConsumed
                                ? "text-coral"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isConsumed ? `-${act.amount}` : `+${act.amount}`}
                          </span>{" "}
                          <span className="text-pantry-muted">pkts</span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-pantry-text">
                          {act.userName}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 relative text-xs text-pantry-muted">
            <div className="ordan-divider absolute top-0 left-0 right-0" />
            <div>
              Page{" "}
              <span className="font-mono font-semibold text-pantry-text">
                {pagination.page}
              </span>{" "}
              of{" "}
              <span className="font-mono font-semibold text-pantry-text">
                {pagination.totalPages}
              </span>{" "}
              ({pagination.totalItems} logs)
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
