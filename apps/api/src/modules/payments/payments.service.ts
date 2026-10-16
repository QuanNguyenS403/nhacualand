import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecordBankPaymentDto } from './dto/record-bank-payment.dto';
import { AllocatePaymentDto } from './dto/allocate-payment.dto';
import { RefundCommissionDto } from './dto/refund-commission.dto';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Nhập giao dịch ngân hàng thực tế (Bank Transaction)
   * Chống trùng lặp giao dịch ngân hàng qua externalBankTxId
   */
  async recordBankPayment(dto: RecordBankPaymentDto, userId?: bigint | number | string) {
    const existing = await this.prisma.payment.findUnique({
      where: { externalBankTxId: dto.externalBankTxId },
    });

    if (existing) {
      throw new ConflictException(
        `Giao dịch ngân hàng với mã ${dto.externalBankTxId} đã được nhập vào hệ thống`
      );
    }

    const paymentCode = `PAY-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    return this.prisma.payment.create({
      data: {
        paymentCode,
        externalBankTxId: dto.externalBankTxId,
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        amount: BigInt(dto.amount),
        allocatedAmount: 0n,
        remitterName: dto.remitterName,
        remitterAccount: dto.remitterAccount,
        paymentTime: dto.paymentTime ? new Date(dto.paymentTime) : new Date(),
        rawDescription: dto.rawDescription,
        reconciledByUserId: userId ? BigInt(userId) : null,
      },
    });
  }

  /**
   * Đối soát và phân bổ tiền từ giao dịch ngân hàng vào phí hoa hồng (BR-11, AT-20, AT-21)
   * TUYỆT ĐỐI KHÔNG đánh dấu PAID nếu thiếu phân bổ tiền thật từ ngân hàng!
   */
  async allocatePayment(
    paymentId: bigint | number | string,
    dto: AllocatePaymentDto,
    reconciledByUserId?: bigint | number | string
  ) {
    const pId = BigInt(paymentId);
    const cId = BigInt(dto.commissionId);
    const allocateAmount = BigInt(dto.amount);

    if (allocateAmount <= 0n) {
      throw new BadRequestException('Số tiền phân bổ phải lớn hơn 0');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra Payment
      const payment = await tx.payment.findUnique({
        where: { id: pId },
      });

      if (!payment) {
        throw new NotFoundException('Không tìm thấy giao dịch ngân hàng');
      }

      const unallocatedAmount = payment.amount - payment.allocatedAmount;
      if (allocateAmount > unallocatedAmount) {
        throw new BadRequestException(
          `Số tiền phân bổ (${allocateAmount.toString()}đ) vượt quá số dư chưa phân bổ của giao dịch (${unallocatedAmount.toString()}đ)`
        );
      }

      // 2. Kiểm tra Commission
      const commission = await tx.commission.findUnique({
        where: { id: cId },
        include: {
          deal: {
            include: { owner: true },
          },
        },
      });

      if (!commission) {
        throw new NotFoundException('Không tìm thấy khoản phí hoa hồng');
      }

      // 3. Tạo bản ghi phân bổ thanh toán
      const allocation = await tx.paymentAllocation.create({
        data: {
          paymentId: pId,
          commissionId: cId,
          amount: allocateAmount,
          note: dto.note,
        },
      });

      // 4. Cập nhật số tiền đã phân bổ trên Payment
      const newPaymentAllocated = payment.allocatedAmount + allocateAmount;
      await tx.payment.update({
        where: { id: pId },
        data: {
          allocatedAmount: newPaymentAllocated,
          reconciledAt: new Date(),
          reconciledByUserId: reconciledByUserId ? BigInt(reconciledByUserId) : payment.reconciledByUserId,
        },
      });

      // 5. Cập nhật Commission: paidAmountVnd và trạng thái PAID / PARTIALLY_PAID
      const newPaidAmount = commission.paidAmountVnd + allocateAmount;
      let newStatus = commission.status;

      if (newPaidAmount >= commission.totalDueVnd) {
        newStatus = 'paid';
      } else {
        newStatus = 'partially_paid';
      }

      const updatedCommission = await tx.commission.update({
        where: { id: cId },
        data: {
          paidAmountVnd: newPaidAmount,
          status: newStatus,
        },
      });

      // 6. Ghi bút toán sổ cái FinanceLedger bất biến (Append-only)
      const ledgerEntry = await tx.financeLedger.create({
        data: {
          transactionType: 'cash_in',
          sourceType: 'brokerage_commission',
          amount: allocateAmount,
          commissionId: cId,
          userId: commission.deal.ownerId,
          externalTransactionId: `${payment.externalBankTxId}-ALLOC-${cId}-${Date.now()}`,
          note: `Đối soát phí môi giới MG-${commission.deal.dealCode} từ GD ${payment.externalBankTxId}`,
          recordedByUserId: reconciledByUserId ? BigInt(reconciledByUserId) : null,
        },
      });

      return {
        allocation,
        commission: updatedCommission,
        ledgerEntry,
        unallocatedRemaining: (payment.amount - newPaymentAllocated).toString(),
      };
    });
  }

  /**
   * Hoàn phí hoa hồng (AT-23)
   * Không được hoàn vượt quá số tiền ròng đã thu thực tế
   */
  async refundCommission(
    commissionId: bigint | number | string,
    dto: RefundCommissionDto,
    userId?: bigint | number | string
  ) {
    const cId = BigInt(commissionId);
    const refundAmount = BigInt(dto.refundAmount);

    if (refundAmount <= 0n) {
      throw new BadRequestException('Số tiền hoàn phải lớn hơn 0');
    }

    return this.prisma.$transaction(async (tx) => {
      const commission = await tx.commission.findUnique({
        where: { id: cId },
        include: {
          deal: true,
        },
      });

      if (!commission) {
        throw new NotFoundException('Không tìm thấy khoản phí hoa hồng');
      }

      const netPaid = commission.paidAmountVnd - commission.refundedAmountVnd;
      if (refundAmount > netPaid) {
        throw new BadRequestException(
          `Số tiền hoàn (${refundAmount.toString()}đ) không được vượt quá số tiền thực thu ròng (${netPaid.toString()}đ)`
        );
      }

      const newRefundedAmount = commission.refundedAmountVnd + refundAmount;
      let newStatus: string;

      if (newRefundedAmount >= commission.paidAmountVnd) {
        newStatus = 'refunded';
      } else {
        newStatus = 'partially_refunded';
      }

      const updatedCommission = await tx.commission.update({
        where: { id: cId },
        data: {
          refundedAmountVnd: newRefundedAmount,
          status: newStatus,
        },
      });

      // Ghi bút toán hoàn tiền vào sổ cái FinanceLedger
      const refundLedger = await tx.financeLedger.create({
        data: {
          transactionType: 'refund',
          sourceType: 'brokerage_commission',
          amount: refundAmount,
          commissionId: cId,
          userId: commission.deal.ownerId,
          externalTransactionId: dto.refundBankTxId || `REFUND-${cId}-${Date.now()}`,
          note: `Hoàn phí môi giới: ${dto.reason}`,
          recordedByUserId: userId ? BigInt(userId) : null,
        },
      });

      return {
        commission: updatedCommission,
        refundLedger,
      };
    });
  }

  /**
   * Lấy chi tiết Payment và các phân bổ
   */
  async getPaymentById(paymentId: bigint | number | string) {
    const pId = BigInt(paymentId);

    const payment = await this.prisma.payment.findUnique({
      where: { id: pId },
      include: {
        paymentAllocations: {
          include: {
            commission: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch ngân hàng');
    }

    return payment;
  }

  /**
  /**
   * Đã ngừng cung cấp VietQR trực tuyến theo Kế hoạch V2 (BR-01, GAP-06)
   */
  async getVietQrForCommission(_commissionId: bigint | number | string) {
    throw new NotFoundException('Chức năng VietQR thanh toán trực tuyến đã bị vô hiệu hóa hoàn toàn theo Kế hoạch V2 (BR-01, GAP-06)');
  }

  /**
   * Đã ngừng cung cấp Webhook ngân hàng tự động theo Kế hoạch V2 (BR-01, GAP-06)
   */
  async handleBankEmailWebhook(_payload: any, _secretHeader?: string) {
    throw new NotFoundException('Webhook ngân hàng tự động đã bị vô hiệu hóa hoàn toàn theo Kế hoạch V2 (BR-01, GAP-06)');
  }

  /**
   * Bộ xử lý lõi đối soát và gạch nợ giao dịch ngân hàng
   */
  private async processBankTransaction(params: {
    amount: bigint;
    reference: string;
    rawDescription: string;
    accountNumber: string;
    bankName: string;
    transactionDateTime: Date;
  }) {
    const { amount, reference, rawDescription, accountNumber, bankName, transactionDateTime } = params;

    if (amount <= 0n) {
      return { success: false, message: 'Số tiền thanh toán phải lớn hơn 0' };
    }

    // 1. Tìm Commission theo mã tham chiếu nằm trong memo (paymentReferenceCode)
    const commissions = await this.prisma.commission.findMany({
      where: {
        status: { in: ['estimated', 'invoiced', 'partially_paid'] },
      },
      take: 100,
    });

    const targetCommission = commissions.find((c) =>
      rawDescription.toUpperCase().includes(c.paymentReferenceCode.toUpperCase()),
    );

    if (!targetCommission) {
      // Ghi nhận giao dịch ngân hàng vào hệ thống ở trạng thái chưa phân bổ để đối soát thủ công 1-chạm
      try {
        const payment = await this.recordBankPayment({
          externalBankTxId: reference,
          bankName,
          accountNumber,
          amount: Number(amount),
          paymentTime: transactionDateTime,
          rawDescription,
        });
        return {
          success: true,
          matched: false,
          paymentId: payment.id.toString(),
          message: 'Đã lưu giao dịch ngân hàng nhưng chưa khớp mã hoa hồng trong nội dung chuyển khoản',
        };
      } catch (err: any) {
        if (err instanceof ConflictException) {
          return { success: true, duplicated: true, message: 'Giao dịch đã được ghi nhận trước đó' };
        }
        throw err;
      }
    }

    // 2. Tìm thấy Commission khớp -> Tự động ghi nhận payment và phân bổ tiền 100% tự động
    let payment;
    try {
      payment = await this.recordBankPayment({
        externalBankTxId: reference,
        bankName,
        accountNumber,
        amount: Number(amount),
        paymentTime: transactionDateTime,
        rawDescription,
      });
    } catch (err: any) {
      if (err instanceof ConflictException) {
        payment = await this.prisma.payment.findUnique({
          where: { externalBankTxId: reference },
        });
      } else {
        throw err;
      }
    }

    if (!payment) {
      throw new BadRequestException('Không thể khởi tạo bản ghi thanh toán');
    }

    const remainingDue = targetCommission.totalDueVnd - targetCommission.paidAmountVnd;
    const allocateAmount = amount > remainingDue ? remainingDue : amount;

    if (allocateAmount > 0n && payment.allocatedAmount < payment.amount) {
      await this.allocatePayment(payment.id, {
        commissionId: targetCommission.id.toString(),
        amount: Number(allocateAmount),
        note: `Tự động đối soát từ Webhook Ngân hàng (mã GD: ${reference})`,
      });
    }

    // RB-04: Ghi nhận sự kiện vào AuditEvent bất biến
    await this.prisma.auditEvent.create({
      data: {
        actorId: null,
        action: 'payment.webhook_auto_reconciled',
        entityType: 'commission',
        entityId: targetCommission.id.toString(),
        reason: `Tự động gạch nợ ${allocateAmount.toString()}đ cho hoa hồng ${targetCommission.id.toString()} qua webhook`,
      },
    });

    // Thông báo tức thì qua Telegram bot nếu đã cấu hình
    const formattedAmount = new Intl.NumberFormat('vi-VN').format(Number(allocateAmount));
    await this.notifyTelegram(
      `💰 [NHACUALAND - TỰ ĐỘNG GẠCH NỢ]\n` +
      `✅ Đã nhận: +${formattedAmount} VNĐ từ Vietcombank\n` +
      `📌 Nội dung: ${rawDescription}\n` +
      `🔖 Mã hoa hồng: ${targetCommission.paymentReferenceCode}\n` +
      `⚡ Trạng thái: Hoàn tất đối soát gạch nợ tự động`
    );

    return {
      success: true,
      matched: true,
      commissionId: targetCommission.id.toString(),
      paymentId: payment.id.toString(),
      allocatedAmount: allocateAmount.toString(),
      message: 'Đối soát và gạch nợ tự động thành công',
    };
  }

  /**
   * Bắn thông báo Telegram khi tiền về
   */
  private async notifyTelegram(message: string): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    } catch {
      // Non-blocking telegram alert failure
    }
  }
}

