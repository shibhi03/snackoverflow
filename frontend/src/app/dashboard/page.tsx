"use client"

import React from "react"
import { useQuery } from "@tanstack/react-query"
import { snackService } from "../../services/snack.service"
import { useAuth } from "../../context/AuthContext"
import { AppShell } from "../../components/layout/AppShell"
import { StatCard } from "../../components/dashboard/StatCard"
import { SnackOfWeekCard } from "../../components/dashboard/SnackOfWeekCard"
import { StockAlerts } from "../../components/dashboard/StockAlerts"
import { RecentActivityFeed } from "../../components/dashboard/RecentActivityFeed"
import { Skeleton } from "../../components/ui/Skeleton"
import { Button } from "../../components/ui/Button"
import Link from "next/link"
import {
  Boxes,
  PackageCheck,
  AlertTriangle,
  Layers,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuth()

  const {
    data: summary,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ["summary"],
    queryFn: () => snackService.getSummary(),
    refetchInterval: 20000,
  })

  return (
    <AppShell requireAdmin>
      <div className="space-y-8">
        {/* Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg ordan-eyebrow text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
              Admin Overview
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] ordan-heading-gradient">
              Pantry Dashboard
            </h1>
            <p className="text-sm text-pantry-muted mt-2">
              Welcome, {user?.name.split(" ")[0]}. Real-time inventory metrics, alerts,
              and audit stream.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
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
            <Link href="/admin">
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-3.5 h-3.5 text-coral" />}
              >
                Manage Inventory
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 rounded-4xl w-full" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-72 rounded-4xl w-full lg:col-span-1" />
              <Skeleton className="h-72 rounded-4xl w-full lg:col-span-2" />
            </div>
          </div>
        )}

        {/* Error Fallback */}
        {error && !isLoading && (
          <div className="p-8 ordan-card rounded-4xl text-center border-coral/35">
            <p className="text-base font-semibold text-pantry-text">
              Failed to load pantry dashboard
            </p>
            <p className="text-xs text-pantry-muted mt-1">
              Please check your connection or sign in again.
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

        {/* Content */}
        {summary && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCard
                title="Total Varieties"
                value={summary.totalSnackTypes}
                subtitle="Active snack items"
                icon={<Layers className="w-5 h-5" />}
                variant="default"
              />
              <StatCard
                title="Total Packets"
                value={summary.totalPackets}
                subtitle="Units in stock"
                icon={<Boxes className="w-5 h-5" />}
                variant="default"
              />
              <StatCard
                title="Well-Stocked"
                value={summary.stockedCount}
                subtitle="Above threshold"
                icon={<PackageCheck className="w-5 h-5" />}
                variant="success"
              />
              <StatCard
                title="Needs Restock"
                value={summary.runningLowCount + summary.goneCount}
                subtitle={`${summary.runningLowCount} low · ${summary.goneCount} gone`}
                icon={<AlertTriangle className="w-5 h-5" />}
                variant={
                  summary.runningLowCount + summary.goneCount > 0 ? "warning" : "default"
                }
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-6 lg:col-span-1 flex flex-col justify-between">
                <SnackOfWeekCard snack={summary.snackOfTheWeek} />

                <div className="p-7 rounded-4xl ordan-card flex flex-col justify-between">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4" />
                      Admin Controls
                    </div>
                    <h4 className="text-xl font-semibold text-pantry-text mt-2">
                      Pantry Inventory Control
                    </h4>
                    <p className="text-xs text-pantry-muted mt-1.5 leading-relaxed">
                      Restock depleted snacks, tune thresholds, or add new items to the
                      catalog.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-col gap-2.5">
                    <Link href="/admin">
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full"
                        icon={<ArrowRight className="w-3.5 h-3.5 text-coral" />}
                      >
                        Inventory Manager
                      </Button>
                    </Link>
                    <Link href="/activities">
                      <Button size="sm" variant="secondary" className="w-full">
                        Full Activity Audit Log
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              <div className="space-y-6 lg:col-span-2">
                <StockAlerts alerts={summary.alerts} />
                <RecentActivityFeed activities={summary.recentActivities} />
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
