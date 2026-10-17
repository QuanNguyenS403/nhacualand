# BÁO CÁO RÀ SOÁT VẬN HÀNH VÀ TRIỂN KHAI (A8) — QNS BROKER
**Agent thực hiện:** Vai A8 (Kỹ sư DevOps & Vận hành Hệ thống — Chế độ Rà soát Độc lập / Mù)  
**Ngày:** 2026-10-17  

---

## 1. PHẠM VI VÀ PHƯƠNG PHÁP RÀ SOÁT

- Kiểm tra cấu hình Docker (`docker-compose.yml`) và tính an toàn mạng cổng DB/Redis.
- Rà soát cơ chế xác thực biến môi trường khi khởi động (`apps/api/src/common/config/assert-env.ts`).
- Kiểm tra các bẫy gửi email thực tế (`MAIL_DRIVER=smtp`) trong `.env.example`.
- Kiểm tra các tệp báo cáo cũ tồn lưu ở thư mục gốc repo.
- Đánh giá quy trình chạy môi trường dev và production.

---

## 2. KẾT QUẢ ĐO ĐẠC VẬN HÀNH

1. **Lỗ hổng Assert Env (OPS-001):** `assert-env.ts` chỉ kiểm tra chuỗi `changeme_access` mà không hề nhận diện 2 chuỗi hex 64 ký tự mẫu có sẵn trong `.env.example` và `auth.service.ts:560`, cho phép hệ thống production khởi động bình thường với khóa JWT mẫu công khai.
2. **Cấu hình Docker (OPS-002):** `docker-compose.yml` mở cổng PostgreSQL 5432 và Redis 6379 lắng nghe toàn mạng `0.0.0.0` với mật khẩu mặc định `postgres`.
3. **Bẫy gửi email thật (OPS-003):** `.env.example` mặc định chọn `MAIL_DRIVER=smtp` thay vì `mock`.
4. **Vệ sinh kho mã nguồn (OPS-004):** Tồn tại 6 tệp `AUDIT-*.md` cũ nằm rải rác ở thư mục gốc repo.

---

## 3. DANH SÁCH PHÁT HIỆN VẬN HÀNH (A8)

| ID | Mức độ | Tiêu đề | Vị trí | Làn | Trạng thái |
|---|:---:|---|---|:---:|:---:|
| **OPS-001** | P1 | assert-env.ts chỉ kiểm tra chuỗi changeme cũ bỏ lọt hoàn toàn 2 khóa hex mẫu công khai trong .env.example | `apps/api/src/common/config/assert-env.ts:21` | F0 | ĐÃ ĐỌC MÃ |
| **OPS-002** | P1 | docker-compose.yml mở cổng 5432 và 6379 ra toàn mạng 0.0.0.0 với mật khẩu mặc định | `docker-compose.yml:8` | F5 | ĐÃ ĐỌC MÃ |
| **OPS-003** | P2 | Tệp .env.example đặt mặc định MAIL_DRIVER=smtp tiềm ẩn bẫy gửi email thật khi chạy test | `.env.example:32` | F5 | ĐÃ ĐỌC MÃ |
| **OPS-004** | P3 | Sáu tệp báo cáo audit cũ tồn lưu tại thư mục gốc repo gây rác kho mã nguồn | `AUDIT-CLAUDE-2026-09-01.md:1` | F5 | ĐÃ ĐỌC MÃ |

---

## 4. MA TRẬN ĐÃ RÀ / CHƯA RÀ

- **Đã rà (100%):** Docker compose, assert-env, biến môi trường mẫu, lịch sử git, tệp rác thư mục gốc.
- **Chưa rà:** Kiểm tra chính sách số điện thoại, thương hiệu và thông tin hotline (chuyển giao cho A9).
