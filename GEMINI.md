# GEMINI.md — Quy tắc vận hành của AI Agent (Gemini 3.7 Flash) trên dự án "batdongsan"

Đây là file luật nền — agent đọc file này ĐẦU TIÊN, trước mọi tác vụ, trong mọi phiên làm việc mới.
(File này thay thế bộ `.clinerules/` trước đây — dự án đã chuyển từ Cline sang vận hành bằng agent chạy trên Gemini 3.7 Flash. Nội dung quy tắc giữ nguyên tinh thần, chỉ đổi tên agent thực thi và cách nạp ngữ cảnh cho phù hợp.)

## 0. Cách nạp file này
Đặt `GEMINI.md` ở gốc repo — đây là quy ước ngữ cảnh chuẩn khi làm việc với agent chạy trên Gemini (tương đương vai trò của `CLAUDE.md` với Claude Code). Agent cần đọc file này cùng lúc với `CLAUDE.md` và `README.md` khi khởi động phiên làm việc trên repo, trước khi đọc bất kỳ file `skills/*.md` nào.

## 1. Nguồn sự thật (Source of Truth) — thứ tự ưu tiên khi có mâu thuẫn
1. `CLAUDE.md` (gốc repo) — đặc tả kiến trúc & quy ước code chính thức.
2. `README.md` (gốc repo) — tài liệu tham chiếu chi tiết (phân tích Mogi.vn + schema đầy đủ).
3. `TRANG-THAI-TRIEN-KHAI.md` (gốc repo) — trạng thái triển khai thực tế, danh sách lỗi đã audit/sửa.
4. `memory-bank/*.md` — trạng thái tiến độ thực tế của dự án (agent phải tự cập nhật).
5. Từng file trong `skills/*.md` — hướng dẫn thực thi từng bước cho một module cụ thể.

Nếu `skills/*.md` mâu thuẫn với `CLAUDE.md`, **ưu tiên `CLAUDE.md`** và báo cho người dùng biết sự sai lệch thay vì tự ý chọn.

## 2. Cơ chế nhận lệnh
- Khi người dùng gõ `/skill <số hoặc tên>` hoặc `thực hiện skill <X>` hoặc chỉ nói tên module (VD: "làm phần đăng tin"), agent:
  1. Mở `skills/00-muc-luc-va-quy-trinh.md` để xác định đúng file skill tương ứng.
  2. Đọc **toàn bộ** file skill đó trước khi sửa bất kỳ file code nào.
  3. Kiểm tra mục "Điều kiện tiên quyết" của skill — nếu chưa đủ (VD: skill 04 cần skill 02+03 đã xong), báo cho người dùng và hỏi có muốn agent tự chạy các skill tiên quyết trước không.
  4. Thực hiện tuần tự từng bước trong "Các bước thực hiện", tạo/sửa file thật trên đĩa.
  5. Sau khi xong, chạy phần "Kiểm thử nhanh" của skill để tự xác minh (build/tsc/test thật, không suy đoán).
  6. Cập nhật `memory-bank/progress.md` (đánh dấu skill đã hoàn thành + ghi chú vấn đề nếu có) và `memory-bank/activeContext.md` (mô tả trạng thái hiện tại, việc dở dang nếu bị ngắt giữa chừng).
  7. Tóm tắt ngắn gọn cho người dùng: đã làm gì, file nào thay đổi, bước tiếp theo đề xuất là gì.
- Nếu người dùng ra lệnh mơ hồ ("làm tiếp đi"), agent đọc `memory-bank/activeContext.md` để biết đang dở việc gì và tiếp tục đúng chỗ đó — không tự ý làm sang việc khác.
- Gemini 3.7 Flash hỗ trợ `thinking_level` (low/medium/high) — với các skill có logic nghiệp vụ phức tạp hoặc đụng tới bảo mật/tiền bạc (auth, thanh toán, phân quyền), ưu tiên đặt `thinking_level=high` để giảm rủi ro bỏ sót; các tác vụ CRUD/scaffold đơn giản dùng `medium` là đủ, tiết kiệm chi phí.

## 3. Quy tắc code bắt buộc (áp dụng cho MỌI skill)
- Ngôn ngữ: TypeScript cho toàn bộ backend (NestJS) và frontend (Next.js). Không dùng JavaScript thuần trừ file config bắt buộc phải `.js`.
- Đặt tên: file/folder `kebab-case`, biến/hàm `camelCase`, class/interface/type `PascalCase`, hằng số `UPPER_SNAKE_CASE`, bảng DB `snake_case` số nhiều (`listings`, `listing_images`).
- Slug BĐS/dự án luôn có hậu tố ID (`...-id123`, `...-prj45`) để tránh trùng và cho phép đổi tiêu đề mà không vỡ URL (xem `CLAUDE.md § 2.9`).
- Giá tiền lưu ở đơn vị VNĐ nguyên (BIGINT), không lưu số thập phân; chỉ format hiển thị ở tầng UI.
- **Không bao giờ** trả số điện thoại đầy đủ trong response API danh sách/tìm kiếm — chỉ qua endpoint `reveal-phone` có auth + ghi log lượt xem.
- Mọi trang public (Next.js) bắt buộc có `generateMetadata` với title/description/canonical/OG — không được thiếu.
- Mọi endpoint NestJS bắt buộc có DTO validate bằng `class-validator` + Swagger decorator (`@ApiProperty`...).
- Mọi ID tham chiếu tới bảng dùng kiểu `BigInt` trong schema phải được parse bằng `ParseBigIntPipe` (`apps/api/src/common/pipes/parse-bigint.pipe.ts`), không dùng `ParseIntPipe` rồi ép kiểu tay — xem lỗi #8 đã sửa trong `TRANG-THAI-TRIEN-KHAI.md`.
- Biến môi trường: mọi app con (`apps/api`, `apps/web`) đọc `.env` GỐC monorepo qua cấu hình đã thiết lập sẵn (`envFilePath` trong `app.module.ts`, `dotenv` trong `next.config.mjs`) — xem lỗi #1 đã sửa. KHÔNG tạo thêm cơ chế đọc env song song khác gây xung đột.
- Mọi exception ném ra từ NestJS controller/service phải đi qua `HttpExceptionFilter` đã đăng ký toàn cục trong `main.ts` — không tự bắt lỗi rồi trả response thô bên trong controller.
- Không tự ý thêm thư viện ngoài danh sách đã chọn trong `CLAUDE.md § 2.2` / `README.md § 9` mà không hỏi trước — tránh phình dependency.
- Viết migration Prisma cho MỌI thay đổi schema, không sửa tay database production.

## 4. Quy tắc an toàn — LUÔN hỏi xác nhận trước khi:
- Chạy lệnh xoá dữ liệu (`DROP`, `TRUNCATE`, `rm -rf`, `git push --force`).
- Cài thêm package mới chưa có trong stack đã chốt.
- Thay đổi cấu trúc thư mục gốc đã thống nhất trong `skills/01-khoi-tao-monorepo.md`.
- Đẩy code lên nhánh `main`/`production` hoặc chạy migration lên môi trường không phải local.
- Agent được phép tự do tạo/sửa file trong phạm vi skill đang thực hiện mà KHÔNG cần hỏi từng bước nhỏ — chỉ dừng lại hỏi khi gặp các trường hợp trên hoặc khi thông tin thiếu (VD: chưa có API key thật, chưa chọn nhà cung cấp SMS).

## 5. Sau mỗi skill hoàn thành
- Commit riêng theo convention: `feat(skill-XX): <mô tả ngắn>` hoặc `fix: <mô tả ngắn>` cho các đợt audit/sửa lỗi — VD: `feat(skill-04): thêm module Listings CRUD + upload ảnh S3`.
- Không gộp nhiều skill/nhiều lỗi không liên quan vào 1 commit.
- Cập nhật `memory-bank/progress.md`.

## 6. Khi bí hoặc thiếu thông tin
- Không tự đoán API key, connection string thật — luôn dùng placeholder trong `.env.example` và dừng lại hỏi người dùng điền `.env` thật.
- Không tự quyết định thay đổi mô hình dữ liệu cốt lõi (bảng `listings`, `users`) mà không xác nhận — đây là xương sống của toàn hệ thống.

## 7. Giới hạn môi trường cần biết trước khi debug
- Nếu chạy trong sandbox/CI bị chặn domain `binaries.prisma.sh`, lệnh `prisma generate`/`migrate` sẽ báo lỗi 403 — đây là giới hạn mạng, KHÔNG phải lỗi code. Xem `TRANG-THAI-TRIEN-KHAI.md § Giới hạn môi trường` để biết cách xác minh code vẫn đúng bằng `tsc --noEmit` dù chưa generate được.

## 8. Quy chuẩn Giao diện & Văn phong Nghiêm ngặt (Học từ /learn)
- **Thương hiệu chính thức**: NHACUALAND (tên miền `nhacualand.com`)
- **Tuyệt đối không thêm dấu chấm vào cuối câu**: Áp dụng triệt để cho toàn bộ nội dung người dùng nhìn thấy (tiêu đề trang, meta description, thông báo lỗi, popup alert, modal, nhãn nút bấm)
- **Tiêu đề Hero H1**: Luôn phân tách 2 dòng ngữ nghĩa rõ ràng ("NHACUALAND -" và "rõ chi phí ngay từ đầu"), với line-height `leading-[1.15] md:leading-[1.18]` và khoảng đệm `mt-0.5 sm:mt-0.5` vừa vặn thuận mắt, các dòng dịch sát nhau hài hòa, không dính chữ cái và không dãn xa
- **Thông tin liên hệ trung tâm**: Mọi thông tin Hotline, Email, Địa chỉ, Thời gian làm việc phải tham chiếu duy nhất từ `SITE_CONFIG` (`hotline: 0981 753 082`, `email: contact@nhacualand.com`, `address: Thành phố Hà Nội`, `workingHours: 24/7`)
- **Mô hình kinh doanh**: 100% chuyên biệt cho thuê (phòng trọ, chung cư mini, studio, căn hộ, mặt bằng kinh doanh). Người thuê 0 đồng, chủ nhà trả phí thành công 40%, không nhận/giữ tiền cọc trên web
- **Môi trường triển khai**: Triển khai chính thức trên nền tảng đám mây Render (render.com) gộp 1 Web Service duy nhất (`nhacualand`). Loại bỏ hoàn toàn Cloudflare Tunnel
- **Tìm kiếm thông minh**: Thanh tìm kiếm Hero phải luôn hỗ trợ cả tiếng Việt có dấu và không dấu (diacritics-insensitive) kèm highlight chính xác từ khóa
- **Cơ chế Rà soát Tự động (Audit Harness)**: Khi nhận nhiệm vụ rà soát, AI agent phải tự động kích hoạt quy trình kiểm tra 6 cổng (Skill 06) và tự động khắc phục độc lập mọi lỗi sai phát hiện được


