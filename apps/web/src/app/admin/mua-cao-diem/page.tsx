'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth-client';
import { formatPrice } from '@/lib/api';

interface PricingSeason {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  priceMultiplier: number;
  isActive: boolean;
  description: string | null;
}

interface PlanPreview {
  name: string;
  basePrice: number;
}

const SAMPLE_BASE_PLANS: PlanPreview[] = [
  { name: 'Gói Dùng Thử', basePrice: 0 },
  { name: 'Gói Khởi Đầu (10 tin)', basePrice: 199000 },
  { name: 'Gói Chuyên Nghiệp (30 tin)', basePrice: 499000 },
  { name: 'Gói Môi Giới VIP (100 tin)', basePrice: 999000 },
];

export default function AdminPricingSeasonsPage() {
  const [seasons, setSeasons] = useState<PricingSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [name, setName] = useState('Mùa tựu trường (Tháng 8 - Tháng 9)');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [priceMultiplier, setPriceMultiplier] = useState(1.25);
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState('Giai đoạn sinh viên cả nước nhập học, nhu cầu tìm phòng trọ tăng vọt.');

  async function loadSeasons() {
    setLoading(true);
    try {
      const res = await authFetch('/admin/pricing-seasons');
      if (res.ok) {
        const data = await res.json();
        setSeasons(Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []);
      }
    } catch {
      // safe-fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSeasons();
  }, []);

  async function handleSaveSeason(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + 'T23:59:59.999Z').toISOString(),
        priceMultiplier: Number(priceMultiplier),
        isActive,
        description: description.trim() || undefined,
      };

      const res = await authFetch('/admin/pricing-seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Không thể lưu cấu hình mùa vụ.');
      }

      setFeedback({ type: 'success', message: 'Đã lưu và áp dụng cấu hình mùa cao điểm thành công!' });
      loadSeasons();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Đã có lỗi xảy ra.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleSeason(season: PricingSeason) {
    try {
      const res = await authFetch(`/admin/pricing-seasons/${season.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !season.isActive }),
      });

      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Đã ${!season.isActive ? 'BẬT' : 'TẮT'} mùa "${season.name}". Giá hiển thị trên sàn đã tự động cập nhật!`,
        });
        loadSeasons();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Không thể thay đổi trạng thái.' });
    }
  }

  async function handleDeleteSeason(id: number) {
    if (!confirm('Bạn có chắc chắn muốn xóa cấu hình mùa cao điểm này?')) return;
    try {
      const res = await authFetch(`/admin/pricing-seasons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Đã xóa mùa cao điểm thành công.' });
        loadSeasons();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Không thể xóa cấu hình.' });
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Quản lý Mùa Cao Điểm & Surge Pricing
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Chủ động điều chỉnh hệ số giá theo mùa tựu trường hoặc sau Tết. Khi bật, giá các gói trên toàn bộ sàn sẽ tự động nhân theo hệ số mà không cần sửa code.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-2xl p-4 text-sm flex items-center justify-between shadow-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-brand-50 text-brand-900 border border-brand-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Grid: Form cấu hình & Live Price Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Cột trái: Form nhập liệu */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card">
          <h2 className="text-base font-bold text-slate-900 mb-5 flex items-center gap-2">
            <span>Thiết lập Mùa Cao Điểm Mới</span>
          </h2>

          <form onSubmit={handleSaveSeason} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên mùa cao điểm:
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Mùa tựu trường (Tháng 8 - Tháng 9)"
                className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ngày bắt đầu:
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ngày kết thúc:
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2.5 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* Hệ số nhân giá */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">
                  Hệ số nhân giá (Surge Multiplier):
                </label>
                <span className="text-base font-extrabold text-brand-900 bg-brand-50 px-2.5 py-0.5 rounded-lg border border-brand-300 shadow-xs">
                  {priceMultiplier}x
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.05"
                value={priceMultiplier}
                onChange={(e) => setPriceMultiplier(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-semibold">
                <span>1.0x (Giá gốc)</span>
                <span>1.25x (+25%)</span>
                <span>1.5x (+50%)</span>
                <span>2.0x (Gấp đôi)</span>
                <span>3.0x (+200%)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mô tả lý do / Ngữ cảnh mùa:
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Giai đoạn tân sinh viên tìm trọ..."
                className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 px-3.5 py-2 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="activeToggle"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded text-brand focus:ring-brand border-slate-300"
              />
              <label htmlFor="activeToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                Kích hoạt ngay mùa cao điểm này trên sàn
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 px-4 bg-brand hover:bg-brand-dark disabled:opacity-50 text-slate-950 text-xs sm:text-sm font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                {saving ? 'Đang lưu cấu hình...' : 'Lưu Cấu Hình Mùa Cao Điểm'}
              </button>
            </div>
          </form>
        </div>

        {/* Cột phải: Live Price Preview */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-amber-400 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider">
                Xem trước giá thực tế (Live Preview)
              </span>
            </div>

            <h3 className="text-lg font-extrabold text-white mb-1">
              Bảng tính giá khi áp dụng hệ số {priceMultiplier}x
            </h3>
            <p className="text-xs text-slate-300 mb-6">
              Đây là giá chính xác người dùng sẽ nhìn thấy trên trang Bảng giá công khai khi mùa này có hiệu lực:
            </p>

            <div className="space-y-3">
              {SAMPLE_BASE_PLANS.map((plan) => {
                const surgePrice = plan.basePrice === 0 ? 0 : Math.round(plan.basePrice * priceMultiplier);
                const diff = surgePrice - plan.basePrice;

                return (
                  <div
                    key={plan.name}
                    className="rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-3.5 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{plan.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Gốc: {formatPrice(plan.basePrice)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-extrabold text-amber-300">
                        {formatPrice(surgePrice)}
                      </p>
                      {diff > 0 && (
                        <p className="text-[10px] text-rose-300 font-semibold">
                          +{formatPrice(diff)} (+{Math.round((priceMultiplier - 1) * 100)}%)
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-white/10 text-[11px] text-slate-400 flex items-center gap-2">
            <span>Gói Dùng Thử luôn giữ mức 0đ bất kể hệ số mùa vụ</span>
          </div>
        </div>
      </div>

      {/* Bảng danh sách các mùa đã thiết lập */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Danh sách các Mùa Cao Điểm đã cấu hình
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Tổng cộng: {seasons.length} mùa
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Đang tải danh sách mùa...</div>
        ) : seasons.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Chưa có cấu hình mùa vụ nào. Hãy tạo mùa cao điểm đầu tiên ở form trên
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Tên mùa</th>
                  <th className="px-6 py-3.5">Thời gian áp dụng</th>
                  <th className="px-6 py-3.5">Hệ số giá</th>
                  <th className="px-6 py-3.5">Trạng thái</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {seasons.map((season) => (
                  <tr key={season.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-xs">{season.name}</p>
                      {season.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {season.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {new Date(season.startDate).toLocaleDateString('vi-VN')} →{' '}
                      {new Date(season.endDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md font-extrabold text-brand-900 bg-brand-50 border border-brand-300">
                        {season.priceMultiplier}x
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleSeason(season)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                          season.isActive
                            ? 'bg-brand-100 text-brand-900 hover:bg-brand-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${season.isActive ? 'bg-brand' : 'bg-slate-400'}`} />
                        <span>{season.isActive ? 'Đang BẬT' : 'Đã TẮT'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDeleteSeason(season.id)}
                        className="text-rose-600 hover:text-rose-800 font-bold text-xs hover:underline"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
