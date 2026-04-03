import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config';
import { PrismaModule } from './modules/prisma';
import { EmailModule } from './modules/email';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users';
import { StopsModule } from './modules/stops';
import { RoutesModule } from './modules/routes';
import { CarsModule } from './modules/cars';
import { DriversModule } from './modules/drivers';
import { TripsModule } from './modules/trips';
import { BookingsModule } from './modules/bookings';
import { PaystackModule } from './modules/paystack';
import { AdminModule } from './modules/admin';
import { JwtAuthGuard, RolesGuard, GlobalExceptionFilter, TransformInterceptor } from './common';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EmailModule,
    AuthModule,
    UsersModule,
    StopsModule,
    RoutesModule,
    CarsModule,
    DriversModule,
    TripsModule,
    BookingsModule,
    PaystackModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
