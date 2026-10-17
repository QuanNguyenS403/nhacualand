/**
 * Script kiểm tra kết nối và trạng thái Database Supabase: node scripts/kiem-tra-supabase.js
 */

const fs = require('fs');
const path = require('path');

// Đọc .env ở gốc repo
try {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    }
  });
} catch (err) {
  console.error('❌ Không tìm thấy file .env ở thư mục gốc');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL || '';
const directUrl = process.env.DIRECT_URL || '';

console.log('====================================================');
console.log('   KIỂM TRA CẤU HÌNH VÀ KẾT NỐI DATABASE SUPABASE   ');
console.log('====================================================');

const isSupabase = dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com');

if (isSupabase) {
  console.log('✅ DATABASE_URL: Đang trỏ tới Supabase Cloud');
  const maskedDbUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`   URL: ${maskedDbUrl}`);
} else {
  console.log('ℹ️  DATABASE_URL: Đang trỏ tới Localhost / môi trường nội bộ');
  console.log(`   URL: ${dbUrl}`);
}

if (directUrl) {
  const maskedDirectUrl = directUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`✅ DIRECT_URL: Đã cấu hình (${maskedDirectUrl})`);
} else {
  console.log('⚠️  DIRECT_URL: Chưa cấu hình (khuyên dùng cho Supabase khi chạy migrate)');
}

console.log('\nĐang thử nghiệm kết nối vào Database...');

let PrismaClient;
try {
  PrismaClient = require('@prisma/client').PrismaClient;
} catch {
  try {
    PrismaClient = require(path.resolve(__dirname, '../packages/database/node_modules/@prisma/client')).PrismaClient;
  } catch (e) {
    console.error('❌ Không nạp được @prisma/client. Hãy chạy `pnpm db:generate` trước');
    process.exit(1);
  }
}

const prisma = new PrismaClient();

async function runCheck() {
  try {
    // Thử truy vấn cơ bản
    const result = await prisma.$queryRaw`SELECT version(), current_database() as db_name, now() as current_time`;
    console.log('✅ Kết nối Database THÀNH CÔNG');
    if (Array.isArray(result) && result[0]) {
      console.log(`   Phiên bản PostgreSQL: ${result[0].version?.split(' on ')[0] || result[0].version}`);
      console.log(`   Tên Database: ${result[0].db_name}`);
      console.log(`   Thời gian máy chủ: ${result[0].current_time}`);
    }

    // Kiểm tra các bảng đã migrate chưa
    try {
      const userCount = await prisma.user.count();
      const listingCount = await prisma.listing.count();
      console.log('\n✅ Bảng dữ liệu đã sẵn sàng:');
      console.log(`   - Số lượng người dùng (Users): ${userCount}`);
      console.log(`   - Số lượng tin đăng (Listings): ${listingCount}`);
    } catch (tblErr) {
      console.log('\n⚠️  Các bảng dữ liệu chưa được khởi tạo trên Database này');
      console.log('👉 Hãy chạy lệnh sau để tự động tạo toàn bộ bảng và cấu trúc schema:');
      console.log('   pnpm --filter @batdongsan/database migrate:deploy');
      console.log('👉 Sau đó khởi tạo SuperAdmin đầu tiên bằng lệnh:');
      console.log('   pnpm --filter @batdongsan/database bootstrap:admin');
    }
  } catch (err) {
    console.error('\n❌ KẾT NỐI THẤT BẠI:');
    console.error(`   ${err.message}`);
    console.log('\n💡 Hướng dẫn kiểm tra nếu dùng Supabase:');
    console.log('1. Đảm bảo mật khẩu trong DATABASE_URL là chính xác (không chứa ký tự lạ chưa URL-encode)');
    console.log('2. Supabase Transaction Pooler dùng cổng 6543 kèm tham số `?pgbouncer=true`');
    console.log('3. Supabase Direct Connection dùng cổng 5432');
    console.log('4. Kiểm tra mạng hoặc tường lửa cho phép kết nối cổng 5432 và 6543');
  } finally {
    await prisma.$disconnect();
    console.log('====================================================\n');
  }
}

runCheck();
