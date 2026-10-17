# Hướng dẫn Triển khai Hệ thống NHACUALAND trên Render (render.com)

Tài liệu này hướng dẫn cách cấu hình gộp toàn bộ Backend API và Frontend Web thành **MỘT dịch vụ Web Service duy nhất** trên Render chạy thật 100% với khách hàng, thay thế hoàn toàn việc sử dụng Cloudflare Tunnel

---

## 1. Ưu Điểm Của Mô Hình Triển Khai Trên Render Thay Cho Cloudflare Tunnel

1. **Không phụ thuộc máy tính cá nhân**: Website hoạt động 24/7 trực tiếp trên nền tảng đám mây Singapore tốc độ cao, không cần bật máy tính hay chạy file `.bat`
2. **Triệt tiêu hoàn toàn rủi ro rò rỉ Tunnel Token**: Không còn sử dụng các file `.bat` chứa token và không cần cài đặt `cloudflared`
3. **Mô hình gộp 1 Web Service duy nhất (`nhacualand`)**: Tiết kiệm tối đa chi phí và tài nguyên (chỉ cần 1 Web Service và 1 Managed PostgreSQL)
4. **Triệt tiêu lỗi CORS**: Do Frontend Web (Next.js) và Backend API (NestJS) chạy chung một domain (Same-Origin), Next.js tự động proxy ngầm mọi request nội bộ
5. **SSL/HTTPS tự động**: Render tự động cấp chứng chỉ bảo mật SSL cho tên miền `nhacualand.com`

---

## 2. Bảng Biến Môi Trường Cấu Hình Trên Render

Khi tạo Web Service trên Render, dán các biến sau vào mục "Add from .env":

| Tên biến | Giá trị cấu hình | Ý nghĩa vận hành thực tế |
|---|---|---|
| `NODE_ENV` | `production` | Kích hoạt chế độ sản phẩm thật cho toàn hệ thống |
| `PORT` | `10000` | Cổng dịch vụ web công khai do Render cấp |
| `DATABASE_URL` | Lấy từ `nhacualand-postgres` | Chuỗi Internal Database URL kết nối cơ sở dữ liệu PostgreSQL trên Render |
| `JWT_ACCESS_SECRET` | Chuỗi ngẫu nhiên dài ≥ 64 ký tự | Khóa bí mật ký phiên đăng nhập của người dùng |
| `JWT_REFRESH_SECRET` | Chuỗi ngẫu nhiên dài ≥ 64 ký tự | Khóa bí mật duy trì đăng nhập của người dùng |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Thời hạn phiên truy cập (15 phút) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Thời hạn phiên làm mới (7 ngày) |
| `CORS_ORIGINS` | `https://nhacualand.com,https://www.nhacualand.com,https://nhacualand.onrender.com,http://localhost:3000` | Danh sách tên miền được phép truy cập |
| `ADMIN_PHONE` | `0981753082` | Số hotline tư vấn và tài khoản quản trị hệ thống |
| `ADMIN_NOTIFICATION_EMAIL` | `ducquan16102006@gmail.com` | Email nhận thông báo đặt lịch xem phòng thật của khách |
| `ADMIN_BOOTSTRAP_SECRET` | Chuỗi bí mật ngẫu nhiên | Khóa bảo mật khởi tạo tài khoản Quản trị viên |
| `ADMIN_BOOTSTRAP_PHONE` | `0981753082` | Số điện thoại tài khoản Quản trị viên |
| `ADMIN_BOOTSTRAP_PASSWORD` | Mật khẩu quản trị của bạn | Mật khẩu tài khoản Quản trị viên |
| `ADMIN_BOOTSTRAP_FULLNAME` | `Chủ nhà` | Họ tên hiển thị của Quản trị viên |
| `ADMIN_MFA_ENFORCED` | `false` | Tùy chọn bảo mật 2 lớp cho Quản trị viên |
| `ADMIN_MFA_SECRET` | Chuỗi bí mật ngẫu nhiên | Khóa xác thực 2 lớp nếu kích hoạt MFA |
| `MAIL_DRIVER` | `smtp` | Gửi email thông báo thật qua Gmail SMTP |
| `SMTP_HOST` | `smtp.gmail.com` | Máy chủ gửi thư Gmail |
| `SMTP_PORT` | `465` | Cổng bảo mật SSL |
| `SMTP_SECURE` | `true` | Bật mã hóa SSL an toàn |
| `SMTP_USER` | `ducquan16102006@gmail.com` | Tài khoản Gmail gửi thư tự động thật cho khách |
| `SMTP_PASS` | Mật khẩu ứng dụng Gmail 16 chữ cái | Mật khẩu App Password tạo từ Google Account |
| `SMTP_FROM` | `NHACUALAND <ducquan16102006@gmail.com>` | Tên và email người gửi hiển thị với khách hàng |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `853230977507-6f7vlho33papqgpn12j5eq3p4ids6hdh.apps.googleusercontent.com` | Mã hiển thị nút Tiếp tục với Google cho khách hàng |
| `GOOGLE_CLIENT_ID` | `853230977507-6f7vlho33papqgpn12j5eq3p4ids6hdh.apps.googleusercontent.com` | Mã xác thực tài khoản Google phía server |
| `GOOGLE_CLIENT_SECRET` | Khóa Secret Google của bạn | Khóa bí mật xác thực tài khoản Google phía server |
| `GOOGLE_CALLBACK_URL` | `https://nhacualand.com/auth/google/callback` | Đường dẫn phản hồi đăng nhập Google thật |
| `STORAGE_DRIVER` | `local` | Trình lưu trữ ảnh phòng trọ thực tế |
| `NEXT_PUBLIC_SITE_URL` | `https://nhacualand.com` | Tên miền chính thức của website |
| `NEXT_PUBLIC_API_URL` | *(Để rỗng)* | Để rỗng để Next.js tự động chuyển tiếp ngầm cùng domain |

---

## 3. Các Bước Tạo Web Service Trên Render Dashboard

### Bước 1: Tạo Database PostgreSQL
1. Truy cập [dashboard.render.com](https://dashboard.render.com)
2. Chọn **New +** ➔ **PostgreSQL**
3. Điền tên: `nhacualand-postgres`, Database: `batdongsan`, Region: `Singapore`
4. Chọn gói phù hợp (Starter hoặc Free) rồi bấm **Create Database**
5. Sau khi tạo xong, sao chép dòng **Internal Database URL**

### Bước 2: Tạo Web Service
1. Chọn **New +** ➔ **Web Service**
2. Chọn repository GitHub của dự án
3. Cấu hình các thông số:
   - **Name**: `nhacualand`
   - **Region**: `Singapore`
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `bash scripts/render-build.sh`
   - **Start Command**: `node scripts/start-all.js`
4. Tại mục **Environment Variables**:
   - Bấm vào nút **Add from .env**
   - Copy nội dung tệp [`.env.render`](file:///D:/QNS%20Cho%20Thu%C3%AA/.env.render) dán vào ô
   - Điền giá trị `DATABASE_URL` từ Bước 1
   - Điền `SMTP_PASS` (Mật khẩu ứng dụng Gmail 16 chữ cái) và `GOOGLE_CLIENT_SECRET`
5. Bấm **Create Web Service**

---

## 4. Gắn Tên Miền Riêng `nhacualand.com`

1. Trên màn hình Web Service `nhacualand` tại Render, vào mục **Settings** ➔ **Custom Domains**
2. Bấm **Add Custom Domain** và nhập:
   - `nhacualand.com`
   - `www.nhacualand.com`
3. Trỏ bản ghi DNS tại nhà cung cấp tên miền của bạn:
   - Bản ghi `A` cho `@` trỏ về IP do Render cung cấp
   - Bản ghi `CNAME` cho `www` trỏ về `nhacualand.onrender.com`
4. Render sẽ tự động xác thực và kích hoạt chứng chỉ SSL Let's Encrypt hoàn toàn miễn phí
