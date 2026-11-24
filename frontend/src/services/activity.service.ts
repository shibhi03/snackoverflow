import { apiFetch } from "./api"
import { Activity, PaginatedResponse } from "../types/index"

export const activityService = {
  /**
   * Global activity audit log (Admin only).
   */
  async listActivities(page = 1, limit = 20): Promise<PaginatedResponse<Activity>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    return apiFetch<PaginatedResponse<Activity>>(`/activities?${params.toString()}`)
  },

  /**
   * Personal consumption history for the logged-in Member.
   */
  async listMyActivities(page = 1, limit = 20): Promise<PaginatedResponse<Activity>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    })

    return apiFetch<PaginatedResponse<Activity>>(`/activities/me?${params.toString()}`)
  },
}
