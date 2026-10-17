# BÁO CÁO RÀ SOÁT KIẾN TRÚC VÀ CẤU TRÚC MÃ NGUỒN (A1) — QNS BROKER
**Agent thực hiện:** Vai A1 (Kiến trúc sư hệ thống — Chế độ Rà soát Độc lập / Mù)  
**Ngày:** 2026-10-17  

---

## 1. PHẠM VI VÀ PHƯƠNG PHÁP RÀ SOÁT

- Kiểm tra toàn bộ cấu trúc Monorepo (pnpm workspace, Turborepo).
- Quét phụ thuộc vòng (Circular Dependencies) trong `apps/api/src` và `apps/web/src`.
- Kiểm tra ranh giới Module NestJS và việc import trong `AppModule`.
- Kiểm tra quy chuẩn Controller/Service (vi phạm gọi Prisma trực tiếp trong controller).
- Thống kê độ dài dòng các tệp mã nguồn (> 500 dòng).
- Đối chiếu Single Source of Truth giữa `@qns/shared`, `apps/api` và `apps/web`.
- Rà soát `tsconfig.json` và tỷ lệ dùng kiểu `: any`.

---

## 2. KẾT QUẢ ĐO ĐẠC KIẾN TRÚC

1. **Phụ thuộc vòng (Circular Dependencies):** **0 vòng** trong `apps/api` và **0 vòng** trong `apps/web`. Cấu trúc cây import phân cấp tốt.
2. **Controller và Service:** 13/14 controller tuân thủ nghiêm ngặt, không gọi Prisma trực tiếp (chỉ trừ `health.controller.ts` thực hiện ping database `SELECT 1`, điều này là chấp nhận được cho endpoint kiểm tra sức khỏe).
3. **Mã chết / Module mồ côi:** `UploadsModule` không được import trực tiếp vào `AppModule` nhưng đã được import qua `ListingsModule`.
4. **Điểm nóng phình to tệp (> 800 dòng):**
   - `apps/api/src/modules/listings/listings.service.ts`: 1.605 dòng.
   - `apps/api/src/modules/admin/admin.service.ts`: 1.145 dòng.
   - `apps/web/src/app/admin/tin-cho-duyet/page.tsx`: 926 dòng.
   - `apps/web/src/lib/vietnam-universities.ts`: 1.710 dòng (bảng dữ liệu tĩnh).
5. **Độ nghiêm ngặt TypeScript:**
   - `apps/api`: `strict: false`, có 50 chỗ dùng `: any`.
   - `apps/web`: `strict: true`, có 38 chỗ dùng `: any`.
   - `packages/shared`: `strict: true`.

---

## 3. DANH SÁCH PHÁT HIỆN KIẾN TRÚC (A1)

| ID | Mức độ | Tiêu đề | Vị trí | Làn | Trạng thái |
|---|:---:|---|---|:---:|:---:|
| **ARC-001** | P2 | Tệp listings.service.ts có quy mô 1.605 dòng vượt trần 800 dòng và ôm đồm quá nhiều nghiệp vụ | `apps/api/src/modules/listings/listings.service.ts:1` | F2 | ĐÃ ĐỌC MÃ |
| **ARC-002** | P2 | Tệp admin.service.ts có quy mô 1.145 dòng vượt trần kiến trúc | `apps/api/src/modules/admin/admin.service.ts:1` | F2 | ĐÃ ĐỌC MÃ |
| **ARC-003** | P2 | Hằng số PROPERTY_TYPES và hàm formatPrice bị định nghĩa lại tại frontend thay vì tái sử dụng @qns/shared | `apps/web/src/components/SearchFilterBar.tsx:32` | F3 | ĐÃ ĐỌC MÃ |
| **ARC-004** | P2 | Cấu hình TypeScript tại apps/api và packages/database tắt chế độ strict | `apps/api/tsconfig.json:8` | F2 | ĐÃ ĐỌC MÃ |

---

## 4. MA TRẬN ĐÃ RÀ / CHƯA RÀ

- **Đã rà (100%):** Toàn bộ cấu trúc module NestJS, dependency graph, 14 controller, tệp cấu hình tsconfig, danh sách các hàm/hằng dùng chung giữa Web và API.
- **Chưa rà:** Chi tiết logic bảo mật của JWT và phân quyền (chuyển giao cho A2).
