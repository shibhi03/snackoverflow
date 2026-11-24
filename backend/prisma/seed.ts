import "dotenv/config"
import { PrismaClient, Role, SnackCategory, ActivityAction } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function seedDatabase(client: PrismaClient = prisma): Promise<void> {
  console.info("[Seed] Starting database seed...")

  // 1. Demo Users
  const saltRounds = 12
  const adminPasswordHash = await bcrypt.hash("Admin1234!", saltRounds)
  const memberPasswordHash = await bcrypt.hash("Member1234!", saltRounds)

  const admin = await client.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      name: "Admin User",
      role: Role.ADMIN,
    },
    create: {
      name: "Admin User",
      email: "admin@example.com",
      role: Role.ADMIN,
      passwordHash: adminPasswordHash,
    },
  })

  const member = await client.user.upsert({
    where: { email: "member@example.com" },
    update: {
      name: "Member User",
      role: Role.MEMBER,
    },
    create: {
      name: "Member User",
      email: "member@example.com",
      role: Role.MEMBER,
      passwordHash: memberPasswordHash,
    },
  })

  console.info(`[Seed] Seeded users: ${admin.email} (ADMIN), ${member.email} (MEMBER)`)

  // 2. Sample Snacks
  const snackData: Array<{
    name: string
    category: SnackCategory
    quantity: number
    lowStockThreshold: number
  }> = [
    { name: "Oreo", category: SnackCategory.SWEET, quantity: 15, lowStockThreshold: 5 },
    { name: "Lays", category: SnackCategory.SAVOURY, quantity: 3, lowStockThreshold: 5 },
    {
      name: "Masala Peanuts",
      category: SnackCategory.SAVOURY,
      quantity: 0,
      lowStockThreshold: 5,
    },
    {
      name: "Apple Juice",
      category: SnackCategory.DRINK,
      quantity: 12,
      lowStockThreshold: 5,
    },
    {
      name: "Protein Bar",
      category: SnackCategory.HEALTHY_ISH,
      quantity: 4,
      lowStockThreshold: 5,
    },
    {
      name: "Dairy Milk",
      category: SnackCategory.SWEET,
      quantity: 20,
      lowStockThreshold: 5,
    },
  ]

  const seededSnacks = []
  for (const item of snackData) {
    const snack = await client.snack.upsert({
      where: { name: item.name },
      update: {
        category: item.category,
        lowStockThreshold: item.lowStockThreshold,
        // Preserve existing inventory quantity on repeated seeds
      },
      create: {
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        lowStockThreshold: item.lowStockThreshold,
      },
    })
    seededSnacks.push(snack)
  }

  console.info(`[Seed] Seeded ${seededSnacks.length} snacks.`)

  // 3. Sample Votes (Idempotent: check before create to satisfy @@unique([userId, snackId]))
  const oreoSnack = seededSnacks.find((s) => s.name === "Oreo")
  const dairyMilkSnack = seededSnacks.find((s) => s.name === "Dairy Milk")

  if (oreoSnack) {
    await client.vote.upsert({
      where: {
        unique_user_snack_vote: {
          userId: member.id,
          snackId: oreoSnack.id,
        },
      },
      update: {},
      create: {
        userId: member.id,
        snackId: oreoSnack.id,
      },
    })
  }

  if (dairyMilkSnack) {
    await client.vote.upsert({
      where: {
        unique_user_snack_vote: {
          userId: member.id,
          snackId: dairyMilkSnack.id,
        },
      },
      update: {},
      create: {
        userId: member.id,
        snackId: dairyMilkSnack.id,
      },
    })

    await client.vote.upsert({
      where: {
        unique_user_snack_vote: {
          userId: admin.id,
          snackId: dairyMilkSnack.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        snackId: dairyMilkSnack.id,
      },
    })
  }

  console.info("[Seed] Seeded sample votes.")

  // 4. Sample Activities (Only add baseline activities if table is currently empty)
  const existingActivitiesCount = await client.activity.count()
  if (existingActivitiesCount === 0 && oreoSnack && dairyMilkSnack) {
    await client.activity.createMany({
      data: [
        {
          userId: admin.id,
          snackId: dairyMilkSnack.id,
          snackName: dairyMilkSnack.name,
          action: ActivityAction.RESTOCKED,
          amount: 20,
        },
        {
          userId: admin.id,
          snackId: oreoSnack.id,
          snackName: oreoSnack.name,
          action: ActivityAction.RESTOCKED,
          amount: 15,
        },
        {
          userId: member.id,
          snackId: oreoSnack.id,
          snackName: oreoSnack.name,
          action: ActivityAction.CONSUMED,
          amount: 1,
        },
      ],
    })
    console.info("[Seed] Seeded initial audit activities.")
  }

  console.info("[Seed] Database seeding completed successfully.")
}

async function main(): Promise<void> {
  await seedDatabase()
}

main()
  .catch((err) => {
    console.error("[Seed] Error during seeding:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
