'use client';

import Link from 'next/link';
import { SITE_CONFIG } from '@/lib/constants';

export function MembershipPricingClient() {
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Tiêu đề & Giới thiệu */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 text-brand-800 border border-brand-200/80 mb-3">
          Mô hình môi giới chuyên biệt cho thuê
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl tracking-tight leading-tight">
          Chính Sách Phí Môi Giới Cho Thuê
        </h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">
          Đăng tin và dẫn khách xem phòng hoàn toàn miễn phí, người thuê 0 đồng, chủ nhà chỉ thanh toán phí thành công 40% khi giao dịch hoàn tất và khách nhận phòng
        </p>
      </div>

      {/* Banner thông báo chuyển đổi mô hình (DEV-11 / GAP-07) */}
      <div className="mb-10 rounded-2xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 p-1 shadow-lg animate-fade-in">
        <div className="rounded-[14px] bg-slate-900/90 backdrop-blur px-6 py-5 sm:flex sm:items-center sm:justify-between text-white">
          <div className="flex items-start sm:items-center gap-3.5 mb-4 sm:mb-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Thông báo chuyển đổi mô hình dịch vụ</h3>
                <span className="bg-brand text-white text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                  Áp dụng từ 24/09/2026
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-1 max-w-3xl leading-relaxed">
                Hệ thống chính thức chuyển đổi sang mô hình môi giới phòng cho thuê trực tiếp do Chủ nhà điều phối độc quyền. Ngừng bán toàn bộ các gói thành viên đăng tin tự do. Chủ trọ đăng tin hoàn toàn miễn phí, chỉ chi trả 40% phí thành công khi có người thuê dọn vào ở
              </p>
            </div>
          </div>
          <Link
            href="/dang-tin"
            className="inline-flex shrink-0 items-center text-xs font-bold bg-brand hover:bg-brand-400 text-slate-950 px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            Đăng tin miễn phí ngay
          </Link>
        </div>
      </div>

      {/* Bảng so sánh 3 bên */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-12">
        {/* Cột 1: Người thuê */}
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                Người thuê phòng
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Miễn Phí 100%</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Tìm kiếm, xem phòng, tư vấn giá và hỗ trợ ký kết hợp đồng thuê hoàn toàn không mất bất kỳ khoản phí môi giới nào
            </p>
            <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-5">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Phí tư vấn & dẫn xem phòng: <strong>0 đồng</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Chuyên viên trực tiếp dẫn xem, khảo sát thực tế</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Kiểm tra danh tính, quyền cho thuê của chủ trước khi cọc</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Ký hợp đồng trực tiếp với chủ nhà, minh bạch chi phí</span>
              </li>
            </ul>
          </div>
          <div className="mt-8 pt-4">
            <Link
              href="/"
              className="w-full block text-center py-3 px-4 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
            >
              Tìm phòng ngay
            </Link>
          </div>
        </div>

        {/* Cột 2: Chủ nhà (Nổi bật) */}
        <div className="rounded-3xl border-2 border-brand bg-white p-7 shadow-xl shadow-brand/10 ring-1 ring-brand flex flex-col justify-between relative">
          <div className="absolute -top-3.5 right-6 bg-brand text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm">
            Thu phí một lần khi thành công
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-800 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200">
                Chủ phòng & Nhà trọ
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Phí Dịch Vụ 40%</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Không thu phí đăng tin ban đầu, chỉ thanh toán một lần bằng 40% tiền thuê trung bình một tháng theo toàn bộ thời hạn hợp đồng sau khi giao dịch thành công và bàn giao phòng
            </p>
            <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-5">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Đăng tin & quảng bá phòng: <strong>0 đồng</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Tiếp nhận, sàng lọc nhu cầu và dẫn khách xem tận nơi</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Hỗ trợ soạn hợp đồng thuê và lập biên bản bàn giao</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Chỉ thanh toán phí khi đủ 4 điều kiện thành công thực tế</span>
              </li>
            </ul>
          </div>
          <div className="mt-8 pt-4">
            <Link
              href="/dang-tin"
              className="w-full block text-center py-3 px-4 rounded-xl text-xs font-bold bg-brand hover:bg-brand-dark text-white transition-colors shadow-sm"
            >
              Gửi phòng cho thuê miễn phí
            </Link>
          </div>
        </div>

        {/* Cột 3: Đầu mối chuyên viên */}
        <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                Đầu mối điều phối
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Chủ nhà</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Người tư vấn và trực tiếp dẫn khách xem phòng trên toàn hệ thống, đại diện dịch vụ môi giới cho thuê NHACUALAND
            </p>
            <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-5">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Kênh Zalo tiếp nhận: <strong>{SITE_CONFIG.zalo}</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Email hỗ trợ: <strong>{SITE_CONFIG.email}</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Thời gian tiếp nhận yêu cầu: <strong>{SITE_CONFIG.workingHours}</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                <span>Địa bàn hoạt động: <strong>Thành phố Hà Nội</strong></span>
              </li>
            </ul>
          </div>
          <div className="mt-8 pt-4">
            <Link
              href="/lien-he"
              className="w-full block text-center py-3 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors"
            >
              Liên hệ tư vấn dịch vụ
            </Link>
          </div>
        </div>
      </div>

      {/* Cam kết vận hành minh bạch */}
      <div className="rounded-3xl bg-slate-50 border border-slate-200/80 p-8 sm:p-10">
        <h4 className="font-extrabold text-base text-slate-900 mb-6 text-center sm:text-left">
          Quy tắc minh bạch & an toàn tài chính
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h5 className="font-bold text-sm text-slate-900 mb-1">Hai hợp đồng độc lập</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hợp đồng dịch vụ môi giới ký giữa chủ nhà và doanh nghiệp; hợp đồng thuê ký trực tiếp giữa chủ nhà và người thuê
            </p>
          </div>
          <div>
            <h5 className="font-bold text-sm text-slate-900 mb-1">Không giữ tiền cọc của khách</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Toàn bộ tiền đặt cọc và tiền thuê do người thuê thanh toán trực tiếp cho bên cho thuê hợp pháp, chúng tôi không thu hộ
            </p>
          </div>
          <div>
            <h5 className="font-bold text-sm text-slate-900 mb-1">Chỉ thu phí khi giao dịch thành công</h5>
            <p className="text-xs text-slate-600 leading-relaxed">
              Khoản phí 40% chỉ phát sinh khi hợp đồng thuê có hiệu lực, biên bản bàn giao hoàn tất và khoản tiền thuê đầu tiên đến hạn (nếu có) đã được xác nhận thanh toán
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
