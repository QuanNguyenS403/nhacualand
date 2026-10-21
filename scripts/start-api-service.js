/**
 * Script khởi chạy Backend API NestJS cho PM2 Service
 * Tự động nạp cấu hình .env gốc monorepo và chạy API trên cổng 4000
 */
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

// 1. Nạp biến môi trường
loadEnvFile(path.resolve(rootDir, '.env.production'));
loadEnvFile(path.resolve(rootDir, '.env'));

process.env.NODE_ENV = 'production';
process.env.PORT = process.env.API_PORT || '4000';
process.env.API_PORT = process.env.PORT;

console.log('====================================================');
console.log('🚀 KHỞI ĐỘNG NHACUALAND BACKEND API QUA PM2');
console.log(`📡 Cổng dịch vụ API: ${process.env.PORT}`);
console.log(`🌐 Kết nối Cloudflare Tunnel: https://api.nhacualand.com`);
console.log('====================================================\n');

// 2. Chạy ứng dụng NestJS đã build
const apiEntry = path.resolve(rootDir, 'apps/api/dist/main.js');
if (!fs.existsSync(apiEntry)) {
  console.error(`❌ Không tìm thấy file dist tại: ${apiEntry}`);
  process.exit(1);
}

require(apiEntry);
