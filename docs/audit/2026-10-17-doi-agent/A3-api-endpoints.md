# BÁO CÁO RÀ SOÁT API VÀ HỢP ĐỒNG ENDPOINTS (A3) — QNS BROKER
**Agent thực hiện:** Vai A3 (Kỹ sư API & Hợp đồng Dữ liệu — Chế độ Rà soát Độc lập / Mù)  
**Ngày:** 2026-10-17  

---

## 1. PHẠM VI VÀ PHƯƠNG PHÁP RÀ SOÁT

- Đối soát chéo 100% giữa danh mục endpoint backend (`inv-endpoints.csv`, 120 mục) và danh mục lời gọi mạng frontend (`inv-calls.csv`, 83 mục).
- Kiểm tra DTO, validation decorator (`class-validator`), giới hạn trần phân trang (`@Max` trên `pageSize`).
- Kiểm tra tính an toàn chuyển đổi BigInt (`ParseBigIntPipe`, `BigIntInterceptor`).
- Kiểm tra Next.js API route handlers tại `apps/web/src/app/api/*`.
- Rà soát các endpoint mồ côi (không ai gọi) và các lời gọi sai lệch hợp đồng.

---

## 2. KẾT QUẢ ĐO ĐẠC HỢP ĐỒNG API

1. **Độ phủ DTO & Validation:** Toàn bộ các Query DTO có phân trang đã được bổ sung `@Max(100)` chặn DoS. DTOs đều có decorator `class-validator` và `ValidationPipe` toàn cục bật `whitelist: true`, `forbidNonWhitelisted: true`.
2. **Xử lý số lớn BigInt:** Dự án có `BigIntInterceptor` toàn cục serialize đệ quy toàn bộ `BigInt` sang `string`, loại trừ triệt để lỗi HTTP 500 do `JSON.stringify`. Các controller sử dụng `ParseBigIntPipe` chuyển đổi tham số đường dẫn trực tiếp.
3. **Các module API mồ côi (Orphan Modules):**
   - 3 module: `commissions`, `deals`, `viewings` (gồm 21 endpoint) hoàn toàn không có trang web nào gọi đến trong thực tế.
4. **Mã chết tuyến đường (Route Handlers):**
   - Tuyến `/api/custom-listings` và `/api/custom-listings/[slug]` cố định trả về 410 Gone nhưng vẫn lưu tệp trong repo.
5. **Nuốt lỗi Silent Fail:**
   - Tuyến `/api/feedback` và `/api/consultation` khi gặp lỗi kết nối tới backend NestJS đã tự động nuốt ngoại lệ và trả về `success: true` cho client, khiến người dùng lầm tưởng dữ liệu đã gửi đi nhưng thực chất lead bị mất trắng.

---

## 3. DANH SÁCH PHÁT HIỆN API (A3)

| ID | Mức độ | Tiêu đề | Vị trí | Làn | Trạng thái |
|---|:---:|---|---|:---:|:---:|
| **API-001** | P2 | Ba module API gồm commissions, deals và viewings với 21 endpoint hoàn toàn không có trang frontend nào tiêu thụ | `apps/api/src/modules/commissions/commissions.controller.ts:1` | F2 | ĐÃ ĐỌC MÃ |
| **API-002** | P3 | Hai route handler custom-listings và custom-listings/[slug] trả về 410 Gone là mã chết tồn lưu | `apps/web/src/app/api/custom-listings/route.ts:7` | F3 | ĐÃ ĐỌC MÃ |
| **API-003** | P1 | Route handler feedback và consultation nuốt lỗi trả về success giả khi backend API gặp sự cố | `apps/web/src/app/api/feedback/route.ts:42` | F3 | ĐÃ ĐỌC MÃ |

---

## 4. MA TRẬN ĐÃ RÀ / CHƯA RÀ

- **Đã rà (100%):** Toàn bộ 120 endpoints (113 NestJS + 7 NextRoute), 83 lời gọi frontend, DTOs, cơ chế serialization BigInt.
- **Chưa rà:** Kiểm tra schema cơ sở dữ liệu chi tiết và chỉ mục index (chuyển giao cho A4).
