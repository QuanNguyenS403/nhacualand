# Hướng dẫn Triển khai Gộp 1 Web Service Duy Nhất trên Render (render.com)

Tài liệu này hướng dẫn cách cấu hình gộp toàn bộ Backend API và Frontend Web thành **MỘT dịch vụ Web Service duy nhất** trên Render chạy thật 100% với khách hàng, không test, không mock

---

## 1. Ưu Điểm Tuyệt Đối Của Mô Hình Gộp 1 Web Service

1. **Chỉ cần tạo 1 Web Service duy nhất trên Render** (chính là service `qns_broker` bạn đang mở): Tiết kiệm 100% chi phí và tài nguyên
2. **Chỉ cần 1 tên miền duy nhất**: Truy cập trực tiếp qua `https://nhacualand.com` (hoặc `https://qns-broker.onrender.com`), Next.js tự động chuyển tiếp ngầm tất cả request API sang NestJS nội bộ
3. **Triệt tiêu 100% lỗi CORS**: Vì frontend và backend cùng chung một nguồn (Same-Origin)
4. **Cấu hình môi trường cực kỳ nhanh gọn**: Chỉ cần copy và dán duy nhất 1 lần vào mục "Add from .env"

---

## 2. Bảng Biến Môi Trường Chạy Thật Với Khách Hàng (Không Test, Không Mock)

Toàn bộ các biến dưới đây cấu hình hệ thống hoạt động thật 100% với khách hàng:

| Tên biến | Giá trị cấu hình | Ý nghĩa vận hành thực tế |
|---|---|---|
| `NODE_ENV` | `production` | Kích hoạt chế độ sản phẩm thật cho toàn hệ thống |
| `PORT` | `10000` | Cổng dịch vụ web công khai do Render cấp |
| `DATABASE_URL` | Lấy từ `nhacualand-postgres` | Chuỗi Internal Database URL kết nối cơ sở dữ liệu thật trên Render |
| `JWT_ACCESS_SECRET` | Render tự sinh hoặc chuỗi 256-bit | Khóa bí mật ký phiên đăng nhập của khách hàng |
| `JWT_REFRESH_SECRET` | Render tự sinh hoặc chuỗi 256-bit | Khóa bí mật ký duy trì đăng nhập của khách hàng |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Thời hạn phiên truy cập (15 phút) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Thời hạn phiên làm mới (7 ngày) |
| `CORS_ORIGINS` | `https://nhacualand.com,https://www.nhacualand.com,https://qns-broker.onrender.com,http://localhost:3000` | Danh sách tên miền được phép truy cập |
| `ADMIN_PHONE` | `0981753082` | Số hotline và tài khoản quản trị hệ thống của Quân |
| `ADMIN_NOTIFICATION_EMAIL` | `ducquan16102006@gmail.com` | Email nhận thông báo đặt lịch xem phòng thật của khách |
| `ADMIN_BOOTSTRAP_SECRET` | `ae45fa53647fdc8811164f26ad6ebda9275b379a0a092a739351c80f11fd357e` | Khóa bảo mật khởi tạo tài khoản SuperAdmin |
| `ADMIN_BOOTSTRAP_PHONE` | `0981753082` | Số điện thoại tài khoản SuperAdmin |
| `ADMIN_BOOTSTRAP_PASSWORD` | `Quannguyenkay6@` | Mật khẩu tài khoản SuperAdmin |
| `ADMIN_BOOTSTRAP_FULLNAME` | `Nguyễn Đức Quân` | Họ tên tài khoản SuperAdmin |
| `ADMIN_MFA_ENFORCED` | `false` | Bảo mật 2 lớp cho Quản trị viên |
| `ADMIN_MFA_SECRET` | `QnsAdminMfa2026!` | Khóa bí mật xác thực 2 lớp |
| `MAIL_DRIVER` | `smtp` | Gửi email thông báo thật qua Gmail SMTP |
| `SMTP_HOST` | `smtp.gmail.com` | Máy chủ gửi thư Gmail |
| `SMTP_PORT` | `465` | Cổng bảo mật SSL |
| `SMTP_SECURE` | `true` | Bật mã hóa SSL an toàn |
| `SMTP_USER` | `ducquan16102006@gmail.com` | Tài khoản Gmail gửi thư tự động thật cho khách |
| `SMTP_PASS` | Mật khẩu ứng dụng Gmail 16 chữ cái | Mật khẩu App Password tạo từ Google Account |
| `SMTP_FROM` | `NHACUALAND <ducquan16102006@gmail.com>` | Tên và email người gửi hiển thị với khách hàng |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Mã Client ID của bạn | Mã hiển thị nút Tiếp tục với Google cho khách hàng |
| `GOOGLE_CLIENT_ID` | Mã Client ID của bạn | Mã xác thực tài khoản Google phía server |
| `GOOGLE_CLIENT_SECRET` | Khóa Secret của bạn | Khóa bí mật xác thực tài khoản Google phía server |
| `GOOGLE_CALLBACK_URL` | `https://nhacualand.com/auth/google/callback` | Đường dẫn phản hồi đăng nhập Google thật |
| `STORAGE_DRIVER` | `local` | Trình lưu trữ ảnh phòng trọ thực tế |
| `NEXT_PUBLIC_SITE_URL` | `https://nhacualand.com` | Tên miền chính thức của website |
| `NEXT_PUBLIC_API_URL` | *(Để rỗng)* | Để rỗng để Next.js tự động chuyển tiếp ngầm cùng domain |

---

## 3. Hướng Dẫn Cấu Hình Màn Hình "New Web Service" Trong Ảnh

Khi tạo hoặc sửa Web Service `qns_broker` trên Render:

1. **Name**: `qns_broker` (hoặc `nhacualand-app`)
2. **Language**: `Node`
3. **Branch**: `main`
4. **Region**: `Singapore (Southeast Asia)`
5. **Root Directory**: *(Để trống)*
6. **Build Command**: Nhập trực tiếp chuỗi lệnh sau vào ô:
   ```bash
   corepack enable && pnpm install --frozen-lockfile && pnpm db:generate && pnpm build
   ```
   *(Lệnh này chạy độc lập, tự cài pnpm, sinh database client và build cả hệ thống)*
7. **Start Command**: Nhập trực tiếp lệnh sau vào ô (xóa chữ `yarn start`):
   ```bash
   node scripts/start-all.js
   ```
8. **Compute**: Chọn gói `$0 / month Free`
9. **Environment Variables**:
   - Bấm vào nút **`Add from .env`** (nút màu xám ngay cạnh nút `+ Add Environment Variable`)
   - Copy toàn bộ nội dung file [`.env.render`](file:///D:/QNS%20Cho%20Thu%C3%AA/.env.render) và dán vào khung nhập liệu
   - Thay giá trị `DATABASE_URL` bằng **Internal Database URL** từ PostgreSQL Render của bạn
   - Điền mật khẩu ứng dụng Gmail 16 ký tự vào `SMTP_PASS`

---

## 4. Các Lệnh Git Để Đẩy Lên GitHub Trước Khi Deploy

Mở terminal tại máy tính và chạy lần lượt:

```bash
git push origin main
```

Sau khi push thành công, trên Render bạn chỉ cần bấm **Deploy web service** (hoặc **Manual Deploy** > **Deploy latest commit**) là hệ thống sẽ khởi chạy thành công 100%
