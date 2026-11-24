"use client"

import React, { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { snackService } from "../../services/snack.service"
import { AppShell } from "../../components/layout/AppShell"
import { SnackCard } from "../../components/snacks/SnackCard"
import { SnackFilters } from "../../components/snacks/SnackFilters"
import { useToast } from "../../context/ToastContext"
import { useBasket } from "../../context/BasketContext"
import { Snack, SnackCategory, SnackStatus } from "../../types/index"
import { Skeleton } from "../../components/ui/Skeleton"
import { Button } from "../../components/ui/Button"
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ShoppingBag,
  Trophy,
  Heart,
} from "lucide-react"

export default function SnacksPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { totalItems, openBasket } = useBasket()

  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<SnackCategory | "">("")
  const [status, setStatus] = useState<SnackStatus | "">("")
  const [sortBy, setSortBy] = useState<"name" | "quantity" | "votes">("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [page, setPage] = useState(1)
  const limit = 12

  const [activeVoteId, setActiveVoteId] = useState<string | null>(null)

  const { data: summary } = useQuery({
    queryKey: ["summary"],
    queryFn: () => snackService.getSummary(),
    staleTime: 15000,
  })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["snacks", { search, category, status, sortBy, sortOrder, page, limit }],
    queryFn: () =>
      snackService.getSnacks({
        search: search.trim() || undefined,
        category: category || undefined,
        status: status || undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      }),
  })

  const snacks = data?.data ?? []
  const pagination = data?.pagination

  const handleVoteToggle = async (snack: Snack) => {
    setActiveVoteId(snack.id)
    try {
      if (snack.hasVoted) {
        await snackService.unvote(snack.id)
        toast.info(`Removed vote for ${snack.name}`)
      } else {
        await snackService.vote(snack.id)
        toast.success(`Voted for ${snack.name}!`)
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["snacks"] }),
        queryClient.invalidateQueries({ queryKey: ["favourites"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
      ])
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message)
      } else {
        toast.error("Failed to update vote.")
      }
    } finally {
      setActiveVoteId(null)
    }
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg ordan-eyebrow text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
              Live Pantry Stock
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] ordan-heading-gradient">
              Snack Catalog
            </h1>
            <p className="text-sm text-pantry-muted mt-2">
              Browse available snacks, build your basket, and vote for the office
              favourite.
            </p>
          </div>

          {totalItems > 0 && (
            <Button
              variant="coral"
              size="sm"
              onClick={openBasket}
              icon={<ShoppingBag className="w-4 h-4" />}
            >
              Open Basket ({totalItems})
            </Button>
          )}
        </div>

        {/* Live Pantry Summary & Snack of the Week Strip */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7 grid grid-cols-3 gap-3">
              <div className="ordan-card rounded-3xl p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-pantry-muted">
                  Stocked
                </p>
                <p className="text-2xl sm:text-3xl font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  {summary.stockedCount}
                </p>
              </div>
              <div className="ordan-card rounded-3xl p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-pantry-muted">
                  Running Low
                </p>
                <p className="text-2xl sm:text-3xl font-mono font-semibold text-amber-600 dark:text-amber-400 mt-1">
                  {summary.runningLowCount}
                </p>
              </div>
              <div className="ordan-card rounded-3xl p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-pantry-muted">
                  Gone
                </p>
                <p className="text-2xl sm:text-3xl font-mono font-semibold text-coral mt-1">
                  {summary.goneCount}
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 ordan-card-dark rounded-3xl p-5 flex items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-coral/25 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3.5 min-w-0 relative z-10">
                <div className="w-11 h-11 rounded-2xl ordan-icon-glow flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-coral block">
                    Snack of the Week
                  </span>
                  <p className="text-base sm:text-lg font-semibold text-white truncate">
                    {summary.snackOfTheWeek
                      ? summary.snackOfTheWeek.name
                      : "No votes yet"}
                  </p>
                </div>
              </div>
              {summary.snackOfTheWeek && (
                <span className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-mono font-semibold text-white shrink-0">
                  <Heart className="w-3.5 h-3.5 fill-coral text-coral" />
                  {summary.snackOfTheWeek.weeklyVotes}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <SnackFilters
          search={search}
          onSearchChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          category={category}
          onCategoryChange={(v) => {
            setCategory(v)
            setPage(1)
          }}
          status={status}
          onStatusChange={(v) => {
            setStatus(v)
            setPage(1)
          }}
          sortBy={sortBy}
          onSortByChange={(v) => {
            setSortBy(v)
            setPage(1)
          }}
          sortOrder={sortOrder}
          onSortOrderChange={(v) => {
            setSortOrder(v)
            setPage(1)
          }}
        />

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-72 rounded-4xl w-full" />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <div className="p-8 rounded-4xl ordan-card border-coral/35 text-center">
            <AlertCircle className="w-8 h-8 text-coral mx-auto mb-2" />
            <h3 className="text-base font-semibold text-pantry-text">
              Unable to load snacks
            </h3>
            <p className="text-xs text-pantry-muted mt-1">
              Check your network or server connection.
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

        {/* Empty State */}
        {!isLoading && !isError && snacks.length === 0 && (
          <div className="ordan-card rounded-4xl p-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-pantry-elevated border border-pantry-border text-3xl flex items-center justify-center mx-auto mb-3">
              🍿
            </div>
            <h3 className="text-base font-semibold text-pantry-text">
              No snacks match your filters
            </h3>
            <p className="text-xs text-pantry-muted mt-1">
              Try adjusting your search keywords, category, or stock status.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearch("")
                setCategory("")
                setStatus("")
                setPage(1)
              }}
              className="mt-5"
            >
              Reset Filters
            </Button>
          </div>
        )}

        {/* Snacks Grid */}
        {!isLoading && !isError && snacks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {snacks.map((snack) => (
              <SnackCard
                key={snack.id}
                snack={snack}
                onVoteToggle={handleVoteToggle}
                isVoting={activeVoteId === snack.id}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 relative text-xs text-pantry-muted">
            <div className="ordan-divider absolute top-0 left-0 right-0" />
            <div>
              Showing{" "}
              <span className="font-mono font-semibold text-pantry-text">
                {snacks.length}
              </span>{" "}
              of{" "}
              <span className="font-mono font-semibold text-pantry-text">
                {pagination.totalItems}
              </span>{" "}
              snacks
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
              <span className="px-3 font-mono font-semibold text-pantry-text">
                {page} / {pagination.totalPages}
              </span>
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
