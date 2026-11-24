import { SnackStatus } from "../types/index.js"

/**
 * Calculates dynamic snack inventory status.
 * Never stored statically in the database.
 *
 * Rules:
 * - STOCKED: quantity > lowStockThreshold
 * - RUNNING_LOW: quantity > 0 AND quantity <= lowStockThreshold
 * - GONE: quantity = 0
 */
export function calculateSnackStatus(
  quantity: number,
  lowStockThreshold: number,
): SnackStatus {
  if (quantity <= 0) {
    return "GONE"
  }
  if (quantity <= lowStockThreshold) {
    return "RUNNING_LOW"
  }
  return "STOCKED"
}
