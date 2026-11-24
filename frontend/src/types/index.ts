export type Role = "ADMIN" | "MEMBER"

export type SnackCategory = "SWEET" | "SAVOURY" | "DRINK" | "HEALTHY_ISH"

export type ActivityAction = "CONSUMED" | "RESTOCKED"

export type SnackStatus = "STOCKED" | "RUNNING_LOW" | "GONE"

export interface User {
  id: string
  name: string
  email: string
  role: Role
}

export interface Snack {
  id: string
  name: string
  category: SnackCategory
  quantity: number
  lowStockThreshold: number
  status: SnackStatus
  voteCount: number
  hasVoted: boolean
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: string
  userId: string
  userName: string
  snackId: string | null
  snackName: string
  action: ActivityAction
  amount: number
  createdAt: string
}

export interface DashboardSummary {
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
  alerts: Snack[]
  recentActivities: Activity[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export interface ApiError {
  error: {
    code: string
    message: string
  }
}
