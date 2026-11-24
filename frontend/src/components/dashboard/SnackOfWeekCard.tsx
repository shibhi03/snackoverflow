"use client"

import React from "react"
import Link from "next/link"
import { Card } from "../ui/Card"
import { Button } from "../ui/Button"
import { Trophy, Heart, ArrowRight } from "lucide-react"
import { SnackCategory } from "../../types/index"

interface SnackOfWeekProps {
  snack: {
    id: string
    name: string
    category: SnackCategory
    quantity: number
    weeklyVotes: number
  } | null
}

export function SnackOfWeekCard({ snack }: SnackOfWeekProps) {
  if (!snack) {
    return (
      <Card dark className="p-7 flex flex-col justify-between relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl ordan-icon-glow flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-coral">
              <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse" />
              Weekly Spotlight
            </span>
            <h3 className="text-lg font-semibold text-white">Snack of the Week</h3>
          </div>
        </div>

        <div className="my-6 text-center py-6 px-4 rounded-3xl bg-white/[0.04] border border-white/10">
          <p className="text-sm font-semibold text-white">No votes cast yet this week</p>
          <p className="text-xs text-zinc-400 mt-1">
            Team votes will spotlight the top office snack here.
          </p>
        </div>

        <Link href="/snacks" className="w-full">
          <Button
            variant="coral"
            size="sm"
            className="w-full"
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Explore Catalog
          </Button>
        </Link>
      </Card>
    )
  }

  return (
    <Card dark className="relative overflow-hidden p-7 flex flex-col justify-between">
      {/* Subtle spotlight beam */}
      <div className="absolute -top-12 right-0 w-40 h-40 bg-coral/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-obsidian-900 border border-obsidian-700 text-[11px] font-semibold text-zinc-200">
            <span className="w-2 h-2 rounded-full bg-coral animate-pulse" />
            Snack of the Week
          </div>
          <div className="w-10 h-10 rounded-2xl ordan-icon-glow flex items-center justify-center">
            <Trophy className="w-4 h-4" />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            {snack.category.replace("_", " ")}
          </p>
          <h4 className="text-2xl font-semibold text-white tracking-tight mt-1">
            {snack.name}
          </h4>

          <div className="mt-5 p-4 rounded-3xl bg-white/[0.05] border border-white/10 flex items-center justify-between text-xs">
            <span className="text-zinc-300">
              <strong className="text-white font-mono text-sm">{snack.quantity}</strong>{" "}
              left in stock
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-coral bg-coral/15 px-3 py-1 rounded-full border border-coral/30">
              <Heart className="w-3 h-3 fill-coral text-coral" />
              {snack.weeklyVotes} vote{snack.weeklyVotes === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 relative z-10">
        <Link href="/snacks" className="block w-full">
          <Button
            variant="coral"
            size="sm"
            className="w-full"
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View in Catalog
          </Button>
        </Link>
      </div>
    </Card>
  )
}
