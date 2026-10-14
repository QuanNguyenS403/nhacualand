'use client';

import { useState, useEffect, useCallback } from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [content, setContent] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const resetForm = useCallback(() => {
    setRating(0);
    setHoverRating(0);
    setContent('');
    setName('');
    setEmail('');
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

    const trimmed = content.trim();
    if (trimmed.length < 10) {
      setErrorMessage('Nội dung chi tiết phải có tối thiểu 10 ký tự');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Địa chỉ email không hợp lệ, vui lòng kiểm tra lại');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: rating > 0 ? rating : undefined,
          content: trimmed,
          name: name.trim() || undefined,
          email: email.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Không thể gửi phản hồi, vui lòng thử lại sau');
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
      aria-labelledby="feedback-modal-title"
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
          <h2 id="feedback-modal-title" className="text-xl font-bold text-slate-800 tracking-tight">
            Gửi phản hồi
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Góp ý của bạn giúp chúng tôi cải thiện dịch vụ tốt hơn
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
              Cảm ơn bạn đã gửi phản hồi đóng góp ý kiến
            </h3>
            <p className="text-xs text-slate-500">
              Thông tin đã được chuyển trực tiếp tới hòm thư ban quản trị
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Đánh giá (tùy chọn) */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Đánh giá (tùy chọn)
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(rating === star ? 0 : star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 text-slate-300 hover:scale-110 transition-transform focus:outline-none"
                      aria-label={`${star} sao`}
                    >
                      <svg
                        className={`h-7 w-7 transition-colors ${
                          isFilled ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                        }`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                        />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nội dung chi tiết */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                Nội dung chi tiết <span className="text-xs font-normal text-slate-500">(tối thiểu 10 ký tự)</span>
              </label>
              <div className="relative">
                <textarea
                  rows={4}
                  value={content}
                  maxLength={2000}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Mô tả chi tiết..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none"
                />
                <div className="mt-1 text-right text-xs text-slate-400">
                  {content.length}/2000
                </div>
              </div>
            </div>

            {/* Thông tin liên hệ (tùy chọn) */}
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-2">
                Thông tin liên hệ (tùy chọn)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tên
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyen Van A"
                    maxLength={100}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    maxLength={150}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                  />
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
                disabled={loading || content.trim().length < 10}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {loading ? (
                  <span>Đang gửi...</span>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    <span>Gửi phản hồi</span>
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
