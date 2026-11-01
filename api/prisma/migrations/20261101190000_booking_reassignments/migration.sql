-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "reassigned_from_booking_id" TEXT;

-- CreateIndex
CREATE INDEX "bookings_reassigned_from_booking_id_idx" ON "bookings"("reassigned_from_booking_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_reassigned_from_booking_id_fkey" FOREIGN KEY ("reassigned_from_booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
