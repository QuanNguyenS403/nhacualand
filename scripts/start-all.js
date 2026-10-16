const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const apiPort = process.env.INTERNAL_API_PORT || '4000';
const publicPort = process.env.PORT || '10000';

console.log('=============================================================');
console.log('🚀 KHỞI ĐỘNG HỆ THỐNG GỘP (UNIFIED WEB + API) TRÊN RENDER');
console.log(`🌐 Cổng công khai bên ngoài (Render Web):  ${publicPort}`);
console.log(`⚙️  Cổng API nội bộ (NestJS Backend):     ${apiPort}`);
console.log('=============================================================\n');

// Kiểm tra artifact của Backend API
const apiEntry = path.resolve(rootDir, 'apps/api/dist/main.js');
if (!fs.existsSync(apiEntry)) {
  console.error(`❌ Không tìm thấy file chạy của Backend API tại: ${apiEntry}`);
  console.error('Vui lòng chạy "pnpm build" trước khi start');
  process.exit(1);
}

// 1. Khởi động Backend API (NestJS) qua process.execPath (Node interpreter hiện tại)
console.log('[1/2] Đang khởi động Backend API (NestJS)...');
const apiProcess = spawn(process.execPath, [apiEntry], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: String(apiPort),
    API_PORT: String(apiPort),
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
});

let isShuttingDown = false;
let webProcess = null;

function shutdownAll(exitCode = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\nĐang dừng các dịch vụ...');
  try {
    if (apiProcess && !apiProcess.killed) apiProcess.kill('SIGTERM');
  } catch {}
  try {
    if (webProcess && !webProcess.killed) webProcess.kill('SIGTERM');
  } catch {}
  setTimeout(() => process.exit(exitCode), 500);
}

apiProcess.on('error', (err) => {
  console.error('❌ Lỗi khởi động tiến trình Backend API:', err);
  shutdownAll(1);
});

apiProcess.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Backend API đã dừng với mã lỗi: ${code}`);
    shutdownAll(code);
  }
});

// 2. Chờ Backend API khởi động rồi chạy Frontend Web (Next.js)
setTimeout(() => {
  console.log('[2/2] Đang khởi động Frontend Web (Next.js)...');

  let nextBin = '';
  try {
    nextBin = require.resolve('next/dist/bin/next', {
      paths: [path.resolve(rootDir, 'apps/web'), rootDir],
    });
  } catch (e) {
    console.warn('⚠️ Không tìm thấy next qua require.resolve, thử tìm binary cục bộ...');
    const localNext = path.resolve(rootDir, 'node_modules/next/dist/bin/next');
    if (fs.existsSync(localNext)) {
      nextBin = localNext;
    }
  }

  const webCwd = path.resolve(rootDir, 'apps/web');

  if (nextBin) {
    webProcess = spawn(
      process.execPath,
      [nextBin, 'start', '-p', String(publicPort)],
      {
        cwd: webCwd,
        env: {
          ...process.env,
          PORT: String(publicPort),
          NODE_ENV: 'production',
          INTERNAL_API_URL: `http://127.0.0.1:${apiPort}`,
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
        },
        stdio: 'inherit',
      }
    );
  } else {
    // Fallback nếu không xác định được file next
    webProcess = spawn('npx', ['next', 'start', '-p', String(publicPort)], {
      cwd: webCwd,
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
  }

  webProcess.on('error', (err) => {
    console.error('❌ Lỗi khởi động Frontend Web:', err);
    shutdownAll(1);
  });

  webProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Frontend Web đã dừng với mã lỗi: ${code}`);
      shutdownAll(code);
    }
  });
}, 2500);

process.on('SIGTERM', () => shutdownAll(0));
process.on('SIGINT', () => shutdownAll(0));
