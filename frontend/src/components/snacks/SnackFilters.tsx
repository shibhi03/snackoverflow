"use client"

import React from "react"
import { SnackCategory, SnackStatus } from "../../types/index"
import { Search } from "lucide-react"
import { cn } from "../../lib/utils"

export interface SnackFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  category: SnackCategory | ""
  onCategoryChange: (value: SnackCategory | "") => void
  status: SnackStatus | ""
  onStatusChange: (value: SnackStatus | "") => void
  sortBy: "name" | "quantity" | "votes"
  onSortByChange: (value: "name" | "quantity" | "votes") => void
  sortOrder: "asc" | "desc"
  onSortOrderChange: (value: "asc" | "desc") => void
}

export function SnackFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  status,
  onStatusChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
}: SnackFiltersProps) {
  const categories: Array<{ id: SnackCategory | ""; label: string; icon: string }> = [
    { id: "", label: "All", icon: "✦" },
    { id: "SWEET", label: "Sweet", icon: "🍫" },
    { id: "SAVOURY", label: "Savoury", icon: "🥨" },
    { id: "DRINK", label: "Drinks", icon: "🧃" },
    { id: "HEALTHY_ISH", label: "Healthy-ish", icon: "🥗" },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-pantry-muted" />
          <input
            type="text"
            placeholder="Search snacks by name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-full border border-pantry-border bg-pantry-elevated text-sm text-pantry-text placeholder:text-pantry-muted/70 focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as SnackStatus | "")}
            className="px-4 py-2.5 rounded-full border border-pantry-border bg-pantry-elevated text-xs font-semibold text-pantry-text focus:outline-none focus:ring-2 focus:ring-coral/30"
          >
            <option value="">All Statuses</option>
            <option value="STOCKED">Stocked</option>
            <option value="RUNNING_LOW">Running Low</option>
            <option value="GONE">Gone</option>
          </select>

          <div className="flex items-center rounded-full border border-pantry-border bg-pantry-elevated overflow-hidden">
            <select
              value={sortBy}
              onChange={(e) =>
                onSortByChange(e.target.value as "name" | "quantity" | "votes")
              }
              className="px-4 py-2.5 bg-transparent text-xs font-semibold text-pantry-text focus:outline-none border-r border-pantry-border"
            >
              <option value="name">Sort: Name</option>
              <option value="quantity">Sort: Stock</option>
              <option value="votes">Sort: Votes</option>
            </select>
            <button
              type="button"
              onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
              title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
              className="px-3 py-2.5 text-xs font-bold text-pantry-muted hover:text-coral transition-colors"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = category === cat.id
          return (
            <button
              key={cat.id || "all"}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all select-none",
                isSelected ? "ordan-btn-dark text-white" : "ordan-btn-light",
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
