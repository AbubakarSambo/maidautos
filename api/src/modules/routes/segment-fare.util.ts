// Shared segment-fare resolution, used by both the routes module (for display) and the
// bookings module (for charging). A route's segmentFares holds explicit overrides for
// specific pickup->dropoff stop pairs; when one exists it takes precedence over the
// cumulative priceFromOrigin subtraction. A trip-level priceOverride (e.g. a cheaper car)
// still scales the result proportionally against the route's full-route fare, so relative
// stop-to-stop pricing (overridden or not) stays consistent across car types.

type FareRouteStop = { id: string; priceFromOrigin: number | { toString(): string } };

type FareRoute = {
  routeStops: FareRouteStop[];
  segmentFares?: { fromStopId: string; toStopId: string; price: number | { toString(): string } }[];
};

export function resolveSegmentFare(
  route: FareRoute,
  pickupStop: FareRouteStop,
  dropoffStop: FareRouteStop,
  tripPriceOverride?: number | { toString(): string } | null,
): number {
  const override = route.segmentFares?.find(
    (f) => f.fromStopId === pickupStop.id && f.toStopId === dropoffStop.id,
  );

  let baseAmount = override
    ? Number(override.price)
    : Number(dropoffStop.priceFromOrigin) - Number(pickupStop.priceFromOrigin);

  if (tripPriceOverride != null) {
    const stops = route.routeStops;
    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];
    const fullRouteFare = Number(lastStop.priceFromOrigin) - Number(firstStop.priceFromOrigin);
    if (fullRouteFare > 0) {
      baseAmount = baseAmount * (Number(tripPriceOverride) / fullRouteFare);
    }
  }

  return baseAmount;
}
