import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ListingsModule } from './modules/listings/listings.module';
import { HealthModule } from './modules/health/health.module';
import { AdminModule } from './modules/admin/admin.module';
import { EmailModule } from './modules/email/email.module';
import { GoogleSheetsModule } from './modules/google-sheets/google-sheets.module';
import { UniversitiesModule } from './modules/universities/universities.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { MembershipModule } from './modules/membership/membership.module';
import { LeadsModule } from './modules/leads/leads.module';
import { OutboxModule } from './modules/outbox/outbox.module';
import { ViewingsModule } from './modules/viewings/viewings.module';
import { DealsModule } from './modules/deals/deals.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // QUAN TRỌNG: ưu tiên đọc .env ở gốc monorepo (Single Source of Truth) rồi mới tới local
      envFilePath: [
        join(__dirname, '..', '..', '..', `.env.${process.env.NODE_ENV ?? 'development'}`),
        join(__dirname, '..', '..', '..', '.env'),
        join(__dirname, '..', `.env.${process.env.NODE_ENV ?? 'development'}`),
        join(__dirname, '..', '.env'),
      ],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    LocationsModule,
    ListingsModule,
    HealthModule,
    AdminModule,
    EmailModule,
    GoogleSheetsModule,
    UniversitiesModule,
    TasksModule,
    MembershipModule,
    LeadsModule,
    OutboxModule,
    ViewingsModule,
    DealsModule,
    CommissionsModule,
  ],
})
export class AppModule {}

