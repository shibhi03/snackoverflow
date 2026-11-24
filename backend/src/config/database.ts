import { PrismaClient } from "@prisma/client"
import { config } from "./env.js"

// Determine connection URL (development vs test)
const connectionUrl =
  process.env.NODE_ENV === "test" && config.testDatabaseUrl
    ? config.testDatabaseUrl
    : config.databaseUrl

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl,
    },
  },
  log: config.nodeEnv === "development" ? ["warn", "error"] : ["error"],
})

export default prisma
