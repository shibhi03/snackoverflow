import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(1, "Password is required").max(100),
})

export type LoginInput = z.infer<typeof loginSchema>

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name cannot exceed 100 characters"),
    email: z
      .string()
      .trim()
      .email("Invalid email address")
      .max(255, "Email cannot exceed 255 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(100, "Password cannot exceed 100 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one digit")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword !== undefined && data.confirmPassword !== null) {
        return data.password === data.confirmPassword
      }
      return true
    },
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  )

export type RegisterInput = z.infer<typeof registerSchema>
