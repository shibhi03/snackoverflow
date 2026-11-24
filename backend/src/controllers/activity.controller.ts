import { Request, Response, NextFunction } from "express"
import { activityService } from "../services/activity.service.js"

export class ActivityController {
  /**
   * Global activity log for Admins.
   */
  async listActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20

      const result = await activityService.listActivities(page, limit)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * Personal consumption history for the authenticated Member.
   */
  async listMemberActivities(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20

      const result = await activityService.listMemberActivities(req.user!.id, page, limit)
      res.status(200).json(result)
    } catch (error) {
      next(error)
    }
  }
}

export const activityController = new ActivityController()
