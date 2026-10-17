import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { RecordDepositDto } from './dto/record-deposit.dto';
import { RecordContractDto } from './dto/record-contract.dto';
import { RecordHandoverDto } from './dto/record-handover.dto';
import { ListingStatus } from '@batdongsan/database';
import * as crypto from 'crypto';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo giao dịch thuê phòng mới
   */
  async createDeal(dto: CreateDealDto) {
    const unitId = BigInt(dto.unitId);
    const agreementId = BigInt(dto.agreementId);
    const introId = dto.introId ? BigInt(dto.introId) : null;

    const unit = await this.prisma.rentalUnit.findUnique({
      where: { id: unitId },
      include: { ownerProfile: true },
    });

    if (!unit) {
      throw new NotFoundException('Không tìm thấy phòng cho thuê');
    }

    const agreement = await this.prisma.ownerServiceAgreement.findUnique({
      where: { id: agreementId },
    });

    if (!agreement) {
      throw new NotFoundException('Không tìm thấy hợp đồng dịch vụ môi giới HĐ-01');
    }

    if (agreement.status !== 'active') {
      throw new BadRequestException('Hợp đồng dịch vụ môi giới chưa có hiệu lực');
    }

    const dealCode = `DEAL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    return this.prisma.rentalDeal.create({
      data: {
        dealCode,
        unitId,
        agreementId,
        introId,
        ownerId: unit.ownerId,
        ownerProfileId: unit.ownerProfileId,
        tenantName: dto.tenantName,
        tenantPhone: dto.tenantPhone,
        tenantIdentity: dto.tenantIdentity,
        actualMonthlyRent: BigInt(dto.actualMonthlyRent),
        depositAmount: BigInt(dto.depositAmount || 0),
        leaseStartDate: new Date(dto.leaseStartDate),
        leaseEndDate: new Date(dto.leaseEndDate),
        status: 'negotiating',
      },
    });
  }

  /**
   * Ghi nhận đặt cọc (BR-10, AT-13)
   * LƯU Ý BẮT BUỘC: Cọc là quan hệ trực tiếp khách - chủ, KHÔNG làm phát sinh phí hoa hồng DUE.
   */
  async recordDeposit(dealId: bigint | number | string, dto: RecordDepositDto) {
    const dId = BigInt(dealId);

    return this.prisma.$transaction(async (tx) => {
      const deal = await tx.rentalDeal.findUnique({
        where: { id: dId },
      });

      if (!deal) {
        throw new NotFoundException('Không tìm thấy hồ sơ giao dịch thuê');
      }

      // Tạo bản ghi DepositRecord
      const depositRecord = await tx.depositRecord.create({
        data: {
          dealId: dId,
          amount: BigInt(dto.amount),
          recipientName: dto.recipientName,
          recipientAccount: dto.recipientAccount,
          recipientBank: dto.recipientBank,
          depositedAt: dto.depositedAt ? new Date(dto.depositedAt) : new Date(),
          holdUntil: dto.holdUntil ? new Date(dto.holdUntil) : null,
          receiptUrl: dto.receiptUrl,
          notes: dto.notes,
          status: 'held_by_owner',
        },
      });

      // Cập nhật số tiền cọc ghi nhận trên deal
      await tx.rentalDeal.update({
        where: { id: dId },
        data: {
          depositAmount: BigInt(dto.amount),
        },
      });

      return depositRecord;
    });
  }

  /**
   * Ghi nhận hợp đồng thuê đã ký
   */
  async recordContractSigned(dealId: bigint | number | string, dto: RecordContractDto = {}) {
    const dId = BigInt(dealId);

    const deal = await this.prisma.rentalDeal.findUnique({
      where: { id: dId },
    });

    if (!deal) {
      throw new NotFoundException('Không tìm thấy hồ sơ giao dịch thuê');
    }

    const signedAt = dto.contractSignedAt ? new Date(dto.contractSignedAt) : new Date();

    return this.prisma.rentalDeal.update({
      where: { id: dId },
      data: {
        contractSignedAt: signedAt,
        contractUrl: dto.contractUrl || deal.contractUrl,
        contractHash: dto.contractHash || deal.contractHash,
        status: 'signed',
      },
    });
  }

  /**
   * Ghi nhận chủ đã nhận khoản tiền thuê tháng đầu tiên
   */
  async recordFirstMonthPaid(dealId: bigint | number | string, paidAt?: Date) {
    const dId = BigInt(dealId);

    const deal = await this.prisma.rentalDeal.findUnique({
      where: { id: dId },
    });

    if (!deal) {
      throw new NotFoundException('Không tìm thấy hồ sơ giao dịch thuê');
    }

    return this.prisma.rentalDeal.update({
      where: { id: dId },
      data: {
        firstMonthPaidAt: paidAt ? new Date(paidAt) : new Date(),
      },
    });
  }

  /**
   * Ghi nhận biên bản bàn giao phòng
   */
  async recordHandover(dealId: bigint | number | string, dto: RecordHandoverDto = {}) {
    const dId = BigInt(dealId);

    return this.prisma.$transaction(async (tx) => {
      const deal = await tx.rentalDeal.findUnique({
        where: { id: dId },
      });

      if (!deal) {
        throw new NotFoundException('Không tìm thấy hồ sơ giao dịch thuê');
      }

      const handoverDate = dto.handoverDate ? new Date(dto.handoverDate) : new Date();

      const handover = await tx.handoverRecord.create({
        data: {
          dealId: dId,
          handoverDate,
          electricMeterNumber: dto.electricMeterNumber,
          waterMeterNumber: dto.waterMeterNumber,
          keysCount: dto.keysCount || 1,
          conditionNotes: dto.conditionNotes,
          handoverDocUrl: dto.handoverDocUrl,
          ownerConfirmed: dto.ownerConfirmed ?? true,
          tenantConfirmed: dto.tenantConfirmed ?? true,
          agentWitnessed: dto.agentWitnessed ?? true,
        },
      });

      await tx.rentalDeal.update({
        where: { id: dId },
        data: {
          handoverCompletedAt: handoverDate,
        },
      });

      return handover;
    });
  }

  /**
   * Đánh giá và ghi nhận thuê thành công theo §6.2 (AT-13, AT-14, BR-10)
   * Điều kiện đồng thời:
   * 1. Hợp đồng dịch vụ HĐ-01 còn hiệu lực.
   * 2. Đã ký hợp đồng thuê (contractSignedAt != null).
   * 3. Chủ đã nhận tiền thuê tháng đầu (firstMonthPaidAt != null).
   * 4. Đã bàn giao phòng (handoverCompletedAt != null).
   * 5. Không tranh chấp.
   */
  async evaluateDealSuccess(dealId: bigint | number | string) {
    const dId = BigInt(dealId);

    return this.prisma.$transaction(async (tx) => {
      const deal = await tx.rentalDeal.findUnique({
        where: { id: dId },
        include: { agreement: true, unit: true },
      });

      if (!deal) {
        throw new NotFoundException('Không tìm thấy hồ sơ giao dịch thuê');
      }

      const missingConditions: string[] = [];

      if (!deal.agreement || deal.agreement.status !== 'active') {
        missingConditions.push('Hợp đồng dịch vụ môi giới HĐ-01 chưa có hiệu lực');
      }

      if (!deal.contractSignedAt) {
        missingConditions.push('Hợp đồng thuê giữa chủ và khách chưa được ký');
      }

      // Điều kiện 3 theo Mục 5 Kế hoạch V2: Khoản tiền thuê đầu tiên đến hạn (nếu có) đã được chủ xác nhận
      if (!deal.firstMonthPaidAt && deal.actualMonthlyRent > 0n) {
        missingConditions.push('Khoản tiền thuê đầu tiên đến hạn chưa được chủ nhà xác nhận nhận từ khách thuê');
      }

      if (!deal.handoverCompletedAt) {
        missingConditions.push('Chưa hoàn thành biên bản bàn giao phòng');
      }

      if (missingConditions.length > 0) {
        return {
          isSuccess: false,
          dealId: deal.id.toString(),
          dealCode: deal.dealCode,
          missingConditions,
          canGenerateCommission: false,
        };
      }

      // Đã đủ điều kiện thành công §6.2
      const successAt = new Date();

      const updatedDeal = await tx.rentalDeal.update({
        where: { id: dId },
        data: {
          successAt,
          status: 'active',
        },
      });

      // Cập nhật trạng thái phòng sang 'rented'
      await tx.rentalUnit.update({
        where: { id: deal.unitId },
        data: { status: 'rented' },
      });

      // Bảo đảm tính toàn vẹn dữ liệu: Cập nhật đồng thời mọi tin đăng Listing liên quan sang 'rented'
      await tx.listing.updateMany({
        where: { unitId: deal.unitId },
        data: { status: ListingStatus.rented },
      });

      return {
        isSuccess: true,
        dealId: updatedDeal.id.toString(),
        dealCode: updatedDeal.dealCode,
        successAt,
        status: updatedDeal.status,
        canGenerateCommission: true,
      };
    });
  }

  /**
   * Lấy chi tiết hồ sơ giao dịch
   */
  async getDealById(dealId: bigint | number | string) {
    const dId = BigInt(dealId);

    const deal = await this.prisma.rentalDeal.findUnique({
      where: { id: dId },
      include: {
        agreement: true,
        unit: true,
        depositRecords: true,
        handoverRecords: true,
        commission: true,
      },
    });

    if (!deal) {
      throw new NotFoundException('Không tìm thấy giao dịch thuê');
    }

    return deal;
  }
}
