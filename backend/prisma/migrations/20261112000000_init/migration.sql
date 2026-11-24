-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "SnackCategory" AS ENUM ('SWEET', 'SAVOURY', 'DRINK', 'HEALTHY_ISH');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CONSUMED', 'RESTOCKED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" VARCHAR(255),
    "ipAddress" VARCHAR(45),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snacks" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" "SnackCategory" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "snacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "snackId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "snackId" UUID,
    "snackName" VARCHAR(120) NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "snacks_name_key" ON "snacks"("name");

-- CreateIndex
CREATE INDEX "snacks_category_idx" ON "snacks"("category");

-- CreateIndex
CREATE INDEX "votes_snackId_idx" ON "votes"("snackId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_userId_snackId_key" ON "votes"("userId", "snackId");

-- CreateIndex
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "activities_userId_idx" ON "activities"("userId");

-- CreateIndex
CREATE INDEX "activities_snackId_idx" ON "activities"("snackId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_snackId_fkey" FOREIGN KEY ("snackId") REFERENCES "snacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_snackId_fkey" FOREIGN KEY ("snackId") REFERENCES "snacks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraints (Enforce database-level data integrity)
ALTER TABLE "snacks" ADD CONSTRAINT "check_snack_quantity_non_negative" CHECK ("quantity" >= 0);
ALTER TABLE "snacks" ADD CONSTRAINT "check_snack_threshold_non_negative" CHECK ("lowStockThreshold" >= 0);
ALTER TABLE "activities" ADD CONSTRAINT "check_activity_amount_positive" CHECK ("amount" > 0);
