-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'CHANGED';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "changed_from_booking_id" TEXT,
ADD COLUMN "change_fee" DECIMAL(10,2),
ADD COLUMN "change_fare_difference" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "bookings_changed_from_booking_id_idx" ON "bookings"("changed_from_booking_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_changed_from_booking_id_fkey" FOREIGN KEY ("changed_from_booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
