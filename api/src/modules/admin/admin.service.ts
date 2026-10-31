import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      todaysTrips,
      totalBookingsToday,
      revenueToday,
      totalBookingsAllTime,
      totalRevenue,
      pendingPayments,
    ] = await Promise.all([
      this.prisma.trip.count({ where: { departureDateTime: { gte: today, lt: tomorrow } } }),
      this.prisma.booking.count({ where: { createdAt: { gte: today, lt: tomorrow }, status: 'CONFIRMED' } }),
      this.prisma.booking.aggregate({
        where: { createdAt: { gte: today, lt: tomorrow }, paymentStatus: 'PAID', status: { not: 'CHANGED' } },
        _sum: { amount: true, changeFee: true },
      }),
      this.prisma.booking.count({ where: { status: { notIn: ['CANCELLED', 'CHANGED'] } } }),
      this.prisma.booking.aggregate({
        where: { paymentStatus: 'PAID', status: { not: 'CHANGED' } },
        _sum: { amount: true, changeFee: true },
      }),
      this.prisma.booking.count({ where: { paymentStatus: 'PENDING', status: 'CONFIRMED' } }),
    ]);

    return {
      today: {
        trips: todaysTrips,
        bookings: totalBookingsToday,
        revenue: Number(revenueToday._sum.amount || 0) + Number(revenueToday._sum.changeFee || 0),
      },
      allTime: {
        bookings: totalBookingsAllTime,
        revenue: Number(totalRevenue._sum.amount || 0) + Number(totalRevenue._sum.changeFee || 0),
        pendingPayments,
      },
    };
  }

  async getRevenueByRoute(startDate?: string, endDate?: string) {
    // A changed booking's value carries over to its replacement (amount + changeFee),
    // so the superseded original is excluded to avoid counting the ticket twice.
    const where: any = { paymentStatus: 'PAID', status: { not: 'CHANGED' } };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const bookings = await this.prisma.booking.findMany({
      where,
      include: {
        trip: { include: { route: { include: { originStop: true, destinationStop: true } } } },
      },
    });

    const byRoute = new Map<string, { label: string; revenue: number; count: number }>();
    for (const b of bookings) {
      const key = b.trip.routeId;
      const label = `${b.trip.route.originStop.name} → ${b.trip.route.destinationStop.name}`;
      const existing = byRoute.get(key) || { label, revenue: 0, count: 0 };
      existing.revenue += Number(b.amount) + Number(b.changeFee ?? 0);
      existing.count += 1;
      byRoute.set(key, existing);
    }

    return Array.from(byRoute.values()).sort((a, b) => b.revenue - a.revenue);
  }
}
