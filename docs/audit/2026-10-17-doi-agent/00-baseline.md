# BÁO CÁO ĐƯỜNG CƠ SỞ (00-BASELINE.MD) — QNS BROKER
**Ngày thực hiện:** 2026-10-17  
**Nhánh Git:** `audit/doi-agent-2026-10-17` (tách từ `main` tại commit `740e095`)  
**Người thực hiện:** ORCH + A7 + A3  

---

## 1. MÔI TRƯỜNG THỰC THI

- **Hệ điều hành:** Windows (x64)
- **Node.js:** `v24.19.0`
- **pnpm:** `9.15.9`
- **Turbo:** `2.10.12`
- **Trạng thái tiến trình cục bộ:**
  - Cổng `3000` đang lắng nghe (PID `10516`, tiến trình `next dev` chạy ứng dụng web).
  - PostgreSQL trên `localhost:5432`: **Không hoạt động** (`Can't reach database server at localhost:5432`).
  - Docker Desktop Engine: **Không kết nối được** (daemon chưa bật).
  - Cloudflare Tunnel: **Không có tiến trình cloudflared chạy ngầm**.
  - Thư mục sao lưu `backup/`: Đã được bảo vệ an toàn trong `.gitignore:48:backup/`.

---

## 2. KẾT QUẢ ĐƯỜNG CƠ SỞ (BASELINE RUNS)

| STT | Lệnh kiểm tra | Mã thoát | Đánh giá | Chi tiết lỗi / Ghi chú |
|---|---|:---:|:---:|---|
| 1 | `pnpm install` | 0 | ĐẠT | 5 workspace packages đồng bộ, lockfile khớp |
| 2 | `pnpm build` | 1 | THẤT BẠI | `@batdongsan/database:build` lỗi `EPERM: operation not permitted, rename ... query_engine-windows.dll.node` do tiến trình dev (PID 10516) đang khóa tệp DLL |
| 3 | `pnpm --filter @qns/shared exec tsc --noEmit` | 0 | ĐẠT | Không có lỗi kiểu dữ liệu TypeScript |
| 4 | `pnpm --filter @batdongsan/api exec tsc --noEmit` | 0 | ĐẠT | Backend NestJS biên dịch sạch, 0 lỗi kiểu dữ liệu |
| 5 | `pnpm --filter @batdongsan/web exec tsc --noEmit` | 0 | ĐẠT | Frontend Next.js biên dịch sạch, 0 lỗi kiểu dữ liệu |
| 6 | `pnpm run lint` (static-lint-check.js) | 0 | ĐẠT (CẢNH BÁO) | 5/5 kiểm tra tĩnh đạt; tuy nhiên đây chỉ là đọc tệp so sánh chuỗi, không phải runtime test |
| 7 | `apps/web lint` (`next lint`) | 1 | CẢNH BÁO | ESLint chưa được cấu hình cho Next.js, hiển thị bảng hỏi tương tác |
| 8 | `apps/api lint` | N/A | CẢNH BÁO | Package `eslint` chưa được khai báo trong devDependencies của `apps/api` |

---

## 3. PHÂN LOẠI VÀ KẾT QUẢ BỘ TEST CÓ SẴN (`packages/database/scripts/test-*.js`)

Tổng số tệp test có sẵn: **25 tệp**.

### 3.1 Nhóm 1: Kiểm thử tĩnh (Static String & Code Checks) — 9 tệp
Chỉ đọc mã nguồn bằng `fs.readFileSync` và so khớp chuỗi/regex, không chứng minh hành vi runtime:

1. `test-account-management-audit.js`: **PASS** (11 assertions tĩnh)
2. `test-auth-hardening-landlord-admin.js`: **PASS** (6 assertions tĩnh)
3. `test-broker-terms.js`: **PASS** (10 assertions tĩnh)
4. `test-dev05-at08.js`: **PASS** (6 assertions tĩnh)
5. `test-fee-v2.js`: **PASS** (14 assertions tĩnh)
6. `test-w00-p0.js`: **PASS** (12 assertions tĩnh)
7. `test-wave-0.js`: **PASS** (8 assertions tĩnh)
8. `test-wave-2.js`: **FAIL (Exit code 1)**: `AssertionError: SearchFilterBar phải dùng areaPresets[areaIndex] thay vì AREA_PRESETS` (Mã giao diện đã được cấu trúc lại ở đợt trước khiến kiểm tra chuỗi bị lệch)
9. `test-wave-4.js`: **FAIL (Exit code 1)**: `AssertionError: Khi request pending, pricePaid bắt buộc phải ghi bằng 0` (Backend đã chủ động chặn bán membership qua `throw BadRequestException` theo DEV-11/GAP-07, khiến logic chuỗi kỳ vọng của test cũ không khớp)

### 3.2 Nhóm 2: Kiểm thử runtime yêu cầu cơ sở dữ liệu và API — 16 tệp
- **9 tệp yêu cầu kết nối trực tiếp PostgreSQL:** `test-dev03-at01-03.js`, `test-dev04-at06.js`, `test-dev06-at04.js`, `test-dev07-at10-12.js`, `test-dev09-at15-18.js`, `test-dev10-at20-23.js`, `test-dev11-at29.js`, `test-dev12-at27.js`, `test-dev14-batch1.js`.
- **5 tệp yêu cầu gọi HTTP API runtime:** `test-feedback-consultation-email.js`, `test-map-reviews.js`, `test-wave-1.js`, `test-wave-3.js`, `test-wave-5.js`.
- **2 tệp kết hợp cả DB và HTTP:** `test-dev08-at13-14.js`, `test-dev14-batch2.js`.
- **Hiện trạng:** Tạm dừng chạy trực tiếp trên môi trường máy chủ vì PostgreSQL hiện chưa bật (port 5432 đóng) và để tuân thủ tuyệt đối quy tắc **R4 (Không ghi dữ liệu lên DB chính, phải kiểm thử trên DB riêng kết thúc bằng `_test`)**.

---

## 4. TỔNG KẾT KIỂM KÊ (INVENTORY SUMMARY)

Đã tạo thành công 6 tệp kiểm kê chi tiết:
1. `inv-endpoints.csv`: **120** endpoints (bao gồm 113 endpoint NestJS và 7 Next.js route handlers)
2. `inv-routes.csv`: **37** routes (`page.tsx` và `layout.tsx`)
3. `inv-models.csv`: **39** models Prisma (phân loại model cốt lõi, model tài chính/tiền cọc, model mua bán và model mã chết)
4. `inv-env.csv`: **53** biến môi trường
5. `inv-calls.csv`: **83** lời gọi `fetch` / `authFetch` trong frontend
6. `inv-scripts.csv`: **85** scripts và tệp thực thi
