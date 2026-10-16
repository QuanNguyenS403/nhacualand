const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const apiPort = process.env.INTERNAL_API_PORT || '4000';
const publicPort = process.env.PORT || '10000';

console.log('=============================================================');
console.log('🚀 KHỞI ĐỘNG HỆ THỐNG GỘP (UNIFIED WEB + API) TRÊN RENDER');
console.log(`🌐 Cổng công khai bên ngoài (Render Web):  ${publicPort}`);
console.log(`⚙️  Cổng API nội bộ (NestJS Backend):     ${apiPort}`);
console.log('=============================================================\n');

// 1. Khởi động Backend API (NestJS)
console.log('[1/2] Đang khởi động Backend API (NestJS)...');
const apiProcess = spawn('node', ['apps/api/dist/main.js'], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: String(apiPort),
    API_PORT: String(apiPort),
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
});

apiProcess.on('error', (err) => {
  console.error('❌ Lỗi khởi động Backend API:', err);
});

apiProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`⚠️ Backend API đã thoát với mã: ${code}`);
  }
});

// 2. Chờ 2 giây để Backend API sẵn sàng rồi khởi động Frontend Web (Next.js)
setTimeout(() => {
  console.log('[2/2] Đang khởi động Frontend Web (Next.js)...');
  const webProcess = spawn('pnpm', ['--filter', '@batdongsan/web', 'start'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PORT: String(publicPort),
      NODE_ENV: 'production',
      INTERNAL_API_URL: `http://127.0.0.1:${apiPort}`,
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
    },
    stdio: 'inherit',
    shell: true,
  });

  webProcess.on('error', (err) => {
    console.error('❌ Lỗi khởi động Frontend Web:', err);
  });

  webProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`⚠️ Frontend Web đã thoát với mã: ${code}`);
    }
  });

  const handleTermination = (signal) => {
    console.log(`\nNhận tín hiệu ${signal}, đang đóng các tiến trình con...`);
    try { apiProcess.kill('SIGTERM'); } catch {}
    try { webProcess.kill('SIGTERM'); } catch {}
    process.exit(0);
  };

  process.on('SIGTERM', () => handleTermination('SIGTERM'));
  process.on('SIGINT', () => handleTermination('SIGINT'));
}, 2500);
