import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, ListingStatus, TransactionType } from '@batdongsan/database';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { QueryListingsDto } from './dto/query-listings.dto';
import { QueryMapListingsDto } from './dto/query-map-listings.dto';
import { EmailService } from '../email/email.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { OutboxService } from '../outbox/outbox.service';
import {
  ListingMapPin,
  normalizeLegacyPropertyType,
  normalizeAmenities,
  buildSlug,
  isValidVietnamCoordinate,
} from '@qns/shared';

const PUBLIC_LISTING_SELECT = {
  id: true,
  title: true,
  slug: true,
  description: true,
  transactionType: true,
  propertyType: true,
  price: true,
  depositAmount: true,
  minLeaseMonths: true,
  utilitiesIncluded: true,
  electricityPricePerKwh: true,
  waterPricePerM3: true,
  waterPriceFlat: true,
  amenities: true,
  areaM2: true,
  bedrooms: true,
  bathrooms: true,
  legalStatus: true,
  addressDetail: true,
  lat: true,
  lng: true,
  status: true,
  rejectionReason: true,
  verificationStatus: true,
  verifiedAt: true,
  publishedAt: true,
  expiresAt: true,
  refreshedAt: true,
  viewCount: true,
  createdAt: true,
  images: { select: { imageUrl: true, sortOrder: true }, orderBy: { sortOrder: 'asc' as const } },
  location: { select: { id: true, name: true, slug: true, level: true } },
  project: { select: { id: true, name: true, slug: true } },
  contactAgent: {
    select: {
      id: true,
      displayName: true,
      workPhone: true,
      avatarUrl: true,
      bio: true,
    },
  },
  owner: { select: { id: true, fullName: true, avatarUrl: true, createdAt: true, isPhoneVerified: true, isIdVerified: true, isBlocked: true } },
  nearbyUniversities: {
    select: {
      distanceMeters: true,
      travelTimeMinutes: true,
      university: {
        select: { id: true, name: true, abbreviation: true, slug: true, address: true },
      },
    },
    orderBy: { distanceMeters: 'asc' as const },
  },
  // CHÚ Ý: Tuyệt đối KHÔNG select owner.phone — số điện thoại riêng của chủ không công khai (GAP-02, BR-01).
} satisfies Prisma.ListingSelect;

function serialize<T extends Record<string, any>>(obj: T): any {
  return JSON.parse(JSON.stringify(obj, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)));
}

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly outboxService: OutboxService,
  ) {}

  /**
   * Predicate cốt lõi cho mọi truy vấn tin công khai (public).
   * BE-04: Thống nhất status active + chưa hết hạn (expiresAt > now hoặc null).
   * BE-05: Ẩn ngay lập tức toàn bộ tin của chủ tài khoản bị khóa (owner.isBlocked = false).
   */
  public static getPublicWhereClause(): Prisma.ListingWhereInput {
    return {
      status: ListingStatus.active,
      owner: { isBlocked: false },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };
  }

  /**
   * Truy vấn danh sách pin bản đồ siêu nhẹ phục vụ /danh-gia và bản đồ toàn site.
   * Chỉ trả các bản ghi có toạ độ hợp lệ tại Việt Nam.
   * Hỗ trợ bounding box bbox, loại hình, khoảng giá, và thời gian polling.
   */
  async getMapPins(query: QueryMapListingsDto): Promise<ListingMapPin[]> {
    if (!this.prisma.isConnected) {
      throw new ServiceUnavailableException('Cơ sở dữ liệu đang ngoại tuyến');
    }

    const where: Prisma.ListingWhereInput = {
      lat: { not: null },
      lng: { not: null },
      owner: { isBlocked: false },
    };

    // Mặc định công chúng chỉ thấy tin active còn hạn.
    // Nếu có ownerId thì cho phép trả kèm tin pending của chính chủ đó (để họ thấy pin chờ duyệt ngay sau khi đăng).
    if (query.ownerId) {
      let ownerIdBigInt: bigint | null = null;
      try {
        ownerIdBigInt = BigInt(query.ownerId);
      } catch {}

      if (ownerIdBigInt) {
        where.OR = [
          {
            status: ListingStatus.active,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
          {
            status: ListingStatus.pending,
            ownerId: ownerIdBigInt,
          },
        ];
      } else {
        where.status = ListingStatus.active;
        where.OR = [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ];
      }
    } else {
      where.status = ListingStatus.active;
      where.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ];
    }

    // Bounding box lọc theo viewport: bbox = minLng,minLat,maxLng,maxLat
    if (query.bbox) {
      const parts = query.bbox.split(',').map((p) => parseFloat(p.trim()));
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const [minLng, minLat, maxLng, maxLat] = parts;
        where.lat = { gte: minLat, lte: maxLat };
        where.lng = { gte: minLng, lte: maxLng };
      }
    }

    // Lọc theo loại hình phòng chuẩn hoá
    if (query.propertyType && query.propertyType !== 'all') {
      const norm = normalizeLegacyPropertyType(query.propertyType);
      where.propertyType = norm;
    }

    // Lọc theo khoảng giá
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceFilter: Prisma.BigIntFilter = {};
      if (query.minPrice !== undefined) {
        priceFilter.gte = BigInt(query.minPrice);
      }
      if (query.maxPrice !== undefined) {
        priceFilter.lte = BigInt(query.maxPrice);
      }
      where.price = priceFilter;
    }

    // Polling thời gian cập nhật để nhận dữ liệu mới trong ≤ 10s
    if (query.updatedSince) {
      const sinceDate = new Date(query.updatedSince);
      if (!isNaN(sinceDate.getTime())) {
        where.updatedAt = { gt: sinceDate };
      }
    }

    const takeLimit = Math.min(query.limit || 500, 2000);

    const items = await this.prisma.listing.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        lat: true,
        lng: true,
        price: true,
        propertyType: true,
        areaM2: true,
        status: true,
        ownerId: true,
        depositAmount: true,
        electricityPricePerKwh: true,
        waterPricePerM3: true,
        waterPriceFlat: true,
        amenities: true,
        images: {
          select: { imageUrl: true },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
        location: {
          select: { name: true },
        },
      },
      take: takeLimit,
      orderBy: { createdAt: 'desc' },
    });

    return items
      .filter((item) => isValidVietnamCoordinate(item.lat, item.lng))
      .map((item) => {
        const isOwnerPending =
          item.status === ListingStatus.pending &&
          Boolean(query.ownerId && String(item.ownerId) === String(query.ownerId));

        return {
          id: String(item.id),
          slug: item.slug,
          lat: Number(item.lat),
          lng: Number(item.lng),
          title: item.title,
          price: Number(item.price),
          propertyType: normalizeLegacyPropertyType(item.propertyType),
          areaM2: Number(item.areaM2),
          thumbnailUrl: item.images?.[0]?.imageUrl || null,
          locationName: item.location?.name || 'Hà Nội',
          status: item.status as any,
          depositAmount: item.depositAmount ? Number(item.depositAmount) : undefined,
          electricityPricePerKwh: item.electricityPricePerKwh ?? undefined,
          waterPricePerM3: item.waterPricePerM3 ?? undefined,
          waterPriceFlat: item.waterPriceFlat ?? undefined,
          amenities: typeof item.amenities === 'object' && item.amenities !== null
            ? normalizeAmenities(item.amenities as Record<string, any>)
            : undefined,
          isOwnerPending,
        };
      });
  }

  async findAll(query: QueryListingsDto) {
    if (!this.prisma.isConnected) {
      throw new ServiceUnavailableException('Cơ sở dữ liệu đang ngoại tuyến');
    }

    const where: Prisma.ListingWhereInput = {
      status: ListingStatus.active,
      owner: { isBlocked: false },
    };

    const andConditions: Prisma.ListingWhereInput[] = [
      {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    ];

    if (query.transactionType) where.transactionType = TransactionType.rent;

    // Xử lý lọc theo nhóm chuyên mục (100% cho thuê)
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
              'phong-tro-nguoi-di-lam',
              'phong_tro_nguoi_di_lam',
              'phong_tro',
              'phong-tro',
              'ky_tuc_xa',
              'ky-tuc-xa',
              'ky-tuc-xa-tu-nhan',
              'ky_tuc_xa_tu_nhan',
              'sleepbox',
              'sleep_box',
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
      }
    }

    // Lọc theo trường Đại học gần đó
    if (query.universitySlug) {
      where.nearbyUniversities = {
        some: {
          university: {
            slug: query.universitySlug,
          },
        },
      };
    } else if (query.universityId) {
      where.nearbyUniversities = {
        some: {
          universityId: query.universityId,
        },
      };
    }

    // Nếu có propertyType cụ thể, ưu tiên lấy theo cả dạng kebab-case lẫn snake_case
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

    // Loại trừ các loại hình không mong muốn nếu được yêu cầu
    if (query.excludePropertyTypes && !query.propertyType) {
      const excluded = query.excludePropertyTypes.split(',').map((s) => s.trim()).filter(Boolean);
      const excludedVariants = Array.from(
        new Set([
          ...excluded,
          ...excluded.map((s) => s.replace(/-/g, '_')),
          ...excluded.map((s) => s.replace(/_/g, '-')),
        ]),
      );
      where.propertyType = { notIn: excludedVariants };
    }

    if (query.bedrooms) where.bedrooms = { gte: query.bedrooms };
    if (query.priceMin || query.priceMax) {
      where.price = {
        ...(query.priceMin ? { gte: BigInt(query.priceMin) } : {}),
        ...(query.priceMax ? { lte: BigInt(query.priceMax) } : {}),
      };
    }
    if (query.areaMin || query.areaMax) {
      where.areaM2 = {
        ...(query.areaMin ? { gte: query.areaMin } : {}),
        ...(query.areaMax ? { lte: query.areaMax } : {}),
      };
    }
    if (query.locationSlug) {
      // BUG ĐÃ SỬA: trước đây filter `location: { slug: query.locationSlug }` chỉ khớp CHÍNH XÁC
      // 1 location — nghĩa là xem tin theo tỉnh (VD "ho-chi-minh") sẽ KHÔNG thấy tin nào cả vì mọi
      // tin đều gắn locationId ở cấp quận/phường, không gắn trực tiếp vào cấp tỉnh. Phải lấy toàn bộ
      // cây con (chính nó + mọi quận/phường trực thuộc) rồi filter locationId IN (...).
      const ids = await this.resolveLocationIdsIncludingChildren(query.locationSlug);
      if (ids.length === 0) {
        // Slug không tồn tại — trả kết quả rỗng thay vì bỏ qua filter (tránh lộ toàn bộ tin ngoài ý muốn).
        return { items: [], pagination: { page: 1, pageSize: query.pageSize ?? 20, total: 0, totalPages: 0 } };
      }
      where.locationId = { in: ids };
    }
    if (query.utilitiesIncluded === 'true') {
      where.utilitiesIncluded = true;
    }

    // Nhận diện tọa độ địa chỉ tìm kiếm (Proximity Geocoding & Distance Algorithm)
    const targetCoords = await this.resolveTargetCoordinates(query.keyword, query.lat, query.lng);

    if (query.keyword) {
      if (targetCoords) {
        // Khi đã nhận diện được tọa độ địa chỉ, tìm các phòng khớp từ khóa HOẶC có tọa độ lân cận
        andConditions.push({
          OR: [
            { title: { contains: query.keyword, mode: 'insensitive' } },
            { addressDetail: { contains: query.keyword, mode: 'insensitive' } },
            { location: { name: { contains: query.keyword, mode: 'insensitive' } } },
            { lat: { not: null } },
            {
              nearbyUniversities: {
                some: {
                  university: {
                    OR: [
                      { name: { contains: query.keyword, mode: 'insensitive' } },
                      { abbreviation: { contains: query.keyword, mode: 'insensitive' } },
                    ],
                  },
                },
              },
            },
          ],
        });
      } else {
        andConditions.push({
          OR: [
            { title: { contains: query.keyword, mode: 'insensitive' } },
            { addressDetail: { contains: query.keyword, mode: 'insensitive' } },
            { location: { name: { contains: query.keyword, mode: 'insensitive' } } },
          ],
        });
      }
    }

    where.AND = andConditions;

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    // Khi có tọa độ địa chỉ mục tiêu (targetCoords): lấy tập phòng phù hợp, tính khoảng cách và sắp xếp theo phòng gần nhất lên đầu
    if (targetCoords) {
      const candidates = await this.prisma.listing.findMany({
        where,
        select: PUBLIC_LISTING_SELECT,
        take: 100, // Lấy tập ứng viên đủ rộng để sắp xếp khoảng cách chính xác
      });

      const enriched = candidates.map((item) => {
        let distanceMeters: number | null = null;

        if (item.lat != null && item.lng != null) {
          distanceMeters = ListingsService.calculateDistanceMeters(
            targetCoords.lat,
            targetCoords.lng,
            item.lat,
            item.lng,
          );
        } else if (item.nearbyUniversities?.length > 0 && item.nearbyUniversities[0].distanceMeters != null) {
          // Dự phòng dùng khoảng cách của trường ĐH lân cận nếu phòng chưa cập nhật tọa độ riêng
          distanceMeters = item.nearbyUniversities[0].distanceMeters;
        }

        const distanceText =
          distanceMeters != null
            ? distanceMeters < 1000
              ? `Cách ${targetCoords.label ? targetCoords.label + ' ' : ''}~${distanceMeters}m`
              : `Cách ${targetCoords.label ? targetCoords.label + ' ' : ''}~${(distanceMeters / 1000).toFixed(1)} km`
            : null;

        return {
          ...serialize(item),
          distanceMeters,
          distanceText,
        };
      });

      // Lọc theo bán kính tối đa nếu có yêu cầu
      const filtered = query.radiusKm
        ? enriched.filter((it) => it.distanceMeters == null || it.distanceMeters <= query.radiusKm! * 1000)
        : enriched;

      // Sắp xếp: phòng gần nhất (khoảng cách nhỏ nhất) lên đầu tiên
      filtered.sort((a, b) => {
        if (a.distanceMeters != null && b.distanceMeters != null) {
          return a.distanceMeters - b.distanceMeters;
        }
        if (a.distanceMeters != null) return -1;
        if (b.distanceMeters != null) return 1;
        return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
      });

      const total = filtered.length;
      const paginatedItems = filtered.slice((page - 1) * pageSize, page * pageSize);

      return {
        items: paginatedItems,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    }

    // Trường hợp tìm kiếm thông thường không có tọa độ địa chỉ: sắp xếp theo tin mới nhất
    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        select: PUBLIC_LISTING_SELECT,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      items: items.map(serialize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /**
   * Tính khoảng cách đường chim bay (mét) giữa 2 tọa độ theo công thức Haversine.
   */
  public static calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Mét
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  private static removeAccents(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  private static readonly KNOWN_ADDRESS_COORDINATES: Record<string, { lat: number; lng: number }> = {
    'dai co viet': { lat: 21.0056, lng: 105.8433 },
    'ta quang buu': { lat: 21.004, lng: 105.845 },
    'giai phong': { lat: 20.9996, lng: 105.8427 },
    'xuan thuy': { lat: 21.0373, lng: 105.7828 },
    'cau giay': { lat: 21.0333, lng: 105.794 },
    'nguyen trai': { lat: 20.9912, lng: 105.7958 },
    'chua lang': { lat: 21.0232, lng: 105.8049 },
    'dong da': { lat: 21.018, lng: 105.826 },
    'thanh xuan': { lat: 20.993, lng: 105.805 },
    'ha dong': { lat: 20.97, lng: 105.77 },
    'hai ba trung': { lat: 21.008, lng: 105.85 },
    'hoan kiem': { lat: 21.0285, lng: 105.8542 },
    'tay ho': { lat: 21.07, lng: 105.82 },
    'bac tu liem': { lat: 21.06, lng: 105.76 },
    'nam tu liem': { lat: 21.01, lng: 105.77 },
    'hoang mai': { lat: 20.97, lng: 105.85 },
    'long bien': { lat: 21.04, lng: 105.89 },
    'vinh tuy': { lat: 20.9982, lng: 105.8778 },
    'minh khai': { lat: 20.9975, lng: 105.8672 },
    'hubt': { lat: 20.9982, lng: 105.8778 },
    'uneti': { lat: 20.9975, lng: 105.8672 },
    'hou': { lat: 21.0041, lng: 105.8475 },
    'ussh': { lat: 20.9947, lng: 105.8078 },
    'hus': { lat: 20.9953, lng: 105.8085 },
    'uet': { lat: 21.0378, lng: 105.7818 },
    'ulis': { lat: 21.0398, lng: 105.7825 },
    'ueb': { lat: 21.0373, lng: 105.7828 },
    'utt': { lat: 20.9856, lng: 105.7978 },
    'trieu khuc': { lat: 20.9856, lng: 105.7978 },
    'ulsa': { lat: 21.0089, lng: 105.7995 },
    'tran duy hung': { lat: 21.0089, lng: 105.7995 },
    'hoang quoc viet': { lat: 21.0475, lng: 105.7877 },
    'epu': { lat: 21.0478, lng: 105.7885 },
    'chua boc': { lat: 21.0084, lng: 105.8285 },
    'tay son': { lat: 21.0076, lng: 105.8242 },
    'nguyen chi thanh': { lat: 21.0189, lng: 105.8119 },
    'kim ma': { lat: 21.0315, lng: 105.8152 },
    'trung kinh': { lat: 21.0185, lng: 105.7962 },
    'to huu': { lat: 20.9635, lng: 105.7483 },
    'ho tung mau': { lat: 21.0366, lng: 105.7742 },
    'pham van dong': { lat: 21.0398, lng: 105.7825 },
    'khuat duy tien': { lat: 20.9972, lng: 105.7928 },
    'nghiem xuan yem': { lat: 20.9765, lng: 105.8157 },
    'quan 1': { lat: 10.7769, lng: 106.7009 },
    'quan 3': { lat: 10.7828, lng: 106.6958 },
    'quan 4': { lat: 10.76, lng: 106.705 },
    'quan 5': { lat: 10.7551, lng: 106.6599 },
    'quan 7': { lat: 10.7326, lng: 106.6992 },
    'quan 10': { lat: 10.7726, lng: 106.6578 },
    'ly thuong kiet': { lat: 10.7726, lng: 106.6578 },
    'nguyen van cu': { lat: 10.7628, lng: 106.6825 },
    'nguyen huu tho': { lat: 10.7326, lng: 106.6992 },
    'nguyen van linh': { lat: 10.7297, lng: 106.6948 },
    'su van hanh': { lat: 10.7785, lng: 106.6672 },
    'chu van an': { lat: 10.8175, lng: 106.7022 },
    'binh thanh': { lat: 10.8037, lng: 106.7144 },
    'dien bien phu': { lat: 10.8016, lng: 106.7145 },
    'thu duc': { lat: 10.8507, lng: 106.7719 },
    'vo van ngan': { lat: 10.8507, lng: 106.7719 },
    'linh trung': { lat: 10.8753, lng: 106.8007 },
    'khu do thi dhqg': { lat: 10.8753, lng: 106.8007 },
    'go vap': { lat: 10.8222, lng: 106.6875 },
    'tan phu': { lat: 10.8063, lng: 106.6287 },
    'tan binh': { lat: 10.8015, lng: 106.6528 },
    'phu nhuan': { lat: 10.8144, lng: 106.6778 },
    'da nang': { lat: 16.0544, lng: 108.2022 },
    'lien chieu': { lat: 16.0738, lng: 108.1499 },
    'ngu hanh son': { lat: 16.0506, lng: 108.2415 },
    'hai chau': { lat: 16.0617, lng: 108.2081 },
    'can tho': { lat: 10.0312, lng: 105.7691 },
    'ninh kieu': { lat: 10.0312, lng: 105.7691 },
  };

  /**
   * Phân tích và nhận diện tọa độ địa chỉ từ từ khóa hoặc tọa độ gửi lên.
   */
  private async resolveTargetCoordinates(
    keyword?: string,
    lat?: number,
    lng?: number,
  ): Promise<{ lat: number; lng: number; label?: string } | null> {
    if (lat != null && lng != null) {
      return { lat, lng };
    }

    if (!keyword || !keyword.trim()) return null;
    const cleanKw = keyword.trim();
    const normalized = ListingsService.removeAccents(cleanKw);

    // 1. Kiểm tra khớp tên/viết tắt/slug của trường Đại học trong CSDL
    const matchedUni = await this.prisma.university.findFirst({
      where: {
        OR: [
          { name: { contains: cleanKw, mode: 'insensitive' } },
          { abbreviation: { contains: cleanKw, mode: 'insensitive' } },
          { slug: { contains: cleanKw, mode: 'insensitive' } },
        ],
      },
    });
    if (matchedUni && matchedUni.lat != null && matchedUni.lng != null) {
      return {
        lat: matchedUni.lat,
        lng: matchedUni.lng,
        label: matchedUni.abbreviation || matchedUni.name,
      };
    }

    // 2. Tra cứu danh mục các tuyến đường và quận/huyện phổ biến
    for (const [key, coords] of Object.entries(ListingsService.KNOWN_ADDRESS_COORDINATES)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return {
          lat: coords.lat,
          lng: coords.lng,
          label: cleanKw,
        };
      }
    }

    // 3. Tra cứu theo địa danh (Location) nếu khớp
    const matchedLoc = await this.prisma.location.findFirst({
      where: {
        OR: [
          { name: { contains: cleanKw, mode: 'insensitive' } },
          { slug: { contains: cleanKw, mode: 'insensitive' } },
        ],
      },
    });
    if (matchedLoc) {
      const locNorm = ListingsService.removeAccents(matchedLoc.name);
      for (const [key, coords] of Object.entries(ListingsService.KNOWN_ADDRESS_COORDINATES)) {
        if (locNorm.includes(key)) {
          return { lat: coords.lat, lng: coords.lng, label: matchedLoc.name };
        }
      }
    }

    // 4. Fallback Geocoder qua OpenStreetMap Nominatim nếu có kết nối mạng (timeout 1.2s)
    if (cleanKw.length >= 4) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=vn&limit=1&q=${encodeURIComponent(
            cleanKw,
          )}`,
          {
            headers: { 'User-Agent': 'QNS-Broker-Platform/1.0' },
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);
        if (res.ok) {
          const results = await res.json();
          if (Array.isArray(results) && results.length > 0 && results[0].lat && results[0].lon) {
            return {
              lat: parseFloat(results[0].lat),
              lng: parseFloat(results[0].lon),
              label: cleanKw,
            };
          }
        }
      } catch {
        // Bỏ qua lỗi timeout hoặc offline geocoding
      }
    }

    return null;
  }

  // In-memory cache lưu cây địa danh để tránh 2-4 câu query đệ quy lặp đi lặp lại trên từng lượt tìm kiếm
  private static readonly locationTreeCache = new Map<string, { ids: number[]; expiresAt: number }>();
  private static readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 giờ

  /** Trả về ID của chính location này + toàn bộ con cháu (đệ quy) — dùng để browsing theo tỉnh vẫn thấy tin ở mọi quận/phường con. */
  private async resolveLocationIdsIncludingChildren(slug: string): Promise<number[]> {
    const cached = ListingsService.locationTreeCache.get(slug);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.ids;
    }

    const root = await this.prisma.location.findUnique({ where: { slug } });
    if (!root) return [];

    const allIds = [root.id];
    let currentLevelIds = [root.id];

    // Tối đa 3 cấp (tỉnh → quận → phường) nên vòng lặp luôn dừng sau vài lần — không cần giới hạn đệ quy phức tạp.
    while (currentLevelIds.length > 0) {
      const children = await this.prisma.location.findMany({
        where: { parentId: { in: currentLevelIds } },
        select: { id: true },
      });
      if (children.length === 0) break;
      const childIds = children.map((c: { id: number }) => c.id);
      allIds.push(...childIds);
      currentLevelIds = childIds;
    }

    ListingsService.locationTreeCache.set(slug, {
      ids: allIds,
      expiresAt: Date.now() + ListingsService.CACHE_TTL_MS,
    });

    return allIds;
  }

  /**
   * Chấp nhận cả slug đầy đủ ("...-id123") lẫn ID số thuần.
   *
   * BẢO MẬT — PHÁT HIỆN QUA AUDIT ĐỘC LẬP (01/09/2026): trước đây hàm này chỉ loại trừ status
   * `removed`, nghĩa là tin ở trạng thái `pending` (CHƯA được admin duyệt) hoặc `rejected`
   * (đã bị từ chối) vẫn hiển thị công khai cho BẤT KỲ ai biết/đoán được ID — mà ID là số
   * nguyên tăng dần nên hoàn toàn có thể duyệt tuần tự (1, 2, 3, 4...). Điều này vô hiệu hoá
   * hoàn toàn mục đích của hàng đợi kiểm duyệt: nội dung spam/vi phạm/chưa kiểm tra vẫn lộ ra
   * ngoài trước khi admin kịp xem. Sửa: endpoint công khai CHỈ trả tin `active`; chủ tin muốn
   * xem tin của chính mình (dù đang pending/rejected) dùng `findOneForOwner` hoặc `findMine`.
   */
  async findOne(idOrSlug: string) {
    if (!this.prisma.isConnected) {
      throw new ServiceUnavailableException('Cơ sở dữ liệu đang ngoại tuyến');
    }

    let listing: any = null;
    let listingId: bigint | null = null;

    const match = idOrSlug.match(/-id(\d+)$/) ?? idOrSlug.match(/^(\d+)$/);
    if (match) {
      listingId = BigInt(match[1]);
      listing = await this.prisma.listing.findUnique({
        where: { id: listingId },
        select: PUBLIC_LISTING_SELECT,
      });
    }

    if (!listing) {
      listing = await this.prisma.listing.findFirst({
        where: { slug: idOrSlug },
        select: PUBLIC_LISTING_SELECT,
      });
      if (listing) {
        listingId = listing.id;
      }
    }

    // Cố tình trả cùng 1 thông báo lỗi cho "không tồn tại" và "tồn tại nhưng chưa active" —
    // không phân biệt 2 trường hợp để không lộ thông tin rằng 1 ID nào đó có tồn tại hay không.
    const now = new Date();
    if (
      !listing ||
      listing.status !== ListingStatus.active ||
      (listing.expiresAt && listing.expiresAt <= now) ||
      (listing as any).owner?.isBlocked
    ) {
      throw new NotFoundException('Không tìm thấy tin đăng hoặc tin chưa được duyệt/đã hết hạn');
    }

    // Tăng view count (fire-and-forget, không chặn response)
    if (listingId) {
      this.prisma.listing.update({ where: { id: listingId }, data: { viewCount: { increment: 1 } } }).catch(() => undefined);
    }

    return serialize(listing);
  }

  /**
   * Lấy 1 tin đăng theo ID số thuần cho CHÍNH CHỦ (hoặc admin) — trả về bất kể trạng thái
   * (pending/active/rejected/expired/removed), dùng cho các thao tác nội bộ sau khi đã xác
   * thực quyền sở hữu (addImages, và trang "Quản lý tin"), khác với findOne() công khai ở trên
   * vốn chỉ phục vụ khách truy cập ẩn danh và chỉ trả tin active.
   */
  async findOneForOwner(id: bigint, requester: { id: bigint; role: string }) {
    await this.assertOwnership(id, requester);
    const listing = await this.prisma.listing.findUnique({ where: { id }, select: PUBLIC_LISTING_SELECT });
    if (!listing) throw new NotFoundException('Không tìm thấy tin đăng');
    return serialize(listing);
  }

  /**
   * Danh sách tin đăng của CHÍNH người gọi API, mọi trạng thái — phục vụ trang "Quản lý tin
   * bất động sản" (trước đây HOÀN TOÀN CHƯA CÓ endpoint này: người đăng tin xong không có cách
   * nào trong app để xem lại tin của mình, phải nhờ admin vào Prisma Studio tra thủ công — phá
   * vỡ luồng "Đăng tin → Quản lý tin" vốn là yêu cầu MVP cốt lõi đã ghi trong CLAUDE.md/README.md).
   */
  async findMine(requesterId: bigint, query: { page?: number; pageSize?: number; status?: ListingStatus }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.ListingWhereInput = {
      ownerId: requesterId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        select: PUBLIC_LISTING_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.listing.count({ where }),
    ]);

    return {
      items: items.map(serialize),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async create(ownerId: bigint, dto: CreateListingDto) {
    // RB-10 & RB-06: Đảm bảo transaction-safe cho quota, slug generation và Transactional Outbox
    const updated = await this.prisma.$transaction(async (tx) => {
      // 0. Bắt buộc chấp thuận Điều khoản & Chính sách dịch vụ môi giới cho thuê (GAP-09 / W-05)
      const user = await tx.user.findUnique({ where: { id: ownerId }, select: { role: true } });
      if (user?.role !== 'admin') {
        const hasAcceptedTerms = await tx.documentAcceptance.findFirst({
          where: {
            userId: ownerId,
            document: { docCode: 'BROKER_TERMS_V2' },
          },
        });
        if (!hasAcceptedTerms) {
          const anyAccepted = await tx.documentAcceptance.findFirst({
            where: { userId: ownerId },
          });
          if (!anyAccepted) {
            throw new ForbiddenException(
              'Bạn cần xác nhận đồng ý với Điều khoản và Chính sách dịch vụ môi giới trước khi bắt đầu đăng tin',
            );
          }
        }
      }

      // 1. Kiểm tra hạn mức số tin đăng theo gói thành viên của người dùng (RB-10)
      const now = new Date();
      const activeMembership = await tx.userMembership.findFirst({
        where: {
          userId: ownerId,
          status: 'active',
          endDate: { gt: now },
        },
        include: { plan: true },
        orderBy: { endDate: 'desc' },
      });

      const ownerUser = await tx.user.findUnique({ where: { id: ownerId }, select: { role: true } });
      let maxAllowedListings = ownerUser?.role === 'admin' ? 100 : (activeMembership?.plan.maxActiveListings ?? 3);
      let planName = activeMembership?.plan.name ?? (ownerUser?.role === 'admin' ? 'Quản trị viên' : 'Gói Dùng Thử');
      if (activeMembership?.planSnapshot && typeof activeMembership.planSnapshot === 'object') {
        const snap = activeMembership.planSnapshot as any;
        if (typeof snap.maxActiveListings === 'number') {
          maxAllowedListings = ownerUser?.role === 'admin' ? 100 : snap.maxActiveListings;
        }
        if (snap.name) {
          planName = snap.name;
        }
      }

      const currentActiveCount = await tx.listing.count({
        where: {
          ownerId,
          status: { in: [ListingStatus.active, ListingStatus.pending] },
        },
      });

      if (currentActiveCount >= maxAllowedListings) {
        throw new ForbiddenException(
          `Bạn đã đạt giới hạn tối đa ${maxAllowedListings} tin đăng theo năng lực phục vụ hiện tại của hệ thống, vui lòng liên hệ chuyên viên tư vấn để được hỗ trợ kiểm duyệt thêm`,
        );
      }

      // 1.1 Kiểm tra tính hợp lệ của toạ độ nếu được cung cấp
      if (dto.lat !== undefined && dto.lng !== undefined) {
        if (!isValidVietnamCoordinate(dto.lat, dto.lng)) {
          throw new BadRequestException('Toạ độ không nằm trong phạm vi phục vụ hợp lệ tại Việt Nam');
        }
      }

      // 1.2 Kiểm tra chống đăng tin trùng lặp liên tiếp (cùng chủ, cùng giá/toạ độ trong 5 phút)
      const recentDuplicate = await tx.listing.findFirst({
        where: {
          ownerId,
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
          OR: [
            { title: dto.title.trim() },
            ...(dto.lat !== undefined && dto.lng !== undefined
              ? [
                  {
                    lat: { gte: dto.lat - 0.0002, lte: dto.lat + 0.0002 },
                    lng: { gte: dto.lng - 0.0002, lte: dto.lng + 0.0002 },
                    price: BigInt(dto.price),
                  },
                ]
              : []),
          ],
        },
      });
      if (recentDuplicate) {
        throw new BadRequestException('Phòng có thông tin tương tự vừa được tạo, vui lòng không đăng lặp lại liên tiếp');
      }

      const normPropertyType = normalizeLegacyPropertyType(dto.propertyType);
      const normAmenities = dto.amenities ? (normalizeAmenities(dto.amenities) as unknown as Prisma.InputJsonValue) : undefined;

      // 2. Tạo bản ghi tin đăng
      const created = await tx.listing.create({
        data: {
          ownerId,
          locationId: dto.locationId,
          projectId: dto.projectId ? BigInt(dto.projectId) : undefined,
          transactionType: dto.transactionType ?? TransactionType.rent,
          propertyType: normPropertyType,
          title: dto.title,
          slug: `${slugify(dto.title, { lower: true, strict: true, locale: 'vi' })}-idtemp`,
          description: dto.description,
          price: BigInt(dto.price),
          depositAmount: dto.depositAmount !== undefined ? BigInt(dto.depositAmount) : undefined,
          minLeaseMonths: dto.minLeaseMonths,
          utilitiesIncluded: dto.utilitiesIncluded ?? false,
          electricityPricePerKwh: dto.electricityPricePerKwh,
          waterPricePerM3: dto.waterPricePerM3,
          waterPriceFlat: dto.waterPriceFlat,
          amenities: normAmenities,
          areaM2: dto.areaM2,
          bedrooms: dto.bedrooms,
          bathrooms: dto.bathrooms,
          legalStatus: dto.legalStatus,
          addressDetail: dto.addressDetail,
          lat: dto.lat,
          lng: dto.lng,
          status: ListingStatus.pending,
          ...(dto.universityDistances?.length
            ? {
                nearbyUniversities: {
                  create: dto.universityDistances.map((ud) => ({
                    universityId: ud.universityId,
                    distanceMeters: ud.distanceMeters,
                    travelTimeMinutes: ud.travelTimeMinutes,
                  })),
                },
              }
            : dto.nearbyUniversityIds?.length
              ? {
                  nearbyUniversities: {
                    create: dto.nearbyUniversityIds.map((uid) => ({
                      universityId: uid,
                    })),
                  },
                }
              : {}),
        },
        include: {
          owner: { select: { phone: true, fullName: true } },
          location: { select: { name: true } },
        },
      });

      // 3. Cập nhật finalSlug nguyên tử ngay trong transaction (loại bỏ race idtemp - RB-10)
      const finalSlug = buildSlug(dto.title, created.id);
      const saved = await tx.listing.update({
        where: { id: created.id },
        data: { slug: finalSlug },
        select: PUBLIC_LISTING_SELECT,
      });

      // 4. Ghi nhận các sự kiện thông báo vào Transactional Outbox (RB-06)
      await this.outboxService.recordEvent(
        {
          aggregateType: 'LISTING',
          aggregateId: created.id.toString(),
          eventType: 'EMAIL_LISTING_SUBMITTED',
          payload: {
            listing: { id: created.id.toString(), title: created.title, slug: finalSlug },
            landlordPhone: created.owner.phone,
          },
        },
        tx,
      );

      await this.outboxService.recordEvent(
        {
          aggregateType: 'LISTING',
          aggregateId: created.id.toString(),
          eventType: 'EMAIL_NEW_LISTING_ADMIN',
          payload: {
            listing: {
              id: created.id.toString(),
              title: created.title,
              propertyType: created.propertyType,
              price: created.price.toString(),
              ownerPhone: created.owner.phone,
              slug: finalSlug,
            },
          },
        },
        tx,
      );

      await this.outboxService.recordEvent(
        {
          aggregateType: 'LISTING',
          aggregateId: created.id.toString(),
          eventType: 'SHEETS_PENDING_LISTING',
          payload: {
            listing: {
              id: created.id.toString(),
              title: created.title,
              propertyType: created.propertyType,
              price: created.price.toString(),
              depositAmount: created.depositAmount ? created.depositAmount.toString() : null,
              locationName: created.location.name,
              addressDetail: created.addressDetail,
              ownerName: created.owner.fullName,
              ownerPhone: created.owner.phone,
              createdAt: created.createdAt.toISOString(),
              slug: finalSlug,
            },
          },
        },
        tx,
      );

      return saved;
    });

    return serialize(updated);
  }

  async update(id: bigint, requester: { id: bigint; role: string }, dto: UpdateListingDto) {
    const listing = await this.assertOwnership(id, requester);

    const updateData: Prisma.ListingUncheckedUpdateInput = {
      ...dto,
      projectId: dto.projectId !== undefined ? (dto.projectId ? BigInt(dto.projectId) : null) : undefined,
      price: dto.price !== undefined ? BigInt(dto.price) : undefined,
      depositAmount: dto.depositAmount !== undefined ? BigInt(dto.depositAmount) : undefined,
      amenities: dto.amenities as Prisma.InputJsonValue | undefined,
    };
    delete (updateData as any).nearbyUniversityIds;
    delete (updateData as any).universityDistances;

    // BE-03: Nếu chủ tin sửa các trường cốt lõi của tin đang active, đưa về pending và reset huy hiệu xác thực
    const coreFields: (keyof UpdateListingDto)[] = [
      'title', 'description', 'price', 'depositAmount', 'addressDetail',
      'locationId', 'projectId', 'propertyType', 'transactionType',
      'areaM2', 'bedrooms', 'bathrooms', 'legalStatus', 'electricityPricePerKwh',
      'waterPricePerM3', 'waterPriceFlat', 'amenities', 'utilitiesIncluded',
    ];
    const isCoreModified = coreFields.some((f) => (dto as any)[f] !== undefined);

    if (requester.role !== 'admin' && listing.status === ListingStatus.active && isCoreModified) {
      updateData.status = ListingStatus.pending;
      updateData.verificationStatus = 'chua_xac_thuc';
      updateData.verifiedAt = null;
      updateData.verifiedByUserId = null;
    }

    // Khi người dùng đổi tiêu đề tin, tự động làm mới slug theo chuẩn "...-id{id}" để URL đồng bộ
    if (dto.title) {
      updateData.slug = `${slugify(dto.title, { lower: true, strict: true, locale: 'vi' })}-id${listing.id}`;
    }

    const updated = await this.prisma.listing.update({
      where: { id: listing.id },
      data: updateData,
      select: PUBLIC_LISTING_SELECT,
    });
    return serialize(updated);
  }

  async remove(id: bigint, requester: { id: bigint; role: string }) {
    const listing = await this.assertOwnership(id, requester);
    await this.prisma.$transaction(async (tx) => {
      await tx.listing.update({ where: { id: listing.id }, data: { status: ListingStatus.removed } });
      await tx.auditEvent.create({
        data: {
          action: 'listing.removed',
          actorId: requester.id,
          entityType: 'listing',
          entityId: listing.id.toString(),
          beforeState: { status: listing.status },
          afterState: { status: ListingStatus.removed },
          reason: 'Người dùng hoặc quản trị viên gỡ tin đăng',
        },
      });
    });
    return { message: 'Đã gỡ tin đăng.' };
  }

  /** Đánh dấu phòng đã cho thuê thành công (FE-N09) */
  async markAsRented(id: bigint, requester: { id: bigint; role: string }) {
    const listing = await this.assertOwnership(id, requester);
    await this.prisma.$transaction(async (tx) => {
      await tx.listing.update({ where: { id: listing.id }, data: { status: ListingStatus.rented } });
      await tx.auditEvent.create({
        data: {
          action: 'listing.mark_rented',
          actorId: requester.id,
          entityType: 'listing',
          entityId: listing.id.toString(),
          beforeState: { status: listing.status },
          afterState: { status: ListingStatus.rented },
          reason: 'Người dùng hoặc quản trị viên đánh dấu phòng đã cho thuê',
        },
      });
    });
    return { message: 'Đã đánh dấu phòng cho thuê thành công.' };
  }

  /**
   * Xác nhận phòng vẫn còn trống — chu kỳ 7 ngày thử nghiệm (§7, Gate E).
   * Cập nhật refreshedAt = now() và ghi AuditEvent.
   */
  async confirmAvailability(id: bigint, requester: { id: bigint; role: string }) {
    const listing = await this.assertOwnership(id, requester);
    if (listing.status !== ListingStatus.active) {
      throw new BadRequestException('Chỉ có thể xác nhận tình trạng còn phòng đối với tin đăng đang hoạt động (active)');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: { id: listing.id },
        data: { refreshedAt: now },
      });

      await tx.auditEvent.create({
        data: {
          action: 'listing.confirm_availability',
          actorId: requester.id,
          entityType: 'listing',
          entityId: listing.id.toString(),
          beforeState: { refreshedAt: listing.refreshedAt },
          afterState: { refreshedAt: now },
        },
      });
    });

    return {
      success: true,
      refreshedAt: now,
      message: 'Đã xác nhận phòng vẫn còn trống thành công',
    };
  }

  async getImageCount(listingId: bigint): Promise<number> {
    return this.prisma.listingImage.count({ where: { listingId } });
  }

  async addImages(id: bigint, requester: { id: bigint; role: string }, imageUrls: string[]) {
    const listing = await this.assertOwnership(id, requester);

    const currentMax = await this.prisma.listingImage.aggregate({
      where: { listingId: id },
      _max: { sortOrder: true },
    });
    let nextOrder = (currentMax._max.sortOrder ?? -1) + 1;

    await this.prisma.listingImage.createMany({
      data: imageUrls.map((url) => ({ listingId: id, imageUrl: url, sortOrder: nextOrder++ })),
    });

    // BE-03: Thêm ảnh mới vào tin đang active cần kiểm duyệt lại để tránh tráo ảnh lừa đảo
    if (requester.role !== 'admin' && listing.status === ListingStatus.active) {
      await this.prisma.listing.update({
        where: { id },
        data: {
          status: ListingStatus.pending,
          verificationStatus: 'chua_xac_thuc',
          verifiedAt: null,
          verifiedByUserId: null,
        },
      });
    }

    return this.findOneForOwner(id, requester);
  }

  async revealPhone(id: bigint, requesterId: bigint) {
    const now = new Date();
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        owner: { select: { isBlocked: true } },
        contactAgent: { select: { workPhone: true, displayName: true, bio: true } },
      },
    });
    // BE-04, BE-05: Kiểm tra trạng thái active, hết hạn và seller có bị block không
    if (
      !listing ||
      listing.status !== ListingStatus.active ||
      (listing.expiresAt && listing.expiresAt <= now) ||
      listing.owner.isBlocked
    ) {
      throw new NotFoundException('Không tìm thấy tin đăng hoặc tin chưa được duyệt/đã hết hạn');
    }

    // Atomic write tracking tương tác
    try {
      await this.prisma.$transaction([
        this.prisma.phoneRevealLog.create({ data: { listingId: id, userId: requesterId } }),
        this.prisma.listing.update({ where: { id }, data: { revealPhoneCount: { increment: 1 } } }),
      ]);
    } catch (err: any) {
      // P2002: Bỏ qua duplicate nếu user đã click nhiều lần cùng lúc
      if (err.code !== 'P2002') {
        throw err;
      }
    }

    // GAP-02, BR-01, AT-02: Tuyệt đối không trả số điện thoại riêng của chủ phòng
    // Trả về số hotline chính thức của người phụ trách tư vấn & dẫn xem (Đức Quân)
    const phone = listing.contactAgent?.workPhone || '0981 753 082';
    const brokerName = listing.contactAgent?.displayName || 'Đức Quân';
    const role = 'Người tư vấn và trực tiếp dẫn xem';

    return {
      phone,
      brokerName,
      role,
      agency: 'QNS BROKER',
      note: 'Tư vấn và xem phòng miễn phí. Hợp đồng thuê ký trực tiếp với bên có quyền cho thuê',
    };
  }

  /**
   * DEV-03: Lấy thông tin liên hệ công khai chính thức cho tin đăng
   * Chỉ trả đầu mối dịch vụ của người phụ trách tư vấn/dẫn xem kèm thông tin minh bạch bên cho thuê
   */
  async getPublicContact(id: bigint) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        contactAgent: {
          select: {
            id: true,
            displayName: true,
            workPhone: true,
            avatarUrl: true,
            bio: true,
          },
        },
        owner: {
          select: {
            fullName: true,
            isBlocked: true,
            isPhoneVerified: true,
            isIdVerified: true,
          },
        },
      },
    });

    if (
      !listing ||
      listing.status !== ListingStatus.active ||
      (listing.expiresAt && listing.expiresAt <= new Date()) ||
      listing.owner.isBlocked
    ) {
      throw new NotFoundException('Không tìm thấy tin đăng hoặc tin chưa được duyệt/đã hết hạn');
    }

    return {
      agent: {
        name: listing.contactAgent?.displayName || 'Đức Quân',
        role: 'Người tư vấn và trực tiếp dẫn xem',
        phone: listing.contactAgent?.workPhone || '0981 753 082',
        zalo: '0981 753 082',
        agencyName: 'QNS BROKER',
        workingHours: '24/7',
      },
      lessorDisclosure: {
        displayName: listing.owner.fullName || 'Người cho thuê',
        isVerified: Boolean(listing.owner.isIdVerified || listing.owner.isPhoneVerified),
      },
      servicePolicy:
        'Tư vấn và xem phòng miễn phí. Hợp đồng thuê ký trực tiếp với bên có quyền cho thuê. Chủ thanh toán phí dịch vụ khi thuê thành công theo thỏa thuận',
    };
  }

  async report(id: bigint, reason: string, note: string | undefined, reporterId?: bigint) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!listing) throw new NotFoundException('Không tìm thấy tin đăng');

    const reportRecord = await this.prisma.$transaction(async (tx) => {
      const record = await tx.listingReport.create({
        data: { listingId: id, reason, note, reporterId },
        include: {
          reporter: { select: { phone: true } },
        },
      });

      // RB-06: Ghi sự kiện thông báo vào Transactional Outbox
      await this.outboxService.recordEvent(
        {
          aggregateType: 'REPORT',
          aggregateId: record.id.toString(),
          eventType: 'EMAIL_NEW_REPORT_ADMIN',
          payload: {
            report: {
              id: record.id.toString(),
              reason,
              note,
              listingId: id.toString(),
              listingTitle: listing.title,
              reporterPhone: record.reporter?.phone,
            },
          },
        },
        tx,
      );

      await this.outboxService.recordEvent(
        {
          aggregateType: 'REPORT',
          aggregateId: record.id.toString(),
          eventType: 'SHEETS_VIOLATION_REPORT',
          payload: {
            report: {
              id: record.id.toString(),
              listingId: id.toString(),
              listingTitle: listing.title,
              reason,
              note,
              reporterPhone: record.reporter?.phone,
              createdAt: record.createdAt.toISOString(),
            },
          },
        },
        tx,
      );

      return record;
    });

    return {
      message: 'Báo cáo vi phạm đã được tiếp nhận, đội ngũ kiểm duyệt sẽ xem xét sớm',
      reportId: reportRecord.id.toString(),
    };
  }

  /**
   * Toggle lưu/bỏ lưu BĐS yêu thích (SavedListing) — hoàn thiện tính năng mục 16 README.
   */
  async toggleSave(listingId: bigint, userId: bigint) {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.status !== ListingStatus.active) {
      throw new NotFoundException('Không tìm thấy tin đăng hoặc tin chưa được duyệt');
    }

    const existing = await this.prisma.savedListing.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });

    if (existing) {
      await this.prisma.savedListing.delete({
        where: { userId_listingId: { userId, listingId } },
      });
      return { saved: false, message: 'Đã bỏ lưu tin đăng' };
    } else {
      await this.prisma.savedListing.create({
        data: { userId, listingId },
      });
      return { saved: true, message: 'Đã lưu tin đăng vào danh sách yêu thích' };
    }
  }

  async isSaved(listingId: bigint, userId: bigint) {
    const existing = await this.prisma.savedListing.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    return { saved: !!existing };
  }

  async findSaved(userId: bigint, query: { page?: number; pageSize?: number }) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const publicWhere = ListingsService.getPublicWhereClause();

    const [savedItems, total] = await this.prisma.$transaction([
      this.prisma.savedListing.findMany({
        where: { userId, listing: publicWhere },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          listing: {
            select: PUBLIC_LISTING_SELECT,
          },
        },
      }),
      this.prisma.savedListing.count({
        where: { userId, listing: publicWhere },
      }),
    ]);

    return {
      items: savedItems.map((s: { listing: any }) => serialize(s.listing)),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  /** Public để Controller kiểm tra quyền trước khi ghi file upload vào đĩa */
  async assertOwnership(id: bigint, requester: { id: bigint; role: string }) {
    const listing = await this.prisma.listing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Không tìm thấy tin đăng');
    if (listing.ownerId !== requester.id && requester.role !== 'admin') {
      throw new ForbiddenException('Bạn không có quyền thao tác trên tin đăng này');
    }
    return listing;
  }
}
