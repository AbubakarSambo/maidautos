-- AlterTable
ALTER TABLE "bookings" ADD COLUMN "paid_without_seat_at" TIMESTAMP(3);

-- Backfill: paid bookings that ended up cancelled because the payment landed after
-- their seat was released. Excludes originals an admin deliberately reassigned.
UPDATE "bookings" b
SET "paid_without_seat_at" = b."updated_at"
WHERE b."status" = 'CANCELLED'
  AND b."payment_status" = 'PAID'
  AND b."payment_method" = 'PAYSTACK'
  AND NOT EXISTS (SELECT 1 FROM "bookings" r WHERE r."reassigned_from_booking_id" = b."id");
