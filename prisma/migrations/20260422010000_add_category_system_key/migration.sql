-- AlterTable
ALTER TABLE "Category" ADD COLUMN "system_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_system_key_key" ON "Category"("userId", "system_key");
