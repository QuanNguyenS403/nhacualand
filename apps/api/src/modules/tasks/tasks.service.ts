import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ListingStatus } from '@batdongsan/database';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from '../auth/otp.service';
import { EmailService } from '../email/email.service';
import { OutboxService } from '../outbox/outbox.service';

@Injectable()
export class TasksService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TasksService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  // Chu kỳ quét mặc định: mỗi 10 phút (600.000 ms)
  private readonly SWEEP_INTERVAL_MS = 10 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly emailService: EmailService,
    private readonly outboxService: OutboxService,
  ) {}

  onApplicationBootstrap() {
    this.logger.log('Khởi chạy hệ thống tác vụ nền định kỳ (TasksService)...');
    // Chạy lượt quét khởi động sau 10 giây
    setTimeout(() => {
      void this.runPeriodicTasks();
    }, 10_000);

    // Lên lịch lặp lại định kỳ
    this.timer = setInterval(() => {
      void this.runPeriodicTasks();
    }, this.SWEEP_INTERVAL_MS);
  }

  onApplicationShutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('Đã dừng hệ thống tác vụ nền định kỳ.');
    }
  }

  /**
   * Thực thi chuỗi tác vụ định kỳ có Distributed Lock (OPS-04)
   */
  async runPeriodicTasks(): Promise<{
    expiredCount: number;
    cleanedOtpCount: number;
    sweptMembershipsCount?: number;
    outboxResult?: any;
  }> {
    if (this.isRunning) {
      this.logger.debug('[TasksService] Tác vụ trước vẫn đang chạy, bỏ qua chu kỳ này.');
      return { expiredCount: 0, cleanedOtpCount: 0 };
    }

    this.isRunning = true;
    let hasAdvisoryLock = false;

    try {
      // PostgreSQL Distributed Lock (OPS-04 / RB-08): Chống race condition khi chạy multi-node/multi-worker
      try {
        const lockRes: any = await this.prisma.$queryRawUnsafe(
          `SELECT pg_try_advisory_lock(hashtext('tasks_sweep_lock')) as locked;`,
        );
        hasAdvisoryLock = Boolean(lockRes?.[0]?.locked);
        if (!hasAdvisoryLock) {
          this.logger.debug('[TasksService] Node khác đang chạy task sweep, bỏ qua.');
          return { expiredCount: 0, cleanedOtpCount: 0 };
        }
      } catch (lockErr: any) {
        // RB-08: Tuyệt đối không fallback in-memory khi DB lỗi raw query; abort an toàn
        this.logger.warn(`[TasksService] Không thể lấy advisory lock DB: ${lockErr.message}. Bỏ qua chu kỳ quét để bảo vệ tính nhất quán.`);
        return { expiredCount: 0, cleanedOtpCount: 0 };
      }

      const expiredCount = await this.expirePastDueListings();
      const cleanedOtpCount = this.sweepExpiredOtps();
      const sweptMembershipsCount = await this.sweepPendingMemberships();
      const outboxResult = await this.outboxService.processPendingBatch(50);

      return { expiredCount, cleanedOtpCount, sweptMembershipsCount, outboxResult };
    } catch (err) {
      this.logger.error('Lỗi khi thực thi tác vụ nền định kỳ:', (err as Error).stack);
      return { expiredCount: 0, cleanedOtpCount: 0 };
    } finally {
      if (hasAdvisoryLock) {
        try {
          await this.prisma.$queryRawUnsafe(
            `SELECT pg_advisory_unlock(hashtext('tasks_sweep_lock'));`,
          );
        } catch {
          // safe-fail
        }
      }
      this.isRunning = false;
    }
  }

  /**
   * Quét và tự động hủy các yêu cầu nâng cấp gói pending quá hạn 7 ngày (FIN-09)
   */
  async sweepPendingMemberships(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.userMembership.updateMany({
      where: {
        status: 'pending',
        createdAt: { lt: sevenDaysAgo },
      },
      data: {
        status: 'expired',
        paymentNote: 'Tự động hủy do quá hạn thanh toán 7 ngày (FIN-09 sweep)',
      },
    });

    if (result.count > 0) {
      this.logger.log(`[TasksService] Đã quét và tự động hủy ${result.count} yêu cầu mua gói pending quá hạn.`);
    }
    return result.count;
  }

  /**
   * Quét và tự động chuyển trạng thái tin đăng hết hạn (expiresAt < now) sang 'expired',
   * ghi nhận thông báo qua Transactional Outbox.
   */
  async expirePastDueListings(): Promise<number> {
    const now = new Date();

    // Conditional update atomic: Chỉ chuyển trạng thái những tin THỰC SỰ đang 'active' và quá hạn
    const expiredCandidates = await this.prisma.listing.findMany({
      where: {
        status: ListingStatus.active,
        expiresAt: {
          not: null,
          lt: now,
        },
      },
      select: {
        id: true,
        title: true,
        owner: { select: { phone: true } },
      },
      take: 100, // giới hạn mỗi batch
    });

    if (expiredCandidates.length === 0) {
      return 0;
    }

    const candidateIds = expiredCandidates.map((c) => c.id);
    const result = await this.prisma.listing.updateMany({
      where: {
        id: { in: candidateIds },
        status: ListingStatus.active,
      },
      data: {
        status: ListingStatus.expired,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `[Tin hết hạn] Đã tự động chuyển ${result.count} tin đăng quá hạn sang trạng thái '${ListingStatus.expired}'.`,
      );

      // Ghi nhận thông báo qua Outbox an toàn
      for (const item of expiredCandidates) {
        try {
          await this.outboxService.recordEvent({
            aggregateType: 'LISTING',
            aggregateId: item.id.toString(),
            eventType: 'EMAIL_LISTING_EXPIRED',
            payload: {
              listing: { id: item.id.toString(), title: item.title },
              landlordPhone: item.owner.phone ?? '',
            },
          });
        } catch {
          // fallback trực tiếp nếu outbox fail
          void this.emailService.sendListingExpiredToLandlord(item, item.owner.phone ?? '');
        }
      }
    }
    return result.count;
  }

  /**
   * Dọn dẹp mã OTP đã hết hạn trong bộ nhớ
   */
  sweepExpiredOtps(): number {
    const count = this.otpService.cleanupExpired();
    if (count > 0) {
      this.logger.log(`[Dọn dẹp OTP] Đã giải phóng ${count} mã OTP hết hạn khỏi bộ nhớ.`);
    }
    return count;
  }
}
