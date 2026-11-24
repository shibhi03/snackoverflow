export type Role = "ADMIN" | "MEMBER"

export type SnackCategory = "SWEET" | "SAVOURY" | "DRINK" | "HEALTHY_ISH"

export type ActivityAction = "CONSUMED" | "RESTOCKED"

export type SnackStatus = "STOCKED" | "RUNNING_LOW" | "GONE"

export interface UserPayload {
  id: string
  email: string
  role: Role
  name: string
}

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
  }
}
