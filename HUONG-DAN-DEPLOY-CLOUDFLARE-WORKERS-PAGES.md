# Hướng Dẫn Chi Tiết Triển Khai Website NHACUALAND Lên Cloudflare

Tài liệu này cung cấp hướng dẫn đầy đủ, cụ thể về các giải pháp triển khai website **NHACUALAND** (`nhacualand.com`) thông qua nền tảng Cloudflare

---

## 1. Phân Biệt Giữa "Workers & Pages" và "Cloudflare Tunnel"

Khi truy cập vào bảng điều khiển [dash.cloudflare.com](https://dash.cloudflare.com), có hai công cụ quan trọng bạn cần nắm rõ:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BẢN CHẤT CÔNG NGHỆ CLOUDFLARE                   │
├──────────────────────────────────┬─────────────────────────────────────┤
│ 1. Cloudflare Workers & Pages    │ 2. Cloudflare Tunnel (Zero Trust)   │
├──────────────────────────────────┼─────────────────────────────────────┤
│ • Nền tảng Serverless Edge       │ • Đường hầm kết nối Máy Chủ Riêng   │
│ • Không cần thuê server/VPS      │ • Cần có máy chủ/VPS hoặc PC        │
│ • Chuyên dụng cho Frontend       │ • Chạy trọn gói Fullstack (Web+API) │
│ • Cloudflare tự làm "Server"     │ • Máy chủ của bạn làm "Server"      │
│ • Tự động build từ Git           │ • Chạy trực tiếp qua cloudflared    │
└──────────────────────────────────┴─────────────────────────────────────┘
```

> [!IMPORTANT]
> - Dự án **NHACUALAND** gồm 2 phần:
>   1. **Frontend Web (`apps/web` - Next.js 14)**: Có thể deploy trực tiếp lên **Cloudflare Pages** (mục Workers & Pages)
>   2. **Backend API (`apps/api` - NestJS + Prisma + PostgreSQL/Supabase)**: Là daemon Node.js cần môi trường máy chủ chạy 24/7
> - Tùy theo nhu cầu thực tế của bạn, bạn có thể chọn **Phương án 1 (Chuyên biệt cho Workers & Pages)** hoặc **Phương án 2 (Mô hình Server trọn gói qua Tunnel)** bên dưới

---

## 2. Phương Án 1: Triển Khai Frontend Lên Cloudflare Pages (Mục Workers & Pages)

Phương án này đưa toàn bộ giao diện Next.js lên mạng lưới Edge toàn cầu của Cloudflare (hưởng 100% băng thông miễn phí, tốc độ phản hồi tính bằng mili-giây, chống DDoS và tự động cấp SSL)

### Các bước bạn cần thực hiện:

> [!WARNING]
> **Phải tạo dự án ở tab "Pages", không phải tab "Workers".** Nếu tạo bằng Workers Builds, lệnh deploy mặc định `npx wrangler deploy` sẽ thất bại với thông báo `It looks like you've run a Workers-specific command in a Pages project` (vì `wrangler.toml` khai báo `pages_build_output_dir`). Cách khắc phục: xoá dự án Workers và tạo lại dự án Pages, hoặc đổi Deploy command thành `npx wrangler pages deploy apps/web/.vercel/output/static --project-name=nhacualand`

#### Bước 2.1: Đẩy mã nguồn mới nhất lên GitHub / GitLab
Đảm bảo mã nguồn trên máy của bạn đã được commit và push lên repository từ xa:
```bash
git add .
git commit -m "Cấu hình triển khai Cloudflare Pages cho web"
git push origin main
```

#### Bước 2.2: Tạo ứng dụng Pages trên Cloudflare Dashboard
1. Truy cập [dash.cloudflare.com](https://dash.cloudflare.com) và đăng nhập
2. Nhìn vào cột menu bên trái, nhấp chọn **Workers & Pages**
3. Nhấp vào nút **Create application** (Tạo ứng dụng)
4. Chọn tab **Pages** -> Nhấp nút **Connect to Git** (Kết nối với Git)
5. Chọn tài khoản GitHub/GitLab của bạn và chọn repository của dự án -> Nhấp **Begin setup**

#### Bước 2.3: Điền thông số Build & Deploy
Tại màn hình cấu hình, điền chính xác các mục sau:
- **Project name**: `nhacualand` (hoặc tên bạn muốn)
- **Production branch**: `main`
- **Framework preset**: Chọn `Next.js`
- **Root directory**: Để trống (hoặc nhập `/`)
- **Build command**:
  ```bash
  pnpm run pages:build
  ```
- **Build output directory** (phải đúng như dưới đây, KHÔNG dùng `apps/web/.next`):
  ```text
  apps/web/.vercel/output/static
  ```
- Lưu ý: file `wrangler.toml` ở thư mục gốc đã khai báo sẵn đường dẫn này, Cloudflare ưu tiên file đó, nhưng vẫn nên điền đúng ở đây để tránh lệch

#### Bước 2.4: Khai báo biến môi trường (Environment variables)
Mở rộng mục **Environment variables (advanced)** và thêm các khóa sau:

| Tên biến | Giá trị khuyên dùng | Ghi chú |
|---|---|---|
| `NODE_VERSION` | `20.18.0` | Phiên bản Node.js khớp với dự án |
| `PNPM_VERSION` | `9.15.9` | Trình quản lý gói pnpm |
| `NEXT_PUBLIC_SITE_URL` | `https://nhacualand.com` | Tên miền chính thức của website |
| `NEXT_PUBLIC_API_URL` | `https://api.nhacualand.com` | Đường dẫn đến Backend API |
| `INTERNAL_API_URL` | `https://api.nhacualand.com` | BẮT BUỘC khi build: được ghi cứng vào quy tắc chuyển tiếp API, thiếu thì mọi API trỏ về 127.0.0.1 và hỏng |

#### Bước 2.5: Nhấp "Save and Deploy"
- Cloudflare sẽ tự động kéo mã nguồn về, cài đặt pnpm và build trang web
- Sau khi hoàn thành, bạn sẽ nhận được một địa chỉ miễn phí dạng `https://nhacualand.pages.dev`

#### Bước 2.6: Gắn tên miền `nhacualand.com` vào Pages
1. Tại trang quản trị của dự án Pages vừa tạo, chuyển sang tab **Custom domains**
2. Nhấp **Set up a custom domain**
3. Nhập `nhacualand.com` -> Nhấp **Continue** -> Nhấp **Activate domain**
4. Làm tương tự cho tên miền phụ `www.nhacualand.com`

---

## 3. Phương Án 2: Triển Khai Cả Web + API Lên Máy Chủ / VPS Thông Qua Cloudflare Tunnel (Khuyên Dùng)

Nếu bạn có một máy chủ riêng (VPS Linux Ubuntu/Debian hoặc máy tính Windows Server cá nhân làm máy chủ), đây là phương án tối ưu nhất vì **chạy chung cả Web Next.js và Backend API NestJS + Database trên cùng một máy**:

### Ưu điểm vượt trội:
- Không cần mở bất kỳ cổng nào trên Router / Firewall
- Không cần IP tĩnh
- Địa chỉ IP thật của máy chủ được bảo vệ giấu kín 100%
- Không lo giới hạn môi trường Node.js hay dung lượng tải ảnh

### Các bước thực hiện:

#### Bước 3.1: Tạo Tunnel trên Cloudflare Zero Trust
1. Trên Cloudflare Dashboard, vào **Zero Trust** (ở menu bên trái)
2. Chọn **Networks** -> **Tunnels** -> Nhấp **Add a tunnel**
3. Đặt tên: `nhacualand-tunnel` -> Nhấp **Save tunnel**
4. Sao chép chuỗi mã Token kết nối mà Cloudflare cung cấp

#### Bước 3.2: Cấu hình bảng Public Hostnames trong Tunnel
Thêm 2 bản ghi định tuyến:
1. **Frontend Web**:
   - Subdomain: Để trống (hoặc `www`) | Domain: `nhacualand.com`
   - Type: `HTTP` | URL: `localhost:3000`
2. **Backend API**:
   - Subdomain: `api` | Domain: `nhacualand.com`
   - Type: `HTTP` | URL: `localhost:4000`

#### Bước 3.3: Chạy trên máy chủ của bạn
- **Nếu dùng Windows**:
  - Nhấp đúp vào file [`chay-website-va-tunnel.bat`](file:///d:/QNS%20Cho%20Thu%C3%AA/chay-website-va-tunnel.bat) để khởi động toàn bộ Web, API và Tunnel trong 1 cửa sổ duy nhất
  - Hoặc click chuột phải vào [`cai-dat-cloudflare-service.bat`](file:///d:/QNS%20Cho%20Thu%C3%AA/cai-dat-cloudflare-service.bat) chọn **Run as administrator** để tunnel chạy ngầm vĩnh viễn 24/7 dưới dạng Windows Service
- **Nếu dùng Linux (VPS Ubuntu)**:
  ```bash
  sudo bash scripts/setup-cloudflare-tunnel-linux.sh <TUNNEL_TOKEN>
  pnpm build
  node scripts/start-all.js
  ```

---

## 4. Bảng So Sánh Để Bạn Lựa Chọn

| Tiêu chí | Phương Án 1: Cloudflare Pages | Phương Án 2: Cloudflare Tunnel |
|---|---|---|
| **Vị trí chạy Web** | Đám mây Cloudflare Edge | Máy chủ riêng / VPS của bạn |
| **Vị trí chạy API** | Cần máy chủ API riêng | Chạy trực tiếp cùng máy chủ |
| **Chi phí máy chủ Web** | Miễn phí 100% | Tùy theo chi phí máy chủ/VPS |
| **Bảo mật & Giấu IP** | 100% an toàn qua Cloudflare | 100% an toàn qua Cloudflare |
| **Cấu hình tự động** | Git Push là tự động cập nhật | Khởi chạy qua script .bat / systemd |
