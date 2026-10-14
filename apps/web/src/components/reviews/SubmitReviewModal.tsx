'use client';

import { useState } from 'react';

interface SubmitReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubmitReviewModal({ isOpen, onClose, onSuccess }: SubmitReviewModalProps) {
  const [role, setRole] = useState<'former_tenant' | 'tenant'>('former_tenant');
  const [address, setAddress] = useState('');
  const [landlordPhone, setLandlordPhone] = useState('');
  const [landlordName, setLandlordName] = useState('');
  const [rating, setRating] = useState(1);
  const [price, setPrice] = useState('');
  const [content, setContent] = useState('');
  const [selectedTraps, setSelectedTraps] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const toggleTrap = (key: string) => {
    setSelectedTraps((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim() || !content.trim()) {
      setErrorMsg('Vui lòng điền địa chỉ phòng trọ và nội dung trải nghiệm');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          address: address.trim(),
          landlordPhone: landlordPhone.trim() || null,
          landlordName: landlordName.trim() || null,
          rating,
          price: price ? parseInt(price.replace(/[^0-9]/g, ''), 10) : null,
          content: content.trim(),
          traps: selectedTraps,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg('Gửi đánh giá thành công! Dữ liệu sẽ được bảo vệ ẩn danh');
        setTimeout(() => {
          setSuccessMsg('');
          onClose();
          if (onSuccess) onSuccess();
        }, 1800);
      } else {
        setErrorMsg(data.message || 'Có lỗi xảy ra khi gửi thông tin');
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Đóng cửa sổ đánh giá"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand text-xs font-bold uppercase tracking-wider mb-2">
            <span>Bảo mật danh tính</span>
            <span>•</span>
            <span>Cộng đồng Nhà Minh Bạch</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Đóng góp đánh giá phòng trọ
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Ý kiến trung thực của bạn sẽ giúp hàng ngàn sinh viên và người đi làm tránh được bẫy lừa
          </p>
        </div>

        {successMsg ? (
          <div className="my-8 text-center p-6 rounded-2xl bg-brand-50 border border-brand-200 text-brand-900">
            <svg className="w-12 h-12 mx-auto text-brand-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-base font-bold">{successMsg}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-slate-800">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Chọn vai trò */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Bạn là ai với căn phòng này?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('former_tenant')}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                    role === 'former_tenant'
                      ? 'border-brand bg-brand-50 text-brand shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cựu người thuê (Đã chuyển đi)
                </button>
                <button
                  type="button"
                  onClick={() => setRole('tenant')}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                    role === 'tenant'
                      ? 'border-brand bg-brand-50 text-brand shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Người đang ở hiện tại
                </button>
              </div>
            </div>

            {/* Địa chỉ phòng trọ */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Địa chỉ phòng trọ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, ngõ ngách, tên đường, phường, quận"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* Thông tin chủ trọ / Chuỗi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  SĐT chủ trọ / Người dẫn (nếu có)
                </label>
                <input
                  type="text"
                  value={landlordPhone}
                  onChange={(e) => setLandlordPhone(e.target.value)}
                  placeholder="098xxxxxxx"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Tên chủ hoặc Chuỗi nhà trọ (nếu có)
                </label>
                <input
                  type="text"
                  value={landlordName}
                  onChange={(e) => setLandlordName(e.target.value)}
                  placeholder="Vd: Chuỗi SmartHome, Anh Tuấn"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* Đánh giá số sao */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Mức độ hài lòng của bạn <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-110"
                    aria-label={`${star} sao`}
                  >
                    <svg
                      className={`h-7 w-7 ${
                        star <= rating
                          ? rating <= 2
                            ? 'text-rose-500 fill-rose-500'
                            : rating >= 4
                            ? 'text-brand fill-brand'
                            : 'text-amber-400 fill-amber-400'
                          : 'text-slate-200 fill-slate-100'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
                <span className="text-xs font-bold ml-2 text-slate-700">
                  {rating === 1 && 'Rất tệ (Bẫy trọ cảnh báo)'}
                  {rating === 2 && 'Kém hài lòng'}
                  {rating === 3 && 'Bình thường'}
                  {rating === 4 && 'Tốt và thoải mái'}
                  {rating === 5 && 'Rất tuyệt vời (Khuyên nên thuê)'}
                </span>
              </div>
            </div>

            {/* Checkbox các vấn đề gặp phải */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Các vấn đề gặp phải (nếu có)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'dien_nuoc', label: 'Điện nước cắt cổ' },
                  { key: 'coc_tien', label: 'Bị quỵt hoặc trừ cọc' },
                  { key: 'anh_ao', label: 'Ảnh mạng lừa dối 0.5x' },
                  { key: 'soi_cam', label: 'Soi camera mất riêng tư' },
                  { key: 'ha_tang', label: 'Ẩm mốc hoặc nước yếu' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleTrap(item.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedTraps.includes(item.key)
                        ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Giá thuê */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Giá thuê phòng mỗi tháng (VND)
              </label>
              <input
                type="text"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Vd: 3500000"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            {/* Nội dung trải nghiệm */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Nội dung chia sẻ chi tiết <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Chia sẻ chân thật về tiền điện nước, thái độ chủ nhà, an ninh, hiện trạng phòng"
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold shadow-sm hover:bg-brand-600 active:scale-95 transition-all disabled:opacity-60"
              >
                {submitting ? 'Đang gửi' : 'Gửi đánh giá ngay'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
