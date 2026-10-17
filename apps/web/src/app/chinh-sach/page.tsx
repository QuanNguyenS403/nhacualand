import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật — NHACUALAND',
  description:
    'Cam kết bảo vệ quyền riêng tư, an toàn dữ liệu cá nhân, dữ liệu người dùng Google và cơ chế bảo mật trên nền tảng NHACUALAND',
};

const TOC_ITEMS = [
  { id: 'muc-1', title: '1. Thông tin chúng tôi thu thập' },
  { id: 'muc-2', title: '2. Mục đích xử lý dữ liệu' },
  { id: 'muc-3', title: '3. Dữ liệu người dùng Google & Tuân thủ Google API' },
  { id: 'muc-4', title: '4. Bảo vệ Số điện thoại & Quyền riêng tư' },
  { id: 'muc-5', title: '5. Thời gian lưu trữ dữ liệu' },
  { id: 'muc-6', title: '6. Chia sẻ dữ liệu với bên thứ ba' },
  { id: 'muc-7', title: '7. Biện pháp bảo vệ an toàn thông tin' },
  { id: 'muc-8', title: '8. Quyền của người dùng & Hướng dẫn xóa dữ liệu' },
  { id: 'muc-9', title: '9. Cookie & Công nghệ theo dõi' },
  { id: 'muc-10', title: '10. Cập nhật chính sách bảo mật' },
  { id: 'muc-11', title: '11. Tiếp nhận phản hồi & Thông tin liên hệ' },
  { id: 'muc-12', title: '12. Dữ liệu Google, Mục đích, Cam kết & Hướng dẫn xóa dữ liệu' },
];

export default function ChinhSachPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-16">
      {/* Header Hero Banner */}
      <section className="bg-gradient-to-b from-brand to-brand-700 text-white py-14 md:py-18 border-b border-black/10">
        <div className="container-max max-w-6xl text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-xs sm:text-sm font-semibold tracking-wider text-white backdrop-blur-sm border border-white/25">
            <span>BẢO VỆ DỮ LIỆU & QUYỀN RIÊNG TƯ</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Chính sách bảo mật
          </h1>

          <p className="text-base md:text-lg text-white/90 max-w-3xl mx-auto leading-relaxed">
            Cam kết minh bạch về việc thu thập, sử dụng, bảo vệ dữ liệu cá nhân và dữ liệu người dùng Google trên nền tảng NHACUALAND
          </p>

        </div>
      </section>

      <div className="container-max max-w-6xl mt-8 space-y-8">

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
              NHACUALAND không bao giờ yêu cầu cung cấp mã xác thực OTP hoặc mật khẩu tài khoản qua điện thoại hay tin nhắn — tuyệt đối không chia sẻ mã xác thực với bất kỳ ai
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
                <p><strong>Thông tin tài khoản đăng ký trực tiếp:</strong> Số điện thoại di động chính chủ (dùng nhận mã xác thực OTP), họ tên hiển thị và mật khẩu đã mã hóa</p>
                <p><strong>Thông tin qua đăng nhập tài khoản Google (OAuth 2.0):</strong> Họ tên người dùng, địa chỉ email, ảnh đại diện hồ sơ và mã định danh người dùng Google theo phạm vi quyền truy cập cơ bản (openid, profile, email)</p>
                <p><strong>Thông tin nhu cầu thuê bất động sản:</strong> Khu vực tìm kiếm, khoảng giá quan tâm, loại hình phòng (phòng trọ, căn hộ, studio, mặt bằng) và danh sách phòng đã lưu</p>
                <p><strong>Dữ liệu thiết bị & kỹ thuật:</strong> Địa chỉ IP, loại trình duyệt, hệ điều hành và nhật ký yêu cầu phục vụ công tác an toàn thông tin và phòng chống tấn công mạng</p>
              </div>
            </article>

            {/* Mục 2 */}
            <article id="muc-2" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">2</span>
                <span>Mục đích thu thập và Xử lý dữ liệu</span>
              </h2>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <li>Xác thực danh tính và kích hoạt tài khoản sử dụng các tiện ích trên nền tảng NHACUALAND</li>
                <li>Hỗ trợ kết nối chuyên viên tư vấn và điều phối lịch hẹn xem phòng thực tế theo đúng yêu cầu của người thuê</li>
                <li>Gửi email xác nhận lịch hẹn xem phòng và cập nhật tình trạng bất động sản đang quan tâm</li>
                <li>Bảo vệ an ninh hệ thống, phát hiện và ngăn chặn hành vi đăng tin giả mạo hoặc gian lận</li>
              </ul>
            </article>

            {/* Mục 3 — DÀNH RIÊNG CHO GOOGLE OAUTH & GOOGLE API USER DATA POLICY */}
            <article id="muc-3" className="rounded-2xl border-2 border-brand-400 bg-white p-6 sm:p-7 shadow-card space-y-4 scroll-mt-28">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">3</span>
                <h2 className="text-base sm:text-lg font-bold text-brand-900">
                  Dữ liệu người dùng Google & Tuân thủ chính sách Google API (Google User Data)
                </h2>
              </div>

              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
                <p>
                  Khi người dùng lựa chọn tính năng <strong>&ldquo;Đăng nhập bằng Google&rdquo; (Sign in with Google)</strong> trên website NHACUALAND, ứng dụng sẽ gửi yêu cầu xác thực thông qua giao thức chuẩn Google OAuth 2.0. Mục này quy định chi tiết cách thức chúng tôi tiếp cận, sử dụng, lưu trữ và bảo vệ dữ liệu người dùng Google:
                </p>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-900">3.1. Các dữ liệu người dùng Google được tiếp nhận:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li><strong>Họ và tên (Name):</strong> Để hiển thị danh tính người dùng trên thanh điều hướng và trang quản lý tài khoản</li>
                    <li><strong>Địa chỉ Email (Email address):</strong> Để nhận diện tài khoản duy nhất và gửi email xác nhận lịch hẹn xem phòng</li>
                    <li><strong>Ảnh đại diện hồ sơ (Profile picture URL):</strong> Để hiển thị avatar tài khoản của người dùng trên website</li>
                    <li><strong>Mã định danh duy nhất (Google User ID):</strong> Khóa định danh an toàn để liên kết phiên đăng nhập</li>
                  </ul>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-900">3.2. Cam kết về việc sử dụng dữ liệu Google:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Dữ liệu từ Google CHỈ được dùng để xác thực phiên đăng nhập và cá nhân hóa trải nghiệm người dùng trên website NHACUALAND</li>
                    <li>Tuyệt đối KHÔNG sử dụng dữ liệu người dùng Google để chạy quảng cáo, tái định vị thương mại hay tiếp thị mục tiêu</li>
                    <li>Tuyệt đối KHÔNG bán, trao đổi, cho thuê hoặc chuyển giao dữ liệu người dùng Google cho bất kỳ bên thứ ba hay nhà môi giới dữ liệu nào</li>
                    <li>Tuyệt đối KHÔNG sử dụng hoặc chuyển giao dữ liệu Google để phục vụ mục đích huấn luyện các mô hình trí tuệ nhân tạo (AI/ML) tổng quát</li>
                  </ul>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <p className="font-bold text-slate-900">3.3. Cơ chế lưu trữ và Thu hồi quyền truy cập (Data Revocation & Deletion):</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Dữ liệu tài khoản được lưu trữ an toàn trong cơ sở dữ liệu mã hóa của NHACUALAND và bảo vệ bởi tường lửa đa tầng</li>
                    <li>Người dùng có thể thu hồi quyền truy cập của NHACUALAND bất cứ lúc nào trực tiếp tại trang quản lý tài khoản Google cá nhân: <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-brand font-semibold underline">https://myaccount.google.com/permissions</a></li>
                    <li>Người dùng có quyền gửi yêu cầu xóa hoàn toàn tài khoản và dữ liệu liên kết Google bất cứ lúc nào qua email <strong className="text-slate-900">{SITE_CONFIG.supportEmail}</strong> — hệ thống sẽ xử lý và xóa vĩnh viễn dữ liệu trong vòng 48 giờ làm việc</li>
                  </ul>
                </div>

                {/* Khối tuyên bố chính sách Limited Use bắt buộc theo chuẩn Google Console */}
                <div className="rounded-xl bg-brand-50/70 p-4 border border-brand-200 space-y-2 text-brand-950">
                  <p className="font-bold text-sm text-brand-900">
                    3.4. Tuyên bố tuân thủ Chính sách dữ liệu người dùng của Dịch vụ Google API (Limited Use Disclosure):
                  </p>
                  <p className="italic text-xs sm:text-sm">
                    &ldquo;Việc NHACUALAND sử dụng và chuyển tiếp thông tin nhận được từ Google API cho bất kỳ ứng dụng nào khác sẽ tuân thủ nghiêm ngặt Chính sách dữ liệu người dùng của dịch vụ Google API, bao gồm các yêu cầu về Sử dụng có giới hạn&rdquo;
                  </p>
                  <p className="italic text-xs text-slate-600 border-t border-brand-200/60 pt-2">
                    &ldquo;NHACUALAND&apos;s use and transfer of information received from Google APIs to any other app will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-brand underline font-semibold">Google API Services User Data Policy</a>, including the Limited Use requirements.&rdquo;
                  </p>
                </div>
              </div>
            </article>

            {/* Mục 4 */}
            <article id="muc-4" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">4</span>
                <span>Cơ chế Bảo vệ Số điện thoại và Quyền riêng tư</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2.5">
                <p>
                  Nhằm tránh tình trạng số điện thoại của người cho thuê và khách thuê bị cào dữ liệu tự động để gọi quảng cáo làm phiền, hệ thống áp dụng cơ chế che số điện thoại trên giao diện tìm kiếm công khai
                </p>
                <p className="text-brand font-medium bg-brand/5 p-3 rounded-xl border border-brand/20">
                  Khách thuê sử dụng tính năng &ldquo;Đặt lịch xem phòng&rdquo; để chuyên viên trực tiếp xác minh phòng trống và kết nối an toàn với bên có quyền cho thuê
                </p>
              </div>
            </article>

            {/* Mục 5 */}
            <article id="muc-5" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">5</span>
                <span>Thời gian lưu trữ dữ liệu</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Dữ liệu tài khoản được lưu trữ an toàn trong suốt thời gian tài khoản hoạt động trên hệ thống — dữ liệu sẽ được xóa bỏ vĩnh viễn hoặc ẩn danh hóa khi người dùng gửi yêu cầu hủy tài khoản
              </p>
            </article>

            {/* Mục 6 */}
            <article id="muc-6" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">6</span>
                <span>Chia sẻ dữ liệu với bên thứ ba</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
                <p>
                  NHACUALAND cam kết không chia sẻ dữ liệu người dùng cho bất kỳ đối tác thương mại hoặc công ty quảng cáo nào — việc cung cấp thông tin chỉ diễn ra trong các trường hợp giới hạn sau:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Kết nối thông tin giữa khách thuê và bên cho thuê khi có sự đồng ý của hai bên để tiến hành dẫn xem và lập hợp đồng thuê phòng</li>
                  <li>Khi có yêu cầu bằng văn bản chính thức từ cơ quan nhà nước có thẩm quyền theo quy định của pháp luật Việt Nam</li>
                </ul>
              </div>
            </article>

            {/* Mục 7 */}
            <article id="muc-7" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">7</span>
                <span>Biện pháp bảo vệ an toàn thông tin</span>
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <li>Mã hóa toàn bộ lưu lượng dữ liệu truyền tải qua giao thức bảo mật HTTPS/TLS chuẩn cao cấp</li>
                <li>Mật khẩu người dùng được băm một chiều bằng thuật toán an toàn bcrypt trước khi lưu trữ vào hệ thống cơ sở dữ liệu</li>
                <li>Hệ thống tường lửa ngăn chặn tấn công DDoS, lọc truy cập trái phép và định kỳ sao lưu bảo vệ dữ liệu</li>
              </ul>
            </article>

            {/* Mục 8 */}
            <article id="muc-8" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">8</span>
                <span>Quyền của người dùng & Hướng dẫn yêu cầu xóa dữ liệu</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
                <p>Người dùng có đầy đủ các quyền theo quy định pháp luật về bảo vệ dữ liệu cá nhân:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Quyền kiểm tra, cập nhật hoặc điều chỉnh thông tin cá nhân trong mục Thông tin tài khoản</li>
                  <li>Quyền yêu cầu tạm ngừng xử lý hoặc xóa bỏ toàn bộ dữ liệu cá nhân khỏi hệ thống</li>
                  <li>Quyền khiếu nại và phản ánh về việc sử dụng thông tin sai mục đích cam kết</li>
                </ul>
                <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <strong>Hướng dẫn yêu cầu xóa dữ liệu:</strong> Người dùng có thể gửi email yêu cầu xóa tài khoản và toàn bộ dữ liệu liên quan về hộp thư <strong className="text-slate-900">{SITE_CONFIG.supportEmail}</strong> hoặc <strong className="text-slate-900">ducquan16102006@gmail.com</strong>. Yêu cầu sẽ được xử lý trong vòng 48 giờ làm việc
                </div>
              </div>
            </article>

            {/* Mục 9 */}
            <article id="muc-9" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">9</span>
                <span>Cookie và Công nghệ theo dõi</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Website sử dụng cookie chức năng nhằm duy trì phiên đăng nhập và ghi nhớ các tùy chọn tìm kiếm gần đây để nâng cao trải nghiệm — bạn có thể chủ động xóa hoặc chặn cookie qua cài đặt trình duyệt của mình bất cứ lúc nào
              </p>
            </article>

            {/* Mục 10 */}
            <article id="muc-10" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">10</span>
                <span>Cập nhật chính sách bảo mật</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Chúng tôi có thể sửa đổi nội dung chính sách bảo mật này để phù hợp với quy định pháp luật mới hoặc nâng cấp hệ thống kỹ thuật — mọi thay đổi sẽ được cập nhật công khai ngay tại trang này
              </p>
            </article>

            {/* Mục 11 */}
            <article id="muc-11" className="rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-card space-y-3 scroll-mt-28">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold">11</span>
                <span>Tiếp nhận phản hồi và Thông tin liên hệ</span>
              </h2>
              <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-1.5">
                <p>Mọi thắc mắc, đề nghị xử lý hoặc khiếu nại liên quan đến quyền riêng tư và dữ liệu cá nhân, xin vui lòng liên hệ:</p>
                <p>• Đơn vị vận hành: <strong>Hệ thống Môi giới Bất động sản NHACUALAND</strong></p>
                <p>• Địa chỉ: <strong>{SITE_CONFIG.address}</strong></p>
                <p>• Hotline hỗ trợ: <strong>{SITE_CONFIG.hotline}</strong></p>
                <p>• Email tiếp nhận bảo mật: <strong className="text-slate-900 font-semibold">{SITE_CONFIG.supportEmail}</strong> hoặc <strong className="text-slate-900 font-semibold">ducquan16102006@gmail.com</strong></p>
              </div>
            </article>

            {/* Mục 12 — Thu thập thông tin từ Google, Mục đích sử dụng, Cam kết & Hướng dẫn xóa dữ liệu */}
            <article id="muc-12" className="rounded-2xl border-2 border-brand-500 bg-white p-6 sm:p-7 shadow-card space-y-4 scroll-mt-28">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-bold">12</span>
                <h2 className="text-base sm:text-lg font-bold text-brand-950">
                  Dữ liệu người dùng Google, Mục đích sử dụng, Cam kết & Hướng dẫn xóa dữ liệu
                </h2>
              </div>

              <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-1.5">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Chúng tôi thu thập thông tin gì từ Google
                  </h3>
                  <p className="text-slate-600">
                    Khi người dùng chọn tính năng đăng nhập bằng tài khoản Google, hệ thống chỉ tiếp nhận các thông tin cơ bản gồm: Họ tên, email, ảnh đại diện
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-1.5">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Mục đích sử dụng dữ liệu
                  </h3>
                  <p className="text-slate-600">
                    Dữ liệu thu thập từ Google chỉ để xác thực tài khoản và quản lý đơn hàng/dịch vụ (bao gồm gửi yêu cầu đặt lịch xem phòng, quản lý tin đăng cho thuê và theo dõi tiến độ xử lý dịch vụ)
                  </p>
                </div>

                <div className="rounded-xl bg-brand-50/70 p-4 border border-brand-200 space-y-1.5">
                  <h3 className="font-bold text-brand-950 text-sm">
                    Cam kết bảo mật & Quyền riêng tư
                  </h3>
                  <p className="text-brand-900 font-medium">
                    NHACUALAND cam kết không chia sẻ dữ liệu với bên thứ ba hoặc bán cho bên quảng cáo dưới bất kỳ hình thức nào
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Hướng dẫn người dùng cách yêu cầu xóa dữ liệu tài khoản khỏi hệ thống
                  </h3>
                  <p className="text-slate-600">
                    Người dùng có quyền yêu cầu xóa bỏ hoàn toàn dữ liệu cá nhân và tài khoản bất cứ lúc nào thông qua các bước sau:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Gửi email yêu cầu xóa dữ liệu tới hộp thư: <strong className="text-slate-900">{SITE_CONFIG.supportEmail}</strong> hoặc <strong className="text-slate-900">ducquan16102006@gmail.com</strong> với tiêu đề &ldquo;Yêu cầu xóa tài khoản và dữ liệu cá nhân&rdquo;</li>
                    <li>Liên hệ Hotline hỗ trợ: <strong className="text-slate-900">{SITE_CONFIG.hotline}</strong> để được chuyên viên hỗ trợ kiểm tra và tiếp nhận yêu cầu xóa tài khoản</li>
                    <li>Sau khi tiếp nhận yêu cầu hợp lệ, hệ thống sẽ tiến hành xóa vĩnh viễn toàn bộ thông tin tài khoản, lịch sử phiên đăng nhập và các dữ liệu liên quan khỏi cơ sở dữ liệu trong vòng 24 đến 48 giờ làm việc</li>
                  </ul>
                </div>
              </div>
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
