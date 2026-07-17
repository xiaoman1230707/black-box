/*
  Warnings:

  - Added the required column `updated_at` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "gameId" INTEGER,
ADD COLUMN     "title_embedding" JSONB,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "cover" VARCHAR(255),
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_name_key" ON "games"("name");

-- CreateIndex
CREATE INDEX "posts_gameId_idx" ON "posts"("gameId");

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE SET NULL ON UPDATE CASCADE;
