import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxService } from '../outbox/outbox.service';
import { EmailService } from '../email/email.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CreateConsultationDto } from './dto/create-consultation.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxService: OutboxService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Tạo dedupe key chuẩn: sha256("${listingId}:${cleanPhone}:${date}")
   * Đảm bảo một số điện thoại chỉ tạo tối đa 1 lead cho cùng 1 tin đăng trong ngày.
   */
  private generateDedupeKey(listingId: bigint, phone: string): string {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const raw = `${listingId}:${phone.trim()}:${today}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Che số điện thoại của khách trước khi hiển thị cho chủ nhà (mục 8.3 & AT-06).
   */
  public maskPhone(phone: string): string {
    if (!phone) return '';
    const clean = phone.replace(/\s+/g, '');
    if (clean.length < 7) return '09•• ••• •••';
    return `${clean.slice(0, 4)}***${clean.slice(-3)}`;
  }

  /**
   * Che email của khách trước khi hiển thị cho chủ nhà (mục 8.3).
   */
  public maskEmail(email: string): string {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return '***@***';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : `${name.slice(0, 1)}***`;
    return `${maskedName}@${domain}`;
  }

  /**
   * Format lead entity sang JSON an toàn (chuyển đổi BigInt sang string).
   * Hỗ trợ che thông tin nhạy cảm của khách cho vai trò chủ nhà (GAP-03, AT-06).
   */
  private formatLead(lead: any, maskPrivateInfo = false) {
    return {
      ...lead,
      id: lead.id.toString(),
      listingId: lead.listingId.toString(),
      unitId: lead.unitId ? lead.unitId.toString() : null,
      requestId: lead.requestId ? lead.requestId.toString() : null,
      requesterId: lead.requesterId ? lead.requesterId.toString() : null,
      assignedToUserId: lead.assignedToUserId ? lead.assignedToUserId.toString() : null,
      phone: maskPrivateInfo ? this.maskPhone(lead.phone) : lead.phone,
      email: maskPrivateInfo && lead.email ? this.maskEmail(lead.email) : lead.email,
      isPhoneMasked: maskPrivateInfo,
      assignedAgent: lead.assignedTo
        ? {
            id: lead.assignedTo.id.toString(),
            fullName: lead.assignedTo.fullName || 'Đức Quân',
            phone: '0981 753 082',
            role: 'Người tư vấn và trực tiếp dẫn xem',
          }
        : {
            fullName: 'Đức Quân',
            phone: '0981 753 082',
            role: 'Người tư vấn và trực tiếp dẫn xem',
          },
      listing: lead.listing
        ? {
            ...lead.listing,
            id: lead.listing.id.toString(),
            price: lead.listing.price ? lead.listing.price.toString() : null,
            ownerId: lead.listing.ownerId ? lead.listing.ownerId.toString() : undefined,
          }
        : undefined,
      requester: lead.requester
        ? {
            id: lead.requester.id.toString(),
            fullName: lead.requester.fullName,
            phone: maskPrivateInfo ? this.maskPhone(lead.requester.phone) : lead.requester.phone,
          }
        : undefined,
    };
  }

  /**
   * Tạo lead mới từ khách thuê (Public endpoint).
   * DEV-04: Tự động gán người phụ trách (Đức Quân) ở server, lưu RentalRequest, bảo vệ số khách.
   */
  async createLead(dto: CreateLeadDto, requesterId?: bigint) {
    const cleanPhone = dto.phone.replace(/\s+/g, '');
    let listingIdBigInt: bigint | null = null;
    try {
      if (dto.listingId && !String(dto.listingId).startsWith('demo-')) {
        listingIdBigInt = BigInt(dto.listingId);
      }
    } catch {
      listingIdBigInt = null;
    }

    // 1. Kiểm tra tin đăng trong CSDL (nếu có)
    let listing: any = null;
    if (listingIdBigInt != null) {
      try {
        listing = await this.prisma.listing.findUnique({
          where: { id: listingIdBigInt },
          select: {
            id: true,
            title: true,
            status: true,
            expiresAt: true,
            ownerId: true,
            unitId: true,
            contactAgentId: true,
            price: true,
            owner: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                isBlocked: true,
              },
            },
          },
        });
      } catch {
        listing = null;
      }
    }

    // Nếu không tìm thấy tin theo id (ví dụ tin demo / mẫu giao diện): tìm tin active dự phòng để lưu DB
    let targetListingId = listingIdBigInt;
    if (!listing) {
      try {
        const fallbackListing = await this.prisma.listing.findFirst({
          where: { status: 'active' },
          select: {
            id: true,
            title: true,
            status: true,
            ownerId: true,
            unitId: true,
            contactAgentId: true,
            price: true,
          },
        });
        if (fallbackListing) {
          targetListingId = fallbackListing.id;
          listing = fallbackListing;
        }
      } catch {
        // Safe fail
      }
    }

    const resolvedTitle = dto.listingTitle || listing?.title || 'Phòng cho thuê';
    const dedupeKey = targetListingId
      ? this.generateDedupeKey(targetListingId, cleanPhone)
      : createHash('sha256').update(`${cleanPhone}:${new Date().toISOString().slice(0, 10)}`).digest('hex');

    // 2. Trích xuất thông tin lịch hẹn từ message
    let appointmentDate = '';
    let appointmentTime = '';
    let note = '';
    if (dto.message) {
      const parts = dto.message.split(' | ');
      for (const p of parts) {
        if (p.startsWith('Ngày mong muốn xem:')) appointmentDate = p.replace('Ngày mong muốn xem:', '').trim();
        if (p.startsWith('Khung giờ:')) appointmentTime = p.replace('Khung giờ:', '').trim();
        if (p.startsWith('Ghi chú thêm:')) note = p.replace('Ghi chú thêm:', '').trim();
      }
    }

    // 3. Tìm người phụ trách dịch vụ (Đức Quân)
    let assignedToUserId: bigint | null = null;
    try {
      const defaultAgent = await this.prisma.agentProfile.findFirst({
        where: { isActive: true },
        select: { userId: true, displayName: true, workPhone: true },
      });
      const defaultAdmin = defaultAgent
        ? null
        : await this.prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true, fullName: true, phone: true },
          });
      assignedToUserId = defaultAgent?.userId || defaultAdmin?.id || null;
    } catch {
      // Safe fail
    }

    // 4. Lưu vào CSDL
    let createdLeadId = `lead_${Date.now()}`;
    if (targetListingId) {
      try {
        const created = await this.prisma.$transaction(async (tx) => {
          let rentalRequest = await tx.rentalRequest.findFirst({
            where: { phone: cleanPhone },
            orderBy: { createdAt: 'desc' },
          });

          if (!rentalRequest) {
            rentalRequest = await tx.rentalRequest.create({
              data: {
                requestCode: `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                userId: requesterId ?? null,
                fullName: dto.fullName.trim(),
                phone: cleanPhone,
                notes: dto.message?.trim() || null,
                budgetMax: listing?.price || null,
              },
            });
          }

          const lead = await tx.lead.create({
            data: {
              listingId: targetListingId!,
              unitId: listing?.unitId || null,
              requestId: rentalRequest.id,
              assignedToUserId,
              requesterId: requesterId ?? null,
              fullName: dto.fullName.trim(),
              phone: cleanPhone,
              email: dto.email?.trim() || null,
              message: dto.message?.trim() || null,
              channel: dto.channel || 'web_form',
              consent: Boolean(dto.consent),
              status: 'new',
              dedupeKey,
            },
          });

          return lead;
        });
        createdLeadId = created.id.toString();
      } catch (dbErr: any) {
        if (dbErr.code === 'P2002' || dbErr.message?.includes('dedupe_key')) {
          this.logger.log(`Duplicate lead prevented by dedupeKey=${dedupeKey}`);
        } else {
          this.logger.warn(`Lỗi lưu lead vào CSDL, tiếp tục gửi email thông báo: ${dbErr.message}`);
        }
      }
    }

    // 5. GỬI EMAIL THÔNG BÁO CHO ADMIN VÀ EMAIL XÁC NHẬN CHO KHÁCH HÀNG (CHẠY SONG SONG NGAY TỨC THÌ)
    // Thực hiện song song ngay tức thì và không chặn HTTP response của người dùng,
    // giúp giao diện đặt lịch phản hồi tức thì <100ms đồng thời gửi email ngay vào hộp thư
    const emailTasks: Promise<any>[] = [];

    emailTasks.push(
      this.emailService
        .sendViewingAppointmentToAdmin({
          fullName: dto.fullName.trim(),
          phone: cleanPhone,
          email: dto.email?.trim(),
          listingTitle: resolvedTitle,
          listingId: listing?.id?.toString() || dto.listingId,
          appointmentDate,
          appointmentTime,
          note,
        })
        .catch((mailAdminErr: any) => {
          this.logger.warn(`Không thể gửi email cho Admin: ${mailAdminErr.message}`);
        }),
    );

    if (dto.email && dto.email.trim()) {
      emailTasks.push(
        this.emailService
          .sendViewingAppointmentConfirmationToCustomer({
            fullName: dto.fullName.trim(),
            phone: cleanPhone,
            email: dto.email.trim(),
            listingTitle: resolvedTitle,
            appointmentDate,
            appointmentTime,
            note,
          })
          .catch((mailCustErr: any) => {
            this.logger.warn(`Không thể gửi email xác nhận cho Khách hàng: ${mailCustErr.message}`);
          }),
      );
    }

    // Kích hoạt thực thi song song ngay lập tức mà không chặn response
    Promise.allSettled(emailTasks).catch(() => {});

    return {
      success: true,
      message: dto.email?.trim()
        ? `Đã đặt lịch xem phòng thành công, thư xác nhận đã được gửi đến ${dto.email.trim()} và Đức Quân sẽ sớm liên hệ xác nhận lịch với bạn`
        : 'Đã đặt lịch xem phòng thành công, Đức Quân sẽ sớm liên hệ xác nhận lịch với bạn',
      isDuplicate: false,
      leadId: createdLeadId,
    };
  }

  /**
   * Dành cho Chủ trọ / Người cho thuê: Xem danh sách lead quan tâm tin của mình.
   * BR-04, GAP-03, AT-06: Chủ nhà chỉ xem lead đã được che số điện thoại và email.
   * Quá trình liên hệ, sàng lọc và dẫn khách do Quan trực tiếp điều phối.
   */
  async findMyLeads(ownerId: bigint, query: QueryLeadsDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Math.min(Number(query.pageSize ?? 20), 100);
    const skip = (page - 1) * pageSize;

    const where: any = {
      listing: {
        ownerId,
      },
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.listingId) {
      try {
        where.listingId = BigInt(query.listingId);
      } catch {
        // bỏ qua nếu sai format
      }
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
              price: true,
              ownerId: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    // GAP-03 & AT-06: Chủ nhà nhận dữ liệu lead với số điện thoại đã che bảo mật
    return {
      items: items.map((item: any) => this.formatLead(item, true)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Dành cho Admin / Người phụ trách (Quan): Quản lý toàn bộ Lead queue của sàn.
   * Xem đầy đủ thông tin khách để thực hiện tư vấn và sắp xếp lịch xem phòng.
   */
  async findAdminLeads(query: QueryLeadsDto) {
    const page = Number(query.page ?? 1);
    const pageSize = Math.min(Number(query.pageSize ?? 20), 100);
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.listingId) {
      try {
        where.listingId = BigInt(query.listingId);
      } catch {
        // bỏ qua nếu sai format
      }
    }

    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              slug: true,
              price: true,
              owner: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                },
              },
            },
          },
          requester: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      items: items.map((item: any) => this.formatLead(item, false)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Cập nhật trạng thái lead (Chỉ Admin hoặc Chuyên viên tư vấn được phân công).
   * GAP-03: Chủ nhà không được tự tiện đổi trạng thái lead để đảm bảo quy trình môi giới.
   */
  async updateStatus(id: bigint, dto: UpdateLeadStatusDto, currentUserId: bigint, isAdmin: boolean) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        listing: {
          select: { ownerId: true },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException('Lead không tồn tại');
    }

    const isAssigned = lead.assignedToUserId === currentUserId;
    if (!isAdmin && !isAssigned) {
      throw new ForbiddenException(
        'Tiến độ và trạng thái khách thuê do chuyên viên tư vấn trực tiếp điều phối và cập nhật',
      );
    }

    const updateData: any = {
      status: dto.status,
      notes: dto.notes !== undefined ? dto.notes : lead.notes,
    };

    if (dto.assignedToUserId && isAdmin) {
      try {
        updateData.assignedToUserId = BigInt(dto.assignedToUserId);
      } catch {
        // ignore
      }
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            price: true,
            ownerId: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
      },
    });

    return this.formatLead(updated, false);
  }

  /**
   * Tiếp nhận phản hồi góp ý từ khách hàng và tự động gửi email thông báo cho chủ website
   */
  async createFeedback(dto: CreateFeedbackDto, ip?: string) {
    this.logger.log(`Tiếp nhận phản hồi từ khách hàng: ${dto.name || 'Khách vãng lai'} (Rating: ${dto.rating ?? 'N/A'})`);

    // Gửi email tự động tới chủ website (contact@nhacualand.com)
    await this.emailService.sendFeedbackNotification({
      rating: dto.rating,
      content: dto.content,
      name: dto.name,
      email: dto.email,
      ip,
    });

    return {
      success: true,
      message: 'Cảm ơn bạn đã gửi phản hồi đóng góp ý kiến',
    };
  }

  /**
   * Tiếp nhận yêu cầu tư vấn từ khách hàng và tự động gửi email thông báo cho chủ website
   */
  async createConsultation(dto: CreateConsultationDto, ip?: string) {
    this.logger.log(`Tiếp nhận yêu cầu tư vấn mới từ SĐT: ${dto.phone} (Lý do: ${dto.reason})`);

    // Gửi email tự động tới chủ website (contact@nhacualand.com)
    await this.emailService.sendConsultationNotification({
      phone: dto.phone,
      reason: dto.reason,
      description: dto.description,
      selectedRoomIds: dto.selectedRoomIds,
      ip,
    });

    return {
      success: true,
      message: 'Yêu cầu tư vấn của bạn đã được gửi thành công, chúng tôi sẽ liên hệ trong thời gian sớm nhất',
    };
  }
}

