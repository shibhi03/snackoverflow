import { SnackStatus } from "../types/index"

/**
 * Shared dynamic status calculation utility.
 * Matches backend calculation exactly.
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
