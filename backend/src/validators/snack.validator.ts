import { z } from "zod"
import { SnackCategory } from "@prisma/client"

export const createSnackSchema = z.object({
  name: z.string().trim().min(1, "Snack name is required").max(120),
  category: z.nativeEnum(SnackCategory, {
    errorMap: () => ({
      message: "Category must be SWEET, SAVOURY, DRINK, or HEALTHY_ISH",
    }),
  }),
  quantity: z
    .number()
    .int("Quantity must be an integer")
    .min(0, "Quantity cannot be negative")
    .default(0),
  lowStockThreshold: z
    .number()
    .int("Threshold must be an integer")
    .min(0, "Threshold cannot be negative")
    .default(5),
})

export const updateSnackSchema = z.object({
  name: z.string().trim().min(1, "Snack name cannot be empty").max(120).optional(),
  category: z.nativeEnum(SnackCategory).optional(),
  lowStockThreshold: z.number().int().min(0, "Threshold cannot be negative").optional(),
})

export const consumeSnackSchema = z.object({
  amount: z
    .number()
    .int("Amount must be an integer")
    .positive("Consumption amount must be a positive integer"),
})

export const restockSnackSchema = z.object({
  amount: z
    .number()
    .int("Amount must be an integer")
    .positive("Restock amount must be a positive integer"),
})

export const basketItemSchema = z.object({
  snackId: z.string().uuid("Invalid snack UUID format"),
  amount: z
    .number()
    .int("Amount must be an integer")
    .positive("Consumption amount must be a positive integer"),
})

export const consumeBasketSchema = z.object({
  items: z
    .array(basketItemSchema)
    .min(1, "Basket cannot be empty")
    .refine(
      (items) => {
        const ids = items.map((i) => i.snackId)
        return new Set(ids).size === ids.length
      },
      { message: "Basket cannot contain duplicate snack items" },
    ),
})

export const querySnacksSchema = z.object({
  category: z.nativeEnum(SnackCategory).optional(),
  status: z.enum(["STOCKED", "RUNNING_LOW", "GONE"]).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  sortBy: z.enum(["name", "quantity", "votes"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  onlyFavourites: z
    .preprocess((val) => {
      if (val === "true" || val === true) return true
      if (val === "false" || val === false) return false
      return undefined
    }, z.boolean().optional())
    .optional(),
})

export type CreateSnackInput = z.infer<typeof createSnackSchema>
export type UpdateSnackInput = z.infer<typeof updateSnackSchema>
export type ConsumeSnackInput = z.infer<typeof consumeSnackSchema>
export type RestockSnackInput = z.infer<typeof restockSnackSchema>
export type BasketItemInput = z.infer<typeof basketItemSchema>
export type ConsumeBasketInput = z.infer<typeof consumeBasketSchema>
export type QuerySnacksInput = z.infer<typeof querySnacksSchema>
