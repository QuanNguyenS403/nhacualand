const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'node_modules', '.pnpm', '@prisma+client@5.22.0_prisma@5.22.0', 'node_modules', '@prisma', 'client'));

async function main() {
  console.log('=== BƯỚC 2: KIỂM TRA BẤT BIẾN DỮ LIỆU HIỆN TRẠNG (CHỈ ĐỌC) ===\n');

  // 1. Kiểm tra database Postgres
  const prisma = new PrismaClient();
  let dbListings = [];
  try {
    dbListings = await prisma.listing.findMany({
      include: {
        images: true,
        location: true,
      },
    });
    console.log(`[1. Postgres DB] Tổng số tin trong DB: ${dbListings.length}`);
    dbListings.forEach((l) => {
      console.log(`   - ID: ${l.id}, status: ${l.status}, slug: ${l.slug}, lat: ${l.lat}, lng: ${l.lng}, price: ${l.price}`);
    });
  } catch (err) {
    console.warn('[1. Postgres DB] Lỗi truy vấn DB:', err.message);
  } finally {
    await prisma.$disconnect();
  }

  // 2. Kiểm tra custom-listings.json
  const customJsonPath = path.join(__dirname, '..', 'apps', 'web', 'data', 'custom-listings.json');
  let customListings = [];
  if (fs.existsSync(customJsonPath)) {
    try {
      customListings = JSON.parse(fs.readFileSync(customJsonPath, 'utf-8'));
      console.log(`\n[2. File custom-listings.json] Số lượng tin: ${customListings.length}`);
      customListings.forEach((c) => {
        console.log(`   - ID: ${c.id}, status: ${c.status}, slug: ${c.slug}, lat: ${c.lat}, lng: ${c.lng}, price: ${c.price}`);
      });
    } catch (err) {
      console.warn('[2. File custom-listings.json] Lỗi đọc JSON:', err.message);
    }
  } else {
    console.log('\n[2. File custom-listings.json] Không tồn tại');
  }

  // 3. Kiểm tra nhaminhbach-reviews-899.json
  const reviewsPath = path.join(__dirname, '..', 'apps', 'web', 'data', 'nhaminhbach-reviews-899.json');
  let reviewsCount = 0;
  let reviewsWithCoords = 0;
  if (fs.existsSync(reviewsPath)) {
    try {
      const revs = JSON.parse(fs.readFileSync(reviewsPath, 'utf-8'));
      reviewsCount = revs.length;
      reviewsWithCoords = revs.filter((r) => r.extracted_data && r.extracted_data.lat && r.extracted_data.lng).length;
      console.log(`\n[3. Reviews 899] Tổng số: ${reviewsCount}, Có tọa độ: ${reviewsWithCoords}`);
    } catch (err) {
      console.warn('[3. Reviews 899] Lỗi:', err.message);
    }
  }

  // 4. Kiểm định toạ độ Việt Nam hợp lệ
  console.log('\n[4. Kiểm định toạ độ]');
  const allItems = [...dbListings, ...customListings];
  allItems.forEach((it) => {
    const lat = Number(it.lat);
    const lng = Number(it.lng);
    const validLat = lat >= 8.5 && lat <= 23.5;
    const validLng = lng >= 102.0 && lng <= 109.5;
    if (!validLat || !validLng) {
      console.warn(`   ⚠️ Toạ độ bất thường: id=${it.id}, lat=${lat}, lng=${lng}`);
    } else {
      console.log(`   ✓ Toạ độ hợp lệ: id=${it.id}, lat=${lat}, lng=${lng}`);
    }
  });

  console.log('\n=== HOÀN TẤT KIỂM TRA BẤT BIẾN HIỆN TRẠNG ===');
}

main().catch(console.error);
