import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Tự động nạp .env gốc nếu chạy trực tiếp
try {
  const envPath = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
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
  }
} catch {}

const prisma = new PrismaClient();

async function bootstrapAdmin() {
  const secret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const phone = process.argv[2] || process.env.ADMIN_BOOTSTRAP_PHONE;
  const password = process.argv[3] || process.env.ADMIN_BOOTSTRAP_PASSWORD;
  const fullName = process.env.ADMIN_BOOTSTRAP_FULLNAME || 'Quản trị viên';

  if (!secret || secret.trim().length < 16) {
    console.error('❌ Lỗi: ADMIN_BOOTSTRAP_SECRET chưa được cấu hình hoặc ngắn hơn 16 ký tự');
    console.error('Vui lòng thiết lập ADMIN_BOOTSTRAP_SECRET trong file .env trước khi chạy');
    process.exit(1);
  }

  if (!phone || !/^0[35789][0-9]{8}$/.test(phone)) {
    console.error('❌ Lỗi: SĐT admin không hợp lệ (cần 10 chữ số định dạng VN: ^0[35789]...)');
    console.error(`Giá trị hiện tại: "${phone}"`);
    process.exit(1);
  }

  if (!password || password.length < 8) {
    console.error('❌ Lỗi: Mật khẩu admin chưa được cung cấp hoặc ngắn hơn 8 ký tự');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { phone } });

  let adminUser;
  if (!existing) {
    adminUser = await prisma.user.create({
      data: {
        phone,
        fullName,
        passwordHash,
        role: 'admin',
        isPhoneVerified: true,
      },
    });
    console.log(`✅ Đã tạo mới tài khoản quản trị viên: ${adminUser.phone} (${adminUser.fullName})`);
  } else {
    adminUser = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: 'admin',
        passwordHash,
        fullName: fullName || existing.fullName,
      },
    });
    console.log(`✅ Đã nâng quyền và cập nhật mật khẩu cho quản trị viên: ${adminUser.phone} (${adminUser.fullName})`);
  }

  console.log('----------------------------------------------------');
  console.log('🎉 KHỞI TẠO TÀI KHOẢN ADMIN THÀNH CÔNG');
  console.log(`📱 Số điện thoại: ${phone}`);
  console.log(`🔑 Mật khẩu: ${password}`);
  console.log('🌐 Đường dẫn đăng nhập: http://localhost:3000/dang-nhap');
  console.log('⚡ Trang quản trị Admin: http://localhost:3000/admin');
  console.log('----------------------------------------------------');
}

bootstrapAdmin()
  .catch((err) => {
    console.error('❌ Lỗi bootstrap admin:', err.message || err);
    if (err.message && err.message.includes('Can\'t reach database server')) {
      console.error('👉 Gợi ý: Hãy mở Docker Desktop và chạy lệnh: docker compose up -d');
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

