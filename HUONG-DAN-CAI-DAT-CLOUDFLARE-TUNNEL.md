# Hướng Dẫn Cấu Hình Triển Khai Cloudflare Tunnel (Networking) — NHACUALAND

Tài liệu này hướng dẫn chi tiết quy trình kết nối máy chủ (Windows hoặc Linux Server/VPS) với tên miền `nhacualand.com` và `api.nhacualand.com` thông qua tính năng **Cloudflare Tunnel (Mục Networks > Tunnels)** trong Cloudflare Zero Trust.

---

## 1. Mô Hình Kiến Trúc Mạng Cloudflare Tunnel

```
[ Khách hàng truy cập Internet ]
              │
              ▼
   ┌──────────────────────┐
   │ Cloudflare Edge (CDN)│ (Tự động cấp SSL/TLS, chống tấn công DDoS, WAF)
   └──────────┬───────────┘
              │ (Kết nối đường hầm mã hóa outbound 2 chiều - Port 7844 UDP/TCP)
              ▼
    ┌───────────────────┐
    │  cloudflared.exe  │ (Chạy ngầm 24/7 dưới dạng Windows Service hoặc Linux Systemd)
    └─────────┬─────────┘
              │ (Định tuyến nội bộ localhost)
      ┌───────┴───────┐
      ▼               ▼
┌───────────────┐ ┌────────────────┐
│ Next.js Web   │ │ NestJS Backend │
│ Cổng 3000     │ │ Cổng 4000      │
└───────────────┘ └────────────────┘
```

### Ưu điểm vượt trội:
- **Không cần mở cổng Router / Modem (Port Forwarding)**: Hoàn toàn miễn nhiễm với quét cổng xâm nhập từ Internet.
- **Không cần IP tĩnh công khai (Static Public IP)**: Hoạt động hoàn hảo ngay cả trên mạng dân dụng (CGNAT).
- **Bảo mật tuyệt đối**: Địa chỉ IP gốc của máy chủ được giấu kín 100% đằng sau mạng lưới toàn cầu của Cloudflare.
- **Miễn phí 100%**: Bao gồm cả chứng chỉ SSL/TLS tự động và băng thông không giới hạn.

---

## 2. Các Bước Cấu Hình Trên Cloudflare Dashboard

### Bước 2.1: Truy cập mục Tunnels trong Cloudflare Zero Trust
1. Đăng nhập vào trang quản trị: [dash.cloudflare.com](https://dash.cloudflare.com)
2. Chọn mục **Zero Trust** ở thanh menu bên trái (hoặc truy cập trực tiếp: [one.dash.cloudflare.com](https://one.dash.cloudflare.com))
3. Điều hướng tới: **Networks** -> **Tunnels**

### Bước 2.2: Tạo Tunnel mới
1. Nhấn nút **Add a tunnel** (hoặc **Create a tunnel**)
2. Chọn loại kết nối: **Cloudflared** -> Nhấn **Next**
3. Đặt tên gợi nhớ cho Tunnel: `nhacualand-tunnel` -> Nhấn **Save tunnel**

### Bước 2.3: Lấy mã Token kết nối
- Trên giao diện cài đặt connector, chọn hệ điều hành máy chủ của bạn (**Windows** 64-bit hoặc **Debian/Ubuntu**).
- Cloudflare sẽ hiển thị mã lệnh chứa chuỗi Token dạng base64:
  ```text
  cloudflared.exe service install eyJhIjoi...
  ```
- Sao chép toàn bộ chuỗi token dài này để cấu hình ở bước tiếp theo.

### Bước 2.4: Cấu hình bảng Public Hostnames (Định tuyến tên miền)
Chuyển sang tab **Public Hostnames** (hoặc nhấn **Next**):

#### 1. Định tuyến cho Frontend Web:
- **Subdomain**: để trống (hoặc nhập `www`)
- **Domain**: chọn `nhacualand.com`
- **Path**: để trống
- **Type**: `HTTP`
- **URL**: `localhost:3000` (hoặc `127.0.0.1:3000`)
- Nhấn **Save hostname**

#### 2. Thêm Hostname cho Backend API:
- Nhấn **Add a public hostname**
- **Subdomain**: nhập `api`
- **Domain**: chọn `nhacualand.com`
- **Path**: để trống
- **Type**: `HTTP`
- **URL**: `localhost:4000` (hoặc `127.0.0.1:4000`)
- Nhấn **Save hostname**

*(Tùy chọn) Thêm một bản ghi nữa cho Subdomain `www` trỏ về `HTTP://localhost:3000` nếu bạn muốn hỗ trợ cả `https://www.nhacualand.com`.*

> [!NOTE]
> Khi lưu Public Hostnames, Cloudflare sẽ **tự động tạo các bản ghi DNS CNAME** tương ứng trên trang DNS Management của tên miền mà bạn không cần phải tạo thủ công.

---

## 3. Cài Đặt Và Vận Hành Trên Máy Chủ

### Phương Án A: Trên Máy Chủ Windows / PC Cá Nhân

Trong thư mục gốc của dự án đã tích hợp sẵn các công cụ tự động hóa:

#### 1. Cài đặt chạy ngầm 24/7 (Khuyên dùng cho Production):
- Click chuột phải vào file [`cai-dat-cloudflare-service.bat`](file:///d:/QNS%20Cho%20Thu%C3%AA/cai-dat-cloudflare-service.bat) -> chọn **Run as administrator**
- Script sẽ:
  1. Tự động kiểm tra và tải file `cloudflared.exe` mới nhất từ GitHub chính thức của Cloudflare nếu máy chưa có.
  2. Yêu cầu nhập token (hoặc bấm Enter để dùng token đã lưu).
  3. Tự động đăng ký dịch vụ `cloudflared` vào Windows Services và khởi động chạy ngầm 24/7 ngay cả khi đăng xuất tài khoản Windows.

#### 2. Chạy kiểm tra trực tiếp qua cửa sổ Console:
- Nhấp đúp vào [`chay-cloudflare-tunnel.bat`](file:///d:/QNS%20Cho%20Thu%C3%AA/chay-cloudflare-tunnel.bat) để theo dõi luồng request trực tiếp trên màn hình.

#### 3. Khởi động nhanh toàn bộ Website + Database + Tunnel (1-Click):
- Nhấp đúp vào [`chay-website-va-tunnel.bat`](file:///d:/QNS%20Cho%20Thu%C3%AA/chay-website-va-tunnel.bat).

---

### Phương Án B: Trên Máy Chủ Linux Server / VPS (Ubuntu / Debian)

1. Đăng nhập SSH vào VPS của bạn và điều hướng tới thư mục dự án:
   ```bash
   cd /var/www/batdongsan
   ```

2. Chạy script cài đặt tự động với quyền root/sudo:
   ```bash
   sudo bash scripts/setup-cloudflare-tunnel-linux.sh <TUNNEL_TOKEN>
   ```

3. Kiểm tra trạng thái dịch vụ hoạt động:
   ```bash
   sudo systemctl status cloudflared
   ```

4. Thiết lập dịch vụ chạy ứng dụng Web + API tự động khởi động:
   ```bash
   sudo cp scripts/nhacualand.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable nhacualand
   sudo systemctl start nhacualand
   ```

---

## 4. Cấu Hình Biến Môi Trường (.env)

Đảm bảo file `.env` (hoặc `.env.production`) trên server có cấu hình khớp với tên miền và các cổng nội bộ:

```env
NODE_ENV=production
PORT=3000
API_PORT=4000

# Tên miền chính thức thông qua Cloudflare Tunnel
NEXT_PUBLIC_SITE_URL=https://nhacualand.com
NEXT_PUBLIC_API_URL=https://api.nhacualand.com

# Danh sách Origin được phép gọi API (CORS)
CORS_ORIGINS=https://nhacualand.com,https://www.nhacualand.com,https://api.nhacualand.com,http://localhost:3000

# Cơ sở dữ liệu nội bộ trên server
DATABASE_URL=postgresql://postgres:MatKhauCuaBan@localhost:5432/batdongsan
REDIS_URL=redis://localhost:6379
```

---

## 5. Danh Sách Lệnh Quản Trị Hữu Ích

### Trên Windows:
- Khởi động service: `net start cloudflared`
- Tạm dừng service: `net stop cloudflared`
- Xem log service: mở `Event Viewer` -> `Windows Logs` -> `Application` (nguồn `cloudflared`)
- Gỡ bỏ service: `cloudflared.exe service uninstall`

### Trên Linux (systemd):
- Xem log thời gian thực: `journalctl -u cloudflared -f`
- Khởi động lại service: `sudo systemctl restart cloudflared`
- Dừng service: `sudo systemctl stop cloudflared`

---

## 6. Xử Lý Các Sự Cố Thường Gặp (Troubleshooting)

| Hiện tượng | Nguyên nhân | Cách khắc phục |
|---|---|---|
| **Lỗi 502 Bad Gateway** khi vào `nhacualand.com` | Next.js (port 3000) hoặc API (port 4000) chưa được bật trên máy chủ | Kiểm tra xem website đã chạy chưa bằng lệnh: `curl http://localhost:3000`. Chạy `pnpm build && pnpm start` hoặc `node scripts/start-all.js` |
| **Trạng thái Tunnel báo DOWN** trên Cloudflare | Máy chủ mất mạng hoặc dịch vụ cloudflared chưa chạy | Kiểm tra dịch vụ `cloudflared` trên máy chủ (`net start cloudflared` hoặc `systemctl status cloudflared`) |
| **Lỗi CORS** khi gọi API từ trình duyệt | Chưa thêm `https://nhacualand.com` vào biến `CORS_ORIGINS` | Bổ sung đầy đủ vào `.env` và khởi động lại Backend API |
| **Chưa có chứng chỉ SSL** | Trình duyệt truy cập bản ghi cũ chưa qua Proxy | Vào Cloudflare DNS Management, đảm bảo bản ghi CNAME của `nhacualand.com` và `api` đang bật chế độ **Proxied (Đám mây màu cam)** |
