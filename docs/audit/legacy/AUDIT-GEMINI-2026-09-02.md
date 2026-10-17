# AUDIT-GEMINI-2026-09-02.md — Kết quả kiểm định độc lập & hoàn thiện chuẩn Mogi.vn

**Người thực hiện:** Gemini 3.7 Flash (Antigravity AI Agent), theo yêu cầu của Quan  
**Ngày:** 02/09/2026  
**Nhánh:** `audit/mogi-completion-2026-09-02`  
**Phạm vi:** Toàn bộ codebase `batdongsan` sau khi tích hợp đợt audit #13-#18 từ Claude (`audit-fixes-2026-09-01.zip`).  
**Phương pháp:** Tự tay xác minh độc lập bằng lệnh chạy thật (`pnpm install`, `prisma generate`, `tsc --noEmit`, `next build`), audit sâu từng dòng mã nguồn nghiệp vụ cốt lõi, sửa triệt để nguyên nhân gốc rễ và kiểm tra lại toàn diện.

---

## 1. Xác minh độc lập các claim từ đợt audit trước (Claude, xem `AUDIT-CLAUDE-2026-09-01.md`)

| Claim | Kết quả xác minh độc lập | Dẫn chứng cụ thể |
|---|---|---|
| Cần nạp `audit-fixes-2026-09-01.zip` để áp dụng 6 lỗi #13 - #18 | ✅ **Chính xác** | Code trên `main` tại thời điểm bắt đầu chưa có `assert-env.ts`, `query-my-listings.dto.ts` hay các trang `/tai-khoan/quan-ly-tin`. Đã giải nén và commit đầy đủ vào nhánh `audit/mogi-completion-2026-09-02`. |
| `pnpm install` cần thiết để cài `dotenv` và `dotenv-cli` | ✅ **Chính xác** | Khi thử `next build` trước khi `pnpm install`, Next.js báo lỗi `Cannot find package 'dotenv' imported from next.config.mjs`. Chạy `pnpm install` giải quyết sạch sẽ. |
| `prisma generate` sinh Prisma Client thành công | ✅ **Chính xác** | `pnpm --filter database exec prisma generate` tạo thành công Prisma Client v5.22.0. |
| `apps/api` typecheck sạch 100% | ✅ **Chính xác** | `pnpm --filter api exec tsc --noEmit` hoàn thành với mã thoát 0, 0 lỗi TypeScript. |
| `apps/web` build sạch 100% | ✅ **Chính xác** | `pnpm --filter web build` biên dịch thành công 16/16 route production. |

---

## 2. Danh sách lỗi/thiếu sót MỚI tìm được và đã khắc phục triệt để (#19 - #32)

### 🔴 #19 — BẢO MẬT & DoS: `addImages()` ghi file vào đĩa server TRƯỚC KHI kiểm tra quyền sở hữu
- **File:** `apps/api/src/modules/listings/listings.controller.ts`, `listings.service.ts`
- **Mô tả vấn đề:** `uploadsService.saveListingImages(id.toString(), files)` xử lý và ghi hàng chục file ảnh webp vào đĩa server trước khi `listingsService.addImages` gọi kiểm tra quyền sở hữu (`assertOwnership`). Kẻ tấn công có thể liên tục gọi upload vào ID bất kỳ của người khác để làm tràn đĩa cứng máy chủ (Disk Exhaustion DoS) mà không cần sở hữu tin. Đồng thời thiếu validate mảng `files`.
- **Đã sửa:** Chuyển `assertOwnership` thành public trên `ListingsService`, gọi kiểm tra quyền sở hữu TRƯỚC KHI ghi đĩa; thêm validate bắt buộc `files && files.length > 0`.

### 🟠 #20 — HẠ TẦNG: Đường dẫn `UploadsService` lệch với `ServeStaticModule` trong monorepo gây 404 ảnh
- **File:** `apps/api/src/modules/uploads/uploads.service.ts`
- **Mô tả vấn đề:** `UploadsService` dùng `join(process.cwd(), 'uploads')`. Khi chạy monorepo từ thư mục gốc qua Turborepo (`pnpm dev`), `process.cwd()` là `d:\BĐS`, nên ảnh được lưu vào `d:\BĐS\uploads`. Trong khi `ServeStaticModule` trong `app.module.ts` lại phục vụ từ `apps/api/uploads`. Kết quả là 100% ảnh upload xong đều trả về 404 Not Found khi xem.
- **Đã sửa:** Đổi đường dẫn trong `UploadsService` thành `join(__dirname, '..', '..', '..', 'uploads')`, đồng bộ chuẩn xác với `ServeStaticModule` tại `apps/api/uploads`.

### 🟠 #21 — FRONTEND ASSETS: Ảnh upload từ API trả về URL tương đối `/uploads/...` gây 404 trên Next.js
- **File:** `apps/web/next.config.mjs`
- **Mô tả vấn đề:** API trả về đường dẫn ảnh `/uploads/listings/...`. Trình duyệt tải ảnh từ frontend `localhost:3000/uploads/...` bị lỗi 404 do Next.js không có thư mục này và không proxy sang backend port 4000.
- **Đã sửa:** Thêm `rewrites()` vào `next.config.mjs` để proxy mọi request `/uploads/:path*` sang backend API (`http://localhost:4000/uploads/:path*`).

### 🟠 #22 — RUNTIME CRASH: `projectId` kiểu `number` trong DTO làm crash Prisma BigInt
- **File:** `apps/api/src/modules/listings/listings.service.ts` (`create`, `update`)
- **Mô tả vấn đề:** `projectId` trong schema là `BigInt?`. `CreateListingDto` định nghĩa `projectId?: number`. Trong `create()`, code truyền thẳng `projectId: dto.projectId`. Trong `update()`, code dùng spread `...dto`. Khi người dùng tạo/sửa tin kèm `projectId`, Prisma Client sẽ crash request: `Argument projectId: Provided Int, expected BigInt`. Đồng thời khi update `title`, `slug` không được cập nhật lại theo quy chuẩn `...-id{id}`.
- **Đã sửa:** Ép kiểu `BigInt(dto.projectId)` nếu có giá trị; dùng `Prisma.ListingUncheckedUpdateInput` để nhận foreign key; tự động cập nhật `slug` đồng bộ khi `dto.title` thay đổi (tuân thủ `GEMINI.md § 3`).

### 🟡 #23 — EXCEPTION FILTER: `OtpService` ném `new Error` bị filter biến thành lỗi 500
- **File:** `apps/api/src/modules/auth/otp.service.ts`
- **Mô tả vấn đề:** Khi người dùng gửi OTP quá 5 lần/giờ, `OtpService` ném `throw new Error('Bạn đã yêu cầu OTP quá nhiều lần...')`. Do là generic `Error`, `HttpExceptionFilter` chuyển thành `500 Internal Server Error` với thông báo chung chung "Đã có lỗi xảy ra, vui lòng thử lại sau.", làm mất thông báo lỗi thân thiện và sai HTTP status code (lẽ ra là 429).
- **Đã sửa:** Đổi sang ném `HttpException('Bạn đã yêu cầu OTP quá nhiều lần trong 1 giờ. Vui lòng thử lại sau.', HttpStatus.TOO_MANY_REQUESTS)`.

### 🟡 #24 — METRIC TAMPERING: `PhoneRevealLog` bị spam tăng ảo lượt xem số điện thoại
- **File:** `apps/api/src/modules/listings/listings.service.ts`
- **Mô tả vấn đề:** Mỗi lần user bấm "Hiện số điện thoại", backend luôn ghi thêm 1 dòng vào `phone_reveal_logs` và tăng `revealPhoneCount`. Kẻ xấu hoặc bot chỉ cần bấm lặp lại sẽ làm sai lệch hoàn toàn thống kê `revealPhoneCount` và phình to bảng log.
- **Đã sửa:** Kiểm tra nếu user đã xem số điện thoại của tin này trước đó rồi thì chỉ trả lại số điện thoại mà không ghi thêm log trùng lặp và không tăng ảo `revealPhoneCount`.

### 🟡 #25 — UX MOGI: `/mua-ban` và `/thue` thiếu thanh lọc tìm kiếm
- **File:** Mới `apps/web/src/components/SearchFilterBar.tsx`, cập nhật `apps/web/src/app/mua-ban/page.tsx`, `apps/web/src/app/thue/page.tsx`
- **Mô tả vấn đề:** API backend hỗ trợ lọc theo loại hình, mức giá, diện tích, từ khoá, nhưng giao diện `/mua-ban` và `/thue` không hề có bất kỳ thanh lọc nào để người dùng bấm chọn.
- **Đã sửa:** Xây dựng component `SearchFilterBar` tương tác: chọn loại hình BĐS, mức giá (theo bán hoặc thuê), diện tích, từ khoá, nút áp dụng/đặt lại, đồng bộ mượt mà với URL searchParams.

### 🟡 #26 — UX MOGI: Đăng tin thiếu upload ảnh và bắt người dùng nhập `locationId` số thô
- **File:** `apps/web/src/app/dang-tin/page.tsx`
- **Mô tả vấn đề:** Form đăng tin bắt người dùng tự gõ số `locationId` (người dùng không thể biết được số ID nội bộ trong DB là bao nhiêu), và hoàn toàn không có ô chọn file ảnh để upload dù backend đã hỗ trợ `POST /listings/:id/images`.
- **Đã sửa:** Tải danh sách địa danh từ `GET /locations` để hiển thị dropdown chọn Tỉnh/Quận/Phường rõ ràng, đồng thời thêm trường upload nhiều ảnh và tự động gọi `POST /listings/:id/images` sau khi tạo tin thành công.

### 🟡 #27 — UX MOGI: "Quản lý tin" thiếu hành động Gỡ tin (Delete) và tab trạng thái "Đã gỡ"
- **File:** `apps/web/src/app/tai-khoan/quan-ly-tin/page.tsx`
- **Mô tả vấn đề:** Người dùng không có cách nào gỡ bỏ tin đã bán/hết hạn từ giao diện quản lý tin, dù backend đã có `DELETE /listings/:id`.
- **Đã sửa:** Thêm nút "Gỡ tin" kèm xác nhận gọi API `DELETE /listings/:id`, và thêm tab lọc "Đã gỡ" (`removed`) trong `FILTER_TABS`.

### 🟡 #28 — UX MOGI: Form "Báo cáo tin vi phạm" (`ReportForm`) trên trang chi tiết tin chỉ là placeholder text
- **File:** `apps/web/src/app/tin/[slug]/page.tsx`, component mới `apps/web/src/components/ReportListingModal.tsx`
- **Mô tả vấn đề:** Đoạn code `ReportForm` hiển thị dòng chữ ghi chú: "Chức năng báo cáo gọi tới POST /listings/{listingId}/report — cần nối form thật ở bản hoàn thiện.", người dùng không thể gửi báo cáo vi phạm.
- **Đã sửa:** Tạo component modal báo cáo thật với các lý do hợp lệ theo `ReportListingDto` (`spam`, `wrong_info`, `sold`, `fraud`, `other`), trường ghi chú, và gọi API thật.

### 🟢 #29 — HOÀN THIỆN CHUẨN MOGI: Xây dựng tính năng "BĐS đã lưu" (Saved Listings) hoàn chỉnh
- **File:** `apps/api/src/modules/listings/listings.service.ts`, `listings.controller.ts`, component mới `apps/web/src/app/tin/[slug]/SaveListingButton.tsx`, cập nhật `apps/web/src/app/tai-khoan/tin-da-luu/page.tsx`
- **Mô tả vấn đề:** Bảng `saved_listings` đã có trong DB nhưng chưa có API và UI. Trang `/tai-khoan/tin-da-luu` trước đó chỉ hiển thị thông báo Coming Soon.
- **Đã sửa:** Bổ sung API `POST /listings/:id/save` (toggle lưu/bỏ lưu), `GET /listings/:id/is-saved`, `GET /listings/saved/mine`; thêm nút "❤️ Lưu tin" trên trang chi tiết BĐS; thay thế `ComingSoonNotice` bằng trang quản lý danh sách tin đã lưu thật, hỗ trợ xem và bỏ lưu trực tiếp.

### 🟢 #30 — HOÀN THIỆN CHUẨN MOGI: Xây dựng công cụ tính khoản vay mua nhà (Loan Calculator Widget)
- **File:** Mới `apps/web/src/components/LoanCalculatorWidget.tsx`, tích hợp vào `apps/web/src/app/tin/[slug]/page.tsx`
- **Mô tả vấn đề:** Một trong những tính năng giữ chân người dùng nổi bật nhất của Mogi.vn là công cụ ước tính khoản vay trả góp ngân hàng trên trang chi tiết tin đăng bán.
- **Đã sửa:** Xây dựng widget tính khoản vay trực tiếp theo công thức niên kim cố định chuẩn ngân hàng (tỷ lệ vay, thời hạn, lãi suất -> tính số tiền trả trước, số tiền vay, và số tiền trả gốc lãi hàng tháng).

### 🟢 #31 — HOÀN THIỆN CHUẨN MOGI: Thêm API & giao diện Chỉnh sửa hồ sơ và Đổi mật khẩu
- **File:** DTO mới `apps/api/src/modules/users/dto/update-user.dto.ts`, `change-password.dto.ts`, cập nhật `users.service.ts`, `users.controller.ts`, `apps/web/src/app/tai-khoan/thong-tin/page.tsx`
- **Mô tả vấn đề:** Người dùng không thể đổi họ tên hoặc mật khẩu cá nhân từ giao diện do thiếu API `PATCH /users/me` và `POST /users/me/change-password`.
- **Đã sửa:** Thêm đầy đủ 2 endpoint tại backend kèm kiểm tra mật khẩu hiện tại bằng bcrypt; nâng cấp trang `/tai-khoan/thong-tin` từ màn hình chỉ xem thành màn hình quản lý hồ sơ và đổi mật khẩu an toàn.

### 🟢 #32 — UX AUTH: Trang đăng nhập thiếu luồng "Quên mật khẩu"
- **File:** `apps/web/src/app/dang-nhap/page.tsx`
- **Mô tả vấn đề:** Người dùng quên mật khẩu không thể vào tài khoản dù backend đã có sẵn endpoint `POST /auth/forgot-password/reset`.
- **Đã sửa:** Thêm luồng "Quên mật khẩu": nhập SĐT -> gửi OTP -> nhập OTP và mật khẩu mới -> đặt lại mật khẩu và đăng nhập.

### 🟢 #33 — UX MOGI: Hiển thị đơn vị giá thuê "/ tháng" trên thẻ BĐS (`ListingCard`)
- **File:** `apps/web/src/components/ListingCard.tsx`
- **Mô tả vấn đề:** Trên các trang danh sách `/mua-ban`, `/thue` và trang chủ, thẻ tin đăng cho thuê chỉ hiển thị giá số (ví dụ "15 triệu") mà thiếu đơn vị thời gian "/ tháng", gây nhầm lẫn giữa giá bán trọn gói và giá thuê hàng tháng.
- **Đã sửa:** Kiểm tra `listing.transactionType === 'rent'` để bổ sung nhãn "/ tháng" trực quan chuẩn theo UX Mogi.vn.

---

## 3. Kết quả chạy build/typecheck thật (BƯỚC 4)

### Backend API:
```bash
$ pnpm --filter api exec tsc --noEmit
# Mã thoát 0 — HOÀN TOÀN SẠCH LỖI TYPESCRIPT (0 errors)
```

### Frontend Web:
```bash
$ pnpm --filter web build
  ▲ Next.js 14.2.15

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (16/16)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    183 B          94.1 kB
├ ○ /_not-found                          872 B            88 kB
├ ○ /dang-nhap                           2.08 kB        89.2 kB
├ ○ /dang-tin                            3.15 kB        97.1 kB
├ ○ /du-an                               183 B          94.1 kB
├ ○ /gia-nha-dat                         183 B          94.1 kB
├ ○ /moi-gioi                            183 B          94.1 kB
├ ƒ /mua-ban                             1.69 kB        95.6 kB
├ ○ /robots.txt                          0 B                0 B
├ ○ /sitemap.xml                         0 B                0 B
├ ○ /tai-khoan/quan-ly-tin               2.63 kB        96.5 kB
├ ○ /tai-khoan/thong-tin                 2.67 kB        89.8 kB
├ ○ /tai-khoan/tin-da-luu                2.57 kB        96.5 kB
├ ƒ /thue                                1.69 kB        95.6 kB
└ ƒ /tin/[slug]                          3.99 kB        91.1 kB
+ First Load JS shared by all            87.1 kB

# Mã thoát 0 — 16/16 ROUTES BIÊN DỊCH VÀ TẠO STATIC/DYNAMIC THÀNH CÔNG
```

---

## 4. Danh sách việc CHƯA làm (Lộ trình Giai đoạn 2-3 theo `CLAUDE.md § 2.8` / `README.md § 15`)

Những mục này là công việc của các giai đoạn tiếp theo, không phải lỗi kỹ thuật:
- **Meilisearch / Elasticsearch**: Tìm kiếm toàn văn nâng cao khi số lượng tin vượt vài chục nghìn tin (hiện tại PostgreSQL query index đa cột hoạt động rất nhanh và ổn định).
- **Google OAuth**: Đăng nhập bằng tài khoản Google.
- **Thanh toán & Gói thành viên**: Cổng VNPay / MoMo và các gói VIP/đẩy tin tự động.
- **Nội dung hoàn thiện cho Dự án / Môi giới / Giá nhà đất**: Hiện là các trang thông báo "Đang phát triển" trung thực, không còn lỗi liên kết chết.
- **Chuyển OTP store sang Redis**: Khi triển khai nhiều instance API song song trên cụm server production.
- **Giao diện Admin kiểm duyệt tập trung**: Hiện duyệt tin qua Prisma Studio.

---

## 5. Trạng thái cập nhật tài liệu dự án

- Đã cập nhật checklist mục 16 trong `README.md`: Tick hoàn thành các mục tìm kiếm/lọc, chi tiết tin, ẩn SĐT, auth OTP & quên mật khẩu, đăng tin + quản lý tin + upload ảnh, BĐS đã lưu, báo cáo vi phạm, công cụ tính khoản vay, SEO.
- Đã cập nhật `TRANG-THAI-TRIEN-KHAI.md`: Bổ sung toàn bộ chi tiết đợt audit #13-#18 (Claude) và #19-#32 (Gemini).
- Đã cập nhật `memory-bank/progress.md` và `memory-bank/activeContext.md`.

Toàn bộ công việc được thực hiện trên nhánh Git riêng: `audit/mogi-completion-2026-09-02`.
