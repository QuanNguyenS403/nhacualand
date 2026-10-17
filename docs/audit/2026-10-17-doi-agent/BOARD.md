# BẢNG ĐIỀU PHỐI (BOARD.MD) — ĐỘI AGENT RÀ SOÁT QNS BROKER
**Ngày bắt đầu:** 2026-10-17  
**Nhánh:** `audit/doi-agent-2026-10-17`  
**Tổng điều phối (ORCH):** Antigravity IDE Agent  

---

## 1. NHẬT KÝ CỔNG KIỂM SOÁT (GATES)

| Cổng | Mục tiêu | Trạng thái | Bằng chứng / Biên bản |
|:---:|---|:---:|---|
| **G0** | Baseline & Inventory 100% | **ĐẠT (PASSED)** | Đã tạo nhánh, đo baseline (Exit 0/1 ghi rõ trong `00-baseline.md`), sinh đủ 6 file CSV inventory (120 endpoints, 37 routes, 39 models, 53 env vars, 83 calls, 85 scripts) |
| **G1** | Hoàn tất rà soát mù A1–A9 | **ĐANG TIẾN HÀNH** | Đang phát lệnh cho các vai chuyên trách A1 -> A9 |
| **G2** | Báo cáo tổng hợp & Kiểm chứng độc lập | **CHƯA** | Chờ EDIT + VER + ORCH |
| **G3** | Đợt 1 sửa lỗi (P0 Security & DB Safety) | **CHƯA** | Chờ G2 |
| **G4** | Đợt 2 sửa lỗi (P1 Correctness & Sync) | **CHƯA** | Chờ G3 |
| **G5** | Nghiệm thu độc lập & Bàn giao | **CHƯA** | Chờ G4 |

---

## 2. PHÂN CÔNG VÀ TIẾN ĐỘ RÀ SOÁT (GIAI ĐOẠN A)

| Vai | Chuyên trách | File báo cáo | File JSON | Trạng thái |
|:---:|---|---|---|:---:|
| **A1** | Kiến trúc & Cấu trúc mã | `A1-kien-truc.md` | `A1-findings.json` | Đang chạy |
| **A2** | Bảo mật & Xác thực | `A2-bao-mat.md` | `A2-findings.json` | Đang chạy |
| **A3** | Hợp đồng API & Endpoints | `A3-api-endpoints.md` | `A3-findings.json` | Đang chạy |
| **A4** | Cơ sở dữ liệu & Schema | `A4-co-so-du-lieu.md` | `A4-findings.json` | Đang chạy |
| **A5** | Giao diện người dùng & Frontend | `A5-frontend.md` | `A5-findings.json` | Đang chạy |
| **A6** | Nghiệp vụ & Đồng bộ dữ liệu | `A6-nghiep-vu-dong-bo.md` | `A6-findings.json` | Đang chạy |
| **A7** | Chất lượng mã & Kiểm thử | `A7-chat-luong-kiem-thu.md` | `A7-findings.json` | Đang chạy |
| **A8** | Vận hành & Hạ tầng | `A8-van-hanh-trien-khai.md` | `A8-findings.json` | Đang chạy |
| **A9** | Chính sách, Thương hiệu & Nội dung | `A9-chinh-sach-noi-dung.md` | `A9-findings.json` | Đang chạy |

---

## 3. BẢNG SỞ HỮU TỆP (FILE OWNERSHIP CHO GIAI ĐOẠN C)

| Làn | Vai trò | Thư mục / Tệp phụ trách độc quyền |
|:---:|---|---|
| **F0** | Khẩn cấp bảo mật | `apps/api/src/modules/auth/*`, `.env.example`, các tệp chứa bí mật |
| **F1** | Nền tảng dữ liệu | `packages/database/prisma/*`, `packages/shared/*` |
| **F2** | Backend / API | `apps/api/src/modules/*` (trừ auth khi F0 đang sửa) |
| **F3** | Frontend Web | `apps/web/src/*` (trừ scripts) |
| **F4** | Nghiệp vụ tích hợp | Khâu tích hợp xuyên làn sau khi F1-F3 bàn giao |
| **F5** | Vận hành & Scripts | `scripts/*`, `packages/database/scripts/*`, `*.bat`, Docker |

---

## 4. DANH SÁCH YÊU CẦU HỖ TRỢ (HELP & HANDOFF)

*(Hiện tại chưa có handoff nào được kích hoạt)*
