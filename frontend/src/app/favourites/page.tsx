"use client"

import React, { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { snackService } from "../../services/snack.service"
import { AppShell } from "../../components/layout/AppShell"
import { SnackCard } from "../../components/snacks/SnackCard"
import { useToast } from "../../context/ToastContext"
import { useBasket } from "../../context/BasketContext"
import { Snack } from "../../types/index"
import { Skeleton } from "../../components/ui/Skeleton"
import { Button } from "../../components/ui/Button"
import Link from "next/link"
import { AlertCircle, ShoppingBag, ArrowRight } from "lucide-react"

export default function FavouritesPage() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { totalItems, openBasket } = useBasket()
  const [activeVoteId, setActiveVoteId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["favourites"],
    queryFn: () => snackService.getFavourites(),
  })

  const snacks = data?.data ?? []

  const handleVoteToggle = async (snack: Snack) => {
    setActiveVoteId(snack.id)
    try {
      if (snack.hasVoted) {
        await snackService.unvote(snack.id)
        toast.info(`Removed ${snack.name} from favourites`)
      } else {
        await snackService.vote(snack.id)
        toast.success(`Added ${snack.name} to favourites`)
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["favourites"] }),
        queryClient.invalidateQueries({ queryKey: ["snacks"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
      ])
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message)
      } else {
        toast.error("Failed to update favourite.")
      }
    } finally {
      setActiveVoteId(null)
    }
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg ordan-eyebrow text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-coral" />
              {snacks.length} Saved
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] ordan-heading-gradient">
              My Favourites
            </h1>
            <p className="text-sm text-pantry-muted mt-2">
              Quick access to the office snacks and drinks you voted for.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {totalItems > 0 && (
              <Button
                variant="coral"
                size="sm"
                onClick={openBasket}
                icon={<ShoppingBag className="w-4 h-4" />}
              >
                Basket ({totalItems})
              </Button>
            )}
            <Link href="/snacks">
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Browse Catalog
              </Button>
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-72 rounded-4xl w-full" />
            ))}
          </div>
        )}

        {isError && !isLoading && (
          <div className="p-8 rounded-4xl ordan-card border-coral/35 text-center">
            <AlertCircle className="w-8 h-8 text-coral mx-auto mb-2" />
            <h3 className="text-base font-semibold text-pantry-text">
              Unable to load favourites
            </h3>
            <p className="text-xs text-pantry-muted mt-1">Please try again shortly.</p>
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

        {!isLoading && !isError && snacks.length === 0 && (
          <div className="ordan-card rounded-4xl p-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-pantry-elevated border border-pantry-border text-3xl flex items-center justify-center mx-auto mb-3">
              ❤️
            </div>
            <h3 className="text-base font-semibold text-pantry-text">
              No favourites yet
            </h3>
            <p className="text-xs text-pantry-muted mt-1 leading-relaxed">
              Click the heart button on any snack in the catalog to pin it here.
            </p>
            <Link href="/snacks" className="inline-block mt-5">
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-3.5 h-3.5 text-coral" />}
              >
                Discover Snacks
              </Button>
            </Link>
          </div>
        )}

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
      </div>
    </AppShell>
  )
}
