# BÁO CÁO RÀ SOÁT CƠ SỞ DỮ LIỆU VÀ SCHEMA (A4) — QNS BROKER
**Agent thực hiện:** Vai A4 (Kỹ sư Cơ sở Dữ liệu & Prisma — Chế độ Rà soát Độc lập / Mù)  
**Ngày:** 2026-10-17  

---

## 1. PHẠM VI VÀ PHƯƠNG PHÁP RÀ SOÁT

- Rà soát toàn bộ 39 model trong `packages/database/prisma/schema.prisma` và lịch sử migration DDL.
- Kiểm tra kiểu dữ liệu các cột tiền tệ (tuân thủ quy chuẩn số nguyên VNĐ, cấm dùng `Float`).
- Kiểm tra quan hệ khóa ngoại và chính sách `onDelete` (Cascade vs Restrict).
- Kiểm tra độ an toàn của kịch bản khởi tạo dữ liệu (`seed.ts`) đối với môi trường production và quy tắc R4.
- Thống kê các model mã chết (0 lượt đọc/ghi trong toàn bộ codebase).

---

## 2. KẾT QUẢ ĐO ĐẠC CƠ SỞ DỮ LIỆU

1. **Kiểu dữ liệu tiền tệ:** **Tuân thủ 100%**. Không có bất kỳ cột giá tiền nào dùng `Float`. 4 cột duy nhất dùng `Float` là các tọa độ địa lý `lat` và `lng` của `Listing` và `University`.
2. **Kịch bản Seed (`prisma/seed.ts`):** **Nguy cơ nghiêm trọng (P0)**. Kịch bản nạp 154 phòng trọ Hà Nội có lệnh `deleteMany` nhưng không có rào chắn chặn chạy trên `NODE_ENV === 'production'` và không kiểm tra hậu tố `_test` của cơ sở dữ liệu.
3. **Mô hình mã chết (Dead Models):** 13/39 model trong Prisma Schema hoàn toàn không có bất kỳ lệnh đọc hay ghi nào từ backend hay frontend:
   - Nhóm liên quan cọc & thanh toán (mâu thuẫn với R6 không giữ tiền): `DepositRecord`, `Payment`, `PaymentAllocation`, `Dispute`, `ConsentRecord`, `HandoverRecord`.
   - Nhóm môi giới phức tạp cũ: `AgencyProfile`, `AgreementUnit`, `RentalRequest`, `Introduction`.
   - Nhóm dữ liệu phụ trợ chưa dùng: `PriceIndex`, `SavedSearch`, `ListingUniversity`.

---

## 3. DANH SÁCH PHÁT HIỆN CƠ SỞ DỮ LIỆU (A4)

| ID | Mức độ | Tiêu đề | Vị trí | Làn | Trạng thái |
|---|:---:|---|---|:---:|:---:|
| **DAT-001** | P0 | Kịch bản seed.ts thiếu cơ chế bảo vệ tự hủy khi chạy trên môi trường production hoặc DB chính | `packages/database/prisma/seed.ts:1` | F1 | ĐÃ ĐỌC MÃ |
| **DAT-002** | P2 | Tồn tại 13 model trong schema Prisma là mã chết không được đọc hoặc ghi ở bất kỳ đâu | `packages/database/prisma/schema.prisma:1` | F1 | ĐÃ ĐỌC MÃ |

---

## 4. MA TRẬN ĐÃ RÀ / CHƯA RÀ

- **Đã rà (100%):** 39 model Prisma, 71 quan hệ khóa ngoại, các kiểu dữ liệu số, kịch bản seed.
- **Chưa rà:** Kiểm tra giao diện người dùng và trạng thái form (chuyển giao cho A5).
