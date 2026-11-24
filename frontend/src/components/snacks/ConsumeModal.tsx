"use client"

import React, { useState, useEffect } from "react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { Snack } from "../../types/index"
import { Utensils, AlertTriangle } from "lucide-react"

interface ConsumeModalProps {
  isOpen: boolean
  onClose: () => void
  snack: Snack | null
  onConfirm: (snack: Snack, amount: number, idempotencyKey?: string) => Promise<void>
  isLoading?: boolean
}

export function ConsumeModal({
  isOpen,
  onClose,
  snack,
  onConfirm,
  isLoading = false,
}: ConsumeModalProps) {
  const [amount, setAmount] = useState<number>(1)
  const [error, setError] = useState<string>("")
  const [idempotencyKey, setIdempotencyKey] = useState<string>("")

  useEffect(() => {
    if (snack && isOpen) {
      setAmount(1)
      setError("")
      setIdempotencyKey(
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `consume-${Date.now()}`,
      )
    }
  }, [snack, isOpen])

  if (!snack) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount <= 0) {
      setError("Amount must be at least 1")
      return
    }
    if (amount > snack.quantity) {
      setError(`Only ${snack.quantity} packet(s) remaining`)
      return
    }
    setError("")
    await onConfirm(snack, amount, idempotencyKey)
  }

  const projectedRemaining = Math.max(0, snack.quantity - amount)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Grab ${snack.name}`}
      description="Enjoy a snack from the office pantry."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current & Projected Stock Preview */}
        <div className="p-3.5 rounded-xl bg-pantry-subtle border border-pantry-border flex items-center justify-between text-xs">
          <div>
            <p className="text-gray-500 font-medium">Available in Pantry</p>
            <p className="font-extrabold text-navy-900 text-base">
              {snack.quantity} packets
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 font-medium">After grab</p>
            <p
              className={`font-extrabold text-base ${
                projectedRemaining === 0
                  ? "text-rose-600"
                  : projectedRemaining <= snack.lowStockThreshold
                    ? "text-amber-600"
                    : "text-emerald-700"
              }`}
            >
              {projectedRemaining} packets
            </p>
          </div>
        </div>

        {/* Quantity Selection */}
        <div>
          <label className="block text-xs font-bold text-navy-900 mb-1.5">
            How many packets are you taking?
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                disabled={num > snack.quantity || isLoading}
                onClick={() => setAmount(num)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  amount === num
                    ? "bg-navy-900 text-white border-navy-900 shadow-sm"
                    : "bg-white text-gray-700 border-pantry-border hover:bg-pantry-subtle disabled:opacity-40 disabled:hover:bg-white"
                }`}
              >
                {num} pkt{num > 1 ? "s" : ""}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <input
              type="number"
              min={1}
              max={snack.quantity}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 rounded-xl border border-pantry-border text-xs focus:outline-hidden focus:ring-2 focus:ring-coral/20 focus:border-coral"
              placeholder="Or enter custom amount"
            />
          </div>

          {error && (
            <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="coral"
            isLoading={isLoading}
            icon={<Utensils className="w-4 h-4" />}
          >
            Confirm Grab ({amount})
          </Button>
        </div>
      </form>
    </Modal>
  )
}
