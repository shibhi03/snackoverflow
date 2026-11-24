"use client"

import React, { useState } from "react"
import { useBasket } from "../../context/BasketContext"
import { snackService } from "../../services/snack.service"
import { useToast } from "../../context/ToastContext"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "../ui/Button"
import { ApiClientError } from "../../services/api"
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  Utensils,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"

export function BasketDrawer() {
  const {
    items,
    totalPackets,
    uniqueCount,
    isDrawerOpen,
    setIsDrawerOpen,
    updateQuantity,
    removeItem,
    clearBasket,
  } = useBasket()

  const toast = useToast()
  const queryClient = useQueryClient()
  const [isConsuming, setIsConsuming] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `basket-${Date.now()}`,
  )

  const prevItemsHash = React.useRef(JSON.stringify(items))
  React.useEffect(() => {
    const currentHash = JSON.stringify(items)
    if (currentHash !== prevItemsHash.current) {
      prevItemsHash.current = currentHash
      setIdempotencyKey(
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `basket-${Date.now()}`,
      )
    }
  }, [items])

  if (!isDrawerOpen) return null

  const handleConfirmConsumption = async () => {
    if (items.length === 0 || isConsuming) return
    setErrorMessage("")
    setIsConsuming(true)

    try {
      const payload = items.map((i) => ({
        snackId: i.snackId,
        amount: i.amount,
      }))

      const res = await snackService.consumeBasket(payload, idempotencyKey)
      toast.success(res.message || `Successfully consumed ${totalPackets} packet(s)!`)
      clearBasket()
      setIsDrawerOpen(false)
      setIdempotencyKey(
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `basket-${Date.now()}`,
      )

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["snacks"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
        queryClient.invalidateQueries({ queryKey: ["my-activities"] }),
        queryClient.invalidateQueries({ queryKey: ["favourites"] }),
      ])
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 409) {
        setErrorMessage(
          err.message ||
            "Someone beat you to the last packet! Please adjust your basket.",
        )
        toast.error(err.message || "Stock conflict detected. Please review your basket.")
      } else if (err instanceof Error) {
        setErrorMessage(err.message)
        toast.error(err.message)
      } else {
        setErrorMessage("Failed to consume basket. Please try again.")
        toast.error("Failed to consume basket.")
      }
      queryClient.invalidateQueries({ queryKey: ["snacks"] })
    } finally {
      setIsConsuming(false)
    }
  }

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "SWEET":
        return "🍫"
      case "SAVOURY":
        return "🥨"
      case "DRINK":
        return "🧃"
      case "HEALTHY_ISH":
        return "🥗"
      default:
        return "🍿"
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="fixed inset-0 bg-obsidian-950/55 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className="fixed inset-y-3 right-3 max-w-full flex pl-10">
        <div className="w-screen max-w-md rounded-4xl ordan-card flex flex-col justify-between animate-in slide-in-from-right duration-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl ordan-icon-glow flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-pantry-text tracking-tight">
                  Snack Basket
                </h3>
                <p className="text-xs text-pantry-muted">
                  {uniqueCount === 0
                    ? "Empty"
                    : `${uniqueCount} snack${uniqueCount === 1 ? "" : "s"} · ${totalPackets} packet${totalPackets === 1 ? "" : "s"}`}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 rounded-full text-pantry-muted hover:text-coral hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="ordan-divider absolute bottom-0 left-6 right-6" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMessage && (
              <div className="p-4 rounded-3xl bg-coral/10 border border-coral/30 flex items-start gap-2.5 text-xs text-pantry-text">
                <AlertTriangle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-pantry-muted">
                <div className="w-16 h-16 rounded-3xl bg-pantry-elevated border border-pantry-border flex items-center justify-center text-3xl mb-4">
                  🧺
                </div>
                <h4 className="text-base font-semibold text-pantry-text">
                  Your basket is empty
                </h4>
                <p className="text-xs text-pantry-muted max-w-xs mt-1.5 leading-relaxed">
                  Add snacks from the catalog and consume them together in one atomic
                  transaction.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsDrawerOpen(false)}
                  className="mt-6"
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Browse Catalog
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const isMaxReached = item.amount >= item.availableQuantity

                  return (
                    <div
                      key={item.snackId}
                      className="p-4 rounded-3xl bg-pantry-elevated border border-pantry-border/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-pantry-surface border border-pantry-border flex items-center justify-center text-lg shrink-0">
                          {getCategoryEmoji(item.category)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-pantry-text truncate">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-mono text-pantry-muted">
                              {item.availableQuantity} in pantry
                            </span>
                            {isMaxReached && (
                              <span className="text-[10px] font-semibold text-coral bg-coral/10 px-2 py-0.2 rounded-full">
                                Max
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-full bg-pantry-surface border border-pantry-border overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.snackId, item.amount - 1)}
                            className="p-1.5 text-pantry-muted hover:text-coral transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-mono font-semibold text-pantry-text min-w-[24px] text-center">
                            {item.amount}
                          </span>
                          <button
                            type="button"
                            disabled={isMaxReached}
                            onClick={() => updateQuantity(item.snackId, item.amount + 1)}
                            className="p-1.5 text-pantry-muted hover:text-coral transition-colors disabled:opacity-30"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.snackId)}
                          className="p-2 text-pantry-muted hover:text-coral rounded-full transition-colors"
                          title="Remove from basket"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-6 relative space-y-4 bg-pantry-elevated/60">
              <div className="ordan-divider absolute top-0 left-6 right-6" />
              <div className="flex items-center justify-between text-xs">
                <span className="text-pantry-muted font-semibold uppercase tracking-wider">
                  Total Packets
                </span>
                <span className="text-lg font-mono font-semibold text-pantry-text">
                  {totalPackets}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearBasket}
                  disabled={isConsuming}
                >
                  Clear
                </Button>

                <Button
                  type="button"
                  variant="coral"
                  className="flex-1"
                  onClick={handleConfirmConsumption}
                  isLoading={isConsuming}
                  icon={<Utensils className="w-4 h-4" />}
                >
                  Confirm Consumption ({totalPackets})
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
