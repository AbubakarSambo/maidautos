-- Allow multiple routes for the same origin/destination pair (e.g. a deactivated
-- historical route alongside its active replacement). Uniqueness among active
-- routes is now enforced at the application layer instead of the database.
DROP INDEX "routes_origin_stop_id_destination_stop_id_key";

CREATE INDEX "routes_origin_stop_id_destination_stop_id_idx" ON "routes"("origin_stop_id", "destination_stop_id");
