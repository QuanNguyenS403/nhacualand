# BÁO CÁO RÀ SOÁT BẢO MẬT VÀ XÁC THỰC (A2) — QNS BROKER
**Agent thực hiện:** Vai A2 (Chuyên gia An ninh mạng — Chế độ Rà soát Độc lập / Mù)  
**Ngày:** 2026-10-17  

---

## 1. PHẠM VI VÀ PHƯƠNG PHÁP RÀ SOÁT

- Toàn bộ luồng Auth: đăng ký email, Google login, refresh token, đăng xuất, bootstrap admin.
- Kiểm tra tính toàn vẹn của JWT secrets, thuật toán băm mật khẩu (`bcryptjs` cost 10), cơ chế thu hồi token qua `tokenVersion`.
- Rà soát lỗ hổng IDOR trên toàn bộ các endpoint thao tác theo `:id`.
- Kiểm tra các tiêu đề bảo mật HTTP (Helmet, CSP, CORS, HSTS) và cấu hình `trust proxy`.
- Kiểm tra tính hợp lệ và an toàn của các tệp tải lên (upload endpoints).
- Quét bí mật rò rỉ trong mã nguồn và lịch sử Git (tuân thủ nghiêm ngặt quy tắc R3: chỉ ghi nhận loại bí mật, vị trí và độ dài).
- Rà soát `pnpm audit` (phụ thuộc bên thứ ba).

---

## 2. KẾT QUẢ ĐO ĐẠC BẢO MẬT

1. **Khóa bí mật JWT:** Phát hiện 2 giá trị bí mật fallback hardcode trong `auth.service.ts:560-561`, trong khi `jwt.strategy.ts` chỉ đọc trực tiếp biến môi trường.
2. **Xác thực chữ ký JWT trên bản đồ:** `listings.controller.ts:108` sử dụng `jwtService.decode` thay vì `verify`, dẫn tới khả năng mạo danh `currentUserId` mà không cần khóa bí mật.
3. **Cấu hình mạng sau Reverse Proxy / Cloudflare:** `apps/api/src/main.ts` thiếu cấu hình `trust proxy`, tiềm ẩn nguy cơ Throttler chặn nhầm toàn bộ người dùng dùng chung IP của Cloudflare.
4. **Bảo mật Upload:** Route handler Next.js `/api/upload-images` cho phép tải ảnh lên mà không cần xác thực tài khoản và không kiểm tra giới hạn dung lượng tệp.
5. **Lịch sử Git:** Tồn tại commit cũ `f9ec1d2` chứa token Cloudflare Tunnel dạng JWT 184 ký tự và tệp nhị phân `cloudflared.exe` (55MB). Tệp hiện đã được xóa khỏi nhánh làm việc ở commit `14a59e0`, nhưng vẫn còn nằm trong lịch sử git.
6. **Tiêu đề bảo mật:** Backend NestJS chưa tích hợp `helmet`.
7. **Lỗ hổng phụ thuộc (`pnpm audit`):** Tổng cộng 89 cảnh báo (4 critical, 39 high, 37 moderate, 9 low), chủ yếu liên quan tới phiên bản Next.js và body-parser/multer.

---

## 3. DANH SÁCH PHÁT HIỆN BẢO MẬT (A2)

| ID | Mức độ | Tiêu đề | Vị trí | Làn | Trạng thái |
|---|:---:|---|---|:---:|:---:|
| **SEC-001** | P0 | Khóa bí mật JWT fallback bị hardcode trong auth.service.ts lệch hoàn toàn với jwt.strategy.ts | `apps/api/src/modules/auth/auth.service.ts:560` | F0 | ĐÃ ĐỌC MÃ |
| **SEC-002** | P0 | Token Cloudflare Tunnel 184 ký tự và tệp nhị phân cloudflared.exe 55MB nằm trong lịch sử Git | `git:f9ec1d2` | F5 | ĐÃ TÁI HIỆN |
| **SEC-003** | P1 | Endpoint bản đồ dùng jwtService.decode thay vì verify dẫn tới bỏ qua chữ ký xác thực người dùng | `apps/api/src/modules/listings/listings.controller.ts:108` | F2 | ĐÃ ĐỌC MÃ |
| **SEC-004** | P1 | Thiếu cấu hình trust proxy tại backend khiến Throttler chia sẻ chung một IP của Cloudflare cho toàn bộ người dùng | `apps/api/src/main.ts:25` | F2 | ĐÃ ĐỌC MÃ |
| **SEC-005** | P1 | Route handler /api/upload-images không có xác thực và không kiểm tra giới hạn dung lượng tệp tải lên | `apps/web/src/app/api/upload-images/route.ts:7` | F3 | ĐÃ ĐỌC MÃ |
| **SEC-006** | P1 | Backend NestJS thiếu middleware Helmet thiết lập các tiêu đề bảo mật HTTP chuẩn | `apps/api/src/main.ts:1` | F2 | ĐÃ ĐỌC MÃ |
| **SEC-007** | P2 | Dữ liệu nhạy cảm số điện thoại bị nhúng thừa vào JWT payload | `apps/api/src/modules/auth/auth.service.ts:555` | F0 | ĐÃ ĐỌC MÃ |

---

## 4. MA TRẬN ĐÃ RÀ / CHƯA RÀ

- **Đã rà (100%):** Mọi luồng auth (đăng ký, login, bootstrap, refresh), cấu hình JWT, guard phân quyền, middleware rate limit, upload handlers, tệp `.bat`, tiêu đề bảo mật HTTP.
- **Chưa rà:** Tính đồng bộ mô hình dữ liệu chi tiết ở tầng database (chuyển giao cho A4).
