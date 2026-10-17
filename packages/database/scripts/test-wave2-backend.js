/**
 * TEST BEHAVIORAL: SEC-003, SEC-004, SEC-006
 * Kiểm tra các rào chắn an ninh API backend: verify chữ ký JWT bản đồ, trust proxy, Helmet
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

console.log('\n================================================================');
console.log('🧪 TEST ĐỎ: SEC-003 / SEC-004 / SEC-006 BACKEND API SECURITY');
console.log('================================================================\n');

// 1. SEC-003: listings.controller.ts không được dùng jwtService.decode
const listingsCtrlPath = path.join(repoRoot, 'apps/api/src/modules/listings/listings.controller.ts');
const listingsCtrlContent = fs.readFileSync(listingsCtrlPath, 'utf8');

assert(
  !listingsCtrlContent.includes('this.jwtService.decode('),
  '[FAIL SEC-003] listings.controller.ts vẫn dùng jwtService.decode thay vì verify!',
);

// 2. SEC-004 & SEC-006: main.ts phải có trust proxy và helmet
const mainPath = path.join(repoRoot, 'apps/api/src/main.ts');
const mainContent = fs.readFileSync(mainPath, 'utf8');

assert(
  mainContent.includes('trust proxy'),
  '[FAIL SEC-004] main.ts chưa cấu hình trust proxy!',
);
assert(
  mainContent.includes('helmet(') || mainContent.includes('app.use(helmet'),
  '[FAIL SEC-006] main.ts chưa tích hợp middleware helmet!',
);

console.log('✅ TẤT CẢ CÁC BÀI TEST BẢO MẬT BACKEND WAVE 2 ĐÃ ĐẠT!');
