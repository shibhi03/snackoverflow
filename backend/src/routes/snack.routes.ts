import { Router } from "express"
import { snackController } from "../controllers/snack.controller.js"
import { authenticate } from "../middleware/auth.middleware.js"
import { requireAdmin } from "../middleware/admin.middleware.js"
import { requireMember } from "../middleware/member.middleware.js"
import { verifyCsrf } from "../middleware/csrf.middleware.js"
import { validateBody, validateQuery } from "../middleware/validate.middleware.js"
import {
  createSnackSchema,
  updateSnackSchema,
  consumeSnackSchema,
  consumeBasketSchema,
  restockSnackSchema,
  querySnacksSchema,
} from "../validators/snack.validator.js"

export const snackRouter = Router()

// Dashboard Summary (Special static route must precede /:id)
snackRouter.get("/summary", authenticate, (req, res, next) =>
  snackController.getSummary(req, res, next),
)

// Member Favourites (Special static route must precede /:id)
snackRouter.get(
  "/favourites",
  authenticate,
  requireMember,
  validateQuery(querySnacksSchema),
  (req, res, next) => snackController.listFavourites(req, res, next),
)

// Atomic multi-item basket consumption (Member only, static route must precede /:id)
snackRouter.post(
  "/consume-basket",
  authenticate,
  requireMember,
  verifyCsrf,
  validateBody(consumeBasketSchema),
  (req, res, next) => snackController.consumeBasket(req, res, next),
)

// List snacks with filters, sorting, and pagination
snackRouter.get("/", authenticate, validateQuery(querySnacksSchema), (req, res, next) =>
  snackController.listSnacks(req, res, next),
)

// Get snack by ID
snackRouter.get("/:id", authenticate, (req, res, next) =>
  snackController.getSnackById(req, res, next),
)

// Create snack (Admin only)
snackRouter.post(
  "/",
  authenticate,
  requireAdmin,
  verifyCsrf,
  validateBody(createSnackSchema),
  (req, res, next) => snackController.createSnack(req, res, next),
)

// Update snack (Admin only)
snackRouter.patch(
  "/:id",
  authenticate,
  requireAdmin,
  verifyCsrf,
  validateBody(updateSnackSchema),
  (req, res, next) => snackController.updateSnack(req, res, next),
)

// Delete snack (Admin only)
snackRouter.delete("/:id", authenticate, requireAdmin, verifyCsrf, (req, res, next) =>
  snackController.deleteSnack(req, res, next),
)

// Single snack consumption (Member only)
snackRouter.post(
  "/:id/consume",
  authenticate,
  requireMember,
  verifyCsrf,
  validateBody(consumeSnackSchema),
  (req, res, next) => snackController.consumeSnack(req, res, next),
)

// Transactional restocking (Admin only)
snackRouter.post(
  "/:id/restock",
  authenticate,
  requireAdmin,
  verifyCsrf,
  validateBody(restockSnackSchema),
  (req, res, next) => snackController.restockSnack(req, res, next),
)

// Cast vote (Member only per consumer role policy, or authenticated)
snackRouter.post("/:id/vote", authenticate, requireMember, verifyCsrf, (req, res, next) =>
  snackController.vote(req, res, next),
)

// Remove vote (Member only)
snackRouter.delete(
  "/:id/vote",
  authenticate,
  requireMember,
  verifyCsrf,
  (req, res, next) => snackController.unvote(req, res, next),
)
