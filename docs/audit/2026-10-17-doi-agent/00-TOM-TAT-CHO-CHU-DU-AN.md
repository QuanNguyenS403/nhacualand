# BẢN TÓM TẮT DÀNH CHO CHỦ DỰ ÁN (00-TOM-TAT-CHO-CHU-DU-AN.MD)
**Dự án:** QNS BROKER (NHACUALAND)  
**Ngày:** 2026-10-17  
**Tổng điều phối:** Đội Agent Kỹ sư Độc lập  

---

## 1. KẾT LUẬN CHUNG

Hệ thống có cấu trúc Monorepo phân lớp chuẩn mực, **0 lỗi biên dịch TypeScript**, các quy chuẩn lưu trữ tiền tệ VNĐ số nguyên được tuân thủ nghiêm túc. Tuy nhiên, đợt rà soát đã phát hiện **3 lỗi khẩn cấp (P0)** và **9 lỗi nghiêm trọng (P1)** cần khắc phục ngay để đảm bảo an toàn dữ liệu, chống rò rỉ token và đồng bộ đúng mô hình kinh doanh "chỉ cho thuê, phí thành công 40%".

---

## 2. 3 LỖI KHẨN CẤP (P0) CẦN XỬ LÝ NGAY

1. **Khóa JWT dự phòng lộ trong mã nguồn (SEC-001):** Nếu biến môi trường bị thiếu, hệ thống tự động ký token bằng khóa cố định công khai. Kẻ xấu có thể tự tạo token quản trị viên để đăng nhập.
2. **Token Cloudflare Tunnel nằm trong lịch sử Git (SEC-002):** Token dài 184 ký tự và tệp `cloudflared.exe` 55MB nằm trong commit cũ `f9ec1d2`. Chủ dự án cần xoay token trên Cloudflare Dashboard.
3. **Kịch bản nạp dữ liệu mẫu có thể xóa nhầm dữ liệu thật (DAT-001):** `seed.ts` nạp 154 phòng trọ nhưng không có điều kiện chặn chạy ở production, có thể làm mất dữ liệu phòng thật nếu bấm nhầm.

---

## 3. 5 QUYẾT ĐỊNH CẦN CHỦ DỰ ÁN CHỐT (MỤC 14)

1. **Thương hiệu chính thức:** Tiếp tục dùng **"NHACUALAND"** (đang hiển thị 136 lần trên giao diện) hay quay lại **"QNS BROKER"**?
2. **Số hotline 0981 753 082:** Giữ nguyên làm kênh liên hệ duy nhất hay cấu hình linh hoạt qua biến môi trường?
3. **Trang Mua bán & Dự án (`/mua-ban`, `/du-an`, `/gia-nha-dat`):** Giữ màn hình chờ (Coming Soon) hay dỡ bỏ hoàn toàn để tập trung 100% vào việc thuê phòng?
4. **Các module API chưa có trang web (`commissions`, `deals`, `viewings`):** Giữ lại làm API mở rộng tương lai hay tạm thời ẩn đi?
5. **Gói thành viên:** Chốt ẩn hoàn toàn mục "Duyệt gói thành viên" và "Mùa cao điểm" trên thanh menu Admin.

---

## 4. KẾ HOẠCH BĂNG CHUYỀN SỬA LỖI (GIAI ĐOẠN C)

Đội ngũ kỹ sư bắt đầu kích hoạt băng chuyền sửa lỗi tự động cho các hạng mục kỹ thuật không cần chờ chủ dự án:
- **Đợt 1:** Vá lỗ hổng JWT (SEC-001), thêm rào chắn tự hủy cho `seed.ts` (DAT-001), gỡ phone khỏi JWT payload (SEC-007), thắt chặt cổng Docker (OPS-002).
- **Đợt 2:** Sửa endpoint bản đồ verifyAsync (SEC-003), bật trust proxy (SEC-004), tích hợp Helmet (SEC-006), chặn upload ảnh nặc danh (SEC-005), ngừng gộp phòng mẫu Unsplash vào phòng thật (FE-001).
- **Đợt 3 & 4:** Chuẩn hóa hằng số phí 40% trong `@qns/shared` (BIZ-003), bổ sung test hành vi vào CI (TST-001), dọn dẹp kho mã nguồn.
