"use client"

import React, { useState } from "react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { Input } from "../ui/Input"
import { Snack } from "../../types/index"
import { PackagePlus } from "lucide-react"

export function RestockModal({
  isOpen,
  onClose,
  snack,
  onRestock,
  isLoading = false,
}: {
  isOpen: boolean
  onClose: () => void
  snack: Snack | null
  onRestock: (snackId: string, amount: number) => Promise<void>
  isLoading?: boolean
}) {
  const [amount, setAmount] = useState<number>(10)
  const [error, setError] = useState<string>("")

  if (!snack) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || amount <= 0) {
      setError("Amount must be a positive integer")
      return
    }
    setError("")
    await onRestock(snack.id, amount)
    onClose()
  }

  const newProjectedStock = snack.quantity + (amount || 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Restock ${snack.name}`}
      description="Add pantry inventory packets."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current & Projected Stock Preview */}
        <div className="p-3.5 rounded-2xl bg-pantry-subtle border border-pantry-border flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-400 dark:text-gray-500 block">Current Stock</span>
            <span className="text-base font-extrabold text-pantry-text">
              {snack.quantity}
            </span>{" "}
            packets
          </div>
          <span className="text-gray-400 font-bold">+</span>
          <div>
            <span className="text-gray-400 dark:text-gray-500 block">Adding</span>
            <span className="text-base font-extrabold text-coral">
              {amount || 0}
            </span>{" "}
            packets
          </div>
          <span className="text-gray-400 font-bold">=</span>
          <div>
            <span className="text-gray-400 dark:text-gray-500 block">
              Projected Total
            </span>
            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              {newProjectedStock}
            </span>{" "}
            packets
          </div>
        </div>

        <Input
          label="Packets to Add"
          type="number"
          min={1}
          value={amount}
          onChange={(e) => {
            setAmount(parseInt(e.target.value, 10) || 0)
            setError("")
          }}
          error={error}
        />

        {/* Quick Amount Pills */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Quick add:
          </span>
          {[5, 10, 20, 50].map((qty) => (
            <button
              key={qty}
              type="button"
              onClick={() => setAmount(qty)}
              className="px-2.5 py-1 rounded-xl text-xs font-bold bg-pantry-surface border border-pantry-border hover:bg-pantry-subtle text-pantry-text transition-colors shadow-2xs"
            >
              +{qty}
            </button>
          ))}
        </div>

        <div className="pt-4 flex items-center justify-end gap-2 border-t border-pantry-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            icon={<PackagePlus className="w-4 h-4" />}
          >
            Confirm Restock
          </Button>
        </div>
      </form>
    </Modal>
  )
}
