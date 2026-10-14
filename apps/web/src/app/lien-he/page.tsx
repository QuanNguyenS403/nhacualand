import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Liên hệ & Hỗ trợ | QNS BROKER',
  description:
    'Thông tin liên hệ, báo cáo tin đăng vi phạm và giải đáp thắc mắc người dùng tại QNS BROKER',
};

export default function ContactPage() {
  return (
    <div className="bg-surface-subtle min-h-[80vh] py-10 lg:py-14">
      <div className="container-max max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-text-muted mb-6">
          <Link href="/" className="hover:text-brand transition-colors">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="text-text-secondary font-medium">Liên hệ</span>
        </nav>

        <div className="rounded-2xl border border-surface-border bg-white p-8 md:p-12 shadow-card">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-3.5">
            Thông tin Liên hệ &amp; Hỗ trợ
          </h1>
          <p className="text-base text-text-secondary leading-relaxed mb-8 border-b border-surface-border pb-5">
            Ban Quản trị nền tảng QNS BROKER luôn sẵn sàng lắng nghe ý kiến đóng góp, giải đáp thắc mắc và hỗ trợ bạn trong quá trình tìm phòng hoặc đăng tin
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="rounded-xl border border-surface-border bg-slate-50/70 p-5 space-y-4">
              <h2 className="text-base font-bold text-text-primary">
                Kênh liên hệ trực tiếp
              </h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-text-muted mb-2">Nhắn tin Zalo trực tiếp Chủ nhà:</p>
                  <a
                    href={`https://zalo.me/${SITE_CONFIG.zalo.replace(/\s+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-200 px-4 py-2.5 text-xs font-bold text-brand-900 hover:bg-brand-100 transition-colors shadow-2xs"
                  >
                    <span className="font-black text-xs">Zalo</span>
                    <span>Chat Zalo {SITE_CONFIG.agentName}</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-surface-border bg-slate-50/70 p-5 space-y-4">
              <h2 className="text-base font-bold text-text-primary">
                Hướng dẫn xử lý nhanh
              </h2>
              <div className="space-y-2.5 text-xs text-text-secondary leading-relaxed">
                <p>
                  • <strong>Tin đăng chưa được duyệt:</strong> Ban Quản trị duyệt tin theo thứ tự gửi trong vòng 1-2 giờ — bạn có thể kiểm tra trạng thái tại <Link href="/tai-khoan/quan-ly-tin" className="text-brand font-semibold underline">Quản lý tin</Link>
                </p>
                <p>
                  • <strong>Báo cáo tin vi phạm / Lừa đảo:</strong> Vui lòng nhấn nút <strong>&ldquo;Báo vi phạm&rdquo;</strong> ngay tại trang chi tiết tin hoặc gửi tin nhắn Zalo kèm mã tin đăng để chúng tôi xác minh và gỡ bỏ ngay lập tức
                </p>
                <p>
                  • <strong>Quên mật khẩu:</strong> Sử dụng chức năng <Link href="/dang-nhap" className="text-brand font-semibold underline">Quên mật khẩu qua OTP</Link> trên form đăng nhập để đặt lại mật khẩu trong 30 giây
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
