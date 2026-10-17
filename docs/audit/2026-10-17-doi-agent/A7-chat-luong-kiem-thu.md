# BÁO CÁO RÀ SOÁT CHẤT LƯỢNG MÃ VÀ KIỂM THỬ (A7) — QNS BROKER
**Agent thực hiện:** Vai A7 (Kỹ sư Đảm bảo Chất lượng & Kiểm thử — Chế độ Rà soát Độc lập / Mù)  
**Ngày:** 2026-10-17  

---

## 1. PHẠM VI VÀ PHƯƠNG PHÁP RÀ SOÁT

- Đo lường và phân loại toàn bộ 25 tệp kiểm thử trong `packages/database/scripts/test-*.js`:
  - Kiểm thử tĩnh (Static string/regex check).
  - Kiểm thử hành vi database runtime (PrismaClient).
  - Kiểm thử hành vi API runtime (HTTP fetch).
- Kiểm tra cấu hình CI Pipeline (`.github/workflows/ci.yml`).
- Rà soát hạ tầng kiểm thử frontend (Jest, Vitest, Playwright).
- Đánh giá khoảng trống độ phủ kiểm thử (Coverage Gaps).

---

## 2. KẾT QUẢ ĐO ĐẠC KIỂM THỬ

1. **Phân loại bộ kiểm thử có sẵn (25 tệp):**
   - **Kiểm thử tĩnh (9 tệp - 36%):** Chỉ dùng `fs.readFileSync` so khớp chuỗi. 7 tệp ĐẠT, 2 tệp THẤT BẠI (`test-wave-2.js`, `test-wave-4.js`) do mã nguồn đã được tái cấu trúc khiến chuỗi kỳ vọng không còn khớp.
   - **Kiểm thử hành vi runtime (16 tệp - 64%):** Gồm 9 tệp DB, 5 tệp HTTP API, 2 tệp kết hợp DB+HTTP.
2. **CI Pipeline (.github/workflows/ci.yml):**
   - Đã dựng sẵn Docker service PostgreSQL 16 và Redis 7.
   - Tuy nhiên, bước test (`Run Verification Test Suite`) chỉ chạy `static-lint-check.js` (chỉ so khớp 5 dòng chuỗi tĩnh), **hoàn toàn không kích hoạt bất kỳ bài test hành vi nào**.
3. **Kiểm thử Frontend:**
   - 0 bài test tự động cho `apps/web`. Không có Jest, Playwright hay Vitest trong `package.json`.

---

## 3. DANH SÁCH PHÁT HIỆN KIỂM THỬ (A7)

| ID | Mức độ | Tiêu đề | Vị trí | Làn | Trạng thái |
|---|:---:|---|---|:---:|:---:|
| **TST-001** | P1 | CI Pipeline chỉ chạy kiểm tra tĩnh 5 dòng và hoàn toàn bỏ qua toàn bộ 16 bài kiểm thử hành vi runtime | `.github/workflows/ci.yml:87` | F5 | ĐÃ ĐỌC MÃ |
| **TST-002** | P2 | Hai tệp kiểm thử tĩnh test-wave-2.js và test-wave-4.js bị lỗi do phụ thuộc vào so khớp chuỗi cứng đã lỗi thời | `packages/database/scripts/test-wave-2.js:133` | F5 | ĐÃ TÁI HIỆN |
| **TST-003** | P2 | Frontend hoàn toàn thiếu hạ tầng kiểm thử tự động e2e và component test | `apps/web/package.json:5` | F5 | ĐÃ ĐỌC MÃ |

---

## 4. MA TRẬN ĐÃ RÀ / CHƯA RÀ

- **Đã rà (100%):** 25 tệp test trong database scripts, cấu hình CI yml, scripts trong package.json.
- **Chưa rà:** Kiểm tra cấu hình triển khai, môi trường dev vs production và tệp batch (chuyển giao cho A8).
