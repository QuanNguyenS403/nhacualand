const { execSync } = require('child_process');

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  console.log('⚠️ [Safe Prisma Generate] DATABASE_URL chưa có hoặc chưa bắt đầu bằng postgresql://, sử dụng connection string dự phòng để sinh Prisma Client...');
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/batdongsan';
}

try {
  execSync('npx prisma generate', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('✅ [Safe Prisma Generate] Sinh Prisma Client thành công');
} catch (error) {
  console.error('❌ [Safe Prisma Generate] Lỗi khi sinh Prisma Client:', error.message);
  process.exit(1);
}
