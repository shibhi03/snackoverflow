import { Prisma, SnackCategory } from "@prisma/client"
import { prisma } from "../config/database.js"
import { calculateSnackStatus } from "../utils/status.js"
import {
  NotFoundError,
  InsufficientStockError,
  ConflictError,
  BadRequestError,
} from "../utils/errors.js"
import {
  CreateSnackInput,
  UpdateSnackInput,
  QuerySnacksInput,
  BasketItemInput,
} from "../validators/snack.validator.js"

export interface SnackWithMeta {
  id: string
  name: string
  category: SnackCategory
  quantity: number
  lowStockThreshold: number
  status: "STOCKED" | "RUNNING_LOW" | "GONE"
  voteCount: number
  hasVoted: boolean
  createdAt: Date
  updatedAt: Date
}

export class SnackService {
  /**
   * Lists snacks with server-side filtering (category, status, search),
   * server-side sorting (name, quantity, votes), and pagination.
   */
  async listSnacks(
    query: QuerySnacksInput,
    currentUserId?: string,
  ): Promise<{
    data: SnackWithMeta[]
    pagination: { page: number; limit: number; totalItems: number; totalPages: number }
  }> {
    const { page, limit, category, status, search, sortBy, sortOrder } = query
    const offset = (page - 1) * limit

    // Build dynamic SQL conditions
    const conditions: Prisma.Sql[] = []

    if (category) {
      conditions.push(Prisma.sql`s.category = ${category}::"SnackCategory"`)
    }

    if (search) {
      const searchPattern = `%${search}%`
      conditions.push(Prisma.sql`s.name ILIKE ${searchPattern}`)
    }

    if (status === "GONE") {
      conditions.push(Prisma.sql`s.quantity = 0`)
    } else if (status === "RUNNING_LOW") {
      conditions.push(Prisma.sql`s.quantity > 0 AND s.quantity <= s."lowStockThreshold"`)
    } else if (status === "STOCKED") {
      conditions.push(Prisma.sql`s.quantity > s."lowStockThreshold"`)
    }

    if (query.onlyFavourites && currentUserId) {
      conditions.push(
        Prisma.sql`EXISTS (SELECT 1 FROM "votes" v_fav WHERE v_fav."snackId" = s.id AND v_fav."userId" = ${currentUserId}::uuid)`,
      )
    }

    const whereClause =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty

    // Total matching records
    const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "snacks" s
      ${whereClause}
    `
    const totalItems = Number(countResult[0]?.count || 0)
    const totalPages = Math.ceil(totalItems / limit) || 1

    // Sorting definition
    let orderBySql: Prisma.Sql
    const direction =
      sortOrder.toUpperCase() === "DESC" ? Prisma.sql`DESC` : Prisma.sql`ASC`

    if (sortBy === "quantity") {
      orderBySql = Prisma.sql`s.quantity ${direction}, s.name ASC`
    } else if (sortBy === "votes") {
      orderBySql = Prisma.sql`"voteCount" ${direction}, s.name ASC`
    } else {
      orderBySql = Prisma.sql`s.name ${direction}`
    }

    // Query records with vote aggregation and user vote state
    const userIdSql = currentUserId
      ? Prisma.sql`${currentUserId}::uuid`
      : Prisma.sql`NULL::uuid`

    const rows = await prisma.$queryRaw<
      Array<{
        id: string
        name: string
        category: SnackCategory
        quantity: number
        lowStockThreshold: number
        createdAt: Date
        updatedAt: Date
        voteCount: number
        hasVoted: boolean
      }>
    >`
      SELECT
        s.id,
        s.name,
        s.category,
        s.quantity,
        s."lowStockThreshold",
        s."createdAt",
        s."updatedAt",
        COALESCE(v_count.count, 0)::int AS "voteCount",
        CASE
          WHEN ${userIdSql} IS NOT NULL AND v_user.id IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS "hasVoted"
      FROM "snacks" s
      LEFT JOIN (
        SELECT "snackId", COUNT(*)::int AS count
        FROM "votes"
        GROUP BY "snackId"
      ) v_count ON v_count."snackId" = s.id
      LEFT JOIN "votes" v_user
        ON v_user."snackId" = s.id AND v_user."userId" = ${userIdSql}
      ${whereClause}
      ORDER BY ${orderBySql}
      LIMIT ${limit} OFFSET ${offset}
    `

    const data: SnackWithMeta[] = rows.map((r) => ({
      ...r,
      status: calculateSnackStatus(r.quantity, r.lowStockThreshold),
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
   * Retrieves single snack details by UUID.
   */
  async getSnackById(id: string, currentUserId?: string): Promise<SnackWithMeta> {
    const userIdSql = currentUserId
      ? Prisma.sql`${currentUserId}::uuid`
      : Prisma.sql`NULL::uuid`

    const rows = await prisma.$queryRaw<
      Array<{
        id: string
        name: string
        category: SnackCategory
        quantity: number
        lowStockThreshold: number
        createdAt: Date
        updatedAt: Date
        voteCount: number
        hasVoted: boolean
      }>
    >`
      SELECT
        s.id,
        s.name,
        s.category,
        s.quantity,
        s."lowStockThreshold",
        s."createdAt",
        s."updatedAt",
        COALESCE(v_count.count, 0)::int AS "voteCount",
        CASE
          WHEN ${userIdSql} IS NOT NULL AND v_user.id IS NOT NULL THEN TRUE
          ELSE FALSE
        END AS "hasVoted"
      FROM "snacks" s
      LEFT JOIN (
        SELECT "snackId", COUNT(*)::int AS count
        FROM "votes"
        GROUP BY "snackId"
      ) v_count ON v_count."snackId" = s.id
      LEFT JOIN "votes" v_user
        ON v_user."snackId" = s.id AND v_user."userId" = ${userIdSql}
      WHERE s.id = ${id}::uuid
      LIMIT 1
    `

    if (rows.length === 0) {
      throw new NotFoundError("Snack not found.")
    }

    const r = rows[0]
    return {
      ...r,
      status: calculateSnackStatus(r.quantity, r.lowStockThreshold),
    }
  }

  /**
   * Creates a new snack in inventory (Admin only).
   */
  async createSnack(input: CreateSnackInput): Promise<SnackWithMeta> {
    const existing = await prisma.snack.findUnique({
      where: { name: input.name },
    })
    if (existing) {
      throw new ConflictError(`A snack named '${input.name}' already exists.`)
    }

    const created = await prisma.snack.create({
      data: {
        name: input.name,
        category: input.category,
        quantity: input.quantity,
        lowStockThreshold: input.lowStockThreshold,
      },
    })

    return {
      ...created,
      status: calculateSnackStatus(created.quantity, created.lowStockThreshold),
      voteCount: 0,
      hasVoted: false,
    }
  }

  /**
   * Updates an existing snack's metadata (Admin only).
   */
  async updateSnack(id: string, input: UpdateSnackInput): Promise<SnackWithMeta> {
    const snack = await prisma.snack.findUnique({ where: { id } })
    if (!snack) {
      throw new NotFoundError("Snack not found.")
    }

    if (input.name && input.name !== snack.name) {
      const duplicate = await prisma.snack.findUnique({ where: { name: input.name } })
      if (duplicate) {
        throw new ConflictError(`A snack named '${input.name}' already exists.`)
      }
    }

    const updated = await prisma.snack.update({
      where: { id },
      data: {
        name: input.name ?? snack.name,
        category: input.category ?? snack.category,
        lowStockThreshold: input.lowStockThreshold ?? snack.lowStockThreshold,
      },
    })

    return this.getSnackById(updated.id)
  }

  /**
   * Deletes a snack from inventory (Admin only).
   * Relational integrity: Preserves historical activities via ON DELETE SET NULL.
   */
  async deleteSnack(id: string): Promise<void> {
    const snack = await prisma.snack.findUnique({ where: { id } })
    if (!snack) {
      throw new NotFoundError("Snack not found.")
    }

    await prisma.snack.delete({ where: { id } })
  }

  /**
   * Consumes inventory packets using atomic row-level conditional SQL.
   * Concurrency Safe: Serialized at PostgreSQL row level.
   * Decrements quantity if and only if quantity >= amount.
   * Records Activity in the exact same transaction.
   */
  async consumeSnack(
    snackId: string,
    amount: number,
    userId: string,
  ): Promise<{ snack: SnackWithMeta; consumedAmount: number }> {
    if (amount <= 0) {
      throw new BadRequestError("Consumption amount must be a positive integer.")
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Atomic conditional decrement: Only updates if sufficient stock exists
      const updatedRows = await tx.$queryRaw<
        Array<{
          id: string
          name: string
          category: SnackCategory
          quantity: number
          lowStockThreshold: number
          createdAt: Date
          updatedAt: Date
        }>
      >`
        UPDATE "snacks"
        SET "quantity" = "quantity" - ${amount}, "updatedAt" = NOW()
        WHERE "id" = ${snackId}::uuid AND "quantity" >= ${amount}
        RETURNING *;
      `

      // 2. Disambiguate if 0 rows modified
      if (updatedRows.length === 0) {
        const existing = await tx.snack.findUnique({ where: { id: snackId } })
        if (!existing) {
          throw new NotFoundError("Snack not found.")
        }
        // Stock was insufficient (another concurrent request depleted it)
        throw new InsufficientStockError(
          "Someone beat you to the last packet! Please refresh the inventory.",
        )
      }

      const updatedSnack = updatedRows[0]

      // 3. Insert audit log activity in the exact same transaction
      await tx.activity.create({
        data: {
          userId,
          snackId: updatedSnack.id,
          snackName: updatedSnack.name,
          action: "CONSUMED",
          amount,
        },
      })

      // 4. Return updated snack with status
      const snackWithMeta: SnackWithMeta = {
        ...updatedSnack,
        status: calculateSnackStatus(
          updatedSnack.quantity,
          updatedSnack.lowStockThreshold,
        ),
        voteCount: 0, // Populated on full fetch
        hasVoted: false,
      }

      return {
        snack: snackWithMeta,
        consumedAmount: amount,
      }
    })
  }

  /**
   * Atomically consumes multiple snacks in a basket (Member only).
   * All-or-Nothing Guarantee:
   * Wrapped in a single PostgreSQL transaction.
   * If any item is missing or has insufficient stock, the entire basket operation
   * aborts and rolls back completely, ensuring no partial deductions or corrupt state.
   */
  async consumeBasket(
    items: BasketItemInput[],
    userId: string,
  ): Promise<{
    message: string
    totalPackets: number
    items: Array<{
      snackId: string
      snackName: string
      amount: number
      remainingQuantity: number
      status: "STOCKED" | "RUNNING_LOW" | "GONE"
    }>
  }> {
    if (!items || items.length === 0) {
      throw new BadRequestError("Basket cannot be empty.")
    }

    const uniqueIds = new Set(items.map((i) => i.snackId))
    if (uniqueIds.size !== items.length) {
      throw new BadRequestError("Basket cannot contain duplicate snack items.")
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Verify existence of all requested snacks
      const snackIds = items.map((i) => i.snackId)
      const existingSnacks = await tx.snack.findMany({
        where: { id: { in: snackIds } },
      })

      if (existingSnacks.length !== items.length) {
        const foundIds = new Set(existingSnacks.map((s) => s.id))
        const missing = items.find((i) => !foundIds.has(i.snackId))
        throw new NotFoundError(
          `Snack with ID '${missing?.snackId}' was not found in pantry inventory.`,
        )
      }

      const snackMap = new Map(existingSnacks.map((s) => [s.id, s]))
      const results: Array<{
        snackId: string
        snackName: string
        amount: number
        remainingQuantity: number
        status: "STOCKED" | "RUNNING_LOW" | "GONE"
      }> = []

      let totalPackets = 0

      // 2. Perform conditional atomic decrements with PostgreSQL row-level locks
      for (const item of items) {
        const snackBefore = snackMap.get(item.snackId)!

        const updatedRows = await tx.$queryRaw<
          Array<{
            id: string
            name: string
            category: SnackCategory
            quantity: number
            lowStockThreshold: number
            createdAt: Date
            updatedAt: Date
          }>
        >`
          UPDATE "snacks"
          SET "quantity" = "quantity" - ${item.amount}, "updatedAt" = NOW()
          WHERE "id" = ${item.snackId}::uuid AND "quantity" >= ${item.amount}
          RETURNING *;
        `

        if (updatedRows.length === 0) {
          // Fetch current live stock for precise error details
          const currentLive = await tx.snack.findUnique({ where: { id: item.snackId } })
          const available = currentLive ? currentLive.quantity : 0
          throw new InsufficientStockError(
            `Insufficient stock for '${snackBefore.name}'. Requested: ${item.amount}, Available: ${available}. Please refresh your basket.`,
          )
        }

        const updatedSnack = updatedRows[0]
        totalPackets += item.amount

        // 3. Record Activity log within the exact same transaction
        await tx.activity.create({
          data: {
            userId,
            snackId: updatedSnack.id,
            snackName: updatedSnack.name,
            action: "CONSUMED",
            amount: item.amount,
          },
        })

        results.push({
          snackId: updatedSnack.id,
          snackName: updatedSnack.name,
          amount: item.amount,
          remainingQuantity: updatedSnack.quantity,
          status: calculateSnackStatus(
            updatedSnack.quantity,
            updatedSnack.lowStockThreshold,
          ),
        })
      }

      return {
        message: `Successfully consumed ${totalPackets} packet(s) across ${items.length} snack variety(ies).`,
        totalPackets,
        items: results,
      }
    })
  }

  /**
   * Restocks snack packets (Admin only).
   * Transactionally increments quantity and records RESTOCKED activity.
   */
  async restockSnack(
    snackId: string,
    amount: number,
    userId: string,
  ): Promise<{ snack: SnackWithMeta; restockedAmount: number }> {
    if (amount <= 0) {
      throw new BadRequestError("Restock amount must be a positive integer.")
    }

    return await prisma.$transaction(async (tx) => {
      const updatedRows = await tx.$queryRaw<
        Array<{
          id: string
          name: string
          category: SnackCategory
          quantity: number
          lowStockThreshold: number
          createdAt: Date
          updatedAt: Date
        }>
      >`
        UPDATE "snacks"
        SET "quantity" = "quantity" + ${amount}, "updatedAt" = NOW()
        WHERE "id" = ${snackId}::uuid
        RETURNING *;
      `

      if (updatedRows.length === 0) {
        throw new NotFoundError("Snack not found.")
      }

      const updatedSnack = updatedRows[0]

      await tx.activity.create({
        data: {
          userId,
          snackId: updatedSnack.id,
          snackName: updatedSnack.name,
          action: "RESTOCKED",
          amount,
        },
      })

      const snackWithMeta: SnackWithMeta = {
        ...updatedSnack,
        status: calculateSnackStatus(
          updatedSnack.quantity,
          updatedSnack.lowStockThreshold,
        ),
        voteCount: 0,
        hasVoted: false,
      }

      return {
        snack: snackWithMeta,
        restockedAmount: amount,
      }
    })
  }
}

export const snackService = new SnackService()
