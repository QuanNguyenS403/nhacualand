# BÁO CÁO RÀ SOÁT GIAO DIỆN NGƯỜI DÙNG VÀ TRẢI NGHIỆM FRONTEND (A5) — QNS BROKER
**Agent thực hiện:** Vai A5 (Kỹ sư Giao diện & Frontend Next.js — Chế độ Rà soát Độc lập / Mù)  
**Ngày:** 2026-10-17  

---

## 1. PHẠM VI VÀ PHƯƠNG PHÁP RÀ SOÁT

- Rà soát 37 route (`page.tsx` và `layout.tsx`) theo danh mục `inv-routes.csv`.
- Kiểm tra các trang xử lý lỗi toàn cục (`error.tsx`, `not-found.tsx`, `loading.tsx`).
- Kiểm tra dữ liệu giả, tin mẫu và ảnh Unsplash hiển thị ra ngoài công khai.
- Rà soát các tuyến quản trị trùng lặp (`/admin/*` và `/qnsbroker/admin`).
- Đối soát quy chuẩn văn phong giao diện theo `GEMINI.md § 8` (tuyệt đối không thêm dấu chấm cuối câu trong tiêu đề, mô tả, nút bấm).

---

## 2. KẾT QUẢ ĐO ĐẠC FRONTEND

1. **Trang xử lý lỗi & Trạng thái tải:** Đầy đủ `not-found.tsx`, `error.tsx` và `loading.tsx` tại gốc `apps/web/src/app`.
2. **Tuân thủ quy chuẩn GEMINI § 8:** Đạt chuẩn. 0 vi phạm dấu chấm kết thúc câu trong toàn bộ thẻ `title` và `description` metadata của các trang.
3. **Hiển thị dữ liệu giả ra công khai:** **Phát hiện nghiêm trọng (P1)**. Tại `apps/web/src/app/page.tsx:89` và `apps/web/src/app/thue/page.tsx:120`, mã nguồn chủ động nhồi các tin đăng demo từ `demo-data.ts` (chứa 27 ảnh Unsplash) vào danh sách hiển thị dù API backend trả về danh sách thật.
4. **Tuyến quản trị cũ `/qnsbroker/admin`:** Dùng `router.replace` trong `useEffect` gây chớp giao diện trước khi chuyển hướng sang `/admin`.
5. **Tiền tố LocalStorage:** `auth-client.ts` vẫn lưu trữ `qns_auth_token` và `qns_refresh_token`.

---

## 3. DANH SÁCH PHÁT HIỆN FRONTEND (A5)

| ID | Mức độ | Tiêu đề | Vị trí | Làn | Trạng thái |
|---|:---:|---|---|:---:|:---:|
| **FE-001** | P1 | Dữ liệu phòng mẫu và ảnh Unsplash giả luôn bị gộp cưỡng bức vào danh sách phòng thật trên trang chủ và trang thuê phòng | `apps/web/src/app/page.tsx:89` | F3 | ĐÃ ĐỌC MÃ |
| **FE-002** | P3 | Route /qnsbroker/admin thực hiện chuyển hướng client-side bằng useEffect thay vì redirect server-side 301/308 | `apps/web/src/app/qnsbroker/admin/page.tsx:9` | F3 | ĐÃ ĐỌC MÃ |
| **FE-003** | P3 | Khóa lưu trữ token phía client vẫn lưu dưới tiền tố cũ qns_auth_token | `apps/web/src/lib/auth-client.ts:25` | F3 | ĐÃ ĐỌC MÃ |

---

## 4. MA TRẬN ĐÃ RÀ / CHƯA RÀ

- **Đã rà (100%):** 37 routes, metadata, form double-submit handling, Unsplash image occurrences, demo data merging logic, error boundaries.
- **Chưa rà:** Kiểm tra tính nhất quán mô hình kinh doanh và máy trạng thái tin đăng (chuyển giao cho A6).
