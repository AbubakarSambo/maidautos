import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { appConfig, databaseConfig, jwtConfig, resendConfig, paystackConfig } from './configuration';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, resendConfig, paystackConfig],
    }),
  ],
})
export class ConfigModule {}
