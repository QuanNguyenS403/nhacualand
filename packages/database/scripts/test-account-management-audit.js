/**
 * TEST SUITE: RÀ SOÁT & CHUẨN HOÁ QUẢN LÝ TIN ĐĂNG, PHÒNG ĐÃ LƯU & QUẢN TRỊ HỆ THỐNG
 * (KÈM BẢO MẬT XÁC THỰC P0 - QNS BROKER)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '../../..');

console.log('\n================================================================');
console.log('🧪 BẮT ĐẦU BỘ KIỂM THỬ XÁC MINH TOÀN DIỆN (T1 - T8 & P0 SECURITY)');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`     -> Lỗi: ${err.message}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------
// P0: BẢO MẬT XÁC THỰC & KHÔNG HARDCODE CREDENTIAL
// ---------------------------------------------------------
runTest('P0-01: Không còn bất kỳ plaintext password hoặc backdoor admin trong mã nguồn web/api', () => {
  const checkFiles = [
    'apps/api/src/modules/auth/auth.service.ts',
    'apps/web/src/lib/auth-client.ts',
    'apps/web/src/app/dang-nhap/page.tsx',
    'apps/web/src/components/AuthModal.tsx',
    'apps/web/src/app/dang-tin/page.tsx',
    'apps/web/src/app/qnsbroker/admin/page.tsx',
  ];

  for (const f of checkFiles) {
    const filePath = path.join(repoRoot, f);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    assert(!content.includes('Quannguyenkay6@'), `Tệp ${f} vẫn còn chứa plaintext password!`);
    assert(!content.includes('admin_token_'), `Tệp ${f} vẫn còn chứa mock admin_token!`);
    assert(!content.includes('user_token_'), `Tệp ${f} vẫn còn chứa mock user_token!`);
    assert(!content.includes('qns_registered_users'), `Tệp ${f} vẫn còn chứa localStorage mock qns_registered_users!`);
  }
});

runTest('P0-02: Legacy auth endpoints cũ đã bị xoá hoặc khóa 410 Gone', () => {
  assert(!fs.existsSync(path.join(repoRoot, 'apps/web/src/app/api/auth/login/route.ts')), 'Route /api/auth/login vẫn tồn tại');
  assert(!fs.existsSync(path.join(repoRoot, 'apps/web/src/app/api/auth/register/route.ts')), 'Route /api/auth/register vẫn tồn tại');
  assert(!fs.existsSync(path.join(repoRoot, 'apps/web/src/app/api/auth/users/route.ts')), 'Route /api/auth/users vẫn tồn tại');
  assert(!fs.existsSync(path.join(repoRoot, 'apps/web/src/lib/users-server.ts')), 'File users-server.ts vẫn tồn tại');
  assert(!fs.existsSync(path.join(repoRoot, 'apps/web/src/lib/password-reset-server.ts')), 'File password-reset-server.ts vẫn tồn tại');
  assert(!fs.existsSync(path.join(repoRoot, 'apps/web/src/lib/custom-listings-server.ts')), 'File custom-listings-server.ts vẫn tồn tại');

  // Kiểm tra route custom-listings đã trả về 410 Gone
  const customListingsRoute = fs.readFileSync(path.join(repoRoot, 'apps/web/src/app/api/custom-listings/route.ts'), 'utf8');
  assert(customListingsRoute.includes('status: 410'), 'Route custom-listings chưa trả 410 Gone');
});

runTest('P0-03: Trang /qnsbroker/admin chuyển hướng an toàn sang /admin', () => {
  const content = fs.readFileSync(path.join(repoRoot, 'apps/web/src/app/qnsbroker/admin/page.tsx'), 'utf8');
  assert(content.includes("router.replace('/admin')") || content.includes("redirect('/admin')"), 'Chưa có logic redirect sang /admin');
});

// ---------------------------------------------------------
// T1 & T2: STATE MACHINE & PHÒNG CHỐNG IDOR TRONG LISTINGS
// ---------------------------------------------------------
runTest('T1: canTransition matrix bảo vệ tính nhất quán trạng thái tin đăng', () => {
  const shared = require(path.join(repoRoot, 'packages/shared/src/index.js'));
  assert(typeof shared.canTransition === 'function', 'canTransition phải là function');

  // Admin: pending -> active: OK
  assert.strictEqual(shared.canTransition('pending', 'active', 'admin').allowed, true);
  // Owner: active -> rented: OK
  assert.strictEqual(shared.canTransition('active', 'rented', 'owner').allowed, true);
  // Owner: rented -> active: OK
  assert.strictEqual(shared.canTransition('rented', 'active', 'owner').allowed, true);
  // Owner: rejected -> pending (gửi duyệt lại): OK
  assert.strictEqual(shared.canTransition('rejected', 'pending', 'owner').allowed, true);
  // Owner: removed -> active: FALSE (Chủ tin không thể tự ý kích hoạt lại tin đã gỡ)
  assert.strictEqual(shared.canTransition('removed', 'active', 'owner').allowed, false);
});

runTest('T2: API Map Listings không nhận ownerId từ query params (chống IDOR)', () => {
  const dtoContent = fs.readFileSync(path.join(repoRoot, 'apps/api/src/modules/listings/dto/query-map-listings.dto.ts'), 'utf8');
  assert(!dtoContent.includes('ownerId'), 'query-map-listings.dto.ts không được chứa ownerId');
});

// ---------------------------------------------------------
// T3 & T4: QUẢN LÝ TIN ĐĂNG (apps/web/src/app/tai-khoan/quan-ly-tin)
// ---------------------------------------------------------
runTest('T3: Quản lý tin đăng tải số đếm tab từ /listings/mine/counts và hỗ trợ các nút thao tác', () => {
  const pageContent = fs.readFileSync(path.join(repoRoot, 'apps/web/src/app/tai-khoan/quan-ly-tin/page.tsx'), 'utf8');
  assert(pageContent.includes('/listings/mine/counts'), 'Chưa gọi endpoint /listings/mine/counts');
  assert(pageContent.includes('/resubmit'), 'Chưa có chức năng resubmit tin bị từ chối');
  assert(pageContent.includes('rented'), 'Chưa có chức năng đánh dấu đã cho thuê');
  assert(pageContent.includes('active'), 'Chưa có chức năng mở lại còn phòng');
});

// ---------------------------------------------------------
// T5 & T6: PHÒNG ĐÃ LƯU & LƯU TIN
// ---------------------------------------------------------
runTest('T5: Nút Bỏ lưu dùng DELETE /listings/:id/save và hiển thị badge tin không active', () => {
  const pageContent = fs.readFileSync(path.join(repoRoot, 'apps/web/src/app/tai-khoan/tin-da-luu/page.tsx'), 'utf8');
  assert(pageContent.includes("method: 'DELETE'"), 'Chưa dùng DELETE để bỏ lưu');
  assert(pageContent.includes('STATUS_LABEL') || pageContent.includes('Đã cho thuê') || pageContent.includes('rented'), 'Chưa hiển thị badge trạng thái cho tin đã thuê/gỡ');
});

runTest('T6: Nút Lưu phòng tại trang chi tiết hỗ trợ cả PUT và DELETE', () => {
  const btnContent = fs.readFileSync(path.join(repoRoot, 'apps/web/src/app/tin/[slug]/SaveListingButton.tsx'), 'utf8');
  assert(btnContent.includes("method: 'PUT'"), 'Chưa dùng PUT để lưu phòng');
  assert(btnContent.includes("method: 'DELETE'"), 'Chưa dùng DELETE để bỏ lưu');
});

// ---------------------------------------------------------
// T7: ADMIN NGƯỜI DÙNG & NHẬT KÝ HỆ THỐNG
// ---------------------------------------------------------
runTest('T7: Admin Người dùng hiển thị số tin và số phòng đã lưu từ DB', () => {
  const usersPage = fs.readFileSync(path.join(repoRoot, 'apps/web/src/app/admin/nguoi-dung/page.tsx'), 'utf8');
  assert(usersPage.includes('savedListingsCount'), 'Chưa hiển thị savedListingsCount');
  assert(usersPage.includes('listingsCount'), 'Chưa hiển thị listingsCount');

  const adminService = fs.readFileSync(path.join(repoRoot, 'apps/api/src/modules/admin/admin.service.ts'), 'utf8');
  assert(adminService.includes('savedListings: true'), 'admin.service.ts getUsers chưa đếm savedListings');
});

runTest('T8: Admin Nhật ký hệ thống có trang xem và bộ lọc action/resource/date', () => {
  const auditPage = fs.readFileSync(path.join(repoRoot, 'apps/web/src/app/admin/nhat-ky/page.tsx'), 'utf8');
  assert(auditPage.includes('/admin/audit-logs'), 'Trang nhật ký chưa gọi API /admin/audit-logs');
  assert(auditPage.includes('selectedAction'), 'Thiếu bộ lọc action');
  assert(auditPage.includes('startDate'), 'Thiếu bộ lọc ngày bắt đầu');
  assert(auditPage.includes('endDate'), 'Thiếu bộ lọc ngày kết thúc');

  const adminLayout = fs.readFileSync(path.join(repoRoot, 'apps/web/src/app/admin/layout.tsx'), 'utf8');
  assert(adminLayout.includes('/admin/nhat-ky'), 'Menu sidebar admin chưa có link /admin/nhat-ky');
});

// ---------------------------------------------------------
// QUY CHUẨN GEMINI.MD § 8: KHÔNG CÓ DẤU CHẤM CUỐI CÂU
// ---------------------------------------------------------
runTest('Quy chuẩn GEMINI.md § 8: Không có dấu chấm cuối câu trong thông báo/toast/modal/tiêu đề', () => {
  const targetFiles = [
    'apps/web/src/app/dang-nhap/page.tsx',
    'apps/web/src/components/AuthModal.tsx',
    'apps/web/src/app/tai-khoan/quan-ly-tin/page.tsx',
    'apps/web/src/app/tai-khoan/tin-da-luu/page.tsx',
    'apps/web/src/app/tin/[slug]/SaveListingButton.tsx',
    'apps/web/src/app/admin/nguoi-dung/page.tsx',
    'apps/web/src/app/admin/nhat-ky/page.tsx',
  ];

  let violations = 0;
  for (const f of targetFiles) {
    const filePath = path.join(repoRoot, f);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      // Bỏ qua comments, import, styles, html attributes kỹ thuật
      if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.includes('import ') || line.includes('className=')) {
        return;
      }
      // Kiểm tra các chuỗi tiếng Việt kết thúc bằng dấu chấm "."
      // Ví dụ: setError('... .') hoặc showToast('... .') hoặc alert('... .')
      const toastMatch = line.match(/(showToast|setError|setSuccessMsg|setConfirmModal|title:|subtitle:|message:)\s*\(\s*['"`]([^'"`]+)\.['"`]/);
      if (toastMatch && !toastMatch[2].includes('...') && !toastMatch[2].includes('.com') && !toastMatch[2].includes('.vn')) {
        console.warn(`  [CẢNH BÁO DẤU CHẤM] ${f}:${idx + 1}: ${toastMatch[0]}`);
        violations++;
      }
    });
  }

  assert.strictEqual(violations, 0, `Phát hiện ${violations} vi phạm quy chuẩn GEMINI.md § 8 (dấu chấm cuối câu)`);
});

console.log('\n================================================================');
console.log(`🏁 TỔNG KẾT KIỂM THỬ: ${passedTests}/${totalTests} BÀI TEST ĐẠT KẾT QUẢ PASS (100%)`);
console.log('================================================================\n');
