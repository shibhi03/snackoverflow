"use client"

import React from "react"
import { Card } from "../ui/Card"
import { StatusBadge, CategoryBadge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { Snack, SnackCategory } from "../../types/index"
import { useBasket } from "../../context/BasketContext"
import { Heart, Plus, Minus, ShoppingBag, AlertTriangle } from "lucide-react"
import { cn } from "../../lib/utils"

export interface SnackCardProps {
  snack: Snack
  onVoteToggle: (snack: Snack) => Promise<void>
  isVoting?: boolean
}

export function SnackCard({ snack, onVoteToggle, isVoting = false }: SnackCardProps) {
  const { addItem, updateQuantity, getItemAmount } = useBasket()
  const isOut = snack.quantity === 0
  const isLow = snack.status === "RUNNING_LOW"
  const inBasketAmount = getItemAmount(snack.id)
  const isMaxInBasket = inBasketAmount >= snack.quantity

  const categoryEmoji: Record<SnackCategory, string> = {
    SWEET: "🍫",
    SAVOURY: "🥨",
    DRINK: "🧃",
    HEALTHY_ISH: "🥗",
  }

  const emoji = categoryEmoji[snack.category] || "🍿"

  return (
    <Card
      className={cn(
        "flex flex-col justify-between group hover:-translate-y-1 transition-all duration-200 p-5",
        isOut && "opacity-80 border-coral/35",
        isLow && "border-amber-500/45",
      )}
    >
      <div>
        {/* Tactile Header Well */}
        <div
          className={cn(
            "h-32 w-full rounded-3xl flex flex-col justify-between p-3.5 border relative overflow-hidden transition-colors",
            isOut
              ? "bg-coral/[0.06] border-coral/25"
              : isLow
                ? "bg-amber-500/[0.07] border-amber-500/25"
                : "bg-pantry-elevated border-pantry-border/80",
          )}
        >
          <div className="flex items-center justify-between gap-1.5 z-10">
            <CategoryBadge category={snack.category} />
            <StatusBadge status={snack.status} />
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <span className="text-5xl group-hover:scale-110 transition-transform duration-200">
              {emoji}
            </span>
          </div>

          <div className="z-10 flex items-center justify-between text-[11px] font-semibold text-pantry-muted">
            <span>Stock</span>
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-full bg-pantry-surface border border-pantry-border font-mono font-semibold",
                isOut ? "text-coral" : "text-pantry-text",
              )}
            >
              {snack.quantity} pkt{snack.quantity === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Title & Threshold */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-pantry-text group-hover:text-coral transition-colors tracking-tight line-clamp-1">
            {snack.name}
          </h3>
          <p className="text-xs text-pantry-muted mt-0.5">
            {snack.category.replace("_", " ")} · Reorder at ≤ {snack.lowStockThreshold}
          </p>
        </div>

        {isLow && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/12 px-3 py-1.5 rounded-2xl border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Running low — grab soon</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 relative flex items-center gap-2">
        <div className="ordan-divider absolute top-0 left-0 right-0" />

        {isOut ? (
          <Button variant="secondary" size="sm" disabled className="flex-1 text-xs">
            Out of Stock
          </Button>
        ) : inBasketAmount > 0 ? (
          <div className="flex-1 flex items-center justify-between rounded-full bg-obsidian-950 text-white px-2.5 py-1.5">
            <button
              type="button"
              onClick={() => updateQuantity(snack.id, inBasketAmount - 1)}
              className="p-1 rounded-full text-zinc-300 hover:text-coral hover:bg-white/10 transition-colors"
              title="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-coral" />
              <span className="font-mono">{inBasketAmount}</span>
            </span>
            <button
              type="button"
              disabled={isMaxInBasket}
              onClick={() => updateQuantity(snack.id, inBasketAmount + 1)}
              className="p-1 rounded-full text-zinc-300 hover:text-coral hover:bg-white/10 transition-colors disabled:opacity-30"
              title={isMaxInBasket ? "All stock in basket" : "Add another packet"}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => addItem(snack, 1)}
            icon={<ShoppingBag className="w-3.5 h-3.5 text-coral" />}
          >
            Consume
          </Button>
        )}

        <button
          type="button"
          onClick={() => onVoteToggle(snack)}
          disabled={isVoting}
          title={snack.hasVoted ? "Remove vote" : "Vote for snack"}
          aria-label={snack.hasVoted ? "Remove vote" : "Vote for snack"}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-all active:scale-95",
            snack.hasVoted ? "ordan-btn-brand border-transparent" : "ordan-btn-light",
          )}
        >
          <Heart
            className={cn(
              "w-3.5 h-3.5 transition-transform",
              snack.hasVoted ? "fill-white text-white scale-110" : "text-coral",
            )}
          />
          <span className="font-mono">{snack.voteCount}</span>
        </button>
      </div>
    </Card>
  )
}
