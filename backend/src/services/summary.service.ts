import { prisma } from "../config/database.js"
import { calculateSnackStatus } from "../utils/status.js"
import { SnackCategory } from "@prisma/client"

export interface DashboardSummaryDto {
  totalSnackTypes: number
  totalPackets: number
  stockedCount: number
  runningLowCount: number
  goneCount: number
  snackOfTheWeek: {
    id: string
    name: string
    category: SnackCategory
    quantity: number
    weeklyVotes: number
  } | null
  alerts: Array<{
    id: string
    name: string
    category: SnackCategory
    quantity: number
    lowStockThreshold: number
    status: "STOCKED" | "RUNNING_LOW" | "GONE"
  }>
  recentActivities: Array<{
    id: string
    action: "CONSUMED" | "RESTOCKED"
    amount: number
    snackName: string
    userName: string
    createdAt: Date
  }>
}

export class SummaryService {
  /**
   * Computes pantry dashboard metrics and Snack of the Week.
   * Snack of the Week is derived from votes cast within the current calendar week
   * (Monday 00:00:00 UTC to Sunday 23:59:59 UTC).
   * Tie-breaker:
   * 1. Weekly votes (DESC)
   * 2. Highest available quantity (DESC)
   * 3. Alphabetical name (ASC)
   */
  async getDashboardSummary(): Promise<DashboardSummaryDto> {
    // 1. Overall Inventory Counts
    const snacks = await prisma.snack.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        quantity: true,
        lowStockThreshold: true,
      },
    })

    const totalSnackTypes = snacks.length
    let totalPackets = 0
    let stockedCount = 0
    let runningLowCount = 0
    let goneCount = 0

    for (const s of snacks) {
      totalPackets += s.quantity
      const status = calculateSnackStatus(s.quantity, s.lowStockThreshold)
      if (status === "STOCKED") stockedCount++
      else if (status === "RUNNING_LOW") runningLowCount++
      else if (status === "GONE") goneCount++
    }

    // 2. Snack of the Week (Current calendar week UTC)
    const now = new Date()
    const dayOfWeek = now.getUTCDay() // 0 is Sunday, 1 is Monday...
    const distanceToMonday = (dayOfWeek + 6) % 7
    const startOfWeek = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - distanceToMonday,
        0,
        0,
        0,
        0,
      ),
    )

    // Query weekly votes with deterministic tie-breaking
    const weeklyVoteResults = await prisma.$queryRaw<
      Array<{
        id: string
        name: string
        category: SnackCategory
        quantity: number
        weeklyVotes: number
      }>
    >`
      SELECT
        s.id,
        s.name,
        s.category,
        s.quantity,
        COUNT(v.id)::int AS "weeklyVotes"
      FROM "snacks" s
      LEFT JOIN "votes" v
        ON v."snackId" = s.id AND v."createdAt" >= ${startOfWeek}
      GROUP BY s.id, s.name, s.category, s.quantity
      ORDER BY "weeklyVotes" DESC, s.quantity DESC, s.name ASC
      LIMIT 1;
    `

    const topSnack = weeklyVoteResults[0]
    const snackOfTheWeek = topSnack && topSnack.weeklyVotes > 0 ? topSnack : null

    // 3. Low Stock Alerts (Gone & Running Low)
    const alerts = snacks
      .filter((s) => s.quantity <= s.lowStockThreshold)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        quantity: s.quantity,
        lowStockThreshold: s.lowStockThreshold,
        status: calculateSnackStatus(s.quantity, s.lowStockThreshold),
      }))

    // 4. Recent Activities Preview
    const recentActivitiesRaw = await prisma.activity.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true },
        },
      },
    })

    const recentActivities = recentActivitiesRaw.map((a) => ({
      id: a.id,
      action: a.action,
      amount: a.amount,
      snackName: a.snackName,
      userName: a.user.name,
      createdAt: a.createdAt,
    }))

    return {
      totalSnackTypes,
      totalPackets,
      stockedCount,
      runningLowCount,
      goneCount,
      snackOfTheWeek,
      alerts,
      recentActivities,
    }
  }
}

export const summaryService = new SummaryService()
