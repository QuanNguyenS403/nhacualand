# BÁO CÁO AUDIT & CHUẨN HOÁ HỆ THỐNG
# "QUẢN LÝ TIN ĐĂNG", "PHÒNG ĐÃ LƯU" & "QUẢN TRỊ HỆ THỐNG" (KÈM BẢO MẬT P0)
**Dự án:** QNS BROKER (`batdongsan`)  
**Ngày thực hiện:** 14/10/2026  
**Thực hiện bởi:** AI Agent (Gemini 3.7 Flash) theo quy chuẩn `GEMINI.md`  

---

## 1. TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Đợt rà soát và chuẩn hoá này tập trung xử lý dứt điểm các vấn đề bảo mật xác thực mức độ P0, đồng thời hoàn thiện ba trang nghiệp vụ trọng tâm: **"Quản lý tin đăng"** (`/tai-khoan/quan-ly-tin`), **"Phòng đã lưu"** (`/tai-khoan/tin-da-luu`) và **"Quản trị hệ thống"** (`/admin/*`) trên nền tảng nguồn sự thật duy nhất (Single Source of Truth) là cơ sở dữ liệu PostgreSQL qua NestJS API, triệt tiêu hoàn toàn các cơ chế lưu trữ giả lập `localStorage` và mock token.

### Các kết quả đạt được cốt lõi:
1. **Triệt tiêu hoàn toàn lỗ hổng bảo mật P0:**
   - Xóa bỏ 100% tài khoản hardcode và mật khẩu quản trị viên dạng plaintext khỏi toàn bộ mã nguồn frontend và backend.
   - Xóa bỏ cơ chế bypass token giả (`admin_token_*`, `user_token_*`, `g_token_*`).
   - Xóa sạch 4 mục legacy cũ trong `apps/web` (`/api/auth/*`, `users-server.ts`, `password-reset-server.ts`, `custom-listings-server.ts`) và khóa mã trạng thái `410 Gone` đối với `/api/custom-listings/*`.
   - Chuyển hướng tự động trang quản trị cũ `/qnsbroker/admin` sang `/admin`.
2. **Khắc phục lỗi kiến trúc Backend & Phòng chống IDOR:**
   - Sửa lỗi đệ quy vô hạn (Call Stack Size Exceeded) trong `BigIntInterceptor` bằng `WeakSet` và `isPlainObject`.
   - Sửa lỗi rò rỉ toạ độ tin đăng chờ duyệt (IDOR) trong API Map: Xóa trường `ownerId` khỏi DTO công khai, áp dụng trích xuất danh tính an toàn từ Header `Authorization: Bearer <token>`.
   - Bổ sung bảng chuyển trạng thái chuẩn (`canTransition`) vào `@qns/shared` để kiểm soát chặt chẽ vòng đời tin đăng.
   - Thêm các endpoint API chuyên dụng: `GET /listings/mine/counts`, `GET /listings/saved/ids`, `PUT /listings/:id/save`, `DELETE /listings/:id/save`, `POST /listings/:id/resubmit`, `GET /admin/audit-logs`.
3. **Chuẩn hoá trải nghiệm người dùng & Giao diện quản trị:**
   - Trang "Quản lý tin đăng": Hiển thị số lượng trực tiếp từ CSDL theo từng tab; hỗ trợ đầy đủ các thao tác xem trước tin chờ duyệt, gỡ tin, đánh dấu đã cho thuê, mở lại còn phòng, gửi duyệt lại tin bị từ chối; sử dụng modal xác nhận và thông báo nội bộ, xóa bỏ hoàn toàn `alert()` và `confirm()` thô.
   - Trang "Phòng đã lưu": Sử dụng phương thức `DELETE /listings/:id/save` chuẩn RESTful, hiển thị badge phân biệt tin đã cho thuê/gỡ/hết hạn, cho phép bỏ lưu để dọn dẹp danh sách.
   - Trang "Chi tiết tin đăng": Nút Lưu tin hỗ trợ phương thức `PUT` và `DELETE` chuẩn xác, phản hồi tức thì với tooltip thông báo không dấu chấm cuối câu.
   - Trang "Quản trị người dùng": Hiển thị đồng thời số lượng tin đăng (`listingsCount`) và số lượng phòng đã lưu (`savedListingsCount`) lấy từ CSDL.
   - Trang "Nhật ký hệ thống" (`/admin/nhat-ky`): Bảng theo dõi kiểm toán hoàn chỉnh kết nối `GET /admin/audit-logs`, hỗ trợ bộ lọc hành động, đối tượng và khoảng thời gian.
4. **Kiểm thử nghiệm thu:**
   - `tsc --noEmit` trên cả `apps/api` và `apps/web` đạt 0 lỗi (Exit Code 0).
   - Bộ kiểm thử tự động `test-account-management-audit.js`: 11/11 bài test PASS (100%).
   - Kiểm thử bảo mật dữ liệu bản đồ & review `test-map-reviews.js`: 4/4 PASS (100%).
   - Tuân thủ quy chuẩn `GEMINI.md § 8`: 100% không có dấu chấm ở cuối câu trên giao diện người dùng nhìn thấy.

---

## 2. HIỆN TRẠNG PHÁT HIỆN TRƯỚC KHI XỬ LÝ

| Thành phần | Hiện trạng phát hiện | Mức độ rủi ro |
| :--- | :--- | :--- |
| `apps/web/src/app/dang-nhap/page.tsx` | Nhánh đăng nhập kiểm tra mật khẩu plaintext hardcode; lưu mật khẩu vào `localStorage.qns_registered_users`; cấp token giả lập `admin_token_*` và `user_token_*` khi backend offline | **P0 (Critical)** |
| `apps/web/src/components/AuthModal.tsx` | Chứa đoạn mã kiểm tra mật khẩu plaintext tương tự như trang đăng nhập; lưu mật khẩu vào `localStorage` | **P0 (Critical)** |
| `apps/web/src/app/dang-tin/page.tsx` | Hàm `handleGoogleLoginSuccess` tự động gán tài khoản admin kèm mật khẩu plaintext vào `localStorage` | **P0 (Critical)** |
| `apps/web/src/app/qnsbroker/admin/page.tsx` | Trang quản trị song song với cổng `/admin`, ghi nhận thông tin đăng nhập admin kèm mật khẩu plaintext ngay trong comment và code logic | **P0 (Critical)** |
| `apps/web/src/components/Header.tsx` | Bỏ qua xác thực `/auth/me` đối với token bắt đầu bằng `admin_token_`, `user_token_`, `g_token_` để duy trì phiên giả lập | **P1 (High)** |
| `apps/api/.../bigint.interceptor.ts` | Duyệt đệ quy sâu trên mọi object trả về không có cơ chế chặn vòng lặp (circular reference) và các đối tượng phức tạp của NestJS/Express, gây tràn stack call | **P1 (High)** |
| `apps/api/.../query-map-listings.dto.ts` | Nhận tham số `ownerId` từ query string cho phép bất kỳ ai xem vị trí GPS của các tin đăng đang ở trạng thái pending của người khác | **P1 (High)** |
| `apps/web/src/app/api/auth/*` | Các API route nội bộ cũ của Next.js chạy song song với NestJS API, lưu trữ tạm bợ | **P2 (Medium)** |
| `apps/web/.../quan-ly-tin/page.tsx` | Số đếm tab tính thủ công từ mảng client; sử dụng lệnh `confirm()` và `alert()` trình duyệt; thiếu nút gửi duyệt lại | **P2 (Medium)** |
| `apps/web/.../tin-da-luu/page.tsx` | Bỏ lưu bằng `POST /save` kiểu toggle; sử dụng `alert()`; tin không còn hiển thị không có badge cảnh báo | **P2 (Medium)** |

---

## 3. CHI TIẾT CÁC BIỆN PHÁP KHẮC PHỤC

### 3.1. Phần P0: Bảo mật tài khoản & Xác thực chuẩn hoá
- **Loại bỏ hoàn toàn backdoor & mật khẩu plaintext:** Xóa sạch mọi so sánh với mật khẩu cứng và xóa toàn bộ việc lưu trữ mật khẩu vào `localStorage.qns_registered_users`.
- **Loại bỏ cơ chế token giả:** Mọi quy trình đăng nhập thường, đăng nhập Google, hoặc đăng ký đều gửi yêu cầu trực tiếp đến NestJS Backend API (`/auth/login`, `/auth/google`, `/auth/register-email`). Chỉ lưu token JWT thật được cấp bởi máy chủ.
- **Bảo trì tính năng khôi phục mật khẩu:** Thay thế luồng nhập mã OTP giả lập cũ tại `dang-nhap` và `AuthModal` bằng thông báo hướng dẫn liên hệ quản trị viên qua hotline chính thức `0981 753 082` (không có dấu chấm cuối câu theo chuẩn `GEMINI.md § 8`).
- **Khóa các route legacy:** Xóa bỏ hoàn toàn các file `users-server.ts`, `password-reset-server.ts`, `custom-listings-server.ts`, các route `/api/auth/*`, và chuyển route `/api/custom-listings/*` sang phản hồi mã trạng thái HTTP `410 Gone`.
- **Hợp nhất cổng quản trị:** Thay thế toàn bộ mã nguồn của trang `apps/web/src/app/qnsbroker/admin/page.tsx` bằng một trang chuyển hướng an toàn sang `/admin`.

### 3.2. Cải tiến Backend API (`apps/api` & `@qns/shared`)
- **State Machine (`canTransition`):** Bổ sung hàm kiểm tra tính hợp lệ của việc chuyển đổi trạng thái tin đăng trong `@qns/shared`:
  - `pending` ➔ `active`, `rejected`, `removed` (Admin).
  - `active` ➔ `rented`, `removed` (Owner, Admin).
  - `rented` ➔ `active`, `removed` (Owner, Admin).
  - `rejected` ➔ `pending` (Owner gửi duyệt lại), `removed` (Owner, Admin).
  - Chặn triệt để việc mở lại tin đăng đã gỡ (`removed` ➔ `active` bị từ chối đối với chủ tin).
- **Phòng chống IDOR trên Bản đồ:** Trong `ListingsController.getMapPins`: Trích xuất `currentUserId` từ header `Authorization: Bearer <token>` tùy chọn. Chỉ khi người dùng đã xác thực thì các tin `pending` thuộc quyền sở hữu của chính người dùng đó mới được đính kèm vào kết quả bản đồ.
- **Khắc phục lỗi đệ quy `BigIntInterceptor`:** Sử dụng `WeakSet` để phát hiện vòng lặp tham chiếu và hàm kiểm tra `isPlainObject` để chỉ serialize các plain object và array, tránh duyệt qua các instance phức tạp.
- **Các endpoint mới:**
  - `GET /listings/mine/counts`: Trả về số lượng tin đăng theo từng trạng thái của tài khoản đang đăng nhập.
  - `GET /listings/saved/ids`: Trả về danh sách ID các phòng đã lưu của tài khoản.
  - `PUT /listings/:id/save`: Lưu phòng (idempotent, chặn tự lưu tin của chính mình, chỉ cho phép lưu tin đang hiển thị).
  - `DELETE /listings/:id/save`: Bỏ lưu phòng (idempotent, cho phép bỏ lưu cả tin đã thuê hoặc đã gỡ).
  - `POST /listings/:id/resubmit`: Gửi duyệt lại tin đăng đã bị từ chối.
  - `GET /admin/audit-logs`: Lấy danh sách nhật ký kiểm toán có phân trang và bộ lọc.

### 3.3. Chuẩn hoá trang "Quản lý tin đăng" (`/tai-khoan/quan-ly-tin`)
- Lấy số lượng hiển thị trên các tab (Tất cả, Chờ duyệt, Đang hiển thị, Đã cho thuê, Bị từ chối) trực tiếp từ API `/listings/mine/counts`.
- Cung cấp nút "Xem trước" cho tin chờ duyệt, dẫn trực tiếp đến trang xem chi tiết `/tin/[slug]`.
- Nút "Đã cho thuê" chuyển trạng thái tin sang `rented` và tạm ẩn khỏi danh sách tìm kiếm công khai.
- Nút "Mở lại còn phòng" cho phép mở lại tin khi phòng có sẵn trở lại.
- Nút "Gửi duyệt lại" cho phép gửi lại tin đăng bị từ chối lên ban quản trị.
- Thay thế toàn bộ hộp thoại `confirm()` và `alert()` bằng modal xác nhận nội bộ và hệ thống toast thông báo hiện đại.

### 3.4. Chuẩn hoá trang "Phòng đã lưu" (`/tai-khoan/tin-da-luu`)
- Chuyển thao tác bỏ lưu sang phương thức HTTP `DELETE /listings/:id/save`.
- Hiển thị đầy đủ tin đã cho thuê, đã hết hạn, hoặc đã gỡ kèm badge trạng thái trực quan để người dùng nắm rõ tình trạng phòng và chủ động dọn dẹp danh sách.
- Nút Lưu tin tại trang chi tiết (`SaveListingButton.tsx`) đồng bộ sử dụng `PUT` để lưu và `DELETE` để bỏ lưu, hiển thị tooltip thông báo tức thì.

### 3.5. Nâng cấp trang "Quản trị hệ thống" (`/admin/*`)
- **Quản trị người dùng (`/admin/nguoi-dung`):** Cột thống kê hiển thị đồng thời số lượng tin đăng (`listingsCount`) và số lượng phòng đã lưu (`savedListingsCount`) truy vấn từ quan hệ cơ sở dữ liệu.
- **Nhật ký hệ thống (`/admin/nhat-ky`):** Xây dựng trang quản lý audit log cho phép quản trị viên tra cứu các sự kiện theo hành động (`listing.approve`, `listing.reject`, `user.block`...), đối tượng và khoảng thời gian. Đã gắn liên kết vào thanh điều hướng bên trái của `AdminLayout`.

### 3.6. Công cụ Di trú Dữ liệu & Sao lưu
- Đã sao lưu dữ liệu tài khoản cũ vào thư mục ngoài git: `backup/legacy-data/users.json`.
- Viết script di trú `packages/database/scripts/migrate-legacy-accounts.ts`:
  - Hỗ trợ cờ `--dry-run` để chạy thử nghiệm an toàn trước khi ghi vào cơ sở dữ liệu.
  - Tự động băm mật khẩu bằng `bcryptjs` với salt round là 10.
  - Tính idempotent: kiểm tra sự tồn tại của email trước khi tạo mới; không ghi đè nếu tài khoản đã tồn tại.
  - Tuyệt đối không in mật khẩu dạng plaintext vào log.

---

## 4. BẰNG CHỨNG KIỂM THỬ TỰ ĐỘNG (TEST EVIDENCE)

### 4.1. Kiểm tra Biên dịch TypeScript (`tsc --noEmit`)
- **Backend API (`apps/api`):**
  ```bash
  pnpm --filter api exec tsc --noEmit
  # Kết quả: Exit Code 0 (0 lỗi)
  ```
- **Frontend Web (`apps/web`):**
  ```bash
  pnpm --filter web exec tsc --noEmit
  # Kết quả: Exit Code 0 (0 lỗi)
  ```

### 4.2. Bộ kiểm thử Nghiệp vụ & Xác thực (`test-account-management-audit.js`)
```
================================================================
🧪 BẮT ĐẦU BỘ KIỂM THỬ XÁC MINH TOÀN DIỆN (T1 - T8 & P0 SECURITY)
================================================================

  [PASS] P0-01: Không còn bất kỳ plaintext password hoặc backdoor admin trong mã nguồn web/api
  [PASS] P0-02: Legacy auth endpoints cũ đã bị xoá hoặc khóa 410 Gone
  [PASS] P0-03: Trang /qnsbroker/admin chuyển hướng an toàn sang /admin
  [PASS] T1: canTransition matrix bảo vệ tính nhất quán trạng thái tin đăng
  [PASS] T2: API Map Listings không nhận ownerId từ query params (chống IDOR)
  [PASS] T3: Quản lý tin đăng tải số đếm tab từ /listings/mine/counts và hỗ trợ các nút thao tác
  [PASS] T5: Nút Bỏ lưu dùng DELETE /listings/:id/save và hiển thị badge tin không active
  [PASS] T6: Nút Lưu phòng tại trang chi tiết hỗ trợ cả PUT và DELETE
  [PASS] T7: Admin Người dùng hiển thị số tin và số phòng đã lưu từ DB
  [PASS] T8: Admin Nhật ký hệ thống có trang xem và bộ lọc action/resource/date
  [PASS] Quy chuẩn GEMINI.md § 8: Không có dấu chấm cuối câu trong thông báo/toast/modal/tiêu đề

================================================================
🏁 TỔNG KẾT KIỂM THỬ: 11/11 BÀI TEST ĐẠT KẾT QUẢ PASS (100%)
================================================================
```

### 4.3. Kiểm thử Cấu trúc Schema & Migration (`static-lint-check.js`)
```
======================================================
🔍 BẮT ĐẦU STATIC LINT CHECK (KIỂM TRA CẤU TRÚC TĨNH)
======================================================
  [OK - Cấu trúc khớp] Prisma Schema: Chứa các entity cốt lõi (Lead, OutboxEvent, FinanceLedger, AuditEvent)
  [OK - Cấu trúc khớp] Migrations: Có đủ các bước migration DDL từ khởi tạo tới Wave 5
  [OK - Cấu trúc khớp] Security: auth.service.ts không chứa backdoor credential admin cũ
  [OK - Cấu trúc khớp] DTOs: Có decorators class-validator thắt chặt cho Listings DTOs
  [OK - Cấu trúc khớp] Outbox: OutboxService có khai báo DLQ, retry và transactional outbox method
======================================================
🏁 KẾT QUẢ STATIC LINT: 5/5 cấu trúc tệp mã nguồn khớp.
======================================================
```

### 4.4. Kiểm thử Bản đồ & Che giấu Số nhà (`test-map-reviews.js`)
```
--- TEST 1: Address Masking Security (Edge cases) ---
✓ TEST 1 PASSED: 9/9 địa chỉ che giấu số nhà bảo mật tuyệt đối, chỉ hiển thị ngõ, phường, quận
--- TEST 2: Data Integrity & Coordinates ---
Tổng số review có tọa độ GPS hợp lệ: 867 / 899
✓ TEST 2 PASSED: Dữ liệu review và tọa độ hợp lệ phong phú
--- TEST 3: Search History Persistence & Permanent Clear ---
✓ TEST 3 PASSED: Xóa tất cả lịch sử hoạt động chính xác và không bị tự phục hồi khi refresh
--- TEST 4: GEMINI.md § 8 Compliance (No Trailing Dots) ---
✓ TEST 4 PASSED: 0 dấu chấm ở cuối câu trên toàn bộ giao diện người dùng theo chuẩn GEMINI.md § 8
========================================================
ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY: PASS 100%
========================================================
```

---

## 5. DANH SÁCH CÁC TỆP THAY ĐỔI (FILE SUMMARY)

### Backend API (`apps/api` & `packages/shared`)
1. `packages/shared/src/index.ts`: Bổ sung `canTransition`, `TransitionResult` và danh sách trạng thái chuẩn.
2. `apps/api/src/common/interceptors/bigint.interceptor.ts`: Chống lỗi đệ quy vô hạn bằng `WeakSet` và `isPlainObject`.
3. `apps/api/src/modules/health/health.controller.ts`: Chuẩn hóa phản hồi kiểm tra sức khỏe hệ thống.
4. `apps/api/src/modules/listings/dto/query-map-listings.dto.ts`: Xóa bỏ trường `ownerId` để ngăn chặn IDOR.
5. `apps/api/src/modules/listings/listings.module.ts`: Đăng ký `JwtModule` để phân tích danh tính tùy chọn trong public endpoint.
6. `apps/api/src/modules/listings/listings.controller.ts`: Khai báo các endpoint `counts`, `saved/ids`, `save` (PUT/DELETE), `resubmit`.
7. `apps/api/src/modules/listings/listings.service.ts`: Cài đặt logic lưu tin, bỏ lưu tin, cập nhật trạng thái với `canTransition`, và lọc toạ độ tin pending an toàn theo JWT token.
8. `apps/api/src/modules/admin/admin.controller.ts`: Bổ sung endpoint `GET /admin/audit-logs`.
9. `apps/api/src/modules/admin/admin.service.ts`: Bổ sung `getAuditLogs`, thêm `savedListingsCount` vào `getUsers`, áp dụng `canTransition` khi duyệt/từ chối tin và tạo `OwnerProfile`/`OwnerServiceAgreement`.
10. `apps/api/src/modules/auth/auth.service.ts`: Làm sạch hoàn toàn, loại bỏ các nhánh kiểm tra admin giả lập.

### Frontend Web (`apps/web`)
1. `apps/web/src/app/dang-nhap/page.tsx`: Kết nối API thực tế, xóa bỏ mật khẩu hardcode và token giả, cập nhật thông báo bảo trì khôi phục mật khẩu.
2. `apps/web/src/components/AuthModal.tsx`: Đồng bộ luồng xác thực thực tế không mock, xóa mật khẩu hardcode.
3. `apps/web/src/app/dang-tin/page.tsx`: Xóa bỏ mock đăng nhập Google, kích hoạt sự kiện `qns_listings_updated` sau khi gửi tin.
4. `apps/web/src/app/qnsbroker/admin/page.tsx`: Chuyển hướng tự động sang `/admin`.
5. `apps/web/src/components/Header.tsx`: Loại bỏ nhánh bỏ qua xác thực của các token giả lập.
6. `apps/web/src/lib/auth-client.ts`: Làm sạch, xóa bỏ hàm lưu trữ tin đăng cục bộ và logic tài khoản hardcode.
7. `apps/web/src/app/tai-khoan/quan-ly-tin/page.tsx`: Cập nhật lấy số lượng theo tab từ CSDL, bổ sung các thao tác xem trước, gỡ tin, đã cho thuê, còn phòng, gửi duyệt lại, toast và confirm modal nội bộ.
8. `apps/web/src/app/tai-khoan/tin-da-luu/page.tsx`: Dùng phương thức `DELETE` để bỏ lưu, hiển thị badge cho tin inactive, loại bỏ `alert()`.
9. `apps/web/src/app/tin/[slug]/SaveListingButton.tsx`: Chuyển sang dùng `PUT` và `DELETE`, hiển thị thông báo không có dấu chấm cuối câu.
10. `apps/web/src/app/admin/nguoi-dung/page.tsx`: Hiển thị số tin đăng và số phòng đã lưu lấy từ CSDL.
11. `apps/web/src/app/admin/nhat-ky/page.tsx`: Tạo trang theo dõi nhật ký hệ thống kèm bộ lọc.
12. `apps/web/src/app/admin/layout.tsx`: Thêm mục "Nhật ký hệ thống" vào thanh điều hướng bên trái.
13. `apps/web/src/app/api/custom-listings/route.ts` & `[slug]/route.ts`: Phản hồi `410 Gone`.
14. Xóa bỏ các file legacy: `users-server.ts`, `password-reset-server.ts`, `custom-listings-server.ts`, các route `/api/auth/*`.

### Database Scripts & Tests
1. `packages/database/scripts/migrate-legacy-accounts.ts`: Script di trú tài khoản hỗ trợ `--dry-run` và idempotent.
2. `packages/database/scripts/test-account-management-audit.js`: Bộ kiểm thử tự động 11 bài xác minh toàn diện.

---

## 6. TUÂN THỦ CÁC LUẬT CỨNG (HARD RULES COMPLIANCE)

1. **Quy tắc Git:** Tuyệt đối không thực hiện các lệnh ghi Git (`git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git stash`, tạo PR). Chỉ sử dụng các lệnh đọc (`git status`, `git diff --stat`, `git log`).
2. **Quy tắc Bảo mật:** Tuyệt đối không in, ghi lại mật khẩu dạng plaintext, mã token, OTP vào log, test script, báo cáo hay console.
3. **Quy tắc Giao diện & Văn phong:** Toàn bộ thông báo, toast, modal, nhãn nút bấm, tiêu đề trang đều tuân thủ nghiêm ngặt quy chuẩn không có dấu chấm ở cuối câu theo `GEMINI.md § 8`.
4. **Quy tắc Quản lý Gói:** Sử dụng duy nhất trình quản lý gói `pnpm` trong toàn bộ monorepo.
