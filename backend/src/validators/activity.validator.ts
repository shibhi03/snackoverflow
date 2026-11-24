import { z } from "zod"

export const queryActivitySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type QueryActivityInput = z.infer<typeof queryActivitySchema>
