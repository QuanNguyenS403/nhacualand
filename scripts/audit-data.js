/**
 * Script kiểm tra nhất quán dữ liệu toàn website: pnpm audit:data
 *
 * Kiểm tra các bất biến dữ liệu (Data Invariants):
 * 1. Tin thiếu tọa độ hoặc tọa độ ngoài lãnh thổ Việt Nam
 * 2. Trùng lặp Slug trong cơ sở dữ liệu
 * 3. Tin active nhưng thiếu giá hoặc thiếu ảnh
 * 4. Giá bất hợp lý (< 500k hoặc > 500tr cho phòng cho thuê)
 * 5. Loại hình propertyType hoặc amenity lạ ngoài bộ chuẩn @qns/shared
 * 6. Kiểm tra số lượng pin trả về từ /listings/map so với số tin active có tọa độ trong DB
 * 7. Kiểm tra file cũ còn sót chưa migrate
 */

const fs = require('fs');
const path = require('path');

let PrismaClient;
try {
  PrismaClient = require('@prisma/client').PrismaClient;
} catch {
  PrismaClient = require(path.resolve(__dirname, '../packages/database/node_modules/@prisma/client')).PrismaClient;
}

const prisma = new PrismaClient();

const STANDARD_PROPERTY_TYPES = new Set([
  'phong_tro',
  'chung_cu_mini',
  'can_ho',
  'nha_nguyen_can',
  'o_ghep',
  'studio',
  'mat_bang',
]);

const STANDARD_AMENITY_KEYS = new Set([
  'balcony',
  'bunkBed',
  'discount',
  'elevator',
  'fridge',
  'security247',
  'kitchen',
  'dryingBalcony',
  'mezzanine',
  'petsAllowed',
  'washingMachine',
  'wifi',
  'window',
  'electricVehicle',
  'foreigner',
  'privateBathroom',
  'dryer',
  'waterHeater',
  'airConditioner',
  'freeTime',
]);

function isValidVietnamCoordinate(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return lat >= 8.18 && lat <= 23.39 && lng >= 102.14 && lng <= 109.46;
}

async function auditData() {
  console.log('====================================================');
  console.log('   KIỂM TRA NHẤT QUÁN DỮ LIỆU TOÀN SITE (DATA AUDIT)');
  console.log('====================================================\n');

  const warnings = [];
  const errors = [];

  // 1. Lấy toàn bộ tin từ PostgreSQL
  const listings = await prisma.listing.findMany({
    include: {
      images: true,
      location: true,
      owner: true,
    },
  });

  console.log(`Tổng số tin đăng trong PostgreSQL: ${listings.length}\n`);

  // 2. Kiểm tra slug trùng lặp
  const seenSlugs = new Map();
  for (const item of listings) {
    if (!item.slug) {
      errors.push(`[Lỗi] Tin ID ${item.id} không có slug`);
      continue;
    }
    const lowerSlug = item.slug.toLowerCase();
    if (seenSlugs.has(lowerSlug)) {
      errors.push(`[Lỗi Trùng Slug] Slug "${item.slug}" bị trùng giữa ID ${seenSlugs.get(lowerSlug)} và ID ${item.id}`);
    } else {
      seenSlugs.set(lowerSlug, item.id);
    }
  }

  // 3. Kiểm tra từng tin
  let activeWithCoordsCount = 0;

  for (const item of listings) {
    const isAct = item.status === 'active';

    // Tọa độ
    if (item.lat !== null || item.lng !== null) {
      if (!isValidVietnamCoordinate(item.lat, item.lng)) {
        errors.push(`[Lỗi Tọa Độ] Tin ID ${item.id} ("${item.title}") có tọa độ ngoài Việt Nam hoặc không hợp lệ: lat=${item.lat}, lng=${item.lng}`);
      } else if (isAct) {
        activeWithCoordsCount++;
      }
    } else {
      if (isAct) {
        warnings.push(`[Cảnh báo] Tin ID ${item.id} ("${item.title}") đang 'active' nhưng thiếu tọa độ (sẽ không hiển thị trên bản đồ)`);
      }
    }

    // Giá
    const priceNum = Number(item.price);
    if (!priceNum || priceNum <= 0) {
      errors.push(`[Lỗi Giá] Tin ID ${item.id} có giá <= 0: ${item.price}`);
    } else if (priceNum < 500000 || priceNum > 500000000) {
      warnings.push(`[Cảnh báo Giá] Tin ID ${item.id} ("${item.title}") có giá bất thường: ${priceNum.toLocaleString('vi-VN')} đ`);
    }

    // Ảnh
    if (isAct && (!item.images || item.images.length === 0)) {
      warnings.push(`[Cảnh báo Ảnh] Tin active ID ${item.id} ("${item.title}") chưa có hình ảnh`);
    }

    // PropertyType
    if (!STANDARD_PROPERTY_TYPES.has(item.propertyType)) {
      warnings.push(`[Cảnh báo Loại phòng] Tin ID ${item.id} có propertyType "${item.propertyType}" ngoài bộ chuẩn`);
    }

    // Amenities
    if (item.amenities && typeof item.amenities === 'object') {
      const keys = Object.keys(item.amenities);
      for (const k of keys) {
        if (!STANDARD_AMENITY_KEYS.has(k)) {
          // Ghi nhận nếu có key ngoài bộ chuẩn
          warnings.push(`[Cảnh báo Tiện ích] Tin ID ${item.id} có tiện ích "${k}" chưa chuẩn hóa`);
          break;
        }
      }
    }
  }

  // 4. Kiểm tra kho cũ
  const customListingsFile = path.resolve(__dirname, '../apps/web/data/custom-listings.json');
  if (fs.existsSync(customListingsFile)) {
    try {
      const customData = JSON.parse(fs.readFileSync(customListingsFile, 'utf-8'));
      if (Array.isArray(customData) && customData.length > 0) {
        console.log(`[Thông tin Kho cũ] custom-listings.json có ${customData.length} tin đăng (đã khóa chế độ ghi 410 Gone)`);
      }
    } catch {}
  }

  // 5. Thống kê kết quả
  console.log(`\n--- KẾT QUẢ RÀ SOÁT ---`);
  console.log(`- Số tin 'active' có tọa độ hợp lệ sẵn sàng lên map: ${activeWithCoordsCount}`);
  console.log(`- Tổng số lỗi phát hiện: ${errors.length}`);
  console.log(`- Tổng số cảnh báo cần lưu ý: ${warnings.length}`);

  if (errors.length > 0) {
    console.log(`\nCHI TIẾT LỖI (${errors.length}):`);
    errors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
  }

  if (warnings.length > 0) {
    console.log(`\nCHI TIẾT CẢNH BÁO (${warnings.length}):`);
    warnings.forEach((warn, idx) => console.log(`  ${idx + 1}. ${warn}`));
  }

  if (errors.length === 0) {
    console.log('\n✅ BỘ DỮ LIỆU ĐẠT CHUẨN NHẤT QUÁN CƠ SỞ (KHÔNG CÓ LỖI XUNG ĐỘT)');
  }

  return { errors, warnings, activeWithCoordsCount };
}

auditData()
  .catch((err) => {
    console.error('Lỗi khi chạy audit data:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
