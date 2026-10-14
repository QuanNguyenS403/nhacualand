'use client';

import { useState } from 'react';
import type { BlacklistCheckResult, ReviewItem } from '@/lib/reviews-types';
import { ReviewCard } from './ReviewCard';

interface TransparencyCheckerProps {
  onSelectKeyword?: (keyword: string) => void;
}

const POPULAR_HOTSPOTS = [
  'Ngõ 1194 Láng',
  'Triều Khúc',
  'Mễ Trì',
  'Định Công',
  'Trần Đại Nghĩa',
  'Cầu Giấy',
  'Bình Thạnh',
  'Tân Bình',
];

export function TransparencyChecker({ onSelectKeyword }: TransparencyCheckerProps) {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BlacklistCheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleCheck(targetText?: string) {
    const query = (targetText !== undefined ? targetText : keyword).trim();
    if (!query) {
      setErrorMessage('Vui lòng nhập số điện thoại hoặc địa chỉ phòng trọ cần kiểm tra');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch(`/api/reviews/blacklist-check?keyword=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success && data.data) {
        setResult(data.data);
        if (targetText !== undefined) {
          setKeyword(targetText);
        }
      } else {
        setErrorMessage(data.message || 'Không thể thực hiện kiểm tra lúc này');
      }
    } catch {
      setErrorMessage('Lỗi kết nối mạng khi tra cứu dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setKeyword('');
    setResult(null);
    setErrorMessage('');
  }

  return (
    <div className="w-full rounded-3xl bg-gradient-to-b from-slate-900 to-slate-800 p-6 sm:p-8 text-white shadow-xl ring-1 ring-white/10">
      <div className="max-w-3xl mx-auto text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-semibold uppercase tracking-wider mb-3">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          Hệ thống tra cứu bẫy trọ khẩn cấp
        </div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white mb-2">
          Kiểm tra SĐT & Địa chỉ trước khi chuyển cọc
        </h2>
        <p className="text-sm sm:text-base text-slate-300">
          Tra cứu ngay lịch sử phản ánh từ 899 cựu người thuê tại Hà Nội và TP Hồ Chí Minh
        </p>
      </div>

      {/* Form tra cứu */}
      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCheck();
          }}
          className="relative flex flex-col sm:flex-row items-center gap-2 rounded-2xl bg-white p-2 shadow-lg"
        >
          <div className="flex items-center w-full px-3 text-slate-700">
            <svg className="w-5 h-5 text-slate-400 shrink-0 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập SĐT chủ trọ hoặc địa chỉ như Ngõ, Đường, Phường"
              className="w-full bg-transparent py-2.5 text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none"
            />
            {keyword && (
              <button
                type="button"
                onClick={handleReset}
                className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label="Xóa nội dung tìm kiếm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white transition-all hover:bg-brand-600 active:scale-95 disabled:opacity-60 shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Đang quét</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Kiểm tra ngay</span>
              </>
            )}
          </button>
        </form>

        {errorMessage && (
          <p className="mt-2 text-center text-xs sm:text-sm font-medium text-rose-300">
            {errorMessage}
          </p>
        )}

        {/* Hotspots gợi ý */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-300">
          <span className="font-semibold text-slate-400">Khu vực tìm kiếm nhiều:</span>
          {POPULAR_HOTSPOTS.map((hotspot) => (
            <button
              key={hotspot}
              type="button"
              onClick={() => {
                if (onSelectKeyword) onSelectKeyword(hotspot);
                handleCheck(hotspot);
              }}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-slate-200 transition-colors hover:bg-white/20 active:scale-95"
            >
              {hotspot}
            </button>
          ))}
        </div>
      </div>

      {/* Hiển thị kết quả tra cứu */}
      {result && (
        <div className="mt-6 rounded-2xl bg-white p-5 sm:p-6 text-slate-800 animate-slide-down shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 ${
                  result.status === 'DANGER'
                    ? 'bg-rose-100 text-rose-600'
                    : result.status === 'WARNING'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-brand-100 text-brand-700'
                }`}
              >
                {result.status === 'DANGER' ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : result.status === 'WARNING' ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      result.status === 'DANGER'
                        ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                        : result.status === 'WARNING'
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                        : 'bg-brand-50 text-brand-900 ring-1 ring-brand-200'
                    }`}
                  >
                    {result.severityLabel}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Từ khóa: &quot;{result.keyword}&quot;</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  {result.summary}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold self-end sm:self-auto"
            >
              Đóng kết quả
            </button>
          </div>

          <div className="mt-3 rounded-xl bg-slate-50 p-3.5 border border-slate-200/80 text-xs sm:text-sm text-slate-700">
            <span className="font-bold text-brand">Khuyến nghị an toàn: </span>
            {result.recommendation}
          </div>

          {/* Danh sách bài đánh giá liên quan nếu có */}
          {result.matchedReviews.length > 0 && (
            <div className="mt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Các bài phản ánh liên quan ({result.matchedReviews.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                {result.matchedReviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
