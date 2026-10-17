# AUDIT-GEMINI-2026-09-06.md — Đánh giá kép & Hoàn thiện toàn diện website batdongsan

**Người thực hiện:** Gemini 3.8 Flash (Antigravity AI Agent), theo yêu cầu của Quan  
**Ngày thực hiện:** 06/09/2026  
**Nhánh Git:** `audit/dual-review-completion-2026-09-06`  
**Phạm vi:** Toàn bộ codebase `batdongsan` sau khi chuyển dịch chiến lược 100% Cho thuê (Pivot 05/09/2026).  
**Phương pháp:** Đóng 2 vai trò tuần tự — Khách hàng khó tính (E2E browser qua `browser_subagent`) và Kỹ sư phần mềm chuyên nghiệp (rà soát mã nguồn, typecheck `tsc --noEmit`, production build `next build`, bảo mật & data sync), sau đó **tự khắc phục triệt để mọi lỗi/thiếu sót** phát hiện được và kiểm thử xác minh lại.

---

## 1. VAI TRÒ 1 — Khách hàng khó tính (End-User Experience Audit)

Nhập vai một khách thuê từng sử dụng chuyên sâu các nền tảng Mogi.vn, Chợ Tốt Nhà Đất, Batdongsan.com.vn và Rever.

### A. Đánh giá trải nghiệm thực tế trên trình duyệt (qua browser subagent & URL thật)
1. **Trang chủ (`/`)**:
   - Truyền tải thông điệp rất rõ ràng: *Chuyên biệt Cho thuê BĐS & Phòng trọ sinh viên, minh bạch chi phí điện nước, tìm phòng gần trường ĐH*.
   - Khối shortcut trường Đại học (ĐHQG TP.HCM, Bách Khoa, Kinh Tế UEH, Tôn Đức Thắng...) giúp sinh viên tiếp cận mục tiêu trong 1 click.
2. **Luồng tìm kiếm (`/thue`, `/cho-thue-tro`, `/cho-thue-mat-bang`)**:
   - Khi database chưa có dữ liệu thật, hệ thống tự động hiển thị dữ liệu tham khảo (`DEMO_*`) kèm nhãn *Tin tham khảo* rất tinh tế, không làm vỡ giao diện hay hiện trang trắng rỗng.
   - Breadcrumb và phân trang mượt mà.
3. **Trang chi tiết BĐS (`/tin/[slug]`)**:
   - Thẻ *Minh bạch chi phí dịch vụ & Điện nước* (điện đ/kWh, nước đ/m³, tiền cọc, hạn hợp đồng) và *Công cụ tính toán chi phí dọn vào tháng đầu* (`MoveInCostEstimator`) rất hữu ích, vượt trội so với các trang rao vặt truyền thống.
   - Khoảng cách tới các trường ĐH lân cận (km và phút đi xe) hiển thị trực quan.
4. **Form Đăng tin (`/dang-tin`)**:
   - Đầy đủ thông số cho thuê trọ (điện nước, hạn hợp đồng, cọc, tiện ích, trường ĐH lân cận).
   - Tuy nhiên trước đợt audit này, form thiếu khu vực hiển thị ảnh xem trước (preview thumbnail) khi chọn ảnh.
5. **Form Đăng nhập / Đăng ký (`/dang-nhap`)**:
   - Hỗ trợ đầy đủ luồng SĐT + Mật khẩu, OTP xác thực số mới và Đặt lại mật khẩu qua OTP.
   - Tuy nhiên khi mất kết nối mạng hoặc server offline, form hiển thị chữ `Failed to fetch` thô tiếng Anh.
6. **Độ tin cậy & Pháp lý (Trust Signals)**:
   - Trước đợt audit này, chân trang chỉ có chữ tĩnh `<span>Điều khoản sử dụng</span>` và `<span>Chính sách bảo mật</span>` không click được; thiếu trang Giới thiệu và trang Liên hệ chính thức.

### B. Kết luận phân nhóm Vai trò 1
- **Thiếu sót cần bổ sung**:
  1. Thiếu các trang pháp lý & thông tin tin cậy: `/dieu-khoan`, `/chinh-sach`, `/gioi-thieu`, `/lien-he`.
  2. Thiếu gallery xem trước hình ảnh (Image Preview Thumbnail) trước khi gửi trong form đăng tin.
  3. Thiếu thông báo tiếng Việt lịch sự khi mất kết nối máy chủ trên form đăng nhập.
- **Lỗi cần sửa**:
  1. *[Trung bình]* Tiêu đề và breadcrumb trang `/thue?categoryGroup=thue_studio` bị lộ chuỗi raw `thue_studio`.
  2. *[Nhỏ]* Danh sách tiện ích trên trang chi tiết hiển thị key tiếng Anh dạng camelCase (`airConditioner`, `freeTime`...) thay vì nhãn tiếng Việt ("Máy lạnh", "Giờ giấc tự do").

---

## 2. VAI TRÒ 2 — Kỹ sư phần mềm chuyên nghiệp (Technical Deep Dive)

### 2.1 Frontend (`apps/web`)
- **Phát hiện #51 [🔴 Nghiêm trọng]**: Trang duyệt tin Admin (`/admin/tin-cho-duyet`) gọi HTTP method `PATCH` tới `/admin/listings/:id/approve` và `/admin/listings/:id/reject`, đồng thời gửi body `{ rejectionReason: ... }`. Trong khi đó backend `AdminController` chỉ định nghĩa `@Post`, và DTO yêu cầu `{ reason: ... }`. Kết quả: Mọi thao tác Phê duyệt hoặc Từ chối tin từ giao diện Admin đều bị sập (404/400)!
- **Phát hiện #52 [🔴 Nghiêm trọng]**: Modal Báo cáo vi phạm (`ReportListingModal.tsx`) gửi các giá trị enum tiếng Anh (`spam`, `wrong_info`, `sold`, `fraud`, `other`), trong khi `ReportListingDto` ở backend chỉ chấp nhận enum tiếng Việt (`tin_gia`, `lua_dao`, `sai_thong_tin`, `da_ban_cho_thue`, `khac`). Kết quả: 100% lượt gửi báo cáo vi phạm từ người dùng đều bị lỗi 400 Bad Request!
- **Kiểm tra liên kết `<Link href>`**: Đã đối chiếu toàn bộ các liên kết trong Header, Footer, Breadcrumbs — 100% trỏ tới các route thực tế, không có dead-link.
- **Kiểm tra SEO**: Mọi trang công khai đều có `export const metadata: Metadata` chuẩn SEO (title, description, openGraph, canonical).

### 2.2 Backend (`apps/api`)
- **Phát hiện #53 [🟠 Quan trọng]**: `HttpExceptionFilter` trước đây chỉ bắt exception và trả về JSON mã lỗi mà **hoàn toàn không ghi log** ra console hay hệ thống. Khi xảy ra lỗi 500 hoặc unhandled exception ở production, lỗi bị nuốt chửng mà lập trình viên không thể biết nguyên nhân hay stack trace.
- **Phát hiện #54 [🟠 Quan trọng]**: Hàm tìm kiếm `ListingsService.findAll` chỉ kiểm tra `status = active` mà không kiểm tra thời hạn hết hạn (`expiresAt`). Nếu có tin đăng đã qua 30 ngày mà chưa chuyển trạng thái, tin vẫn hiển thị trên trang tìm kiếm công khai.
- **Bảo mật & RBAC**:
  - JWT Secret được kiểm tra bảo vệ chặt chẽ qua `assertRequiredSecrets()`.
  - Toàn bộ endpoint quản trị `/admin/*` được bảo vệ bằng `@Roles('admin')` và `RolesGuard` toàn cục.
  - Phân quyền sở hữu dữ liệu (IDOR check) được enforce qua `assertOwnership` trên mọi thao tác sửa/xóa/upload tin.

### 2.3 Kỹ thuật đồng bộ dữ liệu & Background Jobs (Data Sync)
- **Phát hiện #55 [🟠 Quan trọng]**: Hệ thống hoàn toàn thiếu cơ chế tự động chuyển trạng thái tin đăng khi hết hạn (30 ngày) và dọn dẹp các mã OTP cũ trong bộ nhớ.
- **Đánh giá kiến trúc `apps/worker` & Meilisearch**:
  - *Hiện tại:* Ở quy mô MVP Cho thuê, việc duy trì một app riêng `apps/worker` đòi hỏi thêm cấu hình BullMQ + Redis container liên tục chạy ngầm, gây lãng phí tài nguyên và rủi ro môi trường phát triển cục bộ.
  - *Giải pháp tối ưu hiện tại:* Tích hợp `TasksModule` trực tiếp trong `apps/api` sử dụng cơ chế lifecycle `OnApplicationBootstrap` và timer không chặn (non-blocking). Module này tự động quét các tin đăng quá hạn mỗi 10 phút để chuyển sang `expired`, đồng thời quét giải phóng các OTP hết hạn khỏi bộ nhớ.
  - *Lộ trình tách `apps/worker` riêng biệt:* Sẽ triển khai khi hệ thống bước vào Giai đoạn 2-3 (khi khối lượng import dữ liệu ngoài > 10.000 tin, xử lý nén/watermark video hoặc resize hàng nghìn ảnh nặng).

### 2.4 Trang Quản trị (Admin Portal)
- Đã có hệ thống Admin hoàn chỉnh với UI thuần tiếng Việt tại `/admin`:
  - Trang Tổng quan Dashboard: 4 thẻ thống kê thời gian thực (Tin chờ duyệt, Báo cáo vi phạm mới, Tin đang hiển thị, Tổng người dùng) kèm danh sách xem nhanh.
  - Trang Duyệt tin đăng (`/admin/tin-cho-duyet`): Xem chi tiết biểu phí điện nước, cọc, tiện ích, trường ĐH lân cận; nút Phê duyệt và Từ chối kèm hộp thoại lý do.
  - Trang Báo cáo vi phạm (`/admin/bao-cao-vi-pham`): Xử lý gỡ tin hoặc bỏ qua báo cáo.
  - Trang Quản lý người dùng (`/admin/nguoi-dung`): Tìm kiếm, lọc theo vai trò, Khóa/Mở khóa tài khoản an toàn.
- Đã sửa triệt để lỗi kết nối HTTP method & DTO mismatch để chủ website vận hành mượt mà bằng nút bấm 100%, không cần mở Prisma Studio hay câu lệnh SQL nào.

---

## 3. BẢNG TỔNG HỢP CÁC LỖI & THIẾU SÓT ĐÃ SỬA TRIỆT ĐỂ (#51 - #60)

| # | Mức độ | Lĩnh vực | Vấn đề | Đã khắc phục triệt để bằng cách |
|---|---|---|---|---|
| **51** | 🔴 Nghiêm trọng | Admin UI/API | `tin-cho-duyet/page.tsx` gọi method `PATCH` và gửi `{ rejectionReason }`, backend chỉ nhận `POST` và `{ reason }` gây 404/400 | Sửa frontend gọi `POST` kèm `{ reason, rejectionReason }`; đồng thời cập nhật `AdminController` hỗ trợ cả `@Post` và `@Patch`, `RejectListingDto` hỗ trợ cả 2 field |
| **52** | 🔴 Nghiêm trọng | Report vi phạm | `ReportListingModal.tsx` gửi enum tiếng Anh (`spam`, `wrong_info`...) bị `ReportListingDto` từ chối 100% | Cập nhật frontend dùng radio value tiếng Việt (`tin_gia`, `sai_thong_tin`, `da_ban_cho_thue`, `lua_dao`, `khac`); đồng thời backend mở rộng chấp nhận cả 2 bộ enum |
| **53** | 🟠 Quan trọng | Backend Logging | `HttpExceptionFilter` nuốt chửng lỗi 500, không in stack trace hay context ra console | Tích hợp NestJS `Logger('HTTP_ERROR')` ghi log có cấu trúc (method, url, ip, status, error message, stack trace, timestamp) |
| **54** | 🟠 Quan trọng | Tìm kiếm / Sync | `ListingsService.findAll` không lọc tin đã hết hạn (`expiresAt < now`) | Bổ sung điều kiện `OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]` vào truy vấn Prisma |
| **55** | 🟠 Quan trọng | Background Job | Hệ thống không có tác vụ nền chuyển trạng thái tin hết hạn và dọn OTP | Xây dựng `TasksModule` & `TasksService` tự động quét định kỳ mỗi 10 phút, chuyển tin quá hạn sang `expired` và dọn OTP bộ nhớ |
| **56** | 🟡 UX Đăng tin | Frontend UX | Form đăng tin (`/dang-tin`) không có thumbnail xem trước ảnh đã chọn | Bổ sung state `selectedFiles`/`previewUrls`, render gallery thumbnail có nút "×" xóa từng ảnh trực tiếp trước khi gửi |
| **57** | 🟡 UX Auth | Frontend UX | Form đăng nhập hiển thị raw `Failed to fetch` khi mất mạng/server offline | Thêm hàm `formatFriendlyError` chuyển thành thông báo tiếng Việt: *"Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau."* |
| **58** | 🟡 Tiêu đề / i18n | Frontend UI | URL `/thue?categoryGroup=thue_studio` hiển thị raw `thue_studio` trên H1 | Bổ sung từ điển `CATEGORY_NAMES` chuyển thành *"Cho thuê Studio & Căn hộ mini mới nhất tháng 9 năm 2026"* và breadcrumb chuẩn |
| **59** | 🟢 Hiển thị tiện ích | Frontend UI | Trang chi tiết tin (`/tin/[slug]`) hiển thị key camelCase (`airConditioner`...) do map thiếu | Mở rộng `AMENITY_MAP` bao gồm đầy đủ cả key camelCase và snake_case với icon và nhãn tiếng Việt tương ứng |
| **60** | 🟢 Trust Signals | Pháp lý & Uy tín | Chân trang có text điều khoản/chính sách tĩnh không click được | Xây dựng 4 trang hoàn chỉnh: `/dieu-khoan`, `/chinh-sach`, `/gioi-thieu`, `/lien-he` với đầy đủ metadata SEO và gắn link chuẩn ở Footer |

---

## 4. BẰNG CHỨNG KIỂM ĐỊNH THỰC TẾ (VERIFICATION EVIDENCE)

### 4.1 Backend TypeScript Typecheck (`apps/api`)
```bash
$ & "d:\BĐS\node_modules\.bin\tsc.cmd" --noEmit -p apps/api/tsconfig.json
# Mã thoát: 0 — HOÀN TOÀN SẠCH LỖI TYPESCRIPT (0 errors)
```

### 4.2 Frontend Next.js Production Build (`apps/web`)
```bash
$ & "d:\BĐS\apps\web\node_modules\.bin\next.cmd" build
  ▲ Next.js 14.2.15

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (26/26)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    187 B          94.1 kB
├ ○ /_not-found                          163 B          87.3 kB
├ ○ /admin                               4.17 kB        98.1 kB
├ ○ /admin/bao-cao-vi-pham               4.02 kB        91.1 kB
├ ○ /admin/nguoi-dung                    4.01 kB        91.1 kB
├ ○ /admin/tin-cho-duyet                 7.03 kB        94.2 kB
├ ○ /chinh-sach                          187 B          94.1 kB
├ ƒ /cho-thue-mat-bang                   2.73 kB        96.6 kB
├ ƒ /cho-thue-tro                        2.73 kB        96.6 kB
├ ○ /dang-nhap                           2.35 kB        89.5 kB
├ ○ /dang-tin                            5.66 kB        99.6 kB
├ ○ /dieu-khoan                          187 B          94.1 kB
├ ○ /du-an                               163 B          87.3 kB
├ ○ /gia-nha-dat                         163 B          87.3 kB
├ ○ /gioi-thieu                          187 B          94.1 kB
├ ○ /lien-he                             187 B          94.1 kB
├ ○ /moi-gioi                            163 B          87.3 kB
├ ○ /mua-ban                             163 B          87.3 kB
├ ○ /robots.txt                          0 B                0 B
├ ○ /sitemap.xml                         0 B                0 B
├ ○ /tai-khoan/quan-ly-tin               2.89 kB        96.8 kB
├ ○ /tai-khoan/thong-tin                 2.69 kB        89.8 kB
├ ○ /tai-khoan/tin-da-luu                2.64 kB        96.5 kB
├ ƒ /thue                                2.73 kB        96.6 kB
└ ƒ /tin/[slug]                          5.74 kB        99.6 kB
+ First Load JS shared by all            87.1 kB

# Mã thoát: 0 — 26/26 ROUTES BIÊN DỊCH VÀ TẠO STATIC/DYNAMIC THÀNH CÔNG 100%
```

### 4.3 Kiểm thử thực tế trên trình duyệt (Browser Subagent E2E)
- **Video ghi lại phiên kiểm thử:** `audit_verification_1788708599148.webp`
- **Ảnh chụp màn hình các trang đã xác minh:**
  - `dieu_khoan_page_1788708627612.png` — Trang Điều khoản dịch vụ
  - `chinh_sach_page_1788708637329.png` — Trang Chính sách bảo mật
  - `lien_he_page_1788708645792.png` — Trang Liên hệ & Hotline
  - `gioi_thieu_page_1788708654013.png` — Trang Giới thiệu nền tảng
  - `studio_category_page_1788708668042.png` — Danh mục Studio chuẩn tiếng Việt
  - `dang_tin_image_upload_1788708695169.png` — Khu vực tải ảnh form đăng tin
  - `admin_gate_page_1788708723248.png` — Cổng kiểm soát bảo mật Admin

---

## 5. CẬP NHẬT TIẾN ĐỘ & CHECKLIST TÀI LIỆU DỰ ÁN

1. Đã cập nhật checklist mục 16 trong `README.md`:
   - [x] Trang Admin duyệt tin, Báo cáo vi phạm, Quản lý người dùng hoàn chỉnh.
   - [x] Đa kênh liên hệ: Hotline/Zalo **0981 753 082**, Email hỗ trợ, Trang Liên hệ chính thức.
   - [x] Các trang pháp lý & điều khoản: `/dieu-khoan`, `/chinh-sach`, `/gioi-thieu`, `/lien-he`.
   - [x] Tác vụ nền (Background scheduler) tự động quét tin hết hạn và giải phóng bộ nhớ OTP.
   - [x] Ghi log lỗi có cấu trúc (Structured Logging) trong `HttpExceptionFilter`.
2. Đã cập nhật `TRANG-THAI-TRIEN-KHAI.md`, `memory-bank/progress.md` và `memory-bank/activeContext.md`.
3. Toàn bộ mã nguồn được lưu trữ trên nhánh Git riêng: `audit/dual-review-completion-2026-09-06`.
