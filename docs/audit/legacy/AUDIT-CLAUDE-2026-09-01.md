# AUDIT-CLAUDE-2026-09-01.md — Kết quả kiểm định độc lập

**Người thực hiện:** Claude (Anthropic), theo yêu cầu của Quan
**Ngày:** 01/09/2026
**Phạm vi:** Toàn bộ codebase `batdongsan` tại thời điểm commit `2f1d9da` ("model 2"), do agent Gemini Flash 3.7 xây dựng.
**Phương pháp:** Không chỉ đọc code — đã thực sự `pnpm install`, build thật `apps/web`, `tsc --noEmit` thật `apps/api`, và đọc trực tiếp từng file nghiệp vụ quan trọng (auth, listings, upload, frontend auth flow) để tìm lỗi logic mà build/typecheck không bắt được.

---

## 1. Xác nhận độc lập các claim từ đợt audit trước (Gemini Flash 3.7, xem `TRANG-THAI-TRIEN-KHAI.md`)

| Claim | Kết quả xác minh của Claude |
|---|---|
| `apps/web` build sạch 100% | ✅ **Đúng** — build thật thành công, 0 lỗi |
| `apps/api` chỉ còn 4 lỗi TypeScript do chưa `prisma generate` (môi trường, không phải bug) | ✅ **Đúng** — `tsc --noEmit` xác nhận đúng 4 lỗi, đúng nguyên nhân, đúng vị trí |
| Không thể `prisma generate` vì sandbox chặn `binaries.prisma.sh` | ✅ **Đúng** — tái hiện y hệt lỗi 403 Forbidden khi tự thử |
| 12 lỗi đã liệt kê (envFilePath, exception filter, resolveLocationIdsIncludingChildren, upload fileFilter, report DTO, ThrottlerGuard, ParseBigIntPipe, Header client component, check-phone endpoint...) | ✅ Xác minh bằng grep trực tiếp vào code — các fix này thực sự có trong code, không phải chỉ ghi trong tài liệu |

**Kết luận phần 1:** Đợt audit trước là **thật, có kiểm chứng được**, không phải báo cáo khống. Chất lượng nền tảng đã xây khá tốt.

---

## 2. Lỗi/thiếu sót MỚI phát hiện qua audit độc lập (chưa có trong danh sách 12 lỗi trước)

### 🔴 #13 — NGHIÊM TRỌNG: JWT secret fallback về giá trị placeholder công khai
**File:** `auth.service.ts`, `jwt.strategy.ts`
**Vấn đề:** `process.env.JWT_ACCESS_SECRET ?? 'changeme_access'` — nếu `.env` thiếu/sai đường dẫn ở production, app vẫn chạy bình thường và ký JWT bằng chuỗi in sẵn trong mã nguồn công khai. Bất kỳ ai đọc repo đều tự ký được token admin giả mạo, bỏ qua hoàn toàn xác thực.
**Đã sửa:** Thêm `common/config/assert-env.ts`, gọi ở đầu `main.ts` trước `NestFactory.create()` — chặn khởi động hoàn toàn nếu secret thiếu hoặc còn là placeholder khi `NODE_ENV=production`; chỉ cảnh báo ở dev.

### 🟠 #14 — QUAN TRỌNG: Tin `pending`/`rejected` bị lộ công khai qua ID đoán được
**File:** `listings.service.ts` (`findOne`, `revealPhone`)
**Vấn đề:** Endpoint công khai chỉ loại trừ status `removed`, không loại trừ `pending` (chưa duyệt) và `rejected` (đã từ chối). ID là số nguyên tăng dần, có thể duyệt tuần tự — vô hiệu hoá hàng đợi kiểm duyệt.
**Đã sửa:** `findOne` và `revealPhone` giờ chỉ phục vụ tin `active` cho người xem công khai; thêm `findOneForOwner` riêng cho chủ tin.

### 🟠 #15 — QUAN TRỌNG: API "Quản lý tin" hoàn toàn chưa tồn tại
**File:** mới — `listings.controller.ts`, `listings.service.ts`, `dto/query-my-listings.dto.ts`
**Vấn đề:** Không có cách nào trong app để người dùng xem lại tin của chính mình — phá vỡ luồng lõi "Đăng tin → Quản lý tin" (yêu cầu MVP theo README.md mục 14).
**Đã sửa:** Thêm `GET /listings/mine` (đặt đúng thứ tự TRƯỚC route `:idOrSlug` để tránh xung đột định tuyến) + trang `apps/web/src/app/tai-khoan/quan-ly-tin/page.tsx` (thật, có filter theo trạng thái).

### 🟡 #16 — TRUNG BÌNH: `addImages()` luôn trả lỗi 404 dù ảnh đã lưu thành công
**File:** `listings.service.ts`
**Vấn đề:** `return this.findOne(\`id${id}\`)` — chuỗi `"id42"` không khớp CẢ HAI regex trong `findOne()`. Mọi lần upload ảnh xong đều throw `NotFoundException` ở dòng cuối, dù dữ liệu đã ghi DB đúng.
**Đã sửa:** Đổi sang gọi `findOneForOwner(id, requester)`.

### 🟡 #17 — TRUNG BÌNH: `refreshToken` được lưu nhưng không nơi nào sử dụng
**File:** mới — `apps/web/src/lib/auth-client.ts`; sửa `RevealPhoneButton.tsx`, `dang-tin/page.tsx`, `Header.tsx`
**Vấn đề:** Backend có `POST /auth/refresh` hoạt động tốt, nhưng frontend chưa từng gọi tới — với `accessToken` hết hạn sau 15 phút, người dùng bị Header tự động đăng xuất âm thầm mỗi 15 phút dù `refreshToken` (hạn 7 ngày) vẫn hợp lệ.
**Đã sửa:** Thêm helper `authFetch()` tự thử refresh 1 lần khi gặp 401 trước khi coi là hết phiên; áp dụng ở mọi nơi gọi API cần đăng nhập.

### 🟡 #18 — TRUNG BÌNH: 6 liên kết điều hướng trong Header dẫn tới trang không tồn tại (404)
**File:** mới — `du-an/page.tsx`, `moi-gioi/page.tsx`, `gia-nha-dat/page.tsx`, `tai-khoan/tin-da-luu/page.tsx`, `tai-khoan/thong-tin/page.tsx`, `components/ComingSoonNotice.tsx`
**Vấn đề:** `Header.tsx` (hiển thị trên MỌI trang) liên kết tới `/du-an`, `/moi-gioi`, `/gia-nha-dat`, `/tai-khoan/quan-ly-tin`, `/tai-khoan/tin-da-luu`, `/tai-khoan/thong-tin` — nhưng chỉ 6 route thực sự tồn tại trong toàn app (`/`, `/mua-ban`, `/thue`, `/dang-nhap`, `/dang-tin`, `/tin/[slug]`). `next build` không bắt được lỗi này vì Next.js không validate đường dẫn `<Link href>` tại build time.
**Đã sửa:**
- `/tai-khoan/quan-ly-tin` → xây dựng đầy đủ, thật (đi kèm fix #15).
- `/tai-khoan/thong-tin` → xây dựng thật (dùng `GET /auth/me` đã có sẵn, hiển thị chế độ chỉ xem).
- `/du-an`, `/moi-gioi`, `/gia-nha-dat`, `/tai-khoan/tin-da-luu` → trang thông báo trung thực "đang phát triển" (`noindex` để tránh Google index nội dung mỏng), KHÔNG giả vờ đã hoàn thiện tính năng — các tính năng này vẫn đúng là công việc Giai đoạn 2-3 theo roadmap gốc, chỉ khác là giờ không còn dead link.

---

## 3. Đã xác minh lại toàn bộ bằng build thật (không chỉ đọc code)

```
✅ pnpm install                          — thành công
✅ pnpm --filter web build                — 0 lỗi, 16/16 route generate thành công
✅ pnpm --filter api exec tsc --noEmit    — chỉ còn 6 lỗi, TẤT CẢ cùng 1 nguyên nhân môi trường
                                             (chưa prisma generate được vì mạng sandbox chặn
                                             binaries.prisma.sh — không phải lỗi logic mới)
```

## 4. Việc CHƯA làm trong đợt này (để lại đúng như roadmap, không phải bug)
Những mục này KHÔNG được coi là "sai sót" vì đã được tài liệu dự án (README.md mục 15, CLAUDE.md) xếp vào Giai đoạn 2-3 từ đầu — chỉ liệt kê lại để tránh nhầm lẫn với các lỗi ở mục 2:
- Module SavedListing (BĐS đã lưu) — chưa có bảng/API/UI thật.
- `PATCH /users/me` (chỉnh sửa hồ sơ) và đổi mật khẩu.
- Trang Dự án / Môi giới / Giá nhà đất — nội dung thật (hiện là placeholder trung thực).
- Wizard đăng tin nhiều bước (hiện là form đơn 1 bước, chưa gắn upload ảnh vào UI).
- Membership, thanh toán VNPay/MoMo, dịch vụ đẩy tin.
- Tích hợp Meilisearch (hiện filter trực tiếp trên Postgres — hợp lý ở quy mô dữ liệu hiện tại).
- Trang Admin thật (hiện duyệt tin qua Prisma Studio).
- OTP store vẫn dùng in-memory `Map` — PHẢI chuyển sang Redis trước khi deploy nhiều instance/production.

## 5. Cách áp dụng các thay đổi này vào repo GitHub thật
Claude không có quyền push trực tiếp lên `github.com/QuanNguyenS403/batdongsan`. Toàn bộ file đã sửa/thêm được đóng gói trong `audit-fixes-2026-09-01.zip` đi kèm — giải nén đè vào gốc repo rồi:
```bash
git add .
git commit -m "fix: JWT secret fail-fast, pending-listing exposure, missing my-listings API, unused refresh token, 6 broken nav links (audit Claude 01/09/2026)"
git push
```
Sau đó **bắt buộc** đổi `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` trong `.env` thật sang giá trị ngẫu nhiên (`openssl rand -hex 32`) trước khi chạy — app sẽ tự chặn khởi động nếu quên bước này ở production, nhưng ở dev vẫn chạy được với placeholder kèm cảnh báo.
