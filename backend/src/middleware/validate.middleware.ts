import { Request, Response, NextFunction } from "express"
import { ZodTypeAny, ZodError } from "zod"
import { BadRequestError } from "../utils/errors.js"

export function validateBody(schema: ZodTypeAny) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body)
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors.map((e) => e.message).join("; ")
        next(new BadRequestError(message))
      } else {
        next(error)
      }
    }
  }
}

export function validateQuery(schema: ZodTypeAny) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = (await schema.parseAsync(req.query)) as any
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors.map((e) => e.message).join("; ")
        next(new BadRequestError(message))
      } else {
        next(error)
      }
    }
  }
}
