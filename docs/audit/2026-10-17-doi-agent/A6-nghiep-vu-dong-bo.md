# BÁO CÁO RÀ SOÁT NGHIỆP VỤ VÀ ĐỒNG BỘ DỮ LIỆU (A6) — QNS BROKER
**Agent thực hiện:** Vai A6 (Kỹ sư Phân tích Nghiệp vụ & Đồng bộ Dữ liệu — Chế độ Rà soát Độc lập / Mù)  
**Ngày:** 2026-10-17  

---

## 1. PHẠM VI VÀ PHƯƠNG PHÁP RÀ SOÁT

- Đối soát mô hình kinh doanh thực tế với quy tắc cốt lõi **R6**:
  - QNS BROKER / NHACUALAND là nền tảng **chỉ cho thuê**.
  - Chủ dự án là người môi giới duy nhất.
  - Người thuê trả 0 đồng (miễn phí 100%).
  - Chủ nhà trả phí thành công 40% (chỉ trả khi dẫn khách và ký hợp đồng thành công).
  - Không nhận/giữ tiền cọc hay tiền thuê phòng.
  - Không dùng phương thức xác thực số điện thoại.
- Kiểm tra tính nhất quán của hằng số phí 40% trong toàn bộ mã nguồn.
- Kiểm tra dấu vết các tính năng mua bán, dự án, giá nhà đất.
- Kiểm tra tính năng gói thành viên, mua cao điểm trong bảng điều khiển quản trị.

---

## 2. KẾT QUẢ ĐO ĐẠC NGHIỆP VỤ

1. **Khớp nối mô hình 40% & Người thuê 0 đồng:** Backend `membership.service.ts` đã chặn mua mới gói thành viên với thông báo rõ ràng về việc chuyển đổi sang mô hình 40%. Điều khoản tại `OwnerBrokerTermsGate.tsx` và `MembershipPricingClient.tsx` nêu rõ người thuê trả 0đ, chủ nhà trả 40% khi chốt phòng thành công.
2. **Mâu thuẫn Menu Quản trị (Admin Sidebar):** `apps/web/src/app/admin/layout.tsx` vẫn giữ 2 mục điều hướng "Duyệt gói thành viên" và "Mùa cao điểm (Surge)", tạo ra sự mâu thuẫn trực quan khi hệ thống đã dừng kinh doanh mô hình gói.
3. **Các trang Mua bán / Dự án:**
   - `/mua-ban` tự động chuyển hướng về `/thue`.
   - `/du-an` và `/gia-nha-dat` hiển thị màn hình ComingSoonNotice (không index Google).
4. **Hằng số phí 40%:** Đang được ghi rải rác dưới dạng chuỗi ký tự tự do trong 12 tệp khác nhau thay vì tham chiếu hằng số chuẩn từ `@qns/shared`.

---

## 3. DANH SÁCH PHÁT HIỆN NGHIỆP VỤ (A6)

| ID | Mức độ | Tiêu đề | Vị trí | Làn | Trạng thái |
|---|:---:|---|---|:---:|:---:|
| **BIZ-001** | P1 | Thanh điều hướng Admin vẫn hiển thị Duyệt gói thành viên và Mùa cao điểm dù đã ngừng bán gói | `apps/web/src/app/admin/layout.tsx:184` | F3 | ĐÃ ĐỌC MÃ |
| **BIZ-002** | P2 | Tồn tại các tuyến đường mua bán và tra cứu giá nhà đất ngoài mô hình cốt lõi chỉ cho thuê | `apps/web/src/app/mua-ban/page.tsx:1` | F3 | ĐÃ ĐỌC MÃ |
| **BIZ-003** | P2 | Tỷ lệ phí môi giới 40% bị gõ cứng rải rác nhiều tệp thay vì dùng hằng số tập trung tại @qns/shared | `apps/web/src/components/OwnerBrokerTermsGate.tsx:137` | F1 | ĐÃ ĐỌC MÃ |

---

## 4. MA TRẬN ĐÃ RÀ / CHƯA RÀ

- **Đã rà (100%):** Đối soát các luồng nghiệp vụ 40%, người thuê 0 đồng, các trang mua bán, gói thành viên, luồng duyệt tin, điều hướng admin.
- **Chưa rà:** Kiểm tra chất lượng kiểm thử tự động và tỷ lệ phủ test (chuyển giao cho A7).
