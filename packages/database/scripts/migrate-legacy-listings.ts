/**
 * Script di chuyển (migrate) toàn bộ tin đăng từ file custom-listings.json cũ sang PostgreSQL (Prisma).
 *
 * Tính năng:
 * - Hỗ trợ cờ --dry-run để chạy kiểm tra thử không ghi DB.
 * - Idempotent: chạy nhiều lần không tạo bản ghi trùng lặp.
 * - Chuẩn hóa propertyType, amenities, giá tiền, diện tích theo @qns/shared.
 * - Kiểm tra tọa độ: KHÔNG bịa tọa độ; nếu thiếu/ngoài lãnh thổ Việt Nam thì đưa về pending.
 * - Xuất ánh xạ slug cũ -> slug mới vào `packages/database/legacy-slug-redirects.json` phục vụ chuyển hướng 301.
 * - Cập nhật tọa độ chuẩn xác cho các tin seed mẫu đã có trong DB.
 *
 * Chạy thử:
 *   pnpm --filter @batdongsan/database exec ts-node scripts/migrate-legacy-listings.ts --dry-run
 * Chạy thật:
 *   pnpm --filter @batdongsan/database exec ts-node scripts/migrate-legacy-listings.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient, ListingStatus, TransactionType } from '@prisma/client';
import {
  normalizeLegacyPropertyType,
  normalizeAmenities,
  isValidVietnamCoordinate,
  buildSlug,
} from '../../shared/src';

const prisma = new PrismaClient();

const isDryRun = process.argv.includes('--dry-run');

interface LegacyCustomListing {
  id?: string;
  title: string;
  slug?: string;
  description?: string;
  transactionType?: string;
  propertyType?: string;
  price?: string | number;
  depositAmount?: string | number;
  minLeaseMonths?: number;
  utilitiesIncluded?: boolean;
  electricityPricePerKwh?: number;
  waterPricePerM3?: number;
  waterPriceFlat?: number;
  amenities?: Record<string, any>;
  areaM2?: string | number;
  bedrooms?: number;
  bathrooms?: number;
  legalStatus?: string;
  addressDetail?: string;
  lat?: number | null;
  lng?: number | null;
  status?: string;
  ownerId?: string;
  ownerEmail?: string;
  publishedAt?: string;
  images?: Array<string | { imageUrl: string; sortOrder?: number }>;
  location?: { id?: number; name?: string; slug?: string; level?: string };
}

async function runMigration() {
  console.log(`=== BẮT ĐẦU MIGRATION DỮ LIỆU TIN ĐĂNG CŨ VÀO POSTGRESQL ===`);
  console.log(`Chế độ: ${isDryRun ? 'DRY-RUN (CHẠY THỬ - KHÔNG GHI DB)' : 'THỰC THI THẬT'}`);

  // 1. Cập nhật tọa độ và chuẩn hóa loại hình cho 2 tin seed mẫu
  console.log('\n--- Bước 1: Kiểm tra và chuẩn hóa tọa độ cho tin mẫu hiện có ---');
  const seed1 = await prisma.listing.findFirst({
    where: { slug: { contains: 'mau-phong-tro-gac-lung-gan-tdtu' } },
  });
  if (seed1) {
    console.log(`Chuẩn hóa tin mẫu TDTU (id: ${seed1.id}): lat 10.7335, lng 106.7032, propertyType phong_tro`);
    if (!isDryRun) {
      await prisma.listing.update({
        where: { id: seed1.id },
        data: {
          lat: 10.7335,
          lng: 106.7032,
          propertyType: normalizeLegacyPropertyType(seed1.propertyType),
          amenities: normalizeAmenities(seed1.amenities as any),
        },
      });
    }
  }

  const seed2 = await prisma.listing.findFirst({
    where: { slug: { contains: 'mau-can-ho-studio-quan-1-full-noi-that' } },
  });
  if (seed2) {
    console.log(`Chuẩn hóa tin mẫu UEH Q1 (id: ${seed2.id}): lat 10.7828, lng 106.6958, propertyType chung_cu_mini`);
    if (!isDryRun) {
      await prisma.listing.update({
        where: { id: seed2.id },
        data: {
          lat: 10.7828,
          lng: 106.6958,
          propertyType: normalizeLegacyPropertyType(seed2.propertyType),
          amenities: normalizeAmenities(seed2.amenities as any),
        },
      });
    }
  }

  // 2. Đọc file apps/web/data/custom-listings.json
  console.log('\n--- Bước 2: Đọc file dữ liệu custom-listings.json ---');
  const customListingsPath = path.resolve(
    __dirname,
    '../../../apps/web/data/custom-listings.json'
  );

  if (!fs.existsSync(customListingsPath)) {
    console.log(`Không tìm thấy file ${customListingsPath}. Bỏ qua bước này.`);
    return;
  }

  const rawJson = fs.readFileSync(customListingsPath, 'utf-8');
  let legacyListings: LegacyCustomListing[] = [];
  try {
    legacyListings = JSON.parse(rawJson);
  } catch (err) {
    console.error(`Lỗi phân tích cú pháp JSON từ ${customListingsPath}:`, err);
    return;
  }

  console.log(`Tìm thấy ${legacyListings.length} tin trong custom-listings.json`);

  // Lấy tài khoản admin/chủ nhà mặc định để gán nếu thiếu owner
  const defaultOwner = await prisma.user.findFirst({
    where: { role: 'admin' },
  });
  if (!defaultOwner) {
    throw new Error('Chưa có tài khoản admin trong database. Hãy chạy seed trước.');
  }

  // Lấy location mặc định
  const defaultLocation = await prisma.location.findFirst({
    where: { slug: 'ha-noi' },
  });
  if (!defaultLocation) {
    throw new Error('Chưa có location Hà Nội trong database. Hãy chạy seed trước.');
  }

  const slugRedirectMap: Record<string, string> = {};
  let createdCount = 0;
  let skippedCount = 0;

  for (const item of legacyListings) {
    const rawTitle = (item.title || 'Phòng cho thuê').trim();
    console.log(`\nĐang xử lý tin: "${rawTitle}" (ID cũ: ${item.id})`);

    // Chuẩn hóa loại hình
    const propertyType = normalizeLegacyPropertyType(item.propertyType);

    // Chuẩn hóa tiện nghi
    const amenities = normalizeAmenities(item.amenities);

    // Chuẩn hóa giá
    let price = BigInt(0);
    if (item.price) {
      const parsedPrice = parseInt(String(item.price).replace(/\D/g, ''), 10);
      if (!isNaN(parsedPrice) && parsedPrice > 0) {
        price = BigInt(parsedPrice);
      }
    }

    // Chuẩn hóa diện tích
    let areaM2 = 20;
    if (item.areaM2) {
      const parsedArea = parseFloat(String(item.areaM2));
      if (!isNaN(parsedArea) && parsedArea > 0) {
        areaM2 = Math.round(parsedArea);
      }
    }

    // Tọa độ
    let lat: number | null = null;
    let lng: number | null = null;
    let hasValidCoords = false;

    if (
      typeof item.lat === 'number' &&
      typeof item.lng === 'number' &&
      isValidVietnamCoordinate(item.lat, item.lng)
    ) {
      lat = item.lat;
      lng = item.lng;
      hasValidCoords = true;
    } else {
      console.log(`  -> CẢNH BÁO: Tọa độ không hợp lệ hoặc thiếu (lat: ${item.lat}, lng: ${item.lng}). KHÔNG bịa tọa độ.`);
    }

    // Trạng thái tin
    let status: ListingStatus = ListingStatus.active;
    if (item.status === 'rented') status = ListingStatus.rented;
    else if (item.status === 'rejected') status = ListingStatus.rejected;
    else if (item.status === 'removed') status = ListingStatus.removed;
    else if (item.status === 'pending') status = ListingStatus.pending;

    // Nếu thiếu tọa độ hoặc thiếu giá, bắt buộc chuyển về pending
    if (!hasValidCoords || price === BigInt(0)) {
      status = ListingStatus.pending;
      console.log(`  -> Chuyển trạng thái về 'pending' do thiếu tọa độ hoặc thiếu giá.`);
    }

    // Chủ sở hữu
    let ownerId = defaultOwner.id;
    if (item.ownerEmail) {
      const existingUser = await prisma.user.findFirst({
        where: { email: item.ownerEmail.toLowerCase() },
      });
      if (existingUser) {
        ownerId = existingUser.id;
      }
    }

    // Địa danh
    let locationId = defaultLocation.id;
    if (item.location?.slug) {
      const foundLoc = await prisma.location.findFirst({
        where: { slug: item.location.slug },
      });
      if (foundLoc) locationId = foundLoc.id;
    }

    // Kiểm tra xem tin đã tồn tại trong DB chưa (dựa theo tiêu đề và owner)
    const existingListing = await prisma.listing.findFirst({
      where: {
        title: rawTitle,
        ownerId,
      },
    });

    if (existingListing) {
      console.log(`  -> Tin đã tồn tại trong DB (ID: ${existingListing.id}, slug: ${existingListing.slug}). Bỏ qua tạo mới.`);
      if (item.slug && item.slug !== existingListing.slug) {
        slugRedirectMap[item.slug] = existingListing.slug;
      }
      skippedCount++;
      continue;
    }

    // Chuẩn bị ảnh
    const imageList: string[] = [];
    if (Array.isArray(item.images)) {
      for (const img of item.images) {
        if (typeof img === 'string' && img.trim()) {
          imageList.push(img.trim());
        } else if (img && typeof img === 'object' && 'imageUrl' in img && img.imageUrl) {
          imageList.push(img.imageUrl);
        }
      }
    }

    // Tạo bản ghi mới nếu không dry-run
    if (isDryRun) {
      console.log(`  -> [DRY-RUN] Sẽ tạo mới tin: title="${rawTitle}", price=${price}, status=${status}, lat=${lat}, lng=${lng}`);
      createdCount++;
      if (item.slug) {
        slugRedirectMap[item.slug] = buildSlug(rawTitle, 'migrated-preview');
      }
    } else {
      // Tạo placeholder với slug tạm, sau đó update slug có id chuẩn
      const newListing = await prisma.listing.create({
        data: {
          ownerId,
          locationId,
          transactionType: TransactionType.rent,
          propertyType,
          title: rawTitle,
          slug: `temp-slug-${Date.now()}`,
          description: item.description || null,
          price,
          depositAmount: item.depositAmount ? BigInt(parseInt(String(item.depositAmount), 10) || 0) : null,
          minLeaseMonths: item.minLeaseMonths || null,
          utilitiesIncluded: Boolean(item.utilitiesIncluded),
          electricityPricePerKwh: item.electricityPricePerKwh || null,
          waterPricePerM3: item.waterPricePerM3 || null,
          waterPriceFlat: item.waterPriceFlat || null,
          amenities,
          areaM2,
          bedrooms: item.bedrooms || 1,
          bathrooms: item.bathrooms || 1,
          legalStatus: item.legalStatus || null,
          addressDetail: item.addressDetail || null,
          lat,
          lng,
          status,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
          images: {
            create: imageList.map((url, idx) => ({
              imageUrl: url,
              sortOrder: idx,
            })),
          },
        },
      });

      // Tạo slug chuẩn: {tieu-de}-id{id}
      const officialSlug = buildSlug(rawTitle, newListing.id);
      await prisma.listing.update({
        where: { id: newListing.id },
        data: { slug: officialSlug },
      });

      console.log(`  -> ĐÃ TẠO THÀNH CÔNG: ID ${newListing.id}, slug="${officialSlug}"`);
      createdCount++;

      if (item.slug && item.slug !== officialSlug) {
        slugRedirectMap[item.slug] = officialSlug;
      }
    }
  }

  // 3. Xuất file ánh xạ slug redirect
  const redirectMapPath = path.resolve(__dirname, '../legacy-slug-redirects.json');
  console.log(`\n--- Bước 3: Xuất file ánh xạ slug 301 sang ${redirectMapPath} ---`);
  fs.writeFileSync(redirectMapPath, JSON.stringify(slugRedirectMap, null, 2), 'utf-8');
  console.log(`Đã lưu ${Object.keys(slugRedirectMap).length} quy tắc ánh xạ slug.`);

  console.log(`\n=== TỔNG KẾT MIGRATION ===`);
  console.log(`- Đã xử lý: ${legacyListings.length} tin`);
  console.log(`- Đã tạo: ${createdCount} tin`);
  console.log(`- Đã bỏ qua do trùng: ${skippedCount} tin`);
  console.log(`- Ánh xạ redirect 301: ${Object.keys(slugRedirectMap).length} mục`);
}

runMigration()
  .catch((err) => {
    console.error('Lỗi khi chạy migration:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
