-- pgvector for embeddings (ADR 0004). Enabled in the first migration so every environment has it.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "heartbeat" (
    "id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "heartbeat_created_at_idx" ON "heartbeat"("created_at");

