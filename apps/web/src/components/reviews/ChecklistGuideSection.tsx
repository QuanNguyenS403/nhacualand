'use client';

import { useState } from 'react';

export function ChecklistGuideSection() {
  const [activeTab, setActiveTab] = useState<'checklist' | 'roommate'>('checklist');

  const steps = [
    {
      step: '01',
      title: 'Tra cứu hồ sơ tòa nhà trên kho dữ liệu độc lập',
      desc: 'Nhập số điện thoại chủ nhà hoặc địa chỉ ngõ ngách vào công cụ tra cứu Nhà Minh Bạch để xem các đánh giá từ người thuê trước, phòng tránh tiền lệ quỵt cọc',
      tag: 'Bảo vệ nguồn tiền',
    },
    {
      step: '02',
      title: 'Tự tay test công tơ điện và xả thử nước sinh hoạt',
      desc: 'Ngắt toàn bộ aptomat trong phòng và quan sát đĩa nhôm công tơ điện xem có dừng quay hoàn toàn không; đồng thời mở cùng lúc vòi sen và bồn cầu để đo áp lực nước',
      tag: 'Chuẩn định mức',
    },
    {
      step: '03',
      title: 'Yêu cầu video walkthrough 1 shot liền mạch',
      desc: 'Nói không với ảnh chụp góc rộng 0.5x hay render AI; yêu cầu quay video 1 shot từ cổng vào tới phòng để kiểm tra độ thoáng, ánh sáng tự nhiên và mùi ẩm mốc',
      tag: 'Chống ảnh ảo',
    },
    {
      step: '04',
      title: 'Rà soát hợp đồng thuê và cam kết hoàn cọc bằng văn bản',
      desc: 'Quy định rõ thời hạn hoàn trả tiền cọc tối đa 3 đến 5 ngày sau bàn giao, chụp ảnh lập biên bản hiện trạng đồ đạc và chốt mức giá điện nước cố định không tăng',
      tag: 'Pháp lý minh bạch',
    },
    {
      step: '05',
      title: 'Xác minh tư cách pháp lý của người nhận tiền cọc',
      desc: 'Đối chiếu căn cước công dân người ký hợp đồng với sổ đỏ hoặc giấy ủy quyền hợp pháp của chủ nhà; tuyệt đối không chuyển cọc online cho người lạ chưa gặp mặt',
      tag: 'An toàn tuyệt đối',
    },
  ];

  const roommateRules = [
    {
      title: 'Tiền điện điều hòa nhiệt độ',
      desc: 'Không cào bằng nếu lệch ca làm việc hoặc sinh hoạt; nên thỏa thuận tỷ lệ chia công bằng như 60/40 hoặc lắp công tơ phụ cho riêng đường điện máy lạnh',
      icon: '❄️',
    },
    {
      title: 'Quỹ sinh hoạt chung hàng tháng',
      desc: 'Đóng cố định 50k đến 100k mỗi người một tháng để mua sắm vật dụng tiêu hao dùng chung như nước rửa bát, gia vị, dầu ăn và giấy vệ sinh',
      icon: '🛒',
    },
    {
      title: 'Quy định dẫn bạn bè hoặc người yêu về phòng',
      desc: 'Thông báo trước cho bạn cùng phòng tối thiểu 2 tiếng; giới hạn số đêm ngủ lại không quá 1 đến 2 đêm mỗi tuần để giữ không gian riêng tư',
      icon: '👥',
    },
    {
      title: 'Phân công lịch trực nhật dọn vệ sinh',
      desc: 'Lập bảng phân công luân phiên hàng tuần cho khu vực chung như nhà bếp, bồn rửa và nhà vệ sinh để tránh mâu thuẫn sinh hoạt',
      icon: '🧹',
    },
  ];

  return (
    <section className="my-10 rounded-3xl bg-slate-50 border border-slate-200/80 p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-900 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Cẩm nang thực chiến</span>
            <span>•</span>
            <span>Bảo vệ quyền lợi khách thuê</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Cẩm nang an toàn trước khi đặt cọc phòng trọ
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Quy trình đúc kết từ hàng ngàn trải nghiệm thuê nhà giúp bạn không bao giờ mất tiền oan
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 bg-white rounded-xl border border-slate-200 shadow-xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'checklist'
                ? 'bg-brand text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            5 bước kiểm tra phòng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roommate')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'roommate'
                ? 'bg-brand text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quy tắc ở ghép
          </button>
        </div>
      </div>

      {activeTab === 'checklist' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((s, idx) => (
            <div
              key={s.step}
              className={`rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between ${
                idx === 0 ? 'lg:col-span-2 bg-gradient-to-br from-white to-brand-50/40 border-brand-200/70' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand font-black text-sm">
                    {s.step}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {s.tag}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-2">
                  {s.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {s.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-brand font-semibold">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Quy chuẩn kiểm định Chủ nhà NHACUALAND</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {roommateRules.map((r) => (
            <div
              key={r.title}
              className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="text-2xl mb-3">{r.icon}</div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base mb-2">
                  {r.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {r.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-400">
                Thống nhất trước khi dọn vào
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
