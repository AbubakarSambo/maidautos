-- CreateTable
CREATE TABLE "route_segment_fares" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "from_route_stop_id" TEXT NOT NULL,
    "to_route_stop_id" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_segment_fares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_segment_fares_route_id_idx" ON "route_segment_fares"("route_id");

-- CreateIndex
CREATE UNIQUE INDEX "route_segment_fares_from_route_stop_id_to_route_stop_id_key" ON "route_segment_fares"("from_route_stop_id", "to_route_stop_id");

-- AddForeignKey
ALTER TABLE "route_segment_fares" ADD CONSTRAINT "route_segment_fares_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_segment_fares" ADD CONSTRAINT "route_segment_fares_from_route_stop_id_fkey" FOREIGN KEY ("from_route_stop_id") REFERENCES "route_stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_segment_fares" ADD CONSTRAINT "route_segment_fares_to_route_stop_id_fkey" FOREIGN KEY ("to_route_stop_id") REFERENCES "route_stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
