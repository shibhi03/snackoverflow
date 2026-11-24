import { prisma } from "../config/database.js"
import { NotFoundError, DuplicateVoteError } from "../utils/errors.js"
import { Prisma } from "@prisma/client"

export class VoteService {
  /**
   * Casts a vote for a snack by an authenticated user.
   * Database composite unique constraint guarantees duplicate votes are impossible.
   */
  async castVote(
    snackId: string,
    userId: string,
  ): Promise<{ voteCount: number; hasVoted: boolean }> {
    const snack = await prisma.snack.findUnique({ where: { id: snackId } })
    if (!snack) {
      throw new NotFoundError("Snack not found.")
    }

    try {
      await prisma.vote.create({
        data: {
          userId,
          snackId,
        },
      })
    } catch (err: any) {
      if (
        (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") ||
        ("code" in err && err.code === "23505")
      ) {
        throw new DuplicateVoteError("You have already voted for this snack.")
      }
      throw err
    }

    const voteCount = await prisma.vote.count({
      where: { snackId },
    })

    return {
      voteCount,
      hasVoted: true,
    }
  }

  /**
   * Removes an existing vote for a snack by an authenticated user.
   */
  async removeVote(
    snackId: string,
    userId: string,
  ): Promise<{ voteCount: number; hasVoted: boolean }> {
    const snack = await prisma.snack.findUnique({ where: { id: snackId } })
    if (!snack) {
      throw new NotFoundError("Snack not found.")
    }

    await prisma.vote.deleteMany({
      where: {
        userId,
        snackId,
      },
    })

    const voteCount = await prisma.vote.count({
      where: { snackId },
    })

    return {
      voteCount,
      hasVoted: false,
    }
  }
}

export const voteService = new VoteService()
