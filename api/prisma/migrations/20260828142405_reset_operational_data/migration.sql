-- One-time data reset: clears all operational data (routes, cars, drivers, trips,
-- bookings, stops) to start fresh, while leaving users and tokens untouched.
-- Deletes run in FK-safe dependency order.

DELETE FROM "bookings";
DELETE FROM "trip_status_updates";
DELETE FROM "trips";
DELETE FROM "route_stops";
DELETE FROM "routes";
DELETE FROM "cars";
DELETE FROM "drivers";
DELETE FROM "stops";
