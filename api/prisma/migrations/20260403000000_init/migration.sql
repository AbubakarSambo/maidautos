-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'PASSENGER');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "CarType" AS ENUM ('SEDAN', 'SIENA', 'HIACE', 'COASTER', 'BUS');

-- CreateEnum
CREATE TYPE "CarStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('AVAILABLE', 'ON_TRIP', 'OFF_DUTY');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'BOARDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYSTACK', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password_hash" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PASSENGER',
    "admin_city" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "origin_stop_id" TEXT NOT NULL,
    "destination_stop_id" TEXT NOT NULL,
    "estimated_duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "stop_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "distance_from_origin_km" DECIMAL(8,2) NOT NULL,
    "price_from_origin" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cars" (
    "id" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "type" "CarType" NOT NULL,
    "capacity" INTEGER NOT NULL,
    "has_ac" BOOLEAN NOT NULL DEFAULT true,
    "status" "CarStatus" NOT NULL DEFAULT 'ACTIVE',
    "photos" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "license_number" TEXT NOT NULL,
    "license_expiry" DATE NOT NULL,
    "nin" TEXT,
    "photo" TEXT,
    "status" "DriverStatus" NOT NULL DEFAULT 'AVAILABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "departure_datetime" TIMESTAMP(3) NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "price_override" DECIMAL(10,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_status_updates" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "stop_id" TEXT,
    "checkpoint_label" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "trip_status_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "user_id" TEXT,
    "guest_name" TEXT,
    "guest_email" TEXT,
    "guest_phone" TEXT,
    "seat_number" INTEGER NOT NULL,
    "pickup_stop_id" TEXT NOT NULL,
    "dropoff_stop_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paystack_reference" TEXT,
    "paystack_access_code" TEXT,
    "payment_url" TEXT,
    "ticket_code" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "booked_by_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE UNIQUE INDEX "tokens_token_key" ON "tokens"("token");
CREATE INDEX "tokens_user_id_idx" ON "tokens"("user_id");
CREATE UNIQUE INDEX "stops_name_key" ON "stops"("name");
CREATE UNIQUE INDEX "stops_slug_key" ON "stops"("slug");
CREATE UNIQUE INDEX "routes_origin_stop_id_destination_stop_id_key" ON "routes"("origin_stop_id", "destination_stop_id");
CREATE UNIQUE INDEX "route_stops_route_id_stop_id_key" ON "route_stops"("route_id", "stop_id");
CREATE UNIQUE INDEX "route_stops_route_id_order_key" ON "route_stops"("route_id", "order");
CREATE INDEX "route_stops_route_id_idx" ON "route_stops"("route_id");
CREATE UNIQUE INDEX "cars_plate_number_key" ON "cars"("plate_number");
CREATE UNIQUE INDEX "drivers_phone_key" ON "drivers"("phone");
CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");
CREATE UNIQUE INDEX "drivers_nin_key" ON "drivers"("nin");
CREATE INDEX "trips_route_id_idx" ON "trips"("route_id");
CREATE INDEX "trips_departure_datetime_idx" ON "trips"("departure_datetime");
CREATE INDEX "trip_status_updates_trip_id_idx" ON "trip_status_updates"("trip_id");
CREATE UNIQUE INDEX "bookings_paystack_reference_key" ON "bookings"("paystack_reference");
CREATE UNIQUE INDEX "bookings_ticket_code_key" ON "bookings"("ticket_code");
CREATE INDEX "bookings_trip_id_idx" ON "bookings"("trip_id");
CREATE INDEX "bookings_user_id_idx" ON "bookings"("user_id");
CREATE INDEX "bookings_ticket_code_idx" ON "bookings"("ticket_code");

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "routes" ADD CONSTRAINT "routes_origin_stop_id_fkey" FOREIGN KEY ("origin_stop_id") REFERENCES "stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_stop_id_fkey" FOREIGN KEY ("destination_stop_id") REFERENCES "stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trip_status_updates" ADD CONSTRAINT "trip_status_updates_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trip_status_updates" ADD CONSTRAINT "trip_status_updates_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "stops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trip_status_updates" ADD CONSTRAINT "trip_status_updates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booked_by_admin_id_fkey" FOREIGN KEY ("booked_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pickup_stop_id_fkey" FOREIGN KEY ("pickup_stop_id") REFERENCES "route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dropoff_stop_id_fkey" FOREIGN KEY ("dropoff_stop_id") REFERENCES "route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
