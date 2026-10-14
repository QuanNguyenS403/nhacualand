'use client';

import { useState, useEffect, useCallback } from 'react';

interface ConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialReason?: string;
  initialDescription?: string;
  selectedRoomIds?: string[];
}

export function ConsultationModal({
  isOpen,
  onClose,
  initialReason = 'Khác',
  initialDescription = '',
  selectedRoomIds,
}: ConsultationModalProps) {
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState(initialReason);
  const [description, setDescription] = useState(initialDescription);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason || 'Khác');
      if (initialDescription) setDescription(initialDescription);
    }
  }, [isOpen, initialReason, initialDescription]);

  const resetForm = useCallback(() => {
    setPhone('');
    setReason('Khác');
    setDescription('');
    setErrorMessage(null);
    setSubmitted(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = phone.replace(/\s+/g, '');
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMessage('Số điện thoại không hợp lệ, vui lòng nhập số di động 10 chữ số');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage('Vui lòng chọn lý do cần tư vấn');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          reason: reason.trim(),
          description: description.trim() || undefined,
          selectedRoomIds: selectedRoomIds && selectedRoomIds.length > 0 ? selectedRoomIds : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Không thể gửi yêu cầu tư vấn, vui lòng thử lại sau');
      }

      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Có lỗi xảy ra khi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consultation-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
        {/* Nút đóng X ở góc trên phải */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Tiêu đề & phụ đề */}
        <div className="text-center mb-6 pr-6 pl-6">
          <h2 id="consultation-modal-title" className="text-xl font-bold text-slate-800 tracking-tight">
            Cần tư vấn
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Để lại thông tin, chúng tôi sẽ liên hệ hỗ trợ bạn sớm nhất
          </p>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Đã gửi yêu cầu tư vấn thành công
            </h3>
            <p className="text-xs text-slate-500">
              Chuyên viên tư vấn sẽ liên hệ lại với bạn trong thời gian sớm nhất
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Số điện thoại * */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678"
                maxLength={15}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium"
              />
            </div>

            {/* Lý do cần tư vấn * */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Lý do cần tư vấn <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all cursor-pointer"
                >
                  <option value="Khác">Khác</option>
                  <option value="Tìm phòng theo nhu cầu">Tìm phòng theo nhu cầu</option>
                  <option value="Thương lượng giá">Thương lượng giá</option>
                  <option value="Hỗ trợ pháp lý / hợp đồng">Hỗ trợ pháp lý / hợp đồng</option>
                  <option value="Xem phòng trực tiếp">Xem phòng trực tiếp</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Mô tả thêm (tùy chọn) */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Mô tả thêm <span className="text-xs font-normal text-slate-500">(tùy chọn)</span>
              </label>
              <div className="relative">
                <textarea
                  rows={4}
                  value={description}
                  maxLength={2000}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Chia sẻ thêm chi tiết nếu cần..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none"
                />
                <div className="mt-1 text-right text-xs text-slate-400">
                  {description.length}/2000
                </div>
              </div>
            </div>

            {/* Các nút bấm cuối modal */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {loading ? (
                  <span>Đang gửi...</span>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    <span>Gửi yêu cầu</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
