import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật — NHACUALAND',
  description:
    'Cam kết bảo vệ quyền riêng tư, an toàn dữ liệu cá nhân và cơ chế bảo mật thông tin liên hệ trên nền tảng NHACUALAND',
};

const TOC_ITEMS = [
  { id: 'muc-1', title: '1. Thông tin thu thập' },
  { id: 'muc-2', title: '2. Mục đích xử lý dữ liệu' },
  { id: 'muc-3', title: '3. Bảo vệ Số điện thoại & Quyền riêng tư' },
  { id: 'muc-4', title: '4. Thời gian lưu trữ dữ liệu' },
  { id: 'muc-5', title: '5. Chia sẻ dữ liệu bên thứ ba' },
  { id: 'muc-6', title: '6. Biện pháp bảo vệ an toàn' },
  { id: 'muc-7', title: '7. Quyền của người dùng' },
  { id: 'muc-8', title: '8. Cookie & Công nghệ theo dõi' },
  { id: 'muc-9', title: '9. Cập nhật chính sách' },
  { id: 'muc-10', title: '10. Tiếp nhận phản hồi & Liên hệ' },
];

export default function ChinhSachPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-16">
      {/* Header Hero Banner — Màu xanh chủ đạo của website */}
      <section className="bg-gradient-to-b from-brand to-brand-700 text-white py-14 md:py-18 border-b border-black/10">
        <div className="container-max max-w-6xl text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-xs sm:text-sm font-semibold tracking-wider text-white backdrop-blur-sm border border-white/25">
            <span>BẢO VỆ DỮ LIỆU</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Chính sách bảo mật
          </h1>

          <p className="text-base md:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
            Cam kết bảo vệ thông tin cá nhân và dữ liệu người dùng trên NHACUALAND
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs sm:text-sm text-white/85">
            <span className="rounded-lg bg-white/10 px-3 py-1 border border-white/20">
              Cập nhật lần cuối: 24/09/2026
            </span>
            <span className="rounded-lg bg-white/10 px-3 py-1 border border-white/20">
              Phiên bản: 2.1
            </span>
          </div>
        </div>
      </section>

      <div className="container-max max-w-6xl mt-8 space-y-8">
        {/* Khối cam kết bảo mật nổi bật — Màu vàng gold hoàng gia */}
        <div className="rounded-2xl border border-brand-300 bg-brand-50/80 p-5 text-brand-950 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-sm sm:text-base text-brand-900">
            <svg className="h-5 w-5 text-brand shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Cam kết cốt lõi về quyền riêng tư</span>
          </div>
          <ul className="space-y-1.5 text-xs sm:text-sm text-brand-900 pl-7 list-none">
            <li className="flex items-center gap-2">
              <span className="text-brand font-bold">•</span>
              <span>Tuân thủ nghiêm ngặt Luật An toàn thông tin mạng và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand font-bold">•</span>
              <span>Tuyệt đối KHÔNG bán, cho thuê hay thương mại hóa dữ liệu cá nhân của người dùng cho bên thứ ba</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand font-bold">•</span>
              <span>Áp dụng chuẩn mã hóa SSL/TLS 256-bit và băm mật khẩu một chiều bcrypt cho toàn bộ dữ liệu</span>
            </li>
          </ul>
        </div>

        {/* Khối cảnh báo an toàn OTP & mật khẩu */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 text-amber-900 shadow-xs flex items-start gap-3.5">
          <svg className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="text-xs sm:text-sm leading-relaxed space-y-1">
            <p className="font-bold text-amber-950">
              Cảnh báo bảo mật tài khoản
            </p>
            <p className="text-amber-900">
              NHACUALAND không bao giờ yêu cầu cung cấp mã xác thực OTP hoặc mật khẩu tài khoản qua bất kỳ cuộc gọi hay tin nhắn nào — tuyệt đối không chia sẻ mã OTP với người khác
            </p>
          </div>
        </div>

        {/* Bố cục 2 cột: Sidebar Mục lục & Chi tiết chính sách */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cột trái: Mục lục chính sách */}
          <aside className="lg:col-span-4 sticky top-28 hidden lg:block">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
                Mục lục chính sách
              </h2>
              <nav className="space-y-1 max-h-[70vh] overflow-y-auto pr-1 text-xs text-slate-600">
                {TOC_ITEMS.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block rounded-lg px-2.5 py-2 hover:bg-slate-50 hover:text-brand transition-colors font-medium"
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Cột phải: Chi tiết các mục chính sách */}
          <main className="lg:col-span-8 space-y-6">
            {/* Mục 1 */}
            <article id="muc-1" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">1</span>
                <span>Thông tin chúng tôi thu thập</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
                <p><strong>Thông tin tài khoản:</strong> Số điện thoại di động chính chủ (dùng nhận mã xác thực OTP), họ tên hiển thị và mật khẩu đã mã hóa</p>
                <p><strong>Thông tin nhu cầu thuê:</strong> Khu vực tìm kiếm, mức giá mong muốn, loại hình phòng quan tâm và lịch sử lưu tin</p>
                <p><strong>Dữ liệu thiết bị & kỹ thuật:</strong> Địa chỉ IP, loại trình duyệt, hệ điều hành và nhật ký tương tác để phục vụ bảo mật chống tấn công giả mạo</p>
              </div>
            </article>

            {/* Mục 2 */}
            <article id="muc-2" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">2</span>
                <span>Mục đích thu thập và Xử lý dữ liệu</span>
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <li>Xác thực danh tính và kích hoạt tài khoản sử dụng dịch vụ trên nền tảng</li>
                <li>Hỗ trợ điều phối chuyên viên kết nối và sắp xếp lịch dẫn xem phòng thực tế theo yêu cầu của khách thuê</li>
                <li>Gửi thông báo cập nhật về tình trạng phòng trống, lịch hẹn và các thay đổi quan trọng của dịch vụ</li>
                <li>Bảo vệ an ninh hệ thống, ngăn chặn các hành vi gian lận và tin đăng lừa đảo</li>
              </ul>
            </article>

            {/* Mục 3 */}
            <article id="muc-3" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">3</span>
                <span>Cơ chế Bảo vệ Số điện thoại và Quyền riêng tư</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2.5">
                <p>
                  Nhằm tránh tình trạng số điện thoại bị thu thập tự động để gọi quảng cáo và làm phiền, hệ thống áp dụng cơ chế bảo mật tự động: số điện thoại chủ nhà và người đăng tin không được công khai toàn phần trên giao diện tìm kiếm
                </p>
                <p className="text-brand font-medium bg-brand/5 p-3 rounded-xl border border-brand/20">
                  Khách thuê gửi yêu cầu qua nút &ldquo;Đặt lịch xem phòng&rdquo; để chuyên viên trực tiếp xác minh tình trạng phòng và hỗ trợ kết nối an toàn
                </p>
              </div>
            </article>

            {/* Mục 4 */}
            <article id="muc-4" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">4</span>
                <span>Thời gian lưu trữ dữ liệu</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Dữ liệu cá nhân của người dùng được lưu trữ an toàn trong suốt thời gian tài khoản còn hoạt động trên hệ thống — dữ liệu sẽ được xóa bỏ vĩnh viễn hoặc ẩn danh hóa khi người dùng gửi yêu cầu hủy tài khoản
              </p>
            </article>

            {/* Mục 5 */}
            <article id="muc-5" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">5</span>
                <span>Chia sẻ dữ liệu với bên thứ ba</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
                <p>
                  NHACUALAND cam kết không chia sẻ dữ liệu người dùng cho bất kỳ bên quảng cáo nào — việc chia sẻ thông tin chỉ diễn ra trong các trường hợp giới hạn sau:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Kết nối thông tin giữa khách thuê và bên cho thuê khi có sự đồng ý của hai bên để tiến hành lập hợp đồng thuê</li>
                  <li>Khi có yêu cầu bằng văn bản chính thức từ cơ quan nhà nước có thẩm quyền theo quy định pháp luật</li>
                </ul>
              </div>
            </article>

            {/* Mục 6 */}
            <article id="muc-6" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">6</span>
                <span>Biện pháp bảo vệ an toàn thông tin</span>
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <li>Mã hóa toàn bộ lưu lượng dữ liệu truyền tải qua giao thức bảo mật HTTPS/TLS chuẩn cao cấp</li>
                <li>Mật khẩu người dùng được băm một chiều bằng thuật toán an toàn bcrypt trước khi lưu trữ vào hệ thống cơ sở dữ liệu</li>
                <li>Tường lửa ngăn chặn tấn công DDoS, lọc truy cập trái phép và định kỳ sao lưu bảo vệ dữ liệu</li>
              </ul>
            </article>

            {/* Mục 7 */}
            <article id="muc-7" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">7</span>
                <span>Quyền của người dùng đối với dữ liệu</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
                <p>Người dùng có đầy đủ các quyền theo quy định pháp luật về bảo vệ dữ liệu cá nhân:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Quyền kiểm tra, cập nhật hoặc điều chỉnh thông tin cá nhân trong mục Thông tin tài khoản</li>
                  <li>Quyền yêu cầu tạm ngừng xử lý hoặc xóa bỏ toàn bộ dữ liệu cá nhân khỏi hệ thống</li>
                  <li>Quyền khiếu nại và phản ánh về việc sử dụng thông tin sai mục đích cam kết</li>
                </ul>
              </div>
            </article>

            {/* Mục 8 */}
            <article id="muc-8" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">8</span>
                <span>Cookie và Công nghệ theo dõi</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Website sử dụng cookie chức năng nhằm duy trì phiên đăng nhập và ghi nhớ các tùy chọn tìm kiếm gần đây để nâng cao trải nghiệm — bạn có thể chủ động xóa hoặc chặn cookie qua cài đặt trình duyệt của mình bất cứ lúc nào
              </p>
            </article>

            {/* Mục 9 */}
            <article id="muc-9" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">9</span>
                <span>Cập nhật chính sách bảo mật</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Chúng tôi có thể sửa đổi nội dung chính sách bảo mật này để phù hợp với quy định pháp luật mới hoặc nâng cấp hệ thống kỹ thuật — mọi thay đổi sẽ được cập nhật công khai ngay tại trang này
              </p>
            </article>

            {/* Mục 10 */}
            <article id="muc-10" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">10</span>
                <span>Tiếp nhận phản hồi và Liên hệ</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Mọi thắc mắc, đề nghị xử lý hoặc khiếu nại liên quan đến quyền riêng tư và dữ liệu cá nhân, xin vui lòng gửi thư điện tử về hộp thư tiếp nhận: <strong className="text-slate-900 font-semibold">{SITE_CONFIG.supportEmail}</strong>
              </p>
            </article>

            {/* Khối CTA Hỗ trợ dưới cùng */}
            <div className="rounded-2xl bg-gradient-to-r from-brand to-brand-700 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border border-white/10">
              <div className="space-y-1.5 text-center sm:text-left">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Tiếp nhận và giải đáp thắc mắc về quyền riêng tư
                </h3>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                  Mọi yêu cầu chỉnh sửa hoặc xóa dữ liệu cá nhân sẽ được bộ phận kỹ thuật tiếp nhận và xử lý nhanh chóng
                </p>
              </div>

              <Link
                href="/lien-he"
                className="shrink-0 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-brand-700 hover:bg-brand-50 transition-all shadow-sm active:scale-95"
              >
                <span>Gửi yêu cầu hỗ trợ</span>
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
