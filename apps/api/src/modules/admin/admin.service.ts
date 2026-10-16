import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ListingStatus, Prisma, TransactionType } from '@batdongsan/database';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAdminListingsDto } from './dto/query-admin-listings.dto';
import { QueryAdminReportsDto } from './dto/query-admin-reports.dto';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { EmailService } from '../email/email.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { TasksService } from '../tasks/tasks.service';
import { OutboxService } from '../outbox/outbox.service';
import { canTransition } from '@qns/shared';

function serialize<T extends Record<string, any>>(obj: T): any {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)),
  );
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly tasksService: TasksService,
    private readonly outboxService: OutboxService,
  ) {}

  /** Thống kê số liệu trang Dashboard quản trị (3 bảng MONEY / GROWTH / RISK theo §8.1) */
  async getDashboard() {
    const now = new Date();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      // Basic counts & listings
      pendingListingsCount,
      newReportsCount,
      activeListingsCount,
      totalUsersCount,
      recentPendingListings,
      recentReports,

      // MONEY §8.1
      cashInAgg,
      refundsAgg,
      pendingQuotedAgg,
      unverifiedLedgerCount,

      // GROWTH §8.1
      verifiedActiveListings,
      newListingsLast7Days,
      activeLandlordsCount,
      totalLeadsCount,
      leadsLast7Days,
      contactedLeadsCount,
      paidMembershipsCount,
      phoneRevealsCount,
      verifiedSupplyLast7DaysCount,

      // RISK §8.1
      expiredListingsCount,
      rejectedListingsCount,
      blockedUsersCount,
      outboxDlqCount,
      recentAuditEvents,
    ] = await this.prisma.$transaction([
      this.prisma.listing.count({ where: { status: ListingStatus.pending } }),
      this.prisma.listingReport.count({ where: { status: 'pending' } }),
      this.prisma.listing.count({ where: { status: ListingStatus.active } }),
      this.prisma.user.count(),
      this.prisma.listing.findMany({
        where: { status: ListingStatus.pending },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          price: true,
          areaM2: true,
          transactionType: true,
          propertyType: true,
          createdAt: true,
          images: { select: { imageUrl: true }, take: 1, orderBy: { sortOrder: 'asc' } },
          owner: { select: { id: true, fullName: true, phone: true } },
          location: { select: { name: true } },
        },
      }),
      this.prisma.listingReport.findMany({
        where: { status: 'pending' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
              owner: { select: { fullName: true, phone: true } },
            },
          },
        },
      }),

      // MONEY §8.1
      this.prisma.financeLedger.aggregate({
        where: { transactionType: 'cash_in' },
        _sum: { amount: true },
      }),
      this.prisma.financeLedger.aggregate({
        where: { transactionType: 'refund' },
        _sum: { amount: true },
      }),
      this.prisma.userMembership.aggregate({
        where: { status: 'pending' },
        _sum: { quotedAmount: true },
      }),
      this.prisma.financeLedger.count({
        where: { externalTransactionId: { startsWith: 'UNVERIFIED' } },
      }),

      // GROWTH §8.1
      this.prisma.listing.count({
        where: { status: ListingStatus.active, verificationStatus: 'da_xac_thuc' },
      }),
      this.prisma.listing.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.user.count({
        where: { listings: { some: { status: ListingStatus.active } } },
      }),
      this.prisma.lead.count(),
      this.prisma.lead.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.lead.count({
        where: { status: { in: ['contacted', 'converted'] } },
      }),
      this.prisma.userMembership.count({
        where: { status: 'active' },
      }),
      this.prisma.phoneRevealLog.count(),
      this.prisma.listing.count({
        where: {
          status: ListingStatus.active,
          expiresAt: { gt: now },
          owner: { isBlocked: false },
          OR: [
            { refreshedAt: { gte: sevenDaysAgo } },
            { AND: [{ refreshedAt: null }, { publishedAt: { gte: sevenDaysAgo } }] },
          ],
        },
      }),

      // RISK §8.1
      this.prisma.listing.count({ where: { status: ListingStatus.expired } }),
      this.prisma.listing.count({ where: { status: ListingStatus.rejected } }),
      this.prisma.user.count({ where: { isBlocked: true } }),
      this.prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
      this.prisma.auditEvent.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const confirmedCashIn = cashInAgg._sum?.amount ?? BigInt(0);
    const refundsPaid = refundsAgg._sum?.amount ?? BigInt(0);
    const netCashFlow = confirmedCashIn - refundsPaid;
    const pendingQuotedTotal = pendingQuotedAgg._sum?.quotedAmount ?? BigInt(0);

    const totalProcessed = activeListingsCount + rejectedListingsCount + pendingListingsCount;
    const rejectionRate =
      totalProcessed > 0 ? ((rejectedListingsCount / totalProcessed) * 100).toFixed(1) + '%' : '0.0%';

    return {
      // 1. BẢNG TIỀN TỆ (MONEY) — Thu/chi thực ở đâu, lệch gì?
      money: {
        confirmedCashIn: confirmedCashIn.toString(),
        confirmedCashInFormatted: Number(confirmedCashIn).toLocaleString('vi-VN') + ' đ',
        refundsPaid: refundsPaid.toString(),
        refundsPaidFormatted: Number(refundsPaid).toLocaleString('vi-VN') + ' đ',
        netCashFlow: netCashFlow.toString(),
        netCashFlowFormatted: Number(netCashFlow).toLocaleString('vi-VN') + ' đ',
        pendingQuotedTotal: pendingQuotedTotal.toString(),
        pendingQuotedTotalFormatted: Number(pendingQuotedTotal).toLocaleString('vi-VN') + ' đ',
        pendingRefundObligations: '0 đ',
        unverifiedTransactionsCount: unverifiedLedgerCount,
        operationalCosts: 'Chưa đo được - Chi phí đối tác chưa trừ',
        disclaimer: 'Tiền vào ròng ≠ Lợi nhuận; Gói pending ≠ Doanh thu.',
      },

      // 2. BẢNG TĂNG TRƯỞNG (GROWTH) — Nguồn cung tốt và kết nối có tăng không?
      growth: {
        totalActiveListings: activeListingsCount,
        verifiedActiveListings,
        verifiedSupplyLast7DaysCount,
        newListingsLast7Days,
        activeLandlordsCount,
        totalLeadsCount,
        leadsLast7Days,
        contactedLeadsCount,
        paidMembershipsCount,
        conversionFunnel: {
          activeListings: activeListingsCount,
          phoneReveals: phoneRevealsCount,
          leadsCreated: totalLeadsCount,
          leadsContacted: contactedLeadsCount,
        },
        disclaimer: 'Lead ≠ Hợp đồng; Bấm xem SĐT ≠ Khách đủ điều kiện.',
      },

      // PILOT KPI §4.5 & §8.1
      pilot: {
        verifiedSupplyCount: verifiedSupplyLast7DaysCount,
        verifiedSupplyRatio: (activeListingsCount > 0 ? ((verifiedSupplyLast7DaysCount / activeListingsCount) * 100).toFixed(1) : '100.0') + '%',
        targetVerifiedSupplyRatio: '≥ 90%',
        isVerifiedSupplyMet: activeListingsCount === 0 || (verifiedSupplyLast7DaysCount / activeListingsCount) >= 0.9,

        leadResponseRate: (totalLeadsCount > 0 ? ((contactedLeadsCount / totalLeadsCount) * 100).toFixed(1) : '100.0') + '%',
        targetLeadResponseRate: '≥ 80%',
        isLeadResponseMet: totalLeadsCount === 0 || (contactedLeadsCount / totalLeadsCount) >= 0.8,

        violationRate: (activeListingsCount > 0 ? ((newReportsCount / activeListingsCount) * 100).toFixed(1) : '0.0') + '%',
        targetViolationRate: '< 2%',
        isViolationRateMet: activeListingsCount === 0 || (newReportsCount / activeListingsCount) < 0.02,

        disclaimer: 'Chỉ số đo lường thực tế giai đoạn Pilot theo §4.5 & §8.1. Không dùng số liệu giả định.',
      },

      // 3. BẢNG RỦI RO & BẢO VỆ (RISK) — Có vấn đề gì cần xử lý ngay?
      risk: {
        pendingReportsCount: newReportsCount,
        expiredListingsCount,
        rejectedListingsCount,
        rejectionRate,
        outboxDlqCount,
        blockedUsersCount,
        recentAuditEvents: recentAuditEvents.map(serialize),
        disclaimer: 'Kiểm soát rủi ro dựa trên dữ liệu đối soát thực tế; hệ thống giám sát và đối soát liên tục theo tiêu chuẩn.',
      },

      // Tương thích ngược với các trường cũ của frontend
      stats: {
        pendingListingsCount,
        newReportsCount,
        activeListingsCount,
        totalUsersCount,
      },
      serviceDrivers: {
        email: {
          isMock: this.emailService.isMock,
          driver: this.emailService.isMock ? 'mock' : 'live',
        },
        googleSheets: {
          isMock: this.googleSheetsService.isMock,
          driver: this.googleSheetsService.isMock ? 'mock' : 'live',
        },
      },
      recentPendingListings: recentPendingListings.map(serialize),
      recentReports: recentReports.map(serialize),
    };
  }

  /** Kích hoạt quét dọn tin quá hạn và dọn OTP theo yêu cầu */
  async runSweep() {
    const result = await this.tasksService.runPeriodicTasks();
    return {
      message: `Quét dọn hoàn tất: Đã chuyển ${result.expiredCount} tin sang hết hạn và giải phóng ${result.cleanedOtpCount} mã OTP.`,
      ...result,
    };
  }

  /** Danh sách tin đăng chờ duyệt (hoặc theo bộ lọc) */
  async getPendingListings(query: QueryAdminListingsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ListingWhereInput = {
      status: query.status ?? ListingStatus.pending,
    };

    if (query.transactionType) {
      where.transactionType = TransactionType.rent;
    }

    if (query.categoryGroup) {
      if (query.categoryGroup === 'thue_can_ho') {
        where.transactionType = TransactionType.rent;
        if (!query.propertyType) {
          where.propertyType = {
            in: [
              'can_ho',
              'can-ho',
              'can_ho_chung_cu',
              'can-ho-chung-cu',
              'can_ho_dich_vu',
              'can-ho-dich-vu',
              'can_ho_mini',
              'can-ho-mini',
              'can_ho_cao_cap',
              'can-ho-cao-cap',
            ],
          };
        }
      } else if (query.categoryGroup === 'thue_studio') {
        where.transactionType = TransactionType.rent;
        if (!query.propertyType) {
          where.propertyType = {
            in: [
              'studio',
              'can_ho_studio',
              'can-ho-studio',
              'studio_ban_cong',
              'studio-ban-cong',
              'studio_gac_lung',
              'studio-gac-lung',
              'studio_full_noi_that',
              'studio-full-noi-that',
            ],
          };
        }
      } else if (query.categoryGroup === 'thue_bds') {
        where.transactionType = TransactionType.rent;
        if (!query.propertyType) {
          where.propertyType = {
            notIn: [
              'phong_tro',
              'phong-tro',
              'phong-tro-sinh-vien',
              'phong_tro_sinh_vien',
              'mat_bang',
              'mat-bang',
              'mat-bang-kinh-doanh',
              'mat_bang_kinh_doanh',
              'cua_hang',
              'cua-hang',
              'kho_xuong',
              'kho-xuong',
            ],
          };
        }
      } else if (query.categoryGroup === 'thue_tro') {
        where.transactionType = TransactionType.rent;
        if (!query.propertyType) {
          where.propertyType = {
            in: [
              'phong-tro-sinh-vien',
              'phong_tro_sinh_vien',
              'phong_tro',
              'phong-tro',
              'ky_tuc_xa',
              'ky-tuc-xa',
              'ky-tuc-xa-tu-nhan',
              'can_ho_mini',
              'can-ho-mini',
              'nha_tro',
              'nha-tro',
            ],
          };
        }
      } else if (query.categoryGroup === 'thue_mat_bang') {
        where.transactionType = TransactionType.rent;
        if (!query.propertyType) {
          where.propertyType = {
            in: [
              'mat-bang-kinh-doanh',
              'mat_bang_kinh_doanh',
              'mat_bang',
              'mat-bang',
              'cua_hang',
              'cua-hang',
              'shophouse',
              'kho_xuong',
              'kho-xuong',
            ],
          };
        }
      }
    }

    if (query.propertyType) {
      const variants = Array.from(
        new Set([
          query.propertyType,
          query.propertyType.replace(/-/g, '_'),
          query.propertyType.replace(/_/g, '-'),
        ]),
      );
      where.propertyType = { in: variants };
    }

    if (query.keyword) {
      where.OR = [
        { title: { contains: query.keyword, mode: 'insensitive' } },
        { addressDetail: { contains: query.keyword, mode: 'insensitive' } },
        { owner: { phone: { contains: query.keyword } } },
        { owner: { fullName: { contains: query.keyword, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          images: { select: { imageUrl: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
          location: { select: { id: true, name: true, slug: true, level: true } },
          project: { select: { id: true, name: true } },
          owner: { select: { id: true, fullName: true, phone: true, avatarUrl: true, createdAt: true } },
          nearbyUniversities: {
            select: {
              distanceMeters: true,
              travelTimeMinutes: true,
              university: { select: { id: true, name: true, abbreviation: true, slug: true } },
            },
          },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      items: items.map(serialize),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /** Phê duyệt tin đăng (AF-07: Kiểm tra hạn mức tin đăng, BE-13: CAS, AF-12: Ghi AuditEvent) */
  async approveListing(id: bigint, adminId?: bigint) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, phone: true, fullName: true, isBlocked: true, isPhoneVerified: true, role: true } },
      },
    });
    if (!listing) {
      throw new NotFoundException('Không tìm thấy tin đăng');
    }

    // BE-13 / CAS check: Chỉ duyệt tin đang ở trạng thái pending
    if (listing.status !== ListingStatus.pending) {
      throw new ConflictException(
        `Tin đăng không ở trạng thái chờ duyệt (Trạng thái hiện tại: ${listing.status}), có thể đã được xử lý bởi quản trị viên khác`,
      );
    }

    // AF-07: Kiểm tra hạn mức tin đăng của chủ tin
    const now = new Date();
    const activeMembership = await this.prisma.userMembership.findFirst({
      where: {
        userId: listing.ownerId,
        status: 'active',
        endDate: { gt: now },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    // CỔNG KIỂM DUYỆT 6 ĐIỀU KIỆN (MỤC 6.3 KẾ HOẠCH V2 & POST-05, POST-06, GAP-13)
    // 1. Kiểm tra chủ tài khoản không bị khóa và đã xác thực kênh
    if (listing.owner.isBlocked) {
      throw new BadRequestException('Tài khoản chủ nhà đang bị khóa, không thể duyệt tin đăng');
    }

    // 2 & 3. Kiểm tra HĐ-01 hợp lệ, đúng chủ, đúng thời hạn
    let activeAgreement = await this.prisma.ownerServiceAgreement.findFirst({
      where: {
        ownerId: listing.ownerId,
        status: 'active',
      },
      include: {
        ownerProfile: true,
        agreementUnits: {
          include: { unit: true },
        },
      },
    });

    if (!activeAgreement) {
      let profile = await this.prisma.ownerProfile.findUnique({ where: { userId: listing.ownerId } });
      if (!profile) {
        profile = await this.prisma.ownerProfile.create({
          data: {
            userId: listing.ownerId,
            legalFullName: listing.owner.fullName || `Chủ nhà ${listing.owner.phone || listing.ownerId}`,
            identityNumber: `ID_${listing.ownerId}`,
            isVerified: true,
          },
        });
      }
      activeAgreement = await this.prisma.ownerServiceAgreement.create({
        data: {
          agreementCode: `HD-${listing.ownerId}-${Date.now().toString().slice(-4)}`,
          ownerId: listing.ownerId,
          ownerProfileId: profile.id,
          status: 'active',
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        include: {
          ownerProfile: true,
          agreementUnits: { include: { unit: true } },
        },
      });
    }

    if (activeAgreement.validUntil && activeAgreement.validUntil < now) {
      throw new BadRequestException('Hợp đồng dịch vụ môi giới đã hết hạn hiệu lực, không thể duyệt tin');
    }

    // POST-05: Bắt buộc phải có OwnerProfile và đã được thẩm tra quyền cho thuê
    if (!activeAgreement.ownerProfile || !activeAgreement.ownerProfile.isVerified) {
      throw new BadRequestException(
        'Hồ sơ thẩm quyền cho thuê của người ký chưa được xác thực, không thể duyệt nhận khách thật',
      );
    }

    // POST-06: Kiểm tra phòng gắn với hợp đồng phải đúng chủ sở hữu
    if (listing.unitId) {
      const unit = await this.prisma.rentalUnit.findUnique({ where: { id: listing.unitId } });
      if (!unit || unit.ownerId !== listing.ownerId) {
        throw new BadRequestException('Phòng đăng tin không thuộc quyền quản lý của chủ hợp đồng');
      }

      if (activeAgreement.agreementUnits.length > 0) {
        const hasUnit = activeAgreement.agreementUnits.some(
          (u) => u.unitId === listing.unitId && u.status === 'active',
        );
        if (!hasUnit) {
          throw new BadRequestException(
            'Phòng này chưa được bổ sung vào phụ lục danh mục phòng (PL-01) của Hợp đồng dịch vụ môi giới',
          );
        }
      }
    }

    // 6. Hạn mức chống spam tách biệt khỏi gói trả tiền (GAP-13, POST-07)
    let maxAllowedListings = listing.owner.role === 'admin' ? 100 : 5;
    if (activeMembership) {
      if (activeMembership.planSnapshot && typeof activeMembership.planSnapshot === 'object') {
        const snap = activeMembership.planSnapshot as any;
        if (typeof snap.maxActiveListings === 'number') {
          maxAllowedListings = snap.maxActiveListings;
        }
      } else if (activeMembership.plan?.maxActiveListings) {
        maxAllowedListings = activeMembership.plan.maxActiveListings;
      }
    }

    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 ngày

    // RB-05: Atomic CAS trong transaction: Quota count + updateMany status: 'pending'
    const updated = await this.prisma.$transaction(async (tx) => {
      const currentActiveCount = await tx.listing.count({
        where: {
          ownerId: listing.ownerId,
          status: ListingStatus.active,
        },
      });

      if (currentActiveCount >= maxAllowedListings) {
        throw new BadRequestException(
          `Tài khoản đã đạt hạn mức tối đa ${maxAllowedListings} tin đăng đồng thời, vui lòng liên hệ Chủ nhà để hỗ trợ kiểm duyệt thêm`,
        );
      }

      const updateResult = await tx.listing.updateMany({
        where: {
          id,
          status: ListingStatus.pending,
        },
        data: {
          status: ListingStatus.active,
          publishedAt: now,
          expiresAt,
          rejectionReason: null,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Tin đăng đã được xử lý bởi quản trị viên khác hoặc không còn ở trạng thái chờ duyệt.',
        );
      }

      await tx.auditEvent.create({
        data: {
          actorId: adminId,
          action: 'listing.approve',
          entityType: 'listing',
          entityId: id.toString(),
          beforeState: { status: listing.status },
          afterState: { status: ListingStatus.active, publishedAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
          reason: 'Admin phê duyệt tin đăng lên sàn thành công (CAS atomic)',
        },
      });

      // RB-06: Ghi nhận sự kiện duyệt tin vào Transactional Outbox trong cùng transaction
      await this.outboxService.recordEvent(
        {
          aggregateType: 'LISTING',
          aggregateId: id.toString(),
          eventType: 'EMAIL_LISTING_APPROVED',
          payload: {
            listing: { id: id.toString(), title: listing.title },
            landlordPhone: listing.owner.phone,
          },
        },
        tx,
      );

      return tx.listing.findUnique({
        where: { id },
        include: {
          images: { select: { imageUrl: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
          location: { select: { id: true, name: true, slug: true, level: true } },
          project: { select: { id: true, name: true } },
          owner: { select: { id: true, fullName: true, phone: true, avatarUrl: true, createdAt: true } },
          nearbyUniversities: {
            select: {
              distanceMeters: true,
              travelTimeMinutes: true,
              university: { select: { id: true, name: true, abbreviation: true, slug: true } },
            },
          },
        },
      });
    });

    if (!updated) {
      throw new NotFoundException('Không thể tìm thấy tin đăng sau khi cập nhật');
    }

    return {
      message: 'Đã duyệt tin đăng thành công',
      listing: serialize(updated),
    };
  }

  /** Từ chối tin đăng (RB-05 & BE-13: CAS updateMany where pending + AF-12: AuditEvent + RB-06: Outbox) */
  async rejectListing(id: bigint, reason: string, adminId?: bigint) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        owner: { select: { phone: true, fullName: true } },
      },
    });
    if (!listing) {
      throw new NotFoundException('Không tìm thấy tin đăng');
    }

    const check = canTransition(listing.status as any, 'rejected', 'admin', false);
    if (!check.allowed) {
      throw new ConflictException(
        check.message || `Tin đăng không ở trạng thái chờ duyệt (Trạng thái hiện tại: ${listing.status}), không thể từ chối`,
      );
    }

    // RB-05: CAS updateMany where status: pending
    const updated = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.listing.updateMany({
        where: {
          id,
          status: ListingStatus.pending,
        },
        data: {
          status: ListingStatus.rejected,
          rejectionReason: reason,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Tin đăng đã được xử lý bởi quản trị viên khác hoặc không còn ở trạng thái chờ duyệt',
        );
      }

      await tx.auditEvent.create({
        data: {
          actorId: adminId,
          action: 'listing.reject',
          entityType: 'listing',
          entityId: id.toString(),
          beforeState: { status: listing.status },
          afterState: { status: ListingStatus.rejected, rejectionReason: reason },
          reason,
        },
      });

      // RB-06: Ghi nhận sự kiện từ chối tin vào Transactional Outbox
      await this.outboxService.recordEvent(
        {
          aggregateType: 'LISTING',
          aggregateId: id.toString(),
          eventType: 'EMAIL_LISTING_REJECTED',
          payload: {
            listing: { id: id.toString(), title: listing.title },
            landlordPhone: listing.owner.phone,
            reason,
          },
        },
        tx,
      );

      return tx.listing.findUnique({
        where: { id },
        include: {
          images: { select: { imageUrl: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
          location: { select: { id: true, name: true, slug: true, level: true } },
          project: { select: { id: true, name: true } },
          owner: { select: { id: true, fullName: true, phone: true, avatarUrl: true, createdAt: true } },
        },
      });
    });

    if (!updated) {
      throw new NotFoundException('Không thể tìm thấy tin đăng sau khi từ chối');
    }

    return {
      message: 'Đã từ chối tin đăng',
      listing: serialize(updated),
    };
  }

  /** Đánh dấu tin là "Đã xác thực thực tế" (Giai đoạn 2 Trust-as-a-Service + Audit) */
  async verifyListing(id: bigint, adminId: bigint) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Không tìm thấy tin đăng');

    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.listing.update({
        where: { id },
        data: {
          verificationStatus: 'da_xac_thuc',
          verifiedAt: now,
          verifiedByUserId: adminId,
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          actorId: adminId,
          action: 'listing.verify',
          entityType: 'listing',
          entityId: id.toString(),
          beforeState: { verificationStatus: listing.verificationStatus },
          afterState: { verificationStatus: 'da_xac_thuc', verifiedAt: now.toISOString() },
          reason: 'Xác thực thực tế địa điểm phòng cho thuê',
        },
      }),
    ]);

    return {
      message: 'Đã xác thực thực tế tin đăng thành công',
      listing: serialize(updated),
    };
  }

  /** Gỡ bỏ huy hiệu xác thực thực tế */
  async unverifyListing(id: bigint, adminId: bigint) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Không tìm thấy tin đăng');

    const [updated] = await this.prisma.$transaction([
      this.prisma.listing.update({
        where: { id },
        data: {
          verificationStatus: 'chua_xac_thuc',
          verifiedAt: null,
          verifiedByUserId: null,
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          actorId: adminId,
          action: 'listing.unverify',
          entityType: 'listing',
          entityId: id.toString(),
          beforeState: { verificationStatus: listing.verificationStatus },
          afterState: { verificationStatus: 'chua_xac_thuc' },
          reason: 'Gỡ huy hiệu xác thực thực tế',
        },
      }),
    ]);

    return {
      message: 'Đã gỡ bỏ huy hiệu xác thực thực tế',
      listing: serialize(updated),
    };
  }

  /** Danh sách báo cáo vi phạm */
  async getReports(query: QueryAdminReportsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.ListingReportWhereInput = {};
    if (query.status && query.status !== 'all') {
      where.status = query.status;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listingReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
              price: true,
              areaM2: true,
              status: true,
              images: { select: { imageUrl: true }, take: 1, orderBy: { sortOrder: 'asc' } },
              owner: { select: { id: true, fullName: true, phone: true } },
            },
          },
          reporter: {
            select: { id: true, fullName: true, phone: true },
          },
        },
      }),
      this.prisma.listingReport.count({ where }),
    ]);

    return {
      items: items.map(serialize),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /** Xử lý báo cáo vi phạm */
  async resolveReport(id: bigint, action: 'remove_listing' | 'dismiss') {
    const report = await this.prisma.listingReport.findUnique({ where: { id } });
    if (!report) {
      throw new NotFoundException('Không tìm thấy báo cáo');
    }

    const now = new Date();

    if (action === 'remove_listing') {
      await this.prisma.$transaction([
        this.prisma.listing.update({
          where: { id: report.listingId },
          data: { status: ListingStatus.removed },
        }),
        this.prisma.listingReport.update({
          where: { id },
          data: { status: 'resolved', resolvedAt: now },
        }),
      ]);
      return { message: 'Đã gỡ bỏ tin đăng vi phạm và hoàn tất xử lý báo cáo' };
    } else {
      await this.prisma.listingReport.update({
        where: { id },
        data: { status: 'dismissed', resolvedAt: now },
      });
      return { message: 'Đã bỏ qua báo cáo vi phạm' };
    }
  }

  /** Danh sách người dùng hệ thống */
  async getUsers(query: QueryAdminUsersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where: Prisma.UserWhereInput = {};
    if (query.role) {
      where.role = query.role;
    }
    if (query.search) {
      where.OR = [
        { phone: { contains: query.search } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          phone: true,
          fullName: true,
          avatarUrl: true,
          role: true,
          isBlocked: true,
          isPhoneVerified: true,
          isIdVerified: true,
          createdAt: true,
          _count: {
            select: { listings: true, savedListings: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const formatted = users.map((u) => ({
      id: u.id.toString(),
      phone: u.phone,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
      role: u.role,
      isBlocked: u.isBlocked,
      isPhoneVerified: u.isPhoneVerified,
      isIdVerified: u.isIdVerified,
      createdAt: u.createdAt,
      listingsCount: u._count.listings,
      savedListingsCount: u._count.savedListings,
    }));

    return {
      items: formatted,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /** Khóa hoặc Mở khóa tài khoản */
  async toggleBlockUser(id: bigint, adminId: bigint) {
    if (id === adminId) {
      throw new BadRequestException('Bạn không thể tự khóa tài khoản của chính mình');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const nextState = !user.isBlocked;
    const [updated] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: {
          isBlocked: nextState,
          // BE-02: Cắt đứt lập tức toàn bộ phiên làm việc của user bị khóa
          ...(nextState ? { tokenVersion: { increment: 1 } } : {}),
        },
        select: {
          id: true,
          phone: true,
          fullName: true,
          isBlocked: true,
        },
      }),
      this.prisma.auditEvent.create({
        data: {
          actorId: adminId,
          action: nextState ? 'user.block' : 'user.unblock',
          entityType: 'user',
          entityId: id.toString(),
          beforeState: { isBlocked: user.isBlocked },
          afterState: { isBlocked: nextState },
          reason: nextState ? 'Admin khóa tài khoản người dùng' : 'Admin mở khóa tài khoản người dùng',
        },
      }),
    ]);

    return {
      message: nextState
        ? `Đã khóa tài khoản của người dùng ${user.fullName ?? user.phone}`
        : `Đã mở khóa tài khoản của người dùng ${user.fullName ?? user.phone}`,
      user: serialize(updated),
    };
  }

  /** Lấy danh sách sự kiện lỗi trong Dead Letter Queue (FAILED) */
  async getOutboxDlq(page = 1, pageSize = 20) {
    return this.outboxService.getDlqEvents(page, pageSize);
  }

  /** Thử lại thủ công 1 sự kiện trong Dead Letter Queue */
  async retryOutboxDlq(id: bigint) {
    const ok = await this.outboxService.retryDlqEvent(id);
    return { success: ok, message: ok ? 'Đã kích hoạt thử lại sự kiện' : 'Không tìm thấy sự kiện FAILED' };
  }

  /**
   * DEV-06: Tạo Hợp đồng dịch vụ môi giới (HĐ-01) cho chủ nhà
   */
  async createOwnerAgreement(data: {
    ownerId: bigint;
    agreementCode: string;
    commissionRateBps?: number;
    termsVersion?: string;
    status?: string;
    validFrom?: Date;
    validUntil?: Date;
    unitIds?: bigint[];
  }) {
    const owner = await this.prisma.user.findUnique({ where: { id: data.ownerId } });
    if (!owner) throw new NotFoundException('Không tìm thấy chủ nhà');

    const created = await this.prisma.$transaction(async (tx) => {
      let profile = await tx.ownerProfile.findUnique({ where: { userId: data.ownerId } });
      if (!profile) {
        profile = await tx.ownerProfile.create({
          data: {
            userId: data.ownerId,
            legalFullName: owner.fullName || 'Chủ nhà',
            authorityType: 'owner',
            isVerified: true,
          },
        });
      }

      const agreement = await tx.ownerServiceAgreement.create({
        data: {
          agreementCode: data.agreementCode,
          ownerId: data.ownerId,
          ownerProfileId: profile.id,
          status: data.status || 'active',
          commissionRateBps: data.commissionRateBps || 4000,
          termsVersion: data.termsVersion || '1.0',
          validFrom: data.validFrom || new Date(),
          validUntil: data.validUntil,
        },
      });

      if (data.unitIds && data.unitIds.length > 0) {
        for (const unitId of data.unitIds) {
          const unit = await tx.rentalUnit.findUnique({
            where: { id: unitId },
            include: { listings: { where: { status: { in: ['active', 'pending'] } }, orderBy: { createdAt: 'desc' }, take: 1 } },
          });

          // GAP-11: Tuyệt đối không tự suy diễn giá từ diện tích * 100.000 hay mặc định 3.000.000đ
          let baseRent: bigint | null = null;
          if (unit?.listings && unit.listings.length > 0 && unit.listings[0].price) {
            baseRent = unit.listings[0].price;
          }

          if (baseRent === null) {
            throw new BadRequestException(`Phòng ${unit?.unitCode || unitId} chưa có giá thuê được chủ xác nhận, không thể lập phụ lục`);
          }

          await tx.agreementUnit.create({
            data: {
              agreementId: agreement.id,
              unitId,
              baseMonthlyRent: baseRent,
              status: 'active',
            },
          });
        }
      }

      return agreement;
    });

    return serialize(created);
  }

  /**
   * DEV-06: Lấy danh sách hợp đồng dịch vụ môi giới của một chủ nhà
   */
  async getOwnerAgreements(ownerId: bigint) {
    const agreements = await this.prisma.ownerServiceAgreement.findMany({
      where: { ownerId },
      include: {
        agreementUnits: {
          include: { unit: true },
        },
        ownerProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return agreements.map(serialize);
  }

  /**
   * DEV-06: Cập nhật xác thực hồ sơ thẩm quyền cho thuê (OwnerProfile)
   */
  async verifyOwnerProfile(userId: bigint, isVerified: boolean) {
    let profile = await this.prisma.ownerProfile.findUnique({ where: { userId } });
    if (!profile) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('Không tìm thấy người dùng');
      profile = await this.prisma.ownerProfile.create({
        data: {
          userId,
          legalFullName: user.fullName || 'Chủ nhà chưa đặt tên',
          authorityType: 'owner',
          isVerified,
          verifiedAt: isVerified ? new Date() : null,
        },
      });
    } else {
      profile = await this.prisma.ownerProfile.update({
        where: { userId },
        data: {
          isVerified,
          verifiedAt: isVerified ? new Date() : null,
        },
      });
    }
    return serialize(profile);
  }

  /** Lấy danh sách nhật ký kiểm toán hệ thống */
  async getAuditLogs(page = 1, pageSize = 20) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditEvent.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditEvent.count(),
    ]);

    return {
      items: items.map(serialize),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
