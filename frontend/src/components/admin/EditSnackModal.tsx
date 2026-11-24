"use client"

import React, { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Modal } from "../ui/Modal"
import { Input } from "../ui/Input"
import { Button } from "../ui/Button"
import { Snack, SnackCategory } from "../../types/index"
import { UpdateSnackDto } from "../../services/snack.service"

const formSchema = z.object({
  name: z.string().trim().min(1, "Snack name is required").max(120),
  category: z.enum(["SWEET", "SAVOURY", "DRINK", "HEALTHY_ISH"] as const),
  lowStockThreshold: z.coerce.number().int().min(0, "Threshold cannot be negative"),
})

type FormData = z.infer<typeof formSchema>

export function EditSnackModal({
  isOpen,
  onClose,
  snack,
  onSubmit,
  isLoading = false,
}: {
  isOpen: boolean
  onClose: () => void
  snack: Snack | null
  onSubmit: (id: string, data: UpdateSnackDto) => Promise<void>
  isLoading?: boolean
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    if (snack) {
      reset({
        name: snack.name,
        category: snack.category,
        lowStockThreshold: snack.lowStockThreshold,
      })
    }
  }, [snack, reset])

  if (!snack) return null

  const handleFormSubmit = async (data: FormData) => {
    await onSubmit(snack.id, data as UpdateSnackDto)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${snack.name}`}
      description="Update snack configuration or low stock threshold."
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input label="Snack Name" error={errors.name?.message} {...register("name")} />

        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-pantry-text tracking-wide uppercase">
            Category
          </label>
          <select
            className="w-full rounded-2xl border border-pantry-border bg-pantry-surface px-3.5 py-2.5 text-sm text-pantry-text focus:outline-none focus:ring-2 focus:ring-navy-800 dark:focus:ring-navy-600 shadow-2xs"
            {...register("category")}
          >
            <option value="SWEET">🍫 Sweet</option>
            <option value="SAVOURY">🥨 Savoury</option>
            <option value="DRINK">🧃 Drink</option>
            <option value="HEALTHY_ISH">🥗 Healthy-ish</option>
          </select>
          {errors.category?.message && (
            <p className="text-xs text-rose-600">{errors.category.message}</p>
          )}
        </div>

        <Input
          label="Low Stock Alert Threshold"
          type="number"
          min={0}
          error={errors.lowStockThreshold?.message}
          helperText="Triggers warning alerts when stock is at or below this value."
          {...register("lowStockThreshold")}
        />

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
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
