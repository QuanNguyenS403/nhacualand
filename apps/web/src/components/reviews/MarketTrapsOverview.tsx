'use client';

import type { TransparencyStats } from '@/lib/reviews-types';

interface MarketTrapsOverviewProps {
  stats: TransparencyStats;
  onSelectCategory?: (categoryKey: string) => void;
}

export function MarketTrapsOverview({ stats, onSelectCategory }: MarketTrapsOverviewProps) {
  const traps = [
    {
      key: 'dien_nuoc',
      title: 'Bẫy điện nước & Phụ phí cắt cổ',
      percent: stats.categoriesBreakdown?.electricWater?.percent || 41,
      count: stats.categoriesBreakdown?.electricWater?.count || 370,
      color: 'from-amber-500 to-orange-600',
      badgeBg: 'bg-amber-100 text-amber-800',
      barColor: 'bg-amber-500',
      description: 'Chủ nhà báo giá điện nước dân, khi ký hợp đồng lại thu 4k - 5k/số hoặc công tơ chạy nhanh',
      tip: 'Kiểm tra ngắt aptomat xem đĩa công tơ có dừng quay trước khi ký',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      key: 'coc_tien',
      title: 'Chiếm đoạt & Giam tiền cọc',
      percent: stats.categoriesBreakdown?.depositTrap?.percent || 33,
      count: stats.categoriesBreakdown?.depositTrap?.count || 295,
      color: 'from-rose-500 to-red-600',
      badgeBg: 'bg-rose-100 text-rose-800',
      barColor: 'bg-rose-500',
      description: 'Bới móc vết ố tường để trừ tiền triệu hoặc khất lần không trả cọc khi chuyển đi',
      tip: 'Chụp ảnh lập biên bản bàn giao hiện trạng và ghi rõ thời hạn trả cọc 3 - 5 ngày',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      key: 'anh_ao',
      title: 'Ảnh góc rộng 0.5x & AI ảo',
      percent: stats.categoriesBreakdown?.catfishingMedia?.percent || 19,
      count: stats.categoriesBreakdown?.catfishingMedia?.count || 166,
      color: 'from-purple-500 to-indigo-600',
      badgeBg: 'bg-purple-100 text-purple-800',
      barColor: 'bg-purple-500',
      description: 'Ảnh tin đăng chụp dựng lộng lẫy hoặc chụp 0.5x tạo cảm giác rộng giả tạo',
      tip: 'Yêu cầu video walkthrough 1 shot liền mạch từ cổng vào đến trong phòng',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: 'soi_cam',
      title: 'Soi cam & Xâm phạm riêng tư',
      percent: stats.categoriesBreakdown?.privacyViolation?.percent || 14,
      count: stats.categoriesBreakdown?.privacyViolation?.count || 127,
      color: 'from-orange-500 to-amber-600',
      badgeBg: 'bg-orange-100 text-orange-800',
      barColor: 'bg-orange-500',
      description: 'Chủ nhà tự ý mở cửa khi khách vắng nhà, soi camera hành lang và phạt tiền vô lý',
      tip: 'Hỏi kỹ quy định tiếp bạn bè, giờ giấc và quyền riêng tư ngay từ đầu',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: 'ha_tang',
      title: 'Hạ tầng dột nát & An ninh kém',
      percent: stats.categoriesBreakdown?.badInfrastructure?.percent || 12,
      count: stats.categoriesBreakdown?.badInfrastructure?.count || 104,
      color: 'from-amber-600 to-yellow-600',
      badgeBg: 'bg-amber-100 text-amber-900',
      barColor: 'bg-amber-500',
      description: 'Tường thấm dột mùa mưa, nhà vệ sinh bốc mùi, mất nước sinh hoạt vào giờ cao điểm',
      tip: 'Xả cùng lúc vòi sen và bồn cầu để kiểm tra áp lực nước thực tế',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
  ];

  return (
    <section className="my-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand text-xs font-bold uppercase tracking-wider mb-2">
            <span>Dữ liệu thực tế</span>
            <span>•</span>
            <span>899 hồ sơ đánh giá</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            5 vấn đề nhức nhối nhất khi thuê phòng trọ
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Phân tích tự động từ trải nghiệm thực tế của người thuê nhà tại Hà Nội và TP Hồ Chí Minh
          </p>
        </div>

        {/* Tóm tắt nhanh tỷ lệ cảnh báo */}
        <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-xs self-start md:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-xs font-bold text-slate-700">77% Cảnh báo bẫy trọ</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-brand" />
            <span className="text-xs font-bold text-slate-700">19% Trọ tốt uy tín</span>
          </div>
        </div>
      </div>

      {/* Grid 5 nhóm bẫy trọ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {traps.map((trap) => (
          <div
            key={trap.key}
            onClick={() => onSelectCategory && onSelectCategory(trap.key)}
            className="group cursor-pointer flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-brand/40 hover:shadow-card hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${trap.color} text-white shadow-sm`}>
                  {trap.icon}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trap.badgeBg}`}>
                  {trap.percent}% bài phản ánh
                </span>
              </div>

              <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-brand transition-colors mb-1.5">
                {trap.title}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {trap.description}
              </p>
            </div>

            <div>
              {/* Thanh tiến trình % */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${trap.barColor}`}
                  style={{ width: `${Math.min(trap.percent * 2, 100)}%` }}
                />
              </div>

              <div className="rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700 border border-slate-100">
                <span className="font-semibold text-brand">Lời khuyên: </span>
                {trap.tip}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
