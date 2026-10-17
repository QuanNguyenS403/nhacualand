# BẢNG ĐIỀU PHỐI (BOARD.MD) — ĐỘI AGENT RÀ SOÁT QNS BROKER
**Ngày bắt đầu:** 2026-10-17  
**Nhánh:** `audit/doi-agent-2026-10-17`  
**Tổng điều phối (ORCH):** Antigravity IDE Agent (Gemini 3.8 Flash)  

---

## 1. NHẬT KÝ CỔNG KIỂM SOÁT (GATES)

| Cổng | Mục tiêu | Trạng thái | Bằng chứng / Biên bản |
|:---:|---|:---:|---|
| **G0** | Baseline & Inventory 100% | **ĐẠT (PASSED)** | Đã tạo nhánh `audit/doi-agent-2026-10-17`, đo baseline (Exit 0/1 ghi rõ trong `00-baseline.md`), sinh đủ 6 file CSV inventory (120 endpoints, 37 routes, 39 models, 53 env vars, 83 calls, 85 scripts) |
| **G1** | Hoàn tất rà soát mù A1–A9 | **ĐẠT (PASSED)** | Hoàn thành đủ 9/9 báo cáo chuyên trách A1–A9 (`.md` và `.json`) với 100% độ phủ ma trận kiểm kê và đối chiếu độc lập |
| **G2** | Báo cáo tổng hợp & Kiểm chứng độc lập | **ĐẠT (PASSED)** | Hoàn thành `AUDIT-gemini-3.8-flash-2026-10-17-tong-the.md`, `master-findings.json`, `00-TOM-TAT-CHO-CHU-DU-AN.md`. VER kiểm chứng 10/10 mẫu đạt 100% |
| **G3** | Đợt 1 sửa lỗi (P0 Security & DB Safety) | **ĐẠT (PASSED)** | Test đỏ `test-sec001-jwt.js` -> Green. Vá SEC-001, SEC-007, OPS-001, DAT-001, OPS-002, OPS-003. Checkpoint commit: `ac2fd65` |
| **G4** | Đợt 2 sửa lỗi (P1 Backend & Frontend) | **ĐẠT (PASSED)** | Test đỏ `test-wave2-backend.js`, `test-wave2-frontend.js` -> Green. Vá SEC-003, SEC-004, SEC-006, SEC-005, API-003, FE-001. Checkpoint commit: `a04a49f` |
| **G5** | Đợt 3 & Nghiệm thu độc lập | **ĐẠT (PASSED)** | Vá POL-001, BIZ-003, TST-001, OPS-004. Checkpoint commit: `dc50e7b`. 2 lượt xác minh độc lập đạt 100% |

---

## 2. PHÂN CÔNG VÀ TIẾN ĐỘ RÀ SOÁT (GIAI ĐOẠN A)

| Vai | Chuyên trách | File báo cáo | File JSON | Trạng thái |
|:---:|---|---|---|:---:|
| **A1** | Kiến trúc & Cấu trúc mã | `A1-kien-truc.md` | `A1-findings.json` | HOÀN THÀNH (4 phát hiện) |
| **A2** | Bảo mật & Xác thực | `A2-bao-mat.md` | `A2-findings.json` | HOÀN THÀNH (7 phát hiện) |
| **A3** | Hợp đồng API & Endpoints | `A3-api-endpoints.md` | `A3-findings.json` | HOÀN THÀNH (3 phát hiện) |
| **A4** | Cơ sở dữ liệu & Schema | `A4-co-so-du-lieu.md` | `A4-findings.json` | HOÀN THÀNH (2 phát hiện) |
| **A5** | Giao diện người dùng & Frontend | `A5-frontend.md` | `A5-findings.json` | HOÀN THÀNH (3 phát hiện) |
| **A6** | Nghiệp vụ & Đồng bộ dữ liệu | `A6-nghiep-vu-dong-bo.md` | `A6-findings.json` | HOÀN THÀNH (3 phát hiện) |
| **A7** | Chất lượng mã & Kiểm thử | `A7-chat-luong-kiem-thu.md` | `A7-findings.json` | HOÀN THÀNH (3 phát hiện) |
| **A8** | Vận hành & Hạ tầng | `A8-van-hanh-trien-khai.md` | `A8-findings.json` | HOÀN THÀNH (4 phát hiện) |
| **A9** | Chính sách, Thương hiệu & Nội dung | `A9-chinh-sach-noi-dung.md` | `A9-findings.json` | HOÀN THÀNH (4 phát hiện) |

---

## 3. BẢNG TIẾN ĐỘ BĂNG CHUYỀN SỬA LỖI (GIAI ĐOẠN C)

| Mã lỗi | Mức | Làn | Trạng thái | Test đỏ | Bản sửa | Duyệt chéo | Kiểm chứng | Checkpoint Commit |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **SEC-001** | P0 | F0 | XONG | `test-sec001-jwt.js` | Gỡ hardcoded fallback JWT secrets trong `auth.service.ts` | R-Sec (ĐẠT) | VER (ĐÃ TÁI HIỆN -> XANH) | `ac2fd65` |
| **SEC-007** | P0 | F0 | XONG | `test-sec001-jwt.js` | Loại bỏ trường `phone` khỏi payload JWT accessToken/refreshToken | R-Sec (ĐẠT) | VER (XANH) | `ac2fd65` |
| **OPS-001** | P1 | F0 | XONG | `test-sec001-jwt.js` | Thêm blacklist hex keys mẫu vào `assert-env.ts` | R-Ops (ĐẠT) | VER (XANH) | `ac2fd65` |
| **DAT-001** | P0 | F1 | XONG | `test-sec001-jwt.js` | Chặn seed chạy trên production/non-test DB trong `seed.ts` | R-Data (ĐẠT) | VER (XANH) | `ac2fd65` |
| **OPS-002** | P1 | F5 | XONG | `test-sec001-jwt.js` | Ràng buộc Docker Postgres & Redis vào `127.0.0.1` | R-Ops (ĐẠT) | VER (XANH) | `ac2fd65` |
| **OPS-003** | P1 | F5 | XONG | `test-sec001-jwt.js` | Đổi mặc định `MAIL_DRIVER=mock` trong `.env.example` | R-Ops (ĐẠT) | VER (XANH) | `ac2fd65` |
| **SEC-003** | P1 | F2 | XONG | `test-wave2-backend.js` | Chuyển `jwtService.decode` sang `verify` trong `listings.controller.ts` | R-Sec (ĐẠT) | VER (XANH) | `a04a49f` |
| **SEC-004** | P1 | F2 | XONG | `test-wave2-backend.js` | Bật `app.set('trust proxy', 1)` trong `main.ts` | R-Ops (ĐẠT) | VER (XANH) | `a04a49f` |
| **SEC-006** | P1 | F2 | XONG | `test-wave2-backend.js` | Tích hợp middleware `helmet` bảo vệ HTTP headers trong `main.ts` | R-Sec (ĐẠT) | VER (XANH) | `a04a49f` |
| **SEC-005** | P1 | F3 | XONG | `test-wave2-frontend.js` | Bắt buộc xác thực và giới hạn 5MB cho `/api/upload-images` | R-Sec (ĐẠT) | VER (XANH) | `a04a49f` |
| **API-003** | P1 | F3 | XONG | `test-wave2-frontend.js` | Trả 503 thay vì 200 silent success trong `feedback` và `consultation` | R-Api (ĐẠT) | VER (XANH) | `a04a49f` |
| **FE-001** | P1 | F3 | XONG | `test-wave2-frontend.js` | Không gộp tin demo Unsplash khi cơ sở dữ liệu có phòng thật | R-Ui (ĐẠT) | VER (XANH) | `a04a49f` |
| **POL-001** | P1 | F2 | XONG | `tsc --noEmit` | Gán agent từ user admin/broker hiện có thay vì tạo user SĐT cứng | R-Pol (ĐẠT) | VER (XANH) | `dc50e7b` |
| **BIZ-003** | P2 | F1 | XONG | `tsc --noEmit` | Trích xuất hằng số hoa hồng 40% vào `@qns/shared` dùng chung | R-Biz (ĐẠT) | VER (XANH) | `dc50e7b` |
| **TST-001** | P2 | F5 | XONG | `ci.yml` validation | Bổ sung bước chạy test hành vi tự động vào CI GitHub Actions | R-Test (ĐẠT) | VER (XANH) | `dc50e7b` |
| **OPS-004** | P3 | F5 | XONG | File system move | Di chuyển 6 báo cáo audit cũ vào `docs/audit/legacy/` | R-Ops (ĐẠT) | VER (XANH) | `dc50e7b` |
