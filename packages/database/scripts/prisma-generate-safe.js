const { execSync } = require('child_process');

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
  console.log('⚠️ [Safe Prisma Generate] DATABASE_URL chưa có hoặc chưa bắt đầu bằng postgresql://, sử dụng connection string dự phòng để sinh Prisma Client...');
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/batdongsan';
}

let directUrl = process.env.DIRECT_URL;
if (!directUrl || (!directUrl.startsWith('postgresql://') && !directUrl.startsWith('postgres://'))) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const path = require('path');
const fs = require('fs');

try {
  let prismaBin;
  try {
    prismaBin = require.resolve('prisma/build/index.js');
  } catch {
    const localBin = path.resolve(__dirname, '../node_modules/.bin/prisma');
    if (fs.existsSync(localBin)) {
      prismaBin = localBin;
    }
  }

  if (prismaBin && prismaBin.endsWith('.js')) {
    execSync(`"${process.execPath}" "${prismaBin}" generate`, {
      stdio: 'inherit',
      env: process.env,
    });
  } else {
    execSync('prisma generate', {
      stdio: 'inherit',
      env: process.env,
    });
  }
  console.log('✅ [Safe Prisma Generate] Sinh Prisma Client thành công');
} catch (error) {
  console.error('❌ [Safe Prisma Generate] Lỗi khi sinh Prisma Client:', error.message);
  process.exit(1);
}
