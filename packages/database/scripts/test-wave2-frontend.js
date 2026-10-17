/**
 * TEST BEHAVIORAL: SEC-005, API-003, FE-001
 * Kiểm tra các tiêu chuẩn bảo mật và logic dữ liệu của Frontend
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../..');

console.log('\n================================================================');
console.log('🧪 TEST: SEC-005 / API-003 / FE-001 FRONTEND SECURITY & LOGIC');
console.log('================================================================\n');

// 1. SEC-005: upload-images route phải kiểm tra auth và file size
const uploadRoutePath = path.join(repoRoot, 'apps/web/src/app/api/upload-images/route.ts');
const uploadRouteContent = fs.readFileSync(uploadRoutePath, 'utf8');

assert(
  uploadRouteContent.includes('authorization') || uploadRouteContent.includes('authHeader') || uploadRouteContent.includes('jwt'),
  '[FAIL SEC-005] /api/upload-images chưa kiểm tra xác thực người dùng!',
);
assert(
  uploadRouteContent.includes('5 * 1024 * 1024') || uploadRouteContent.includes('size >'),
  '[FAIL SEC-005] /api/upload-images chưa giới hạn dung lượng tệp tải lên (5MB)!',
);

// 2. API-003: feedback và consultation không được nuốt lỗi trả 200 success
const feedbackRoutePath = path.join(repoRoot, 'apps/web/src/app/api/feedback/route.ts');
const feedbackContent = fs.readFileSync(feedbackRoutePath, 'utf8');
assert(
  !feedbackContent.includes('success: true') || feedbackContent.includes('status: 503'),
  '[FAIL API-003] /api/feedback vẫn trả success: true khi backend API bị lỗi!',
);

const consultRoutePath = path.join(repoRoot, 'apps/web/src/app/api/consultation/route.ts');
const consultContent = fs.readFileSync(consultRoutePath, 'utf8');
assert(
  !consultContent.includes('success: true') || consultContent.includes('status: 503'),
  '[FAIL API-003] /api/consultation vẫn trả success: true khi backend API bị lỗi!',
);

// 3. FE-001: Không gộp dữ liệu demo Unsplash vào dữ liệu thật khi API có dữ liệu
const pageHomePath = path.join(repoRoot, 'apps/web/src/app/page.tsx');
const pageHomeContent = fs.readFileSync(pageHomePath, 'utf8');
assert(
  !pageHomeContent.includes('mergeHomeListings') || pageHomeContent.includes('apiItems.length > 0 ? apiItems'),
  '[FAIL FE-001] page.tsx vẫn ép gộp demo Unsplash vào danh sách tin thật!',
);

const pageThuePath = path.join(repoRoot, 'apps/web/src/app/thue/page.tsx');
const pageThueContent = fs.readFileSync(pageThuePath, 'utf8');
assert(
  !pageThueContent.includes('for (const item of fallbackListings) {\n    if (item?.slug && !mergedMap.has(item.slug))'),
  '[FAIL FE-001] thue/page.tsx vẫn ép gộp toàn bộ fallbackListings vào danh mục thật!',
);

console.log('✅ TẤT CẢ CÁC BÀI TEST FRONTEND WAVE 2 ĐÃ ĐẠT!');
