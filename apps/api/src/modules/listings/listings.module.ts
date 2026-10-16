import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { UploadsModule } from '../uploads/uploads.module';
import { EmailModule } from '../email/email.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { OutboxModule } from '../outbox/outbox.module';

@Module({
  imports: [
    JwtModule.register({}),
    UploadsModule,
    EmailModule,
    GoogleSheetsModule,
    OutboxModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}
