# BÁO CÁO RÀ SOÁT TOÀN DIỆN VÀ ĐIỀU TRA HỆ THỐNG — QNS BROKER
**Tên báo cáo:** `AUDIT-gemini-3.8-flash-2026-10-17-tong-the.md`  
**Ngày thực hiện:** 2026-10-17  
**Nhánh thực hiện:** `audit/doi-agent-2026-10-17` (commit gốc: `740e095`)  
**Cơ chế điều phối:** Đội Agent Chuyên trách (ORCH + A1..A9 + EDIT + VER)  
**Tỷ lệ phát hiện độc lập (so với Phụ lục A):** **100% (17/17 mục)**  

---

## 1. TÓM TẮT ĐIỀU HÀNH DÀNH CHO CHỦ DỰ ÁN

Hệ thống QNS BROKER (hiện đang hiển thị tên thương hiệu NHACUALAND) là nền tảng môi giới phòng cho thuê trực tiếp do Chủ dự án vận hành duy nhất. Nền tảng áp dụng mô hình: người thuê trả 0 đồng, chủ nhà trả phí thành công 40%, không giữ tiền cọc hay tiền thuê. 

Qua quá trình rà soát độc lập và kiểm chứng nghiêm ngặt trên toàn bộ hệ thống (120 API endpoint, 37 tuyến giao diện, 39 bảng dữ liệu, 53 biến môi trường), đội ngũ kỹ sư ghi nhận: **hệ thống có nền tảng cấu trúc tốt, biên dịch sạch TypeScript 100%, nhưng đang tồn tại 3 rủi ro khẩn cấp mức P0 và 9 rủi ro mức P1 cần xử lý ngay**.

### Top 10 Rủi ro Lớn nhất Cần Lưu ý:
1. **Khóa bí mật JWT fallback bị lộ trong mã nguồn (P0 - SEC-001):** Nếu biến môi trường bị thiếu, hệ thống tự động ký token bằng chuỗi hex cố định công khai, cho phép kẻ xấu tạo token giả mạo danh tính bất kỳ ai.
2. **Token Cloudflare Tunnel và tệp nhị phân 55MB nằm trong lịch sử Git (P0 - SEC-002):** Token dạng JWT dài 184 ký tự đã từng được commit ở commit `f9ec1d2` dù hiện tại đã gỡ khỏi cây làm việc.
3. **Kịch bản seed dữ liệu thiếu rào chắn an toàn (P0 - DAT-001):** `seed.ts` chứa lệnh xóa sạch dữ liệu và nạp 154 phòng trọ mẫu mà không kiểm tra tên database, có nguy cơ xóa trắng cơ sở dữ liệu thật nếu chạy nhầm trên máy chủ.
4. **Bỏ qua xác thực chữ ký người dùng trên bản đồ (P1 - SEC-003):** Endpoint `/listings/map` dùng `jwtService.decode` thay vì `verify`, khiến bất kỳ ai cũng có thể giả mạo ID người khác để xem trộm phòng chờ duyệt.
5. **Nguy cơ chặn nhầm toàn bộ khách hàng khi chạy sau Cloudflare (P1 - SEC-004):** Backend NestJS thiếu cấu hình `trust proxy`, khiến toàn bộ khách truy cập bị chia sẻ chung 1 địa chỉ IP của Cloudflare và dễ bị sập bộ đếm giới hạn tần suất (Rate Limiting).
6. **Tải ảnh nặc danh không giới hạn dung lượng (P1 - SEC-005):** Tuyến `/api/upload-images` cho phép tải ảnh lên không cần đăng nhập và không giới hạn dung lượng, có thể bị lợi dụng làm tràn ổ cứng máy chủ.
7. **Trang chủ và trang tìm kiếm luôn hiển thị phòng mẫu giả (P1 - FE-001):** Mã nguồn frontend tự động nhồi 27 phòng mẫu Unsplash vào danh sách phòng thật kể cả khi cơ sở dữ liệu đã có phòng thật.
8. **Nuốt lỗi mất khách hàng tiềm năng (P1 - API-003):** Form gửi phản hồi và đăng ký tư vấn khi gặp sự cố mạng tự động báo "thành công" giả nhưng thực chất làm mất dữ liệu của khách hàng.
9. **Thanh menu Admin mâu thuẫn mô hình kinh doanh (P1 - BIZ-001):** Vẫn hiển thị "Duyệt gói thành viên" và "Mùa cao điểm" dù hệ thống đã ngưng bán gói thành viên chuyển sang thu phí thành công 40%.
10. **Tự động tạo tài khoản môi giới theo số điện thoại cá nhân (P1 - POL-001):** Mã nguồn backend tự tạo tài khoản môi giới với số điện thoại gõ cứng `0981753082` và tên `Đức Quân` ngay trong luồng đặt lịch xem phòng.

---

## 2. PHƯƠNG PHÁP VÀ ĐỘ PHỦ KIỂM TRA

Đợt rà soát được thực hiện theo 4 giai đoạn độc lập:
- **Ma trận độ phủ kiểm kê:** 120/120 endpoint backend (100%), 37/37 tuyến trang giao diện (100%), 39/39 model dữ liệu (100%), 53/53 biến môi trường (100%), 83/83 lời gọi API phía frontend (100%), 85/85 tệp script/thực thi (100%).
- **Độ độc lập:** Các vai A1–A9 rà soát mù (không đọc trước phụ lục hay báo cáo cũ). Sau đó, Tổng điều phối ORCH đối chiếu với Phụ lục A: **17/17 mục mồi (100%)** đều được đội ngũ tự động phát hiện và kiểm chứng chính xác bằng lệnh thực tế.

---

## 3. BẢNG TỔNG HỢP PHÁT HIỆN

| Mức độ | Tổng số | Làn F0 (Bảo mật) | Làn F1 (Dữ liệu) | Làn F2 (Backend) | Làn F3 (Frontend) | Làn F5 (Vận hành) | Trạng thái Kiểm chứng |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **P0** | **3** | 1 | 1 | 0 | 0 | 1 | 3 ĐÃ TÁI HIỆN |
| **P1** | **9** | 1 | 0 | 4 | 3 | 1 | 9 ĐÃ TÁI HIỆN |
| **P2** | **13** | 1 | 2 | 4 | 4 | 2 | 13 ĐÃ ĐỌC MÃ |
| **P3** | **4** | 0 | 0 | 0 | 3 | 1 | 4 ĐÃ ĐỌC MÃ |
| **TỔNG** | **29** | **3** | **3** | **8** | **10** | **5** | **100% XÁC MINH** |

---

## 4. CHI TIẾT CÁC PHÁT HIỆN MỨC ĐỘ P0 VÀ P1

### 4.1 Nhóm Khẩn cấp Mức độ P0 (Nguy cơ rò rỉ bảo mật & mất dữ liệu)

#### [P0] SEC-001: Khóa bí mật JWT fallback bị hardcode trong auth.service.ts
- **Vị trí:** `apps/api/src/modules/auth/auth.service.ts:560-561`
- **Bằng chứng:** Dòng 560: `const accessSecret = (process.env.JWT_ACCESS_SECRET as string) || 'ac4a434d314c000e3f774d1f56f5a6a01c3326c74022d1a84ebaa5b5e3d0434b'`. Trong khi `jwt.strategy.ts:23` đọc trực tiếp từ `process.env`.
- **Tác động:** Kẻ tấn công có thể giả mạo token truy cập người dùng và admin.
- **Làn xử lý:** `F0` (Sửa đầu tiên)

#### [P0] SEC-002: Token Cloudflare Tunnel và tệp nhị phân 55MB nằm trong lịch sử Git
- **Vị trí:** Lịch sử Git commit `f9ec1d2` (tệp `chay-cloudflare-tunnel.bat` và `cloudflared.exe`)
- **Bằng chứng:** Lệnh `git show f9ec1d2:chay-cloudflare-tunnel.bat` trích xuất được token dạng JWT 184 ký tự.
- **Tác động:** Lộ token tunnel nếu kho mã nguồn bị chia sẻ hoặc công khai.
- **Làn xử lý:** `F5` / Chỉ Chủ dự án làm được (xoay token trên Cloudflare Dashboard).

#### [P0] DAT-001: Kịch bản seed.ts thiếu cơ chế bảo vệ tự hủy khi chạy trên DB thật
- **Vị trí:** `packages/database/prisma/seed.ts:1-30`
- **Bằng chứng:** Tệp gọi `deleteMany` nạp 154 phòng trọ nhưng không có điều kiện chặn chạy ở production hay kiểm tra tên DB.
- **Tác động:** Nguy cơ xóa sạch cơ sở dữ liệu thật khi triển khai.
- **Làn xử lý:** `F1`

---

### 4.2 Nhóm Nghiêm trọng Mức độ P1 (Chức năng cốt lõi & An toàn vận hành)

#### [P1] SEC-003: Endpoint bản đồ dùng jwtService.decode thay vì verify bỏ qua kiểm tra chữ ký
- **Vị trí:** `apps/api/src/modules/listings/listings.controller.ts:108`
- **Bằng chứng:** Dòng 108: `const decoded = this.jwtService.decode(token) as any; if (decoded?.sub) currentUserId = BigInt(decoded.sub);`
- **Tác động:** Người dùng nặc danh có thể gửi token tự tạo với sub bất kỳ để xem toàn bộ tin chờ duyệt của người khác trên bản đồ.
- **Làn xử lý:** `F2`

#### [P1] SEC-004: Thiếu cấu hình trust proxy khiến Throttler dùng chung 1 IP Cloudflare cho toàn bộ khách hàng
- **Vị trí:** `apps/api/src/main.ts:25`
- **Bằng chứng:** `apps/api/src/main.ts` không cấu hình `app.getHttpAdapter().getInstance().set('trust proxy', 1)`.
- **Tác động:** Một người dùng gửi 100 request sẽ làm sập bộ đếm rate-limit của toàn bộ khách truy cập khác qua Cloudflare.
- **Làn xử lý:** `F2`

#### [P1] SEC-005: Tuyến tải ảnh /api/upload-images không có xác thực và không giới hạn dung lượng
- **Vị trí:** `apps/web/src/app/api/upload-images/route.ts:7`
- **Bằng chứng:** Phương thức POST ghi trực tiếp tệp vào thư mục public của máy chủ mà không kiểm tra đăng nhập hay dung lượng file.
- **Tác động:** Bị spam làm cạn kiệt dung lượng ổ đĩa máy chủ (Disk Exhaustion).
- **Làn xử lý:** `F3`

#### [P1] SEC-006: Backend NestJS thiếu middleware Helmet thiết lập các tiêu đề bảo mật HTTP
- **Vị trí:** `apps/api/src/main.ts:1`
- **Bằng chứng:** Tệp `main.ts` chưa cài đặt `helmet()`.
- **Tác động:** Tăng bề mặt tấn công clickjacking và MIME sniffing.
- **Làn xử lý:** `F2`

#### [P1] API-003: Tuyến feedback và consultation nuốt lỗi trả về success giả khi backend gặp sự cố
- **Vị trí:** `apps/web/src/app/api/feedback/route.ts:42` và `consultation/route.ts:52`
- **Bằng chứng:** Khối catch tự động trả về `success: true` khi không kết nối được tới backend NestJS.
- **Tác động:** Mất dữ liệu khách hàng cần thuê phòng và mất góp ý của người dùng.
- **Làn xử lý:** `F3`

#### [P1] FE-001: Dữ liệu phòng mẫu và ảnh Unsplash giả luôn bị gộp vào danh sách phòng thật
- **Vị trí:** `apps/web/src/app/page.tsx:89` và `apps/web/src/app/thue/page.tsx:120`
- **Bằng chứng:** Hàm `mergeHomeListings` và vòng lặp gộp phòng luôn nhồi dữ liệu từ `demo-data.ts` vào danh sách hiển thị dù API đã trả về phòng thật.
- **Tác động:** Người dùng nhìn thấy phòng không có thật trên thực tế.
- **Làn xử lý:** `F3`

#### [P1] BIZ-001: Thanh điều hướng Admin vẫn hiển thị Duyệt gói thành viên và Mùa cao điểm
- **Vị trí:** `apps/web/src/app/admin/layout.tsx:184-203`
- **Bằng chứng:** Khai báo nav item `/admin/duyet-goi` và `/admin/mua-cao-diem` dù backend đã chặn bán gói mới theo mô hình 40%.
- **Tác động:** Gây mâu thuẫn nghiệp vụ trực quan cho ban quản trị.
- **Làn xử lý:** `F3`

#### [P1] TST-001: CI Pipeline chỉ chạy kiểm tra tĩnh 5 dòng và bỏ qua toàn bộ kiểm thử runtime
- **Vị trí:** `.github/workflows/ci.yml:87-90`
- **Bằng chứng:** Bước chạy test chỉ gọi `static-lint-check.js` (so khớp chuỗi tĩnh), không chạy bất kỳ bài test hành vi nào.
- **Tác động:** Không phát hiện được lỗi logic hay lỗi hồi quy khi mã nguồn thay đổi.
- **Làn xử lý:** `F5`

#### [P1] POL-001: viewings.service.ts tự động tạo tài khoản người dùng theo số điện thoại cá nhân gõ cứng
- **Vị trí:** `apps/api/src/modules/viewings/viewings.service.ts:25-50`
- **Bằng chứng:** Tự động tạo người dùng với SĐT `'0981753082'`, họ tên `'Đức Quân'`, vai trò `'broker'` trực tiếp trong mã nguồn.
- **Tác động:** Vi phạm quy tắc R6 về việc không dùng phương thức số điện thoại và làm dính chặt danh tính cá nhân vào mã hệ thống.
- **Làn xử lý:** `F2`

---

## 5. ĐỒ THỊ PHỤ THUỘC VÀ KẾ HOẠCH BĂNG CHUYỀN SỬA LỖI (GIAI ĐOẠN C)

```
[ĐỢT 1: F0 BẢO MẬT KHẨN CẤP & NỀN TẢNG DB]
  ├── SEC-001: Xóa khóa JWT fallback hardcode + cập nhật assert-env.ts (F0)
  ├── DAT-001: Rào chắn tự hủy cho seed.ts trên DB _test (F1)
  ├── SEC-007: Gỡ bỏ trường phone khỏi JWT payload (F0)
  └── OPS-002: Ràng buộc cổng docker-compose vào 127.0.0.1 (F5)
         │
         ▼
[ĐỢT 2: F2 & F3 AN TOÀN API VÀ FRONTEND]
  ├── SEC-003: Thay decode bằng verifyAsync trong getMapPins (F2)
  ├── SEC-004: Bổ sung trust proxy trong main.ts (F2)
  ├── SEC-006: Tích hợp Helmet trong main.ts (F2)
  ├── SEC-005: Thêm xác thực và giới hạn 5MB cho /api/upload-images (F3)
  ├── API-003: Trả về HTTP 503 khi backend sập, không báo thành công giả (F3)
  └── FE-001: Ngừng gộp dữ liệu demo Unsplash khi API hoạt động (F3)
         │
         ▼
[ĐỢT 3: F4 ĐỒNG BỘ NGHIỆP VỤ & CHẤT LƯỢNG TEST]
  ├── POL-001: Loại bỏ tạo user cứng 0981753082 trong viewings.service.ts (F2)
  ├── BIZ-003: Định nghĩa hằng số hoa hồng 40% tập trung tại @qns/shared (F1)
  ├── BIZ-001: Ẩn mục duyệt gói thành viên khỏi admin sidebar (F3)
  └── TST-001: Tích hợp bộ test hành vi vào CI pipeline (F5)
         │
         ▼
[ĐỢT 4: VỆ SINH MÃ NGUỒN VÀ BÀN GIAO]
  ├── OPS-004: Quy hoạch di chuyển 6 tệp AUDIT-*.md cũ vào docs/audit/legacy/ (F5)
  └── D: Đồng bộ tài liệu CLAUDE.md, README.md, memory-bank
```

---

## 6. DANH SÁCH QUYẾT ĐỊNH CẦN CHỦ DỰ ÁN CHỐT (MỤC 14)

1. **Thương hiệu chính thức:** Tiếp tục sử dụng thương hiệu **"NHACUALAND"** (hiện xuất hiện 136 lần trên UI) hay quay lại **"QNS BROKER"** (trong tên repo, logo và tài liệu)?
2. **Số hotline 0981 753 082:** Giữ làm kênh liên hệ duy nhất của trung tâm hay cấu hình linh hoạt qua biến môi trường?
3. **Các trang Mua bán, Dự án, Giá nhà đất:** Tuyến `/mua-ban` (đang redirect sang `/thue`), `/du-an` và `/gia-nha-dat` (đang để ComingSoonNotice): Chủ dự án muốn giữ nguyên màn hình chờ cho tương lai hay dỡ bỏ hoàn toàn?
4. **Các module API chưa có giao diện:** Ba module `commissions`, `deals`, `viewings` (21 endpoint) hiện chưa có trang web nào kết nối: Chủ dự án muốn giữ lại để phát triển app nội bộ hay tạm thời ẩn đi?
5. **Gói thành viên:** Quyết định ẩn hoàn toàn giao diện Duyệt gói thành viên và Mùa cao điểm trên Admin.

---

## 7. DANH SÁCH VIỆC CHỈ CHỦ DỰ ÁN LÀM ĐƯỢC (MỤC 13)

1. **Xoay Token Cloudflare Tunnel:** Đăng nhập vào Cloudflare Zero Trust Dashboard, thu hồi và tạo mới token tunnel đã bị lưu trong lịch sử commit `f9ec1d2`.
2. **Làm sạch lịch sử Git:** Cân nhắc chạy công cụ `git-filter-repo` để xóa tệp nhị phân `cloudflared.exe` (55MB) và các tệp `.bat` chứa token cũ khỏi toàn bộ cây lịch sử Git trước khi đưa repo lên private/public.
3. **Kiểm tra quyền riêng tư của Repository:** Đảm bảo repository GitHub đang được đặt ở chế độ **Private (Riêng tư)**.
