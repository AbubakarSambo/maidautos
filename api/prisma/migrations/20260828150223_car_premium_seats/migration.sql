-- AlterTable
ALTER TABLE "cars" ADD COLUMN     "premium_seat_numbers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "premium_seat_surcharge" DECIMAL(10,2) NOT NULL DEFAULT 0;
