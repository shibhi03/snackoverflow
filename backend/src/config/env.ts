import dotenv from "dotenv"

// Load environment variables from backend/.env or root .env
dotenv.config()

const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
)
const nodeEnv = process.env.NODE_ENV || "development"

function buildAllowedOrigins(primaryUrl: string): string[] {
  const origins = new Set<string>([primaryUrl])
  try {
    const parsed = new URL(primaryUrl)
    if (parsed.hostname === "localhost") {
      origins.add(`${parsed.protocol}//127.0.0.1${parsed.port ? `:${parsed.port}` : ""}`)
    } else if (parsed.hostname === "127.0.0.1") {
      origins.add(`${parsed.protocol}//localhost${parsed.port ? `:${parsed.port}` : ""}`)
    }
  } catch {
    // Keep primaryUrl only if URL parsing fails
  }
  return Array.from(origins)
}

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv,
  frontendUrl,
  allowedOrigins: buildAllowedOrigins(frontendUrl),
  cookieSecure: nodeEnv === "production" && frontendUrl.startsWith("https://"),
  databaseUrl: process.env.DATABASE_URL || "",
  testDatabaseUrl: process.env.TEST_DATABASE_URL || "",
  jwtSecret:
    process.env.JWT_SECRET ||
    "dev_snack_overflow_jwt_secret_change_in_production_min_32_characters",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  cookieName: process.env.COOKIE_NAME || "snack_session",
  csrfCookieName: "snack_csrf",
  sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  enableMemberRegistration: process.env.ENABLE_MEMBER_REGISTRATION !== "false",
}
