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
  // Abuja → Maiduguri (via Kaduna, Zaria, Kano, Bauchi, Gombe)
  const abujaMaiduguri = await prisma.route.upsert({
    where: {
      originStopId_destinationStopId: {
        originStopId: stops['abuja'].id,
        destinationStopId: stops['maiduguri'].id,
      },
    },
    update: {},
    create: {
      originStopId: stops['abuja'].id,
      destinationStopId: stops['maiduguri'].id,
      estimatedDurationMinutes: 780, // ~13 hrs
      isActive: true,
    },
  });

  // Route stops for Abuja → Maiduguri
  // priceFromOrigin = cumulative fare from Abuja at market rates
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
      create: {
        routeId: abujaMaiduguri.id,
        stopId: stops[rs.slug].id,
        order: rs.order,
        distanceFromOriginKm: rs.distanceKm,
        priceFromOrigin: rs.price,
      },
    });
  }

  // Abuja → Kano (direct, subset of above with shorter estimate)
  const abujaKano = await prisma.route.upsert({
    where: {
      originStopId_destinationStopId: {
        originStopId: stops['abuja'].id,
        destinationStopId: stops['kano'].id,
      },
    },
    update: {},
    create: {
      originStopId: stops['abuja'].id,
      destinationStopId: stops['kano'].id,
      estimatedDurationMinutes: 360, // ~6 hrs
      isActive: true,
    },
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
      create: {
        routeId: abujaKano.id,
        stopId: stops[rs.slug].id,
        order: rs.order,
        distanceFromOriginKm: rs.distanceKm,
        priceFromOrigin: rs.price,
      },
    });
  }

  // Abuja → Jos (via Lafia)
  const abujaJos = await prisma.route.upsert({
    where: {
      originStopId_destinationStopId: {
        originStopId: stops['abuja'].id,
        destinationStopId: stops['jos'].id,
      },
    },
    update: {},
    create: {
      originStopId: stops['abuja'].id,
      destinationStopId: stops['jos'].id,
      estimatedDurationMinutes: 240, // ~4 hrs
      isActive: true,
    },
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
      create: {
        routeId: abujaJos.id,
        stopId: stops[rs.slug].id,
        order: rs.order,
        distanceFromOriginKm: rs.distanceKm,
        priceFromOrigin: rs.price,
      },
    });
  }

  console.log('✓ 3 routes with stops');

  // ── Cars ──────────────────────────────────────────────────────────────────
  const cars = await Promise.all([
    prisma.car.upsert({
      where: { plateNumber: 'ABJ-123-AA' },
      update: { type: CarType.SIENA, capacity: 6, model: 'Sienna' },
      create: {
        plateNumber: 'ABJ-123-AA',
        make: 'Toyota',
        model: 'Sienna',
        year: 2020,
        type: CarType.SIENA,
        capacity: 6,
        hasAC: true,
        status: 'ACTIVE',
      },
    }),
    prisma.car.upsert({
      where: { plateNumber: 'KD-456-BB' },
      update: {},
      create: {
        plateNumber: 'KD-456-BB',
        make: 'Toyota',
        model: 'Sienna',
        year: 2021,
        type: CarType.SIENA,
        capacity: 6,
        hasAC: true,
        status: 'ACTIVE',
      },
    }),
    prisma.car.upsert({
      where: { plateNumber: 'KN-789-CC' },
      update: {},
      create: {
        plateNumber: 'KN-789-CC',
        make: 'Toyota',
        model: 'Coaster',
        year: 2019,
        type: CarType.COASTER,
        capacity: 30,
        hasAC: true,
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log('✓ 3 cars');

  // ── Drivers ───────────────────────────────────────────────────────────────
  const drivers = await Promise.all([
    prisma.driver.upsert({
      where: { phone: '08011111111' },
      update: {},
      create: {
        firstName: 'Musa',
        lastName: 'Ibrahim',
        phone: '08011111111',
        licenseNumber: 'DRV-001-ABJ',
        licenseExpiry: new Date('2027-06-30'),
        status: DriverStatus.AVAILABLE,
        isActive: true,
      },
    }),
    prisma.driver.upsert({
      where: { phone: '08022222222' },
      update: {},
      create: {
        firstName: 'Sule',
        lastName: 'Abubakar',
        phone: '08022222222',
        licenseNumber: 'DRV-002-KD',
        licenseExpiry: new Date('2026-12-31'),
        status: DriverStatus.AVAILABLE,
        isActive: true,
      },
    }),
  ]);
  console.log('✓ 2 drivers');

  // ── Super admin user ──────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Admin1234!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@maidautos.com' },
    update: {},
    create: {
      email: 'admin@maidautos.com',
      passwordHash,
      firstName: 'Abubakar',
      lastName: 'Sambo',
      role: 'SUPER_ADMIN',
      isActive: true,
      isEmailVerified: true,
    },
  });
  console.log('✓ Super admin: admin@maidautos.com / Admin1234!');

  // ── Sample upcoming trip ──────────────────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 0, 0, 0);

  await prisma.trip.create({
    data: {
      routeId: abujaMaiduguri.id,
      carId: cars[0].id,
      driverId: drivers[0].id,
      departureDateTime: tomorrow,
      status: 'SCHEDULED',
      notes: 'Sample trip — Abuja to Maiduguri',
    },
  });
  console.log('✓ 1 sample trip (tomorrow 7:00 AM, Abuja → Maiduguri)');

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
