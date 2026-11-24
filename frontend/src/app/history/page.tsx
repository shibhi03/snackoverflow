"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { activityService } from "../../services/activity.service"
import { AppShell } from "../../components/layout/AppShell"
import { Button } from "../../components/ui/Button"
import { Skeleton } from "../../components/ui/Skeleton"
import Link from "next/link"
import {
  Utensils,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react"

export default function MemberHistoryPage() {
  const [page, setPage] = useState(1)
  const limit = 15

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-activities", page, limit],
    queryFn: () => activityService.listMyActivities(page, limit),
  })

  const activities = data?.data ?? []
  const pagination = data?.pagination

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg ordan-eyebrow text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-coral" />
              Personal Log
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] ordan-heading-gradient">
              Consumption History
            </h1>
            <p className="text-sm text-pantry-muted mt-2">
              Your personal record of snacks and drinks grabbed from the pantry.
            </p>
          </div>

          <Link href="/snacks">
            <Button
              variant="primary"
              size="sm"
              icon={<ArrowRight className="w-3.5 h-3.5 text-coral" />}
            >
              Pantry Catalog
            </Button>
          </Link>
        </div>

        {isLoading && (
          <div className="ordan-card rounded-4xl p-5 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="p-8 rounded-4xl ordan-card border-coral/35 text-center">
            <AlertCircle className="w-8 h-8 text-coral mx-auto mb-2" />
            <h3 className="text-base font-semibold text-pantry-text">
              Unable to load consumption history
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
          <div className="ordan-card rounded-4xl p-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-pantry-elevated border border-pantry-border text-3xl flex items-center justify-center mx-auto mb-3">
              ☕
            </div>
            <h3 className="text-base font-semibold text-pantry-text">
              No snack history yet
            </h3>
            <p className="text-xs text-pantry-muted mt-1 leading-relaxed">
              Whenever you consume a snack from the catalog, your personal record will
              appear here.
            </p>
            <Link href="/snacks" className="inline-block mt-5">
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-3.5 h-3.5 text-coral" />}
              >
                Browse Catalog
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && !isError && activities.length > 0 && (
          <div className="ordan-card rounded-4xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-pantry-border bg-pantry-elevated/70 text-pantry-muted font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Timestamp</th>
                    <th className="py-4 px-6">Snack Item</th>
                    <th className="py-4 px-6">Quantity</th>
                    <th className="py-4 px-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pantry-border/60">
                  {activities.map((act) => (
                    <tr
                      key={act.id}
                      className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-4 px-6 font-mono text-pantry-muted whitespace-nowrap">
                        {formatTimestamp(act.createdAt)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-pantry-text text-sm">
                          {act.snackName}
                        </span>
                        {!act.snackId && (
                          <span className="ml-2 text-[10px] font-medium text-pantry-muted bg-pantry-elevated px-2 py-0.5 rounded-full border border-pantry-border">
                            Archived
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-coral bg-coral/10 px-3 py-1 rounded-full border border-coral/25">
                          <Utensils className="w-3 h-3" />
                          {act.amount} pkt{act.amount === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-obsidian-950 text-white">
                          Consumed
                        </span>
                      </td>
                    </tr>
                  ))}
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
              ({pagination.totalItems} records)
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
