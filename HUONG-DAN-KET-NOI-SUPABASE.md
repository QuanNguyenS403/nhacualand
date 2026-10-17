# Hướng dẫn Kết Nối Database Supabase Cho Website NHACUALAND

Hệ thống **NHACUALAND** được xây dựng trên nền tảng **PostgreSQL** kết hợp **Prisma ORM**. **Supabase** chính là dịch vụ PostgreSQL Đám Mây (Cloud-native) mã nguồn mở hàng đầu thế giới, bảo mật cấp doanh nghiệp (SOC2, GDPR), miễn phí lưu trữ và tự động sao lưu dữ liệu.

---

## 1. Các bước tạo Database Supabase miễn phí (mất 2 phút)

1. Truy cập **[https://supabase.com](https://supabase.com)** và bấm **Sign in** (đăng nhập bằng tài khoản GitHub hoặc Google).
2. Tại màn hình Dashboard, bấm nút **"New project"** (Dự án mới).
3. Điền thông tin tạo dự án:
   - **Name**: `nhacualand-db` (hoặc tên tùy thích)
   - **Database Password**: Đặt mật khẩu mạnh và **ghi nhớ mật khẩu này** (ví dụ: `QuanNguyenSupabase2026!`)
   - **Region**: Chọn **`Singapore (ap-southeast-1)`** để có tốc độ truy xuất nhanh nhất tại Việt Nam
   - Bấm **"Create new project"** và chờ khoảng 1-2 phút để Supabase khởi tạo cụm PostgreSQL.

---

## 2. Lấy chuỗi kết nối (Connection String)

1. Trong dự án Supabase vừa tạo, vào menu **Project Settings** (biểu tượng bánh răng ở góc trái dưới) > Chọn mục **Database**.
2. Kéo xuống phần **Connection string**:
   - Chọn tab **URI**.
   - Tại mục **Mode**, bạn sẽ lấy 2 chuỗi kết nối:

### A. Chuỗi `DATABASE_URL` (Connection Pooler - Chế độ Transaction)
- Chọn **Method**: `Transaction` (Port `6543`)
- Chuỗi kết nối có dạng:
  ```text
  postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
  ```

### B. Chuỗi `DIRECT_URL` (Direct Connection - Chế độ Session)
- Chọn **Method**: `Session` (Port `5432`)
- Chuỗi kết nối có dạng:
  ```text
  postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
  ```

*(Lưu ý: Thay `[YOUR-PASSWORD]` bằng mật khẩu bạn đã đặt ở Bước 1. Nếu mật khẩu có ký tự đặc biệt như `@`, `#`, `?`, hãy URL-encode chúng hoặc đặt mật khẩu dạng chữ và số kèm dấu gạch dưới)*

---

## 3. Cập nhật vào file `.env` của Website

Mở file `.env` ở thư mục gốc của dự án (`d:\QNS Cho Thuê\.env`) và dán 2 dòng cấu hình:

```env
# ===== Database Supabase =====
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

---

## 4. Chạy lệnh tự động khởi tạo dữ liệu

Sau khi lưu file `.env`, mở PowerShell tại thư mục dự án và chạy lần lượt các lệnh sau:

### Bước 1: Kiểm tra kết nối tới Supabase
```powershell
pnpm db:check
```
*Script sẽ kiểm tra và xác nhận kết nối thành công tới Supabase Cloud.*

### Bước 2: Tự động tạo toàn bộ bảng dữ liệu
```powershell
pnpm db:migrate:deploy
```
*Lệnh này sẽ triển khai toàn bộ 12 migration (người dùng, tin đăng, lịch sử xem phòng, phân quyền admin, lead...) lên Supabase.*

### Bước 3: Khởi tạo tài khoản SuperAdmin đầu tiên
```powershell
pnpm db:bootstrap-admin
```
*Khởi tạo tài khoản Quản trị viên SuperAdmin theo cấu hình trong `.env` (`0981753082`).*

### Bước 4 (Tùy chọn): Nạp dữ liệu mẫu ban đầu
```powershell
pnpm db:seed
```

---

## 5. Xem và quản lý dữ liệu trên Supabase Studio

Sau khi hoàn tất, bạn có thể vào trực tiếp giao diện web của Supabase:
- Bấm vào mục **Table Editor** ở thanh điều hướng bên trái.
- Toàn bộ các bảng: `users`, `listings`, `leads`, `viewing_requests`, `admins`,... sẽ hiển thị dạng bảng trực quan tương tự Excel / Google Sheets để bạn xem, lọc, xuất file và quản lý trực tiếp.
