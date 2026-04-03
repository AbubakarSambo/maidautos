import { PrismaClient, CarType, DriverStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding...');

  // ── Stops ─────────────────────────────────────────────────────────────────
  const stopData = [
    { name: 'Abuja', state: 'FCT', slug: 'abuja' },
    { name: 'Kaduna', state: 'Kaduna', slug: 'kaduna' },
    { name: 'Zaria', state: 'Kaduna', slug: 'zaria' },
    { name: 'Kano', state: 'Kano', slug: 'kano' },
    { name: 'Maiduguri', state: 'Borno', slug: 'maiduguri' },
    { name: 'Bauchi', state: 'Bauchi', slug: 'bauchi' },
    { name: 'Gombe', state: 'Gombe', slug: 'gombe' },
    { name: 'Jos', state: 'Plateau', slug: 'jos' },
    { name: 'Lafia', state: 'Nasarawa', slug: 'lafia' },
    { name: 'Dutse', state: 'Jigawa', slug: 'dutse' },
    { name: 'Azare', state: 'Bauchi', slug: 'azare' },
  ];

  const stops: Record<string, { id: string }> = {};
  for (const s of stopData) {
    const stop = await prisma.stop.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    });
    stops[s.slug] = stop;
  }
  console.log(`✓ ${stopData.length} stops`);

  // ── Routes ────────────────────────────────────────────────────────────────

  // 1. Abuja → Maiduguri (via Kaduna, Zaria, Kano, Bauchi, Gombe)
  const abujaMaiduguri = await prisma.route.upsert({
    where: { originStopId_destinationStopId: { originStopId: stops['abuja'].id, destinationStopId: stops['maiduguri'].id } },
    update: {},
    create: { originStopId: stops['abuja'].id, destinationStopId: stops['maiduguri'].id, estimatedDurationMinutes: 780, isActive: true },
  });
  const abujaMaiduguriStops = [
    { slug: 'abuja',     order: 0, distanceKm: 0,   price: 0 },
    { slug: 'kaduna',    order: 1, distanceKm: 185,  price: 15000 },
    { slug: 'zaria',     order: 2, distanceKm: 230,  price: 20000 },
    { slug: 'kano',      order: 3, distanceKm: 320,  price: 30000 },
    { slug: 'bauchi',    order: 4, distanceKm: 480,  price: 40000 },
    { slug: 'gombe',     order: 5, distanceKm: 580,  price: 47000 },
    { slug: 'maiduguri', order: 6, distanceKm: 750,  price: 55000 },
  ];
  for (const rs of abujaMaiduguriStops) {
    await prisma.routeStop.upsert({
      where: { routeId_stopId: { routeId: abujaMaiduguri.id, stopId: stops[rs.slug].id } },
      update: { priceFromOrigin: rs.price },
      create: { routeId: abujaMaiduguri.id, stopId: stops[rs.slug].id, order: rs.order, distanceFromOriginKm: rs.distanceKm, priceFromOrigin: rs.price },
    });
  }

  // 2. Abuja → Kano (direct via Kaduna, Zaria)
  const abujaKano = await prisma.route.upsert({
    where: { originStopId_destinationStopId: { originStopId: stops['abuja'].id, destinationStopId: stops['kano'].id } },
    update: {},
    create: { originStopId: stops['abuja'].id, destinationStopId: stops['kano'].id, estimatedDurationMinutes: 360, isActive: true },
  });
  const abujaKanoStops = [
    { slug: 'abuja',  order: 0, distanceKm: 0,   price: 0 },
    { slug: 'kaduna', order: 1, distanceKm: 185,  price: 15000 },
    { slug: 'zaria',  order: 2, distanceKm: 230,  price: 20000 },
    { slug: 'kano',   order: 3, distanceKm: 320,  price: 30000 },
  ];
  for (const rs of abujaKanoStops) {
    await prisma.routeStop.upsert({
      where: { routeId_stopId: { routeId: abujaKano.id, stopId: stops[rs.slug].id } },
      update: { priceFromOrigin: rs.price },
      create: { routeId: abujaKano.id, stopId: stops[rs.slug].id, order: rs.order, distanceFromOriginKm: rs.distanceKm, priceFromOrigin: rs.price },
    });
  }

  // 3. Abuja → Jos (via Lafia)
  const abujaJos = await prisma.route.upsert({
    where: { originStopId_destinationStopId: { originStopId: stops['abuja'].id, destinationStopId: stops['jos'].id } },
    update: {},
    create: { originStopId: stops['abuja'].id, destinationStopId: stops['jos'].id, estimatedDurationMinutes: 240, isActive: true },
  });
  const abujaJosStops = [
    { slug: 'abuja', order: 0, distanceKm: 0,   price: 0 },
    { slug: 'lafia', order: 1, distanceKm: 130,  price: 10000 },
    { slug: 'jos',   order: 2, distanceKm: 280,  price: 18000 },
  ];
  for (const rs of abujaJosStops) {
    await prisma.routeStop.upsert({
      where: { routeId_stopId: { routeId: abujaJos.id, stopId: stops[rs.slug].id } },
      update: { priceFromOrigin: rs.price },
      create: { routeId: abujaJos.id, stopId: stops[rs.slug].id, order: rs.order, distanceFromOriginKm: rs.distanceKm, priceFromOrigin: rs.price },
    });
  }

  // 4. Kano → Maiduguri (via Dutse, Azare, Gombe)
  const kanoMaiduguri = await prisma.route.upsert({
    where: { originStopId_destinationStopId: { originStopId: stops['kano'].id, destinationStopId: stops['maiduguri'].id } },
    update: {},
    create: { originStopId: stops['kano'].id, destinationStopId: stops['maiduguri'].id, estimatedDurationMinutes: 420, isActive: true },
  });
  const kanoMaiduguriStops = [
    { slug: 'kano',      order: 0, distanceKm: 0,   price: 0 },
    { slug: 'dutse',     order: 1, distanceKm: 130,  price: 10000 },
    { slug: 'azare',     order: 2, distanceKm: 250,  price: 18000 },
    { slug: 'gombe',     order: 3, distanceKm: 350,  price: 25000 },
    { slug: 'maiduguri', order: 4, distanceKm: 430,  price: 32000 },
  ];
  for (const rs of kanoMaiduguriStops) {
    await prisma.routeStop.upsert({
      where: { routeId_stopId: { routeId: kanoMaiduguri.id, stopId: stops[rs.slug].id } },
      update: { priceFromOrigin: rs.price },
      create: { routeId: kanoMaiduguri.id, stopId: stops[rs.slug].id, order: rs.order, distanceFromOriginKm: rs.distanceKm, priceFromOrigin: rs.price },
    });
  }

  // 5. Abuja → Bauchi (via Lafia, Jos)
  const abujaBauchi = await prisma.route.upsert({
    where: { originStopId_destinationStopId: { originStopId: stops['abuja'].id, destinationStopId: stops['bauchi'].id } },
    update: {},
    create: { originStopId: stops['abuja'].id, destinationStopId: stops['bauchi'].id, estimatedDurationMinutes: 360, isActive: true },
  });
  const abujaBauchiStops = [
    { slug: 'abuja',  order: 0, distanceKm: 0,   price: 0 },
    { slug: 'lafia',  order: 1, distanceKm: 130,  price: 10000 },
    { slug: 'jos',    order: 2, distanceKm: 280,  price: 18000 },
    { slug: 'bauchi', order: 3, distanceKm: 400,  price: 28000 },
  ];
  for (const rs of abujaBauchiStops) {
    await prisma.routeStop.upsert({
      where: { routeId_stopId: { routeId: abujaBauchi.id, stopId: stops[rs.slug].id } },
      update: { priceFromOrigin: rs.price },
      create: { routeId: abujaBauchi.id, stopId: stops[rs.slug].id, order: rs.order, distanceFromOriginKm: rs.distanceKm, priceFromOrigin: rs.price },
    });
  }

  console.log('✓ 5 routes with stops');

  // ── Cars ──────────────────────────────────────────────────────────────────
  const cars = await Promise.all([
    // 4 Sienas
    prisma.car.upsert({
      where: { plateNumber: 'ABJ-001-AA' },
      update: {},
      create: { plateNumber: 'ABJ-001-AA', make: 'Toyota', model: 'Sienna', year: 2021, type: CarType.SIENA, capacity: 6, hasAC: true, status: 'ACTIVE' },
    }),
    prisma.car.upsert({
      where: { plateNumber: 'ABJ-002-AA' },
      update: {},
      create: { plateNumber: 'ABJ-002-AA', make: 'Toyota', model: 'Sienna', year: 2021, type: CarType.SIENA, capacity: 6, hasAC: true, status: 'ACTIVE' },
    }),
    prisma.car.upsert({
      where: { plateNumber: 'KD-003-BB' },
      update: {},
      create: { plateNumber: 'KD-003-BB', make: 'Toyota', model: 'Sienna', year: 2022, type: CarType.SIENA, capacity: 6, hasAC: true, status: 'ACTIVE' },
    }),
    prisma.car.upsert({
      where: { plateNumber: 'KD-004-BB' },
      update: {},
      create: { plateNumber: 'KD-004-BB', make: 'Toyota', model: 'Sienna', year: 2020, type: CarType.SIENA, capacity: 6, hasAC: true, status: 'ACTIVE' },
    }),
    // 1 Camry
    prisma.car.upsert({
      where: { plateNumber: 'ABJ-005-CC' },
      update: {},
      create: { plateNumber: 'ABJ-005-CC', make: 'Toyota', model: 'Camry', year: 2020, type: CarType.SEDAN, capacity: 4, hasAC: true, status: 'ACTIVE' },
    }),
  ]);
  console.log('✓ 5 cars (4 Sienas + 1 Camry)');

  // ── Drivers ───────────────────────────────────────────────────────────────
  const drivers = await Promise.all([
    prisma.driver.upsert({
      where: { phone: '08011111111' },
      update: {},
      create: { firstName: 'Musa', lastName: 'Ibrahim', phone: '08011111111', licenseNumber: 'DRV-001-ABJ', licenseExpiry: new Date('2027-06-30'), status: DriverStatus.AVAILABLE, isActive: true },
    }),
    prisma.driver.upsert({
      where: { phone: '08022222222' },
      update: {},
      create: { firstName: 'Sule', lastName: 'Abubakar', phone: '08022222222', licenseNumber: 'DRV-002-KD', licenseExpiry: new Date('2026-12-31'), status: DriverStatus.AVAILABLE, isActive: true },
    }),
    prisma.driver.upsert({
      where: { phone: '08033333333' },
      update: {},
      create: { firstName: 'Usman', lastName: 'Garba', phone: '08033333333', licenseNumber: 'DRV-003-KN', licenseExpiry: new Date('2027-03-15'), status: DriverStatus.AVAILABLE, isActive: true },
    }),
    prisma.driver.upsert({
      where: { phone: '08044444444' },
      update: {},
      create: { firstName: 'Yusuf', lastName: 'Bello', phone: '08044444444', licenseNumber: 'DRV-004-ABJ', licenseExpiry: new Date('2026-09-20'), status: DriverStatus.AVAILABLE, isActive: true },
    }),
    prisma.driver.upsert({
      where: { phone: '08055555555' },
      update: {},
      create: { firstName: 'Aliyu', lastName: 'Danjuma', phone: '08055555555', licenseNumber: 'DRV-005-JOS', licenseExpiry: new Date('2028-01-10'), status: DriverStatus.AVAILABLE, isActive: true },
    }),
    prisma.driver.upsert({
      where: { phone: '08066666666' },
      update: {},
      create: { firstName: 'Hassan', lastName: 'Mamman', phone: '08066666666', licenseNumber: 'DRV-006-BCH', licenseExpiry: new Date('2027-08-25'), status: DriverStatus.AVAILABLE, isActive: true },
    }),
    prisma.driver.upsert({
      where: { phone: '08077777777' },
      update: {},
      create: { firstName: 'Kabir', lastName: 'Saleh', phone: '08077777777', licenseNumber: 'DRV-007-GMB', licenseExpiry: new Date('2027-11-30'), status: DriverStatus.AVAILABLE, isActive: true },
    }),
  ]);
  console.log('✓ 7 drivers');

  // ── Users ─────────────────────────────────────────────────────────────────
  const superAdminHash = await bcrypt.hash('Admin1234!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@maidautos.com' },
    update: {},
    create: { email: 'admin@maidautos.com', passwordHash: superAdminHash, firstName: 'Abubakar', lastName: 'Sambo', role: 'SUPER_ADMIN', isActive: true, isEmailVerified: true },
  });

  const adminHash = await bcrypt.hash('Amneshuwa1$', 10);
  await prisma.user.upsert({
    where: { email: 'samboabubakar5@gmail.com' },
    update: {},
    create: { email: 'samboabubakar5@gmail.com', passwordHash: adminHash, firstName: 'Abubakar', lastName: 'Sambo', role: 'SUPER_ADMIN', isActive: true, isEmailVerified: true },
  });

  console.log('✓ Admin: admin@maidautos.com / Admin1234!');
  console.log('✓ Admin: samboabubakar5@gmail.com / Amneshuwa1$');

  // ── Trips (next 7 days, multiple departures per day) ──────────────────────
  const tripConfigs = [
    { route: abujaMaiduguri, carIdx: 0, driverIdx: 0, hours: [6, 14] },
    { route: abujaMaiduguri, carIdx: 1, driverIdx: 1, hours: [8, 16] },
    { route: abujaKano,      carIdx: 2, driverIdx: 2, hours: [7, 13, 18] },
    { route: abujaJos,       carIdx: 3, driverIdx: 3, hours: [7, 15] },
    { route: kanoMaiduguri,  carIdx: 4, driverIdx: 4, hours: [8, 14] },
    { route: abujaBauchi,    carIdx: 0, driverIdx: 5, hours: [9] },
  ];

  let tripCount = 0;
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    for (const config of tripConfigs) {
      for (const hour of config.hours) {
        const departure = new Date();
        departure.setDate(departure.getDate() + dayOffset);
        departure.setHours(hour, 0, 0, 0);

        await prisma.trip.create({
          data: {
            routeId: config.route.id,
            carId: cars[config.carIdx].id,
            driverId: drivers[config.driverIdx].id,
            departureDateTime: departure,
            status: 'SCHEDULED',
          },
        });
        tripCount++;
      }
    }
  }
  console.log(`✓ ${tripCount} trips (next 7 days)`);

  console.log('\nDone! 🎉');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
