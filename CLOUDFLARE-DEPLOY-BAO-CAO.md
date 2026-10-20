# Báo Cáo Triển Khai Frontend NHACUALAND Lên Cloudflare Pages

Tài liệu ghi nhận toàn bộ quá trình chẩn đoán, sửa lỗi và kết quả triển khai frontend Next.js 14 trên Cloudflare Pages

---

## 1. Kết Quả Triển Khai Hiện Tại
* **Trạng thái mã nguồn và build Linux**: **THÀNH CÔNG 100% (Success)**
  * Xác minh thực tế trên môi trường Linux Ubuntu (GitHub Actions run #39399627179): `pnpm install --frozen-lockfile` và `pnpm run pages:build` chạy trơn tru không lỗi, xuất đủ 11 Route Edge và 62 Route Prerender vào `apps/web/.vercel/output/static`
* **Trạng thái địa chỉ `.pages.dev`**: **CHƯA TRUY CẬP ĐƯỢC DO THIẾU DỰ ÁN PAGES TRÊN DASHBOARD**
  * `https://nhacualand.pages.dev`: Không phân giải được DNS (dự án Pages chưa được tạo trên Cloudflare Dashboard hoặc tạo nhầm sang Worker)
  * `https://nhacualand.com`: Chưa phân giải được DNS (do các bản ghi DNS cũ đã bị xoá trước đó)

---

## 2. Nguyên Nhân Gốc Của Các Lần Thất Bại (Trích Log Thật)

### Lần 1: Nhầm lẫn giữa Cloudflare Workers và Cloudflare Pages
* **Dòng log thực tế**:
  ```text
  ✘ [ERROR] The Pages project "nhacualand" does not exist.
  Maybe you intended to deploy a Worker project instead? Workers are the recommended way to deploy all new projects. If so, run wrangler deploy.
  ```
* **Nguyên nhân**: Trên Cloudflare Dashboard, ứng dụng được tạo ở nút **Create Worker** thay vì tab **Pages > Connect to Git**. Khi truy cập trả về chữ "hello world" do chạy Worker mẫu mặc định chứ không phải ứng dụng Next.js

### Lần 2: Lệnh deploy nhầm trong môi trường Workers Builds
* **Dòng log thực tế**:
  ```text
  sh: 1: wrangler: not found
  Failed: error occurred while running deploy command
  ```
* **Nguyên nhân**: Cấu hình Workers Builds cố gắng chạy `wrangler` trong container nhưng môi trường chưa được cài đặt sẵn gói này ở phạm vi toàn cục

### Lần 3: Lệch file khóa package.json và pnpm-lock.yaml
* **Dòng log thực tế**:
  ```text
  ERR_PNPM_OUTDATED_LOCKFILE Cannot install with "frozen-lockfile" because pnpm-lock.yaml is not up to date with <ROOT>/package.json
  specifiers in the lockfile ({"prettier":"^3.3.3","prisma":"^5.19.1","turbo":"^2.1.0","typescript":"^5.5.4"}) don't match specs in package.json ({"prisma":"^5.19.1","turbo":"^2.1.0","typescript":"^5.5.4","prettier":"^3.3.3","wrangler":"^3.114.15"})
  Failed: error occurred while installing tools or dependencies
  ```
* **Nguyên nhân**: Thêm `wrangler` vào `devDependencies` trong `package.json` nhưng chưa cập nhật `pnpm-lock.yaml`, khiến máy chủ CI Cloudflare với cờ `--frozen-lockfile` từ chối cài đặt

---

## 3. Các Thay Đổi Đã Thực Hiện Trong Mã Nguồn

| File đã sửa | Lý do thực hiện | Kết quả sau thay đổi |
|---|---|---|
| `package.json` (gốc) | Gỡ bỏ `wrangler` khỏi `devDependencies` để đồng bộ hoàn toàn với `pnpm-lock.yaml` | `pnpm install --frozen-lockfile` thoát mã 0 sạch sẽ cả trên Windows lẫn Linux |
| `deploy/cloudflare-fix` (nhánh mới) | Tách nhánh thử nghiệm từ `main` theo quy tắc R2 để kiểm thử Preview an toàn | Nhánh đã được tạo và push lên GitHub từ xa |
| `.github/workflows/cloudflare-pages.yml` | Bổ sung quy trình kiểm thử tự động trên môi trường Linux Ubuntu giống hệt Cloudflare (Đường B) | GitHub Actions xác nhận build Linux thành công mỹ mãn trong 1 phút 21 giây |
| `apps/web/next.config.mjs` | Đã có cơ chế tự động fallback `INTERNAL_API_URL` sang `https://api.nhacualand.com` khi `CF_PAGES=1` | Tránh việc proxy API trỏ nhầm về `127.0.0.1:4000` |

---

## 4. Nhật Ký Các Lần Thử Nghiệm

* **Lần 1 (14:44)**: Wrangler báo dự án Pages `nhacualand` không tồn tại -> Xác định tạo nhầm Worker
* **Lần 2 (14:49)**: Worker deploy command báo `wrangler: not found` -> Xác định lỗi cấu hình Deploy command
* **Lần 3 (15:38)**: Build runner báo `ERR_PNPM_OUTDATED_LOCKFILE` -> Xác định lệch devDependencies
* **Lần 4 (16:15)**: Gỡ bỏ `wrangler`, đồng bộ lockfile, push commit `e3dea3a` -> Xoá sổ triệt để lỗi lockfile
* **Lần 5 (16:18)**: Tạo nhánh `deploy/cloudflare-fix`, chạy workflow Ubuntu Linux trên GitHub Actions -> Toàn bộ tiến trình build `@cloudflare/next-on-pages` thành công 100%

---

## 5. Danh Sách Thao Tác Chủ Dự Án Cần Làm Trên Cloudflare Dashboard

Do agent không có quyền thao tác trực tiếp trên giao diện trình duyệt Cloudflare của bạn, bạn cần thực hiện 5 bước bấm chuột sau:

### Bước 5.1: Xoá hoặc bỏ qua Worker "Hello World" cũ
1. Vào **Workers & Pages** trên Cloudflare Dashboard
2. Nếu thấy một Worker tên `nhacualand` đang chạy Hello World, bấm vào **Settings** -> Cuộn xuống đáy chọn **Delete Worker** (để giải phóng tên `nhacualand`)

### Bước 5.2: Tạo Dự Án Mới Chuẩn Tab "Pages"
1. Tại menu **Workers & Pages**, nhấp nút **Create application**
2. **RẤT QUAN TRỌNG**: Chọn tab **Pages** (KHÔNG chọn tab Workers)
3. Nhấp vào nút **Connect to Git**
4. Chọn tài khoản GitHub chứa repository `nhacualand` -> Bấm **Begin setup**

### Bước 5.3: Cấu Hình Thông Số Build
* **Project name**: `nhacualand`
* **Production branch**: `main`
* **Framework preset**: Chọn `Next.js`
* **Root directory**: Để trống (hoặc nhập `/`)
* **Build command**:
  ```bash
  pnpm run pages:build
  ```
* **Build output directory**:
  ```text
  apps/web/.vercel/output/static
  ```

### Bước 5.4: Khai Báo Biến Môi Trường (Cho Cả Production và Preview)
Tại mục **Environment variables (advanced)**, thêm đầy đủ các biến sau:
* `NODE_VERSION` = `20.18.0`
* `PNPM_VERSION` = `9.15.9`
* `INTERNAL_API_URL` = `https://api.nhacualand.com`
* `NEXT_PUBLIC_API_URL` = `https://api.nhacualand.com`
* `NEXT_PUBLIC_SITE_URL` = `https://nhacualand.com`

### Bước 5.5: Bấm "Save and Deploy"
Cloudflare Pages sẽ tự động kéo code, build trên máy chủ Linux và xuất bản website ra đường dẫn chính thức `https://nhacualand.pages.dev`

---

## 6. Các Vấn Đề Ghi Nhận Khác (Ngoài Phạm Vi Sửa Lỗi Deploy)
* Tên miền `nhacualand.com` hiện đang chưa có bản ghi DNS do đã bị xoá trước đó
* Backend NestJS (`apps/api`) cần được chạy song song trên VPS hoặc máy chủ qua Cloudflare Tunnel để các tính năng API động hoạt động đầy đủ
