-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "userId" UUID NOT NULL,
    "operation" VARCHAR(100) NOT NULL,
    "requestHash" VARCHAR(64) NOT NULL,
    "statusCode" INTEGER,
    "responseBody" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_idempotency_key" ON "idempotency_keys"("userId", "key");

-- CreateIndex
CREATE INDEX "idempotency_keys_userId_idx" ON "idempotency_keys"("userId");

-- CreateIndex
CREATE INDEX "idempotency_keys_expiresAt_idx" ON "idempotency_keys"("expiresAt");

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
