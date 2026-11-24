"use client"

import React from "react"
import { Snack } from "../../types/index"
import { StatusBadge, CategoryBadge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { PackagePlus, Edit2, Trash2, Heart, AlertTriangle } from "lucide-react"
import { Skeleton } from "../ui/Skeleton"

interface SnackTableProps {
  snacks: Snack[]
  onRestock: (snack: Snack) => void
  onEdit: (snack: Snack) => void
  onDelete: (snack: Snack) => void
  isLoading?: boolean
}

export function SnackTable({
  snacks,
  onRestock,
  onEdit,
  onDelete,
  isLoading = false,
}: SnackTableProps) {
  if (isLoading) {
    return (
      <div className="ordan-card rounded-4xl overflow-hidden">
        <div className="p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (snacks.length === 0) {
    return (
      <div className="ordan-card rounded-4xl p-12 text-center">
        <div className="w-12 h-12 bg-pantry-elevated border border-pantry-border rounded-2xl flex items-center justify-center mx-auto mb-3 text-pantry-muted">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-pantry-text">No snacks found</h4>
        <p className="text-xs text-pantry-muted mt-1 max-w-sm mx-auto">
          Add new snacks to the inventory to start tracking pantry stock.
        </p>
      </div>
    )
  }

  return (
    <div className="ordan-card rounded-4xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-pantry-border bg-pantry-elevated/70 text-pantry-muted font-semibold uppercase tracking-wider">
              <th className="py-4 px-6">Snack & Category</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Stock</th>
              <th className="py-4 px-6">Threshold</th>
              <th className="py-4 px-6">Votes</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pantry-border/60">
            {snacks.map((snack) => (
              <tr
                key={snack.id}
                className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
              >
                <td className="py-4 px-6">
                  <div className="font-semibold text-pantry-text text-sm">
                    {snack.name}
                  </div>
                  <div className="mt-1.5">
                    <CategoryBadge category={snack.category} />
                  </div>
                </td>
                <td className="py-4 px-6">
                  <StatusBadge status={snack.status} />
                </td>
                <td className="py-4 px-6">
                  <span className="font-mono font-semibold text-pantry-text text-sm">
                    {snack.quantity}
                  </span>
                  <span className="text-pantry-muted ml-1">pkts</span>
                </td>
                <td className="py-4 px-6 font-mono text-pantry-muted">
                  ≤ {snack.lowStockThreshold}
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-coral bg-coral/10 px-3 py-1 rounded-full border border-coral/25">
                    <Heart className="w-3 h-3 fill-coral text-coral" />
                    {snack.voteCount}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onRestock(snack)}
                      className="h-8 px-3 text-xs"
                      title="Restock"
                      icon={<PackagePlus className="w-3.5 h-3.5 text-coral" />}
                    >
                      Restock
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(snack)}
                      className="h-8 w-8 p-0"
                      title="Edit details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(snack)}
                      className="text-coral hover:bg-coral/10 h-8 w-8 p-0"
                      title="Delete snack"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
