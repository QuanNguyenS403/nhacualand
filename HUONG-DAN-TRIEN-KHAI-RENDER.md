# Hướng dẫn Triển khai Toàn diện Hệ thống NHACUALAND lên Render (render.com)

Tài liệu này tổng hợp toàn bộ cấu hình môi trường chuẩn xác và hướng dẫn từng bước đưa website và backend NHACUALAND lên môi trường đám mây Render 24/7

---

## 1. Danh mục Biến Môi Trường Chi Tiết

Toàn bộ các biến môi trường này đã được định nghĩa tự động trong file [render.yaml](file:///D:/QNS%20Cho%20Thu%C3%AA/render.yaml)

### A. Dịch vụ Backend API (`nhacualand-api`)

| Tên biến | Giá trị cấu hình | Ý nghĩa & Hướng dẫn |
|---|---|---|
| `NODE_ENV` | `production` | Môi trường vận hành thực tế |
| `DATABASE_URL` | Tự động lấy từ `nhacualand-postgres` | Chuỗi kết nối cơ sở dữ liệu PostgreSQL |
| `JWT_ACCESS_SECRET` | Tự động sinh ngẫu nhiên 256-bit | Khóa bí mật ký token đăng nhập (Render tự sinh) |
| `JWT_REFRESH_SECRET` | Tự động sinh ngẫu nhiên 256-bit | Khóa bí mật ký token làm mới phiên đăng nhập |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Thời hạn phiên truy cập (15 phút) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Thời hạn phiên làm mới (7 ngày) |
| `CORS_ORIGINS` | `https://nhacualand.com,https://www.nhacualand.com,https://api.nhacualand.com,https://nhacualand-web.onrender.com,https://nhacualand-api.onrender.com,http://localhost:3000` | Danh sách các tên miền được phép gọi API |
| `SMS_PROVIDER` | `mock` (hoặc `esms` khi có key) | Cấu hình gửi SMS mã OTP đăng ký và xác thực |
| `ALLOW_MOCK_SMS` | `true` | Cho phép in OTP ra console log của Render để đăng ký thử nghiệm mà không mất phí viễn thông |
| `SMS_API_KEY` | Bỏ trống (điền khi đăng ký eSMS thật) | API Key mạng viễn thông |
| `SMS_SECRET_KEY` | Bỏ trống (điền khi đăng ký eSMS thật) | Khóa bí mật mạng viễn thông |
| `ADMIN_PHONE` | `0981753082` | Số hotline và tài khoản quản trị hệ thống |
| `ADMIN_NOTIFICATION_EMAIL` | `ducquan16102006@gmail.com` | Email nhận thông báo đặt lịch xem phòng và tin đăng mới |
| `ADMIN_BOOTSTRAP_SECRET` | `ae45fa53647fdc8811164f26ad6ebda9275b379a0a092a739351c80f11fd357e` | Khóa bí mật chạy lệnh tạo tài khoản SuperAdmin |
| `ADMIN_BOOTSTRAP_PHONE` | `0981753082` | Số điện thoại tài khoản SuperAdmin |
| `ADMIN_BOOTSTRAP_PASSWORD` | `Quannguyenkay6@` | Mật khẩu khởi tạo của SuperAdmin |
| `ADMIN_BOOTSTRAP_FULLNAME` | `Nguyễn Đức Quân` | Họ tên tài khoản SuperAdmin |
| `ADMIN_MFA_ENFORCED` | `false` | Trạng thái bảo mật 2 lớp cho Admin |
| `ADMIN_MFA_SECRET` | `QnsAdminMfa2026!` | Khóa bí mật xác thực 2 lớp |
| `MAIL_DRIVER` | `smtp` | Trình điều khiển gửi email tự động |
| `SMTP_HOST` | `smtp.gmail.com` | Máy chủ gửi thư Gmail |
| `SMTP_PORT` | `465` | Cổng bảo mật SSL của Gmail |
| `SMTP_SECURE` | `true` | Bật mã hóa SSL an toàn |
| `SMTP_USER` | `ducquan16102006@gmail.com` | Tài khoản Gmail gửi thư tự động |
| `SMTP_PASS` | Mật khẩu ứng dụng 16 ký tự | Mật khẩu App Password tạo từ Google Account (xem mục 3 bên dưới) |
| `SMTP_FROM` | `NHACUALAND <ducquan16102006@gmail.com>` | Nhãn và email người gửi hiển thị với người nhận |
| `GOOGLE_CLIENT_ID` | Mã Client ID của bạn | Mã Client ID tạo từ Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Khóa Secret của bạn | Mã Client Secret tạo từ Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `https://nhacualand.com/auth/google/callback` | Đường dẫn callback đăng nhập Google |
| `STORAGE_DRIVER` | `local` | Trình lưu trữ ảnh đăng tin |
| `NEXT_PUBLIC_SITE_URL` | `https://nhacualand.com` | Tên miền chính của website |

---

### B. Dịch vụ Frontend Web (`nhacualand-web`)

| Tên biến | Giá trị cấu hình | Ý nghĩa & Hướng dẫn |
|---|---|---|
| `NODE_ENV` | `production` | Môi trường vận hành thực tế |
| `NEXT_PUBLIC_API_URL` | `https://api.nhacualand.com` (hoặc để trống khi gộp 1 service) | Địa chỉ API backend để frontend giao tiếp |
| `NEXT_PUBLIC_SITE_URL` | `https://nhacualand.com` (hoặc `https://qns-broker.onrender.com`) | Tên miền chính website hiển thị với người dùng |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Mã Client ID của bạn | Mã Client ID để hiển thị nút Tiếp tục với Google |

---

## 2. Hướng Dẫn Lấy Mật Khẩu Ứng Dụng Gmail (SMTP_PASS)

Để hệ thống tự động gửi email xác nhận đặt lịch xem phòng cho khách hàng và gửi email thông báo cho Quân:
1. Đăng nhập vào tài khoản Google: `ducquan16102006@gmail.com`
2. Bật tính năng **Xác minh 2 bước** (2-Step Verification) nếu chưa bật
3. Truy cập vào trang tạo mật khẩu ứng dụng: https://myaccount.google.com/apppasswords
4. Đặt tên ứng dụng (ví dụ: `NHACUALAND Render`) rồi bấm **Tạo** (Create)
5. Google sẽ cấp một mật khẩu gồm **16 ký tự** (dạng `abcd efgh ijkl mnop`)
6. Copy mã 16 ký tự này (bỏ dấu cách) và điền vào biến `SMTP_PASS` trên Render Dashboard

---

## 3. Các Bước Triển Khai Lên Render Bằng Blueprint 1-Click

### Bước 1: Đẩy mã nguồn lên GitHub
Mở terminal tại máy tính và chạy:
```bash
git add .
git commit -m "feat: cap nhat cau hinh moi truong chuan deploy render"
git push origin main
```

### Bước 2: Tạo Blueprint trên Render
1. Truy cập vào **[Render Dashboard](https://dashboard.render.com)** (đăng nhập bằng tài khoản GitHub)
2. Nhấn nút **New +** ở góc trên bên phải màn hình -> Chọn **Blueprint**
3. Chọn kho mã nguồn GitHub của bạn (`QuanNguyenS403/qns_broker`)
4. Render sẽ tự động đọc file `render.yaml` và hiển thị 3 tài nguyên:
   - `nhacualand-postgres` (Cơ sở dữ liệu PostgreSQL)
   - `nhacualand-api` (Backend Web Service)
   - `nhacualand-web` (Frontend Web Service)
5. Khi Render yêu cầu nhập các biến chưa có giá trị (`sync: false`):
   - `SMTP_PASS`: Nhập mã ứng dụng Gmail 16 chữ cái đã lấy ở mục 2
   - `SMS_API_KEY` & `SMS_SECRET_KEY`: Có thể để trống (hệ thống sẽ tự động in mã OTP ra console log của Render vì đã bật `ALLOW_MOCK_SMS=true`)
6. Bấm nút **Apply** để Render tự động tạo cơ sở dữ liệu và tiến hành build cả hai ứng dụng

---

## 4. Khởi Tạo Dữ Liệu Ban Đầu Sau Khi Deploy

Khi cả hai dịch vụ `nhacualand-api` và `nhacualand-web` chuyển sang màu xanh (**Live**):
1. Bấm vào dịch vụ **nhacualand-api** trên Render Dashboard
2. Chọn tab **Shell** (cửa sổ dòng lệnh trực tiếp trên server)
3. Chạy 2 lệnh khởi tạo sau:
```bash
pnpm db:seed
pnpm db:bootstrap-admin
```
- Lệnh `pnpm db:seed` sẽ nạp danh mục quận huyện, trường đại học và các phòng mẫu
- Lệnh `pnpm db:bootstrap-admin` sẽ tự động tạo tài khoản Quản trị viên SuperAdmin với thông tin:
  - **Số điện thoại:** `0981753082`
  - **Mật khẩu:** `Quannguyenkay6@`

---

## 5. Cấu Hình Tên Miền Riêng (nhacualand.com)

Mặc định Render cấp 2 tên miền miễn phí:
- Web: `https://nhacualand-web.onrender.com`
- API: `https://nhacualand-api.onrender.com`

Khi muốn gắn tên miền riêng:
1. **Frontend Web:**
   - Vào service **nhacualand-web** -> **Settings** -> **Custom Domains**
   - Thêm `nhacualand.com` và `www.nhacualand.com`
   - Cấu hình DNS tại nhà cung cấp tên miền theo bảng chỉ dẫn của Render
2. **Backend API:**
   - Vào service **nhacualand-api** -> **Settings** -> **Custom Domains**
   - Thêm `api.nhacualand.com`
   - Cấu hình bản ghi CNAME trỏ `api` về Render
3. Sau khi domain kích hoạt, các biến môi trường `NEXT_PUBLIC_SITE_URL` và `NEXT_PUBLIC_API_URL` trong `render.yaml` sẽ tự động ăn khớp 100% với tên miền chính thức

---

## 6. Hướng Dẫn Cấu Hình Biến Môi Trường Thông Qua File .env Trên Render

Render hỗ trợ tính năng **"Add from .env"** cho phép nhập hàng loạt toàn bộ biến môi trường bằng cách dán nội dung file `.env` chỉ trong 1 thao tác:

### Bước 1: Nạp file .env cho Backend API (`nhacualand-api`)
1. Mở file [.env.render.api](file:///D:/QNS%20Cho%20Thu%C3%AA/.env.render.api) trên máy tính và copy toàn bộ nội dung
2. Trên Render Dashboard, bấm vào service **nhacualand-api**
3. Chọn mục **Environment** ở thanh menu bên trái
4. Nhấn nút **Add from .env** (hoặc icon paste .env)
5. Dán toàn bộ nội dung vừa copy vào khung nhập liệu
6. Thay thế các thông tin bí mật nếu cần:
   - `DATABASE_URL`: Dán chuỗi **Internal Database URL** từ service Postgres của bạn
   - `SMTP_PASS`: Dán mật khẩu ứng dụng Gmail 16 ký tự
7. Nhấn **Save Changes** (Render sẽ tự động redeploy ứng dụng với cấu hình mới)

### Bước 2: Nạp file .env cho Frontend Web (`nhacualand-web`)
1. Mở file [.env.render.web](file:///D:/QNS%20Cho%20Thu%C3%AA/.env.render.web) trên máy tính và copy toàn bộ nội dung
2. Trên Render Dashboard, bấm vào service **nhacualand-web**
3. Chọn mục **Environment** ở thanh menu bên trái
4. Nhấn nút **Add from .env**
5. Dán toàn bộ nội dung vừa copy vào khung
6. Nhấn **Save Changes**

---

## 7. Tổng Hợp Các File Cấu Hình .env Trong Dự Án

- [.env.render.api](file:///D:/QNS%20Cho%20Thu%C3%AA/.env.render.api): Chứa đầy đủ biến môi trường chuẩn bị sẵn để copy-paste trực tiếp vào Render API
- [.env.render.web](file:///D:/QNS%20Cho%20Thu%C3%AA/.env.render.web): Chứa đầy đủ biến môi trường chuẩn bị sẵn để copy-paste trực tiếp vào Render Web
- [.env.production](file:///D:/QNS%20Cho%20Thu%C3%AA/.env.production): File môi trường production tổng hợp của monorepo
- [.env](file:///D:/QNS%20Cho%20Thu%C3%AA/.env): File môi trường đang dùng cho máy cục bộ
- [.env.example](file:///D:/QNS%20Cho%20Thu%C3%AA/.env.example): File mẫu chuẩn của dự án để tham khảo

