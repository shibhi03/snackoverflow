"use client"

import React from "react"
import { Modal } from "../ui/Modal"
import { Button } from "../ui/Button"
import { Snack } from "../../types/index"
import { AlertTriangle, Trash2 } from "lucide-react"

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  snack: Snack | null
  onConfirm: (id: string) => Promise<void>
  isLoading?: boolean
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  snack,
  onConfirm,
  isLoading = false,
}: DeleteConfirmModalProps) {
  if (!snack) return null

  const handleDelete = async () => {
    await onConfirm(snack.id)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Snack"
      description="Confirm removal from office inventory."
    >
      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-950 dark:text-rose-200 space-y-1">
            <p className="font-bold">Are you sure you want to delete {snack.name}?</p>
            <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
              This action cannot be undone. Historical activity logs will be safely
              preserved with a snapshot of this snack&apos;s name.
            </p>
          </div>
        </div>

        <div className="bg-pantry-subtle p-3.5 rounded-2xl border border-pantry-border flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400 font-medium">
            Current Stock
          </span>
          <span className="font-bold text-pantry-text">{snack.quantity} packets</span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold"
            onClick={handleDelete}
            isLoading={isLoading}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Delete Snack
          </Button>
        </div>
      </div>
    </Modal>
  )
}
