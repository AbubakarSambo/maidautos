/*
  Warnings:

  - Added the required column `group_id` to the `bookings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "bookings_paystack_reference_key";

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "group_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "bookings_group_id_idx" ON "bookings"("group_id");

-- CreateIndex
CREATE INDEX "bookings_paystack_reference_idx" ON "bookings"("paystack_reference");
