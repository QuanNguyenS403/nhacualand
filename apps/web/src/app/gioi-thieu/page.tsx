import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Về chúng tôi — QNS BROKER',
  description:
    'Nền tảng công nghệ hàng đầu Việt Nam kết nối sinh viên, người đi làm với chủ nhà uy tín, minh bạch và an toàn',
};

export default function GioiThieuPage() {
  return (
    <div className="min-h-screen bg-surface-muted">
      {/* ── Top Hero Banner (Màu chủ đạo QNS BROKER) ── */}
      <section className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 py-8 sm:py-10 md:py-12 px-4 text-center text-white">
        <div className="container-max max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-extrabold tracking-tight text-white leading-tight">
            Về QNS BROKER
          </h1>
          <p className="mt-2.5 sm:mt-3 max-w-[680px] mx-auto text-xs sm:text-sm md:text-base text-brand-100/90 leading-relaxed font-normal">
            Nền tảng công nghệ hàng đầu Việt Nam kết nối sinh viên, người đi làm với chủ nhà uy tín. Chúng tôi sứ mệnh làm cho việc tìm phòng trọ trở nên dễ dàng, an toàn và tiện lợi hơn bao giờ hết
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="container-max max-w-6xl pt-4 sm:pt-5 px-4 sm:px-6">
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-text-muted">
          <Link href="/" className="hover:text-brand transition-colors">
            Trang chủ
          </Link>
          <span>›</span>
          <span className="text-text-secondary font-medium">Về chúng tôi</span>
        </nav>
      </div>

      {/* ── Section 1: Sứ mệnh của chúng tôi ── */}
      <section className="py-7 sm:py-9 md:py-11">
        <div className="container-max max-w-6xl px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight leading-snug">
            Sứ mệnh của chúng tôi
          </h2>
          <p className="mt-2 sm:mt-2.5 text-xs sm:text-sm md:text-base text-slate-600 max-w-[660px] mx-auto leading-relaxed">
            Mang đến giải pháp tìm kiếm nhà trọ tối ưu, xây dựng cộng đồng minh bạch và tạo dựng niềm tin trong thị trường cho thuê
          </p>

          <div className="max-w-3xl mx-auto mt-6 sm:mt-7 space-y-3.5 sm:space-y-4 text-left">
            {/* Cộng đồng minh bạch */}
            <div className="flex items-start gap-3.5 sm:gap-5 p-4.5 sm:p-5 md:p-6 rounded-2xl bg-white border border-surface-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <svg className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Cộng đồng minh bạch
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Hệ thống đánh giá và xác thực giúp xây dựng môi trường cho thuê đáng tin cậy
                </p>
              </div>
            </div>

            {/* Giao dịch an toàn */}
            <div className="flex items-start gap-3.5 sm:gap-5 p-4.5 sm:p-5 md:p-6 rounded-2xl bg-white border border-surface-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                <svg className="w-5.5 h-5.5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Giao dịch an toàn
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Quy trình đặt cọc và thanh toán được bảo vệ, đảm bảo quyền lợi cho cả hai bên
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Số liệu thống kê ── */}
      <section className="py-6 sm:py-7 md:py-8 border-y border-surface-border/90 bg-white/40">
        <div className="container-max max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="p-1 sm:p-1.5">
              <div className="text-2xl sm:text-3xl md:text-[38px] font-extrabold text-brand-700 tracking-tight leading-none">
                10,000+
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 sm:mt-2 font-medium">
                Người dùng hoạt động
              </p>
            </div>
            <div className="p-1 sm:p-1.5">
              <div className="text-2xl sm:text-3xl md:text-[38px] font-extrabold text-brand-700 tracking-tight leading-none">
                5,000+
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 sm:mt-2 font-medium">
                Phòng trọ chất lượng
              </p>
            </div>
            <div className="p-1 sm:p-1.5">
              <div className="text-2xl sm:text-3xl md:text-[38px] font-extrabold text-brand-700 tracking-tight leading-none">
                98%
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 sm:mt-2 font-medium">
                Khách hàng hài lòng
              </p>
            </div>
            <div className="p-1 sm:p-1.5">
              <div className="text-2xl sm:text-3xl md:text-[38px] font-extrabold text-brand-700 tracking-tight leading-none">
                24/7
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 sm:mt-2 font-medium">
                Hỗ trợ khách hàng
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Giá trị cốt lõi ── */}
      <section className="py-7 sm:py-9 md:py-11">
        <div className="container-max max-w-6xl px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight leading-snug">
            Giá trị cốt lõi
          </h2>
          <p className="mt-2 sm:mt-2.5 text-xs sm:text-sm md:text-base text-slate-600 max-w-[660px] mx-auto leading-relaxed">
            Những giá trị định hình văn hóa và hướng dẫn mọi hoạt động của QNS BROKER
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4.5 mt-6 sm:mt-7">
            {/* Card 1: Uy tín */}
            <div className="rounded-2xl border border-surface-border bg-white p-4.5 sm:p-5 md:p-5.5 text-center shadow-sm hover:shadow-elevated hover:-translate-y-1 transition-all flex flex-col items-center">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-3 sm:mb-3.5">
                <svg className="w-6 h-6 sm:w-6.5 sm:h-6.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-[17px] font-bold text-slate-900 mb-1.5">
                Uy tín
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Cam kết minh bạch thông tin và bảo vệ quyền lợi khách hàng
              </p>
            </div>

            {/* Card 2: Thấu hiểu */}
            <div className="rounded-2xl border border-surface-border bg-white p-4.5 sm:p-5 md:p-5.5 text-center shadow-sm hover:shadow-elevated hover:-translate-y-1 transition-all flex flex-col items-center">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-3 sm:mb-3.5">
                <svg className="w-6 h-6 sm:w-6.5 sm:h-6.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-[17px] font-bold text-slate-900 mb-1.5">
                Thấu hiểu
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Lắng nghe và thấu hiểu nhu cầu của cả người thuê và chủ nhà
              </p>
            </div>

            {/* Card 3: Hiệu quả */}
            <div className="rounded-2xl border border-surface-border bg-white p-4.5 sm:p-5 md:p-5.5 text-center shadow-sm hover:shadow-elevated hover:-translate-y-1 transition-all flex flex-col items-center">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-3 sm:mb-3.5">
                <svg className="w-6 h-6 sm:w-6.5 sm:h-6.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <circle cx="12" cy="12" r="9" />
                  <circle cx="12" cy="12" r="5" />
                  <circle cx="12" cy="12" r="1.5" />
                </svg>
              </div>
              <h3 className="text-base sm:text-[17px] font-bold text-slate-900 mb-1.5">
                Hiệu quả
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Tối ưu hóa quy trình giúp tiết kiệm thời gian và chi phí
              </p>
            </div>

            {/* Card 4: Chất lượng */}
            <div className="rounded-2xl border border-surface-border bg-white p-4.5 sm:p-5 md:p-5.5 text-center shadow-sm hover:shadow-elevated hover:-translate-y-1 transition-all flex flex-col items-center">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center mb-3 sm:mb-3.5">
                <svg className="w-6 h-6 sm:w-6.5 sm:h-6.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.003 0H9.497m5.003 0a3.375 3.375 0 003.375-3.375V6.75A3.375 3.375 0 0014.5 3.375h-5A3.375 3.375 0 006.125 6.75v5.25a3.375 3.375 0 003.375 3.375z" />
                </svg>
              </div>
              <h3 className="text-base sm:text-[17px] font-bold text-slate-900 mb-1.5">
                Chất lượng
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Nâng cao tiêu chuẩn dịch vụ và trải nghiệm người dùng
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: Kêu gọi hành động (CTA) ── */}
      <section className="pb-10 sm:pb-12 md:pb-14 pt-2 sm:pt-3">
        <div className="container-max max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl sm:rounded-3xl border border-brand-200/80 bg-gradient-to-b from-brand-50/70 via-brand-50/30 to-white p-6 sm:p-8 md:p-9 text-center shadow-xs">
            <h2 className="text-xl sm:text-2xl md:text-[28px] font-bold text-slate-900 tracking-tight leading-snug">
              Sẵn sàng tìm căn phòng phù hợp?
            </h2>
            <p className="mt-2 sm:mt-2.5 text-xs sm:text-sm md:text-base text-slate-600 max-w-[640px] mx-auto leading-relaxed">
              Khám phá các phòng đang có trên QNS BROKER và kết nối với chủ nhà phù hợp với nhu cầu của bạn
            </p>
            <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-3.5">
              <Link
                href="/thue"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-brand px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
              >
                Tìm phòng
              </Link>
              <Link
                href="/dang-tin"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-brand bg-white px-6 py-2.5 text-xs sm:text-sm font-bold text-brand hover:bg-brand-50 active:scale-[0.98] transition-all shadow-xs"
              >
                Đăng tin
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

