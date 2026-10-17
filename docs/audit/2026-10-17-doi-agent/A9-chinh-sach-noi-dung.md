# BÁO CÁO RÀ SOÁT CHÍNH SÁCH, THƯƠNG HIỆU VÀ NỘI DUNG (A9) — QNS BROKER
**Agent thực hiện:** Vai A9 (Chuyên gia Pháp chế, Chính sách & Thương hiệu — Chế độ Rà soát Độc lập / Mù)  
**Ngày:** 2026-10-17  

---

## 1. PHẠM VI VÀ PHƯƠNG PHÁP RÀ SOÁT

- Rà soát việc tuân thủ các quy chuẩn cốt lõi theo quy tắc **R6**:
  - Không dùng phương thức số điện thoại (đăng nhập, xác minh, OTP).
  - Không hardcode danh tính cá nhân trong logic nghiệp vụ.
- Thống kê toàn bộ các vị trí hardcode số điện thoại hotline `0981 753 082` trong repo.
- Đếm số lần xuất hiện và so sánh độ phân mảnh giữa hai thương hiệu "nhacualand" và "QNS BROKER".
- Rà soát các tuyên bố dịch vụ (như "24/7") và tính minh bạch thông tin.

---

## 2. KẾT QUẢ ĐO ĐẠC CHÍNH SÁCH VÀ THƯƠNG HIỆU

1. **Khởi tạo người dùng theo SĐT cá nhân cứng (POL-001):** `apps/api/src/modules/viewings/viewings.service.ts:30-45` tự động tạo tài khoản với `phone: '0981753082'`, `fullName: 'Đức Quân'`, `role: 'broker'` khi hệ thống thiếu hồ sơ môi giới.
2. **Hardcode Hotline (POL-002):** Số điện thoại cá nhân `0981 753 082` / `0981753082` xuất hiện tại **26 vị trí** trong toàn bộ dự án.
3. **Phân mảnh thương hiệu (POL-003):**
   - Chuỗi "nhacualand": **136 lần** xuất hiện trong mã nguồn (tiêu đề trang web, nội dung, footer, email sender).
   - Chuỗi "QNS BROKER": **3 lần** trong mã nguồn (nhưng toàn bộ tài liệu dự án, tên repo `QNS Cho Thuê`, admin header `QNS.Admin`, logo `logo-qns.svg`, và package `@qns/shared` vẫn giữ tên QNS).
4. **Tuyên bố "24/7" (POL-004):** `constants.ts:11` hiển thị `0981 753 082 (24/7)`, cam kết thời gian trực không khả thi với một cá nhân môi giới độc lập.

---

## 3. DANH SÁCH PHÁT HIỆN CHÍNH SÁCH & THƯƠNG HIỆU (A9)

| ID | Mức độ | Tiêu đề | Vị trí | Làn | Trạng thái |
|---|:---:|---|---|:---:|:---:|
| **POL-001** | P1 | viewings.service.ts tự động tạo tài khoản người dùng và hồ sơ môi giới theo số điện thoại cá nhân gõ cứng | `apps/api/src/modules/viewings/viewings.service.ts:30` | F2 | ĐÃ ĐỌC MÃ |
| **POL-002** | P2 | Số hotline cá nhân 0981 753 082 bị gõ cứng rải rác tại 26 vị trí trong mã nguồn | `apps/web/src/lib/constants.ts:10` | F3 | ĐÃ TÁI HIỆN |
| **POL-003** | P2 | Bất đồng bộ nhận diện thương hiệu giữa nhacualand 136 lần và QNS BROKER 3 lần trong codebase | `apps/web/src/app/layout.tsx:18` | F3 | ĐÃ TÁI HIỆN |
| **POL-004** | P3 | Tuyên bố trực hotline 24/7 trong constants.ts tiềm ẩn rủi ro thông tin không chính xác cho mô hình môi giới đơn lẻ | `apps/web/src/lib/constants.ts:11` | F3 | ĐÃ ĐỌC MÃ |

---

## 4. MA TRẬN ĐÃ RÀ / CHƯA RÀ

- **Đã rà (100%):** Quét SĐT cá nhân, đếm thương hiệu, kiểm tra luồng tạo user ngầm, kiểm tra tuyên bố giờ làm việc.
- Toàn bộ 9 vai rà soát mù (A1 đến A9) đã hoàn tất 100% báo cáo.
