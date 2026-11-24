import { apiFetch } from "./api"
import { Snack, DashboardSummary, PaginatedResponse, SnackCategory } from "../types/index"

export interface SnackFilters {
  category?: SnackCategory | ""
  status?: "STOCKED" | "RUNNING_LOW" | "GONE" | ""
  search?: string
  page?: number
  limit?: number
  sortBy?: "name" | "quantity" | "votes"
  sortOrder?: "asc" | "desc"
  onlyFavourites?: boolean
}

export interface CreateSnackDto {
  name: string
  category: SnackCategory
  quantity: number
  lowStockThreshold: number
}

export interface UpdateSnackDto {
  name?: string
  category?: SnackCategory
  lowStockThreshold?: number
}

export interface BasketConsumeItemDto {
  snackId: string
  amount: number
}

export interface BasketConsumeResponse {
  message: string
  totalPackets: number
  items: Array<{
    snackId: string
    snackName: string
    amount: number
    remainingQuantity: number
    status: "STOCKED" | "RUNNING_LOW" | "GONE"
  }>
}

export const snackService = {
  async listSnacks(filters: SnackFilters = {}): Promise<PaginatedResponse<Snack>> {
    const params = new URLSearchParams()

    if (filters.category) params.set("category", filters.category)
    if (filters.status) params.set("status", filters.status)
    if (filters.search) params.set("search", filters.search)
    if (filters.page) params.set("page", filters.page.toString())
    if (filters.limit) params.set("limit", filters.limit.toString())
    if (filters.sortBy) params.set("sortBy", filters.sortBy)
    if (filters.sortOrder) params.set("sortOrder", filters.sortOrder)
    if (filters.onlyFavourites) params.set("onlyFavourites", "true")

    const queryString = params.toString()
    return apiFetch<PaginatedResponse<Snack>>(
      `/snacks${queryString ? `?${queryString}` : ""}`,
    )
  },

  async getSnacks(filters: SnackFilters = {}): Promise<PaginatedResponse<Snack>> {
    return this.listSnacks(filters)
  },

  async getFavourites(page = 1, limit = 20): Promise<PaginatedResponse<Snack>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })
    return apiFetch<PaginatedResponse<Snack>>(`/snacks/favourites?${params.toString()}`)
  },

  async getSnack(id: string): Promise<Snack> {
    return apiFetch<Snack>(`/snacks/${id}`)
  },

  async createSnack(dto: CreateSnackDto): Promise<Snack> {
    return apiFetch<Snack>("/snacks", {
      method: "POST",
      body: JSON.stringify(dto),
    })
  },

  async updateSnack(id: string, dto: UpdateSnackDto): Promise<Snack> {
    return apiFetch<Snack>(`/snacks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    })
  },

  async deleteSnack(id: string): Promise<void> {
    await apiFetch<{ message: string }>(`/snacks/${id}`, {
      method: "DELETE",
    })
  },

  async consumeBasket(
    items: BasketConsumeItemDto[],
    idempotencyKey?: string,
  ): Promise<BasketConsumeResponse> {
    const headers: Record<string, string> = {}
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey
    }
    return apiFetch<BasketConsumeResponse>("/snacks/consume-basket", {
      method: "POST",
      headers,
      body: JSON.stringify({ items }),
    })
  },

  async consumeSnack(
    id: string,
    amount = 1,
    idempotencyKey?: string,
  ): Promise<{ snack: Snack; consumedAmount: number }> {
    const headers: Record<string, string> = {}
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey
    }
    return apiFetch<{ message: string; snack: Snack; consumedAmount: number }>(
      `/snacks/${id}/consume`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ amount }),
      },
    )
  },

  async consume(
    id: string,
    amount = 1,
    idempotencyKey?: string,
  ): Promise<{ snack: Snack; consumedAmount: number }> {
    return this.consumeSnack(id, amount, idempotencyKey)
  },

  async restockSnack(
    id: string,
    amount: number,
  ): Promise<{ snack: Snack; restockedAmount: number }> {
    return apiFetch<{ message: string; snack: Snack; restockedAmount: number }>(
      `/snacks/${id}/restock`,
      {
        method: "POST",
        body: JSON.stringify({ amount }),
      },
    )
  },

  async restock(
    id: string,
    amount: number,
  ): Promise<{ snack: Snack; restockedAmount: number }> {
    return this.restockSnack(id, amount)
  },

  async vote(id: string): Promise<{ voteCount: number; hasVoted: boolean }> {
    return apiFetch<{ message: string; voteCount: number; hasVoted: boolean }>(
      `/snacks/${id}/vote`,
      {
        method: "POST",
      },
    )
  },

  async unvote(id: string): Promise<{ voteCount: number; hasVoted: boolean }> {
    return apiFetch<{ message: string; voteCount: number; hasVoted: boolean }>(
      `/snacks/${id}/vote`,
      {
        method: "DELETE",
      },
    )
  },

  async getSummary(): Promise<DashboardSummary> {
    return apiFetch<DashboardSummary>("/snacks/summary")
  },
}
