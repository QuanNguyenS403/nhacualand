import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Điều khoản sử dụng — NHACUALAND',
  description:
    'Quy định chi tiết về quyền, nghĩa vụ và trách nhiệm pháp lý của các bên khi sử dụng nền tảng cho thuê NHACUALAND',
};

const TOC_ITEMS = [
  { id: 'dieu-1', title: '1. Giới thiệu & Phạm vi áp dụng' },
  { id: 'dieu-2', title: '2. Định nghĩa & Giải thích thuật ngữ' },
  { id: 'dieu-3', title: '3. Đăng ký & Bảo mật tài khoản' },
  { id: 'dieu-4', title: '4. Quyền & Nghĩa vụ của Khách thuê' },
  { id: 'dieu-5', title: '5. Quyền & Nghĩa vụ của Chủ nhà' },
  { id: 'dieu-6', title: '6. Quy định Đăng tin & Kiểm duyệt' },
  { id: 'dieu-7', title: '7. Miễn phí Dịch vụ & Không thanh toán trực tuyến' },
  { id: 'dieu-8', title: '8. Giới hạn Trách nhiệm & Miễn trừ' },
  { id: 'dieu-9', title: '9. Quyền sở hữu Trí tuệ & Dữ liệu' },
  { id: 'dieu-10', title: '10. Xử lý Vi phạm & Tạm khóa' },
  { id: 'dieu-11', title: '11. Giải quyết Tranh chấp & Luật áp dụng' },
  { id: 'dieu-12', title: '12. Sửa đổi Điều khoản & Thi hành' },
];

export default function DieuKhoanPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-16">
      {/* Header Hero Banner — Màu xanh chủ đạo của website */}
      <section className="bg-gradient-to-b from-brand to-brand-700 text-white py-14 md:py-18 border-b border-black/10">
        <div className="container-max max-w-6xl text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-xs sm:text-sm font-semibold tracking-wider text-white backdrop-blur-sm border border-white/25">
            <span>VĂN BẢN PHÁP LÝ</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Điều khoản sử dụng
          </h1>

          <p className="text-base md:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
            Quy định quyền và nghĩa vụ khi sử dụng dịch vụ trên nền tảng NHACUALAND
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
        {/* Banner cảnh báo an toàn quan trọng */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 sm:p-5 text-amber-900 shadow-xs flex items-start gap-3.5">
          <svg className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="text-xs sm:text-sm leading-relaxed space-y-1">
            <p className="font-bold text-amber-950">
              Cảnh báo an toàn quan trọng
            </p>
            <p className="text-amber-900">
              NHACUALAND KHÔNG bao giờ yêu cầu quý khách truy cập liên kết lạ, cung cấp mã OTP ngân hàng hoặc chuyển tiền vào tài khoản cá nhân không được xác thực — quý khách vui lòng cảnh giác trước mọi thủ đoạn giả mạo
            </p>
          </div>
        </div>

        {/* Khối bố cục 2 cột: Sidebar Mục lục & Nội dung chi tiết */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cột trái: Mục lục điều khoản (Sticky Desktop) */}
          <aside className="lg:col-span-4 sticky top-28 hidden lg:block">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
                Mục lục điều khoản
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

          {/* Cột phải: Chi tiết các điều khoản */}
          <main className="lg:col-span-8 space-y-6">
            {/* Điều 1 */}
            <article id="dieu-1" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">1</span>
                <span>Giới thiệu và Phạm vi áp dụng</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2.5">
                <p>
                  Điều khoản sử dụng này là thỏa thuận pháp lý giữa người dùng với nền tảng NHACUALAND (sau đây gọi là &ldquo;Nền tảng&rdquo;), điều chỉnh việc truy cập, tra cứu thông tin, đăng tin cho thuê và sử dụng dịch vụ môi giới kết nối phòng cho thuê
                </p>
                <p>
                  Bằng việc truy cập website, đăng ký tài khoản hoặc sử dụng bất kỳ tính năng nào của NHACUALAND, bạn xác nhận đã đọc kỹ, hiểu rõ và đồng ý bị ràng buộc bởi toàn bộ các quy định trong văn bản này
                </p>
              </div>
            </article>

            {/* Điều 2 */}
            <article id="dieu-2" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">2</span>
                <span>Định nghĩa và Giải thích thuật ngữ</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
                <p><strong>Nền tảng NHACUALAND:</strong> Hệ sinh thái website và công nghệ hỗ trợ tìm kiếm, xác thực và kết nối giao dịch cho thuê phòng trọ, chung cư mini, chung cư và mặt bằng kinh doanh</p>
                <p><strong>Khách thuê:</strong> Cá nhân, sinh viên, người đi làm có nhu cầu tìm kiếm và thuê phòng thông qua hệ thống</p>
                <p><strong>Chủ nhà / Bên cho thuê:</strong> Chủ sở hữu hợp pháp hoặc bên có quyền quản lý, vận hành và ký kết hợp đồng cho thuê phòng, căn hộ hoặc mặt bằng</p>
                <p><strong>Tin đăng:</strong> Nội dung mô tả phòng, hình ảnh, biểu phí điện nước, vị trí và tiện ích được tạo và công khai trên hệ thống</p>
              </div>
            </article>

            {/* Điều 3 */}
            <article id="dieu-3" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">3</span>
                <span>Đăng ký và Bảo mật tài khoản</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2.5">
                <p>
                  Người dùng có thể đăng ký tài khoản qua số điện thoại chính chủ hoặc sử dụng phương thức Đăng nhập bằng Google (Google Sign-In) 1 chạm bảo mật cao mà không cần tạo mật khẩu riêng
                </p>
                <p>
                  Khi lựa chọn đăng nhập bằng tài khoản Google, người dùng đồng ý cho phép NHACUALAND tiếp nhận các thông tin cơ bản (họ tên, email, ảnh đại diện) tuân thủ nghiêm ngặt Chính sách bảo mật và Chính sách dữ liệu người dùng của dịch vụ Google API
                </p>
                <p>
                  Bạn có trách nhiệm tự bảo vệ thông tin tài khoản, không cung cấp mã xác thực cho bất kỳ ai và thông báo ngay cho ban quản trị NHACUALAND khi phát hiện hành vi truy cập trái phép
                </p>
              </div>
            </article>

            {/* Điều 4 */}
            <article id="dieu-4" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">4</span>
                <span>Quyền và Nghĩa vụ của Khách thuê</span>
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <li>Được tra cứu thông tin phòng, xem ảnh chụp thực tế và liên hệ đặt lịch xem phòng hoàn toàn miễn phí</li>
                <li>Được đối chiếu biểu phí minh bạch (giá thuê, tiền điện, tiền nước, chi phí phát sinh) trước khi ký hợp đồng</li>
                <li>Không thực hiện hành vi lừa đảo, phá hoại tài sản hoặc vi phạm pháp luật tại nơi thuê phòng</li>
                <li>Tự chịu trách nhiệm kiểm tra hiện trạng thực tế và tính hợp pháp của bên cho thuê trước khi chuyển tiền đặt cọc</li>
              </ul>
            </article>

            {/* Điều 5 */}
            <article id="dieu-5" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">5</span>
                <span>Quyền và Nghĩa vụ của Chủ nhà / Bên cho thuê</span>
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <li>Cam kết có quyền sở hữu hoặc quyền cho thuê hợp pháp đối với phòng hoặc mặt bằng đăng tải</li>
                <li>Công khai thông tin chính xác về giá thuê, đơn giá điện, nước và các tiện ích đi kèm</li>
                <li>Phối hợp tiếp nhận lịch hẹn dẫn xem phòng và tôn trọng quyền lợi của khách thuê</li>
                <li>Kịp thời cập nhật tình trạng khi phòng đã được thuê để tránh gây hiểu nhầm cho khách hàng khác</li>
              </ul>
            </article>

            {/* Điều 6 */}
            <article id="dieu-6" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">6</span>
                <span>Quy định Đăng tin và Kiểm duyệt nội dung</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2.5">
                <p>
                  Mọi tin đăng trên hệ thống đều phải tuân thủ chuẩn kiểm duyệt về hình ảnh thật, thông tin biểu phí rõ ràng và vị trí chính xác
                </p>
                <p className="text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
                  Nghiêm cấm đăng tin ảo, đăng sai lệch giá tiền, chèn đường dẫn độc hại hoặc phát tán nội dung vi phạm thuần phong mỹ tục
                </p>
              </div>
            </article>

            {/* Điều 7 */}
            <article id="dieu-7" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">7</span>
                <span>Nguyên tắc Không thanh toán trực tuyến & Miễn phí dịch vụ</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
                <p>
                  Khách thuê phòng được sử dụng toàn bộ nền tảng tra cứu, tìm phòng và đặt lịch dẫn xem phòng hoàn toàn miễn phí (0 đồng phí dịch vụ)
                </p>
                <p>
                  Website NHACUALAND tuyệt đối không tích hợp thanh toán trực tuyến, không thu tiền cọc và không giữ hộ tiền qua ngân hàng — người thuê ký hợp đồng và làm việc trực tiếp với bên có quyền cho thuê
                </p>
              </div>
            </article>

            {/* Điều 8 */}
            <article id="dieu-8" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">8</span>
                <span>Giới hạn Trách nhiệm và Miễn trừ</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2.5">
                <p>
                  NHACUALAND đóng vai trò là nền tảng kết nối thông tin môi giới, không trực tiếp thu hộ tiền thuê, không giữ tiền đặt cọc và không thay thế hợp đồng dân sự giữa chủ nhà và khách thuê
                </p>
                <p>
                  Các bên tự chịu trách nhiệm pháp lý đối với nội dung thỏa thuận và các giao dịch chuyển tiền trực tiếp với nhau
                </p>
              </div>
            </article>

            {/* Điều 9 */}
            <article id="dieu-9" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">9</span>
                <span>Quyền sở hữu Trí tuệ và Dữ liệu</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Mọi thương hiệu, biểu tượng logo, giao diện thiết kế, mã nguồn và hệ thống dữ liệu thuộc quyền sở hữu độc quyền của NHACUALAND — nghiêm cấm sao chép, trích xuất dữ liệu tự động hoặc tái sử dụng cho mục đích thương mại trái phép
              </p>
            </article>

            {/* Điều 10 */}
            <article id="dieu-10" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">10</span>
                <span>Xử lý Vi phạm và Tạm khóa tài khoản</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Hệ thống có quyền gỡ bỏ tin đăng, tạm đình chỉ hoặc chấm dứt vĩnh viễn quyền truy cập của bất kỳ tài khoản nào có hành vi gian lận, cung cấp thông tin sai sự thật hoặc vi phạm điều khoản sử dụng mà không cần thông báo trước
              </p>
            </article>

            {/* Điều 11 */}
            <article id="dieu-11" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">11</span>
                <span>Giải quyết Tranh chấp và Luật áp dụng</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Điều khoản này được điều chỉnh và giải thích theo pháp luật Việt Nam — mọi bất đồng phát sinh sẽ được ưu tiên giải quyết qua thương lượng hòa giải, trường hợp không đạt thỏa thuận sẽ chuyển tới Tòa án có thẩm quyền tại Việt Nam
              </p>
            </article>

            {/* Điều 12 */}
            <article id="dieu-12" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">12</span>
                <span>Sửa đổi Điều khoản và Điều khoản thi hành</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                NHACUALAND có quyền cập nhật và điều chỉnh nội dung điều khoản bất kỳ lúc nào để phù hợp với hoạt động vận hành và quy định pháp luật hiện hành — văn bản sửa đổi sẽ có hiệu lực ngay khi được công bố công khai trên website
              </p>
            </article>

            {/* Khối CTA Hỗ trợ dưới cùng — Chuẩn khối cuối trang như trong ảnh */}
            <div className="rounded-2xl bg-gradient-to-r from-brand to-brand-700 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md border border-white/10">
              <div className="space-y-1.5 text-center sm:text-left">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Bạn cần hỗ trợ hoặc có thắc mắc về điều khoản?
                </h3>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                  Đội ngũ chuyên viên NHACUALAND luôn sẵn sàng giải đáp và hỗ trợ bạn trong suốt quá trình thuê phòng
                </p>
              </div>

              <Link
                href="/lien-he"
                className="shrink-0 rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-brand-700 hover:bg-brand-50 transition-all shadow-sm active:scale-95"
              >
                <span>Liên hệ chuyên viên</span>
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
