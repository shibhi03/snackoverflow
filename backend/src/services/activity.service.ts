import { prisma } from "../config/database.js"

export interface ActivityDto {
  id: string
  userId: string
  userName: string
  snackId: string | null
  snackName: string
  action: "CONSUMED" | "RESTOCKED"
  amount: number
  createdAt: Date
}

export class ActivityService {
  /**
   * Retrieves paginated global audit logs (Admin only).
   */
  async listActivities(
    page = 1,
    limit = 20,
  ): Promise<{
    data: ActivityDto[]
    pagination: { page: number; limit: number; totalItems: number; totalPages: number }
  }> {
    const offset = (page - 1) * limit

    const [totalItems, rows] = await Promise.all([
      prisma.activity.count(),
      prisma.activity.findMany({
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true },
          },
        },
      }),
    ])

    const totalPages = Math.ceil(totalItems / limit) || 1

    const data: ActivityDto[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      snackId: r.snackId,
      snackName: r.snackName,
      action: r.action,
      amount: r.amount,
      createdAt: r.createdAt,
    }))

    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    }
  }

  /**
   * Retrieves paginated personal consumption history for the authenticated Member.
   * Strictly filters by the authenticated user's ID and only returns CONSUMED actions.
   * Never exposes restocks or other members' consumption events.
   */
  async listMemberActivities(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: ActivityDto[]
    pagination: { page: number; limit: number; totalItems: number; totalPages: number }
  }> {
    const offset = (page - 1) * limit

    const [totalItems, rows] = await Promise.all([
      prisma.activity.count({
        where: {
          userId,
          action: "CONSUMED",
        },
      }),
      prisma.activity.findMany({
        where: {
          userId,
          action: "CONSUMED",
        },
        skip: offset,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true },
          },
        },
      }),
    ])

    const totalPages = Math.ceil(totalItems / limit) || 1

    const data: ActivityDto[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      snackId: r.snackId,
      snackName: r.snackName,
      action: r.action,
      amount: r.amount,
      createdAt: r.createdAt,
    }))

    return {
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
    }
  }
}

export const activityService = new ActivityService()
