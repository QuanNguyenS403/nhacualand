'use client';

import { useState, useRef, useEffect } from 'react';
import { authFetch } from '@/lib/auth-client';
import { SITE_CONFIG } from '@/lib/constants';

interface OwnerBrokerTermsGateProps {
  onAccepted: () => void;
}

export function OwnerBrokerTermsGate({ onAccepted }: OwnerBrokerTermsGateProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolledNearBottom, setHasScrolledNearBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollPosition = el.scrollTop + el.clientHeight;
    const threshold = el.scrollHeight - 60;
    if (scrollPosition >= threshold) {
      setHasScrolledNearBottom(true);
    }
  }

  function scrollToBottom() {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      setHasScrolledNearBottom(true);
    }
  }

  async function handleConfirm() {
    if (!agreed) {
      setError('Vui lòng tích chọn ô đồng ý với điều khoản trước khi tiếp tục');
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const res = await authFetch('/auth/accept-broker-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Lưu xác nhận điều khoản thất bại, vui lòng thử lại');
      }

      // Lưu cache local để các lần sau không cần hiển thị lại
      if (typeof window !== 'undefined') {
        localStorage.setItem('qns_broker_terms_accepted', 'true');
      }

      onAccepted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in space-y-6">
      {/* Header giới thiệu */}
      <div className="rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-50/80 via-white to-brand-50/40 p-6 md:p-7 shadow-sm">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand ring-1 ring-brand/20">
            <span>QUY ĐỊNH BẮT BUỘC DÀNH CHO NGƯỜI ĐĂNG TIN</span>
          </span>
        </div>
        <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
          Chính sách & Điều khoản Dịch vụ Môi giới Cho thuê NHACUALAND
        </h2>
        <p className="mt-2 text-xs md:text-sm text-slate-600 leading-relaxed">
          Nhằm đảm bảo sự minh bạch, quyền lợi hợp pháp và tính xác thực giữa Chủ nhà, Người thuê và NHACUALAND, quý khách vui lòng đọc lướt từ trên xuống dưới và xác nhận đồng ý điều khoản trước khi bắt đầu đăng tin cho thuê đầu tiên
        </p>
      </div>

      {/* Khung tài liệu Scrollable */}
      <div className="relative rounded-2xl border border-surface-border bg-white shadow-elevated overflow-hidden">
        {/* Thanh công cụ đọc */}
        <div className="flex items-center justify-between border-b border-surface-border bg-slate-50/80 px-5 py-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">
            <span>Văn bản: Quy chế Dịch vụ Môi giới Cho thuê (Bản V2.0)</span>
          </span>
          {!hasScrolledNearBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="inline-flex items-center gap-1 font-bold text-brand hover:text-brand-700 transition-colors"
            >
              <span>Cuộn xuống cuối</span>
              <span>↓</span>
            </button>
          )}
        </div>

        {/* Nội dung chi tiết cuộn được */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="max-h-[440px] overflow-y-auto p-6 md:p-8 space-y-6 text-xs md:text-sm text-slate-700 leading-relaxed scroll-smooth"
        >
          {/* Mục 1 */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">1</span>
              <span>Mô hình môi giới chuyên biệt & Đầu mối phục vụ thực tế</span>
            </h3>
            <p>
              Hệ thống NHACUALAND hoạt động theo mô hình môi giới chuyên biệt cho thuê phòng trọ, chung cư mini, chung cư và mặt bằng kinh doanh
            </p>
            <p>
              Chủ nhà trực tiếp tiếp nhận tin đăng, liên hệ để xác minh thông tin, khảo sát thực tế và điều phối dẫn khách thuê tới xem phòng trực tiếp tại địa chỉ cho thuê
            </p>
            <p className="font-medium text-brand-900 bg-brand-50/80 p-2.5 rounded-xl border border-brand-200/60">
              Khách thuê phòng được phục vụ hoàn toàn miễn phí 0 đồng, không phải trả bất kỳ chi phí dịch vụ môi giới nào
            </p>
          </section>

          {/* Mục 2 */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">2</span>
              <span>Biểu phí dịch vụ môi giới minh bạch & Điều kiện thanh toán</span>
            </h3>
            <p>
              Đăng tin, khảo sát và dẫn khách xem phòng hoàn toàn miễn phí. Chủ nhà / Người cho thuê chỉ thanh toán phí dịch vụ môi giới khi giao dịch cho thuê thành công (hợp đồng thuê được ký kết và khách thuê nhận bàn giao phòng thực tế)
            </p>
            <p>
              Mức phí dịch vụ môi giới tiêu chuẩn là <strong>40%</strong> giá trị hợp đồng thuê trung bình một tháng theo toàn kỳ hạn thuê (tính theo công thức bình quân có trọng số thời hạn hợp đồng)
            </p>
            <p className="text-slate-600 italic bg-slate-50 p-2.5 rounded-xl border border-surface-border">
              Ví dụ: Hợp đồng 24 tháng (3 tháng đầu giá 5 triệu/tháng, 21 tháng sau giá 7 triệu/tháng), mức phí môi giới bằng 40% × 6,75 triệu = 2,7 triệu đồng duy nhất một lần cho toàn bộ hợp đồng
            </p>
            <p className="font-semibold text-slate-800">
              Trong trường hợp không có khách thuê chốt hợp đồng thành công: Chủ nhà không phải thanh toán bất kỳ chi phí nào (0 đồng)
            </p>
          </section>

          {/* Mục 3 */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">3</span>
              <span>Nguyên tắc tài chính trực tiếp — Không thu cọc & không thanh toán trực tuyến</span>
            </h3>
            <p>
              Website NHACUALAND tuyệt đối không tích hợp thanh toán trực tuyến, không thu tiền cọc phòng và không giữ hộ tiền của các bên nhằm loại bỏ hoàn toàn rủi ro gian lận mạng
            </p>
            <p>
              Mọi khoản tiền đặt cọc và tiền thuê phòng do Khách thuê và Chủ nhà giao dịch, ký nhận trực tiếp tại địa điểm thuê bằng hợp đồng và biên bản bàn giao thực tế
            </p>
            <p>
              Phí dịch vụ môi giới được thỏa thuận và thanh toán trực tiếp với đại diện môi giới sau khi giao dịch chốt thuê hoàn tất
            </p>
          </section>

          {/* Mục 4 */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">4</span>
              <span>Trách nhiệm và cam kết của Người đăng tin (Chủ nhà)</span>
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Cung cấp thông tin địa chỉ, diện tích, giá thuê và hình ảnh thực tế trung thực, chính xác</li>
              <li>Công khai minh bạch các chi phí dịch vụ đi kèm (giá điện, nước, internet, gửi xe)</li>
              <li>Cam kết có toàn quyền cho thuê hoặc là chủ sở hữu hợp pháp đối với phòng hoặc mặt bằng đăng tải</li>
              <li>Phối hợp tạo điều kiện thuận lợi để chuyên viên hẹn giờ và dẫn khách thuê tới xem phòng</li>
              <li>Thông báo ngay cho NHACUALAND khi phòng đã được cho thuê từ nguồn khác để hệ thống gỡ hoặc ẩn tin đăng, tránh làm phiền đôi bên</li>
            </ul>
          </section>

          {/* Mục 5 */}
          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-white text-xs font-bold">5</span>
              <span>Bảo mật thông tin & Xử lý hỗ trợ</span>
            </h3>
            <p>
              NHACUALAND cam kết bảo mật thông tin liên hệ và hình ảnh của quý khách theo quy định pháp luật — số điện thoại cá nhân không hiển thị công khai tùy tiện để tránh tin nhắn rác hoặc cuộc gọi làm phiền
            </p>
          </section>
        </div>

        {/* Khung tích đồng ý và xác nhận */}
        <div className="border-t border-surface-border bg-slate-50/95 p-5 md:p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium animate-shake">
              {error}
            </div>
          )}

          <label className="flex items-start gap-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="accept-broker-terms-checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setError(null);
              }}
              className="mt-0.5 h-5 w-5 rounded-md border-slate-300 text-brand focus:ring-brand focus:ring-offset-0 cursor-pointer transition-all"
            />
            <span className="text-xs md:text-sm font-semibold text-slate-800 leading-snug">
              Tôi là chủ sở hữu hoặc người có quyền cho thuê hợp pháp, đã đọc kỹ, hiểu rõ và đồng ý toàn bộ Điều khoản và Chính sách dịch vụ môi giới cho thuê của NHACUALAND
            </span>
          </label>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="text-xs text-slate-500 text-center sm:text-left">
              Xác nhận này chỉ thực hiện 01 lần duy nhất cho tài khoản đăng tin
            </div>
            <button
              type="button"
              id="confirm-broker-terms-button"
              disabled={!agreed || submitting}
              onClick={handleConfirm}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-sm transition-all duration-200 ${
                agreed && !submitting
                  ? 'bg-brand text-white hover:bg-brand-600 active:scale-[0.98] cursor-pointer shadow-md'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <span>Xác nhận đồng ý và bắt đầu đăng tin</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
