/**
 * Script di trú tài khoản người dùng cũ từ backup/legacy-data/users.json sang cơ sở dữ liệu PostgreSQL (Prisma).
 *
 * Tính năng:
 * - Hỗ trợ cờ --dry-run để chạy kiểm tra thử không ghi DB.
 * - Idempotent: chạy nhiều lần không tạo bản ghi trùng lặp, không ghi đè mật khẩu đã có.
 * - Bảo mật tuyệt đối: KHÔNG in mật khẩu dạng plaintext vào console/log.
 * - Tự động băm mật khẩu bằng bcryptjs (10 rounds).
 *
 * Chạy thử:
 *   pnpm --filter @batdongsan/database exec ts-node --transpile-only scripts/migrate-legacy-accounts.ts --dry-run
 * Chạy thật:
 *   pnpm --filter @batdongsan/database exec ts-node --transpile-only scripts/migrate-legacy-accounts.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const isDryRun = process.argv.includes('--dry-run');

interface LegacyUser {
  id?: string;
  email: string;
  password?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

async function main() {
  console.log('========================================================');
  console.log(`BẮT ĐẦU DI TRÚ TÀI KHOẢN (Chế độ: ${isDryRun ? 'DRY-RUN - Kiểm tra thử' : 'THỰC THI - Ghi DB'})`);
  console.log('========================================================');

  const backupPath = path.resolve(__dirname, '../../../backup/legacy-data/users.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`Không tìm thấy file sao lưu tại: ${backupPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(backupPath, 'utf8');
  let legacyUsers: LegacyUser[] = [];
  try {
    legacyUsers = JSON.parse(raw);
  } catch (err) {
    console.error('Không thể phân tích file JSON sao lưu:', err);
    process.exit(1);
  }

  console.log(`Đã nạp ${legacyUsers.length} tài khoản từ file sao lưu`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < legacyUsers.length; i++) {
    const legacy = legacyUsers[i];
    const email = (legacy.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      console.log(`[BỎ QUA] Email không hợp lệ: "${legacy.email}"`);
      skippedCount++;
      continue;
    }

    // Bỏ qua tài khoản test hacker nếu có trong backup
    if (email.includes('hacker') || email.includes('proof')) {
      console.log(`[BỎ QUA] Tài khoản kiểm thử bảo mật: ${email}`);
      skippedCount++;
      continue;
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    const targetRole = legacy.role === 'admin' ? UserRole.admin : UserRole.user;

    if (existing) {
      console.log(`[ĐÃ TỒN TẠI] ${email} (ID: ${existing.id.toString()}, Role: ${existing.role})`);
      if (!isDryRun) {
        if (legacy.role === 'admin' && existing.role !== UserRole.admin) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { role: UserRole.admin },
          });
          console.log(`  -> Đã cập nhật quyền admin cho ${email}`);
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
      continue;
    }

    // Tài khoản mới chưa tồn tại trong DB
    console.log(`[CẦN TẠO MỚI] ${email} - Vai trò: ${targetRole}`);

    if (!isDryRun) {
      let passwordHash: string | null = null;
      if (legacy.password && legacy.password.length >= 6) {
        passwordHash = await bcrypt.hash(legacy.password, 10);
      }

      // Xử lý số điện thoại: nếu trùng hoặc thiếu, sinh số duy nhất
      let phoneToUse = legacy.phone ? legacy.phone.trim() : '';
      if (phoneToUse) {
        const phoneExists = await prisma.user.findUnique({ where: { phone: phoneToUse } });
        if (phoneExists) {
          phoneToUse = `099${Date.now().toString().slice(-6)}${i % 10}`;
        }
      } else {
        phoneToUse = `099${Date.now().toString().slice(-6)}${i % 10}`;
      }

      const newUser = await prisma.user.create({
        data: {
          email,
          fullName: legacy.fullName || email.split('@')[0],
          phone: phoneToUse,
          role: targetRole,
          passwordHash,
          avatarUrl: legacy.avatarUrl || null,
          createdAt: legacy.createdAt ? new Date(legacy.createdAt) : new Date(),
        },
      });

      console.log(`  -> Đã tạo thành công người dùng mới ID: ${newUser.id.toString()}`);
      createdCount++;
    } else {
      createdCount++;
    }
  }

  console.log('========================================================');
  console.log('KẾT QUẢ DI TRÚ:');
  console.log(`- Tổng số tài khoản: ${legacyUsers.length}`);
  console.log(`- Tạo mới: ${createdCount} ${isDryRun ? '(dự kiến)' : ''}`);
  console.log(`- Cập nhật: ${updatedCount} ${isDryRun ? '(dự kiến)' : ''}`);
  console.log(`- Bỏ qua: ${skippedCount}`);
  console.log('========================================================');
}

main()
  .catch((e) => {
    console.error('Lỗi khi chạy di trú:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
