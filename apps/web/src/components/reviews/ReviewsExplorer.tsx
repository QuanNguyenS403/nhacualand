'use client';

import { useState, useMemo } from 'react';
import { ReviewItem, removeDiacritics } from '@/lib/reviews-types';
import { ReviewCard } from './ReviewCard';
import { SubmitReviewModal } from './SubmitReviewModal';

interface ReviewsExplorerProps {
  initialReviews: ReviewItem[];
  totalCount: number;
}

export function ReviewsExplorer({ initialReviews, totalCount }: ReviewsExplorerProps) {
  const [reviews] = useState<ReviewItem[]>(initialReviews);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<'all' | 'hanoi' | 'hcm'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | 'bad' | 'good' | '1' | '2' | '3' | '4' | '5'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'dien_nuoc' | 'coc_tien' | 'anh_ao' | 'soi_cam' | 'ha_tang' | 'tro_tot'>('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const [modalOpen, setModalOpen] = useState(false);

  // Lọc dữ liệu client-side tức thì cho trải nghiệm mượt mà
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Lọc city
      if (selectedCity !== 'all' && r.detectedCity !== selectedCity) {
        return false;
      }

      // Lọc rating
      if (ratingFilter === 'bad' && r.rating > 2) return false;
      if (ratingFilter === 'good' && r.rating < 4) return false;
      if (['1', '2', '3', '4', '5'].includes(ratingFilter) && r.rating !== parseInt(ratingFilter, 10)) {
        return false;
      }

      // Lọc category
      if (categoryFilter !== 'all' && !r.categoryTags?.includes(categoryFilter)) {
        return false;
      }

      // Lọc search query
      if (searchTerm.trim()) {
        const norm = removeDiacritics(searchTerm);
        const full = `${r.content} ${r.displayAddress || ''} ${r.extracted_data?.address_raw || ''} ${r.extracted_data?.secondary_address || ''} ${r.buildings?.address_text || ''} ${r.buildings?.street_text || ''} ${r.target_phone || ''} ${r.target_brand || ''}`;
        if (!removeDiacritics(full).includes(norm)) {
          return false;
        }
      }

      return true;
    });
  }, [reviews, searchTerm, selectedCity, ratingFilter, categoryFilter]);

  const displayedList = filteredReviews.slice(0, visibleCount);
  const hasMore = visibleCount < filteredReviews.length;

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCity('all');
    setRatingFilter('all');
    setCategoryFilter('all');
    setVisibleCount(12);
  };

  return (
    <section id="feed-danh-gia" className="my-10">
      {/* Header khu vực Explorer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Dữ liệu mở cộng đồng</span>
            <span>•</span>
            <span>{totalCount} bài đánh giá thực tế</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Tra cứu phản ánh thực tế từ cựu người thuê
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Tìm kiếm theo địa chỉ, tên đường, số điện thoại hoặc loại bẫy trọ
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-brand-600 active:scale-95 transition-all self-start md:self-auto shrink-0"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Đóng góp đánh giá</span>
        </button>
      </div>

      {/* Bộ điều khiển lọc & Tìm kiếm */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs mb-6 space-y-4">
        {/* Hàng 1: Ô tìm kiếm và Thành phố */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(12);
              }}
              placeholder="Tìm theo địa chỉ, tên ngõ, số nhà, SĐT hoặc từ khóa bóc phốt"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Chọn thành phố */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedCity('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCity === 'all'
                  ? 'bg-white text-brand shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả khu vực
            </button>
            <button
              type="button"
              onClick={() => setSelectedCity('hanoi')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCity === 'hanoi'
                  ? 'bg-white text-brand shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hà Nội
            </button>
            <button
              type="button"
              onClick={() => setSelectedCity('hcm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCity === 'hcm'
                  ? 'bg-white text-brand shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TP Hồ Chí Minh
            </button>
          </div>
        </div>

        {/* Hàng 2: Lọc theo Rating và Chủ đề */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500 mr-1">Phân loại:</span>

          <button
            type="button"
            onClick={() => setRatingFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              ratingFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả điểm số
          </button>
          <button
            type="button"
            onClick={() => setRatingFilter('bad')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              ratingFilter === 'bad'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Cảnh báo bẫy trọ (1-2 sao)
          </button>
          <button
            type="button"
            onClick={() => setRatingFilter('good')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              ratingFilter === 'good'
                ? 'bg-brand text-white'
                : 'bg-brand-50 text-brand-900 hover:bg-brand-100'
            }`}
          >
            Trọ tốt được khen (4-5 sao)
          </button>

          <span className="text-slate-300 mx-1">|</span>

          {/* Lọc nhanh theo bẫy trọ */}
          {[
            { key: 'dien_nuoc', label: 'Điện nước cắt cổ' },
            { key: 'coc_tien', label: 'Giam cọc quỵt cọc' },
            { key: 'anh_ao', label: 'Ảnh ảo 0.5x' },
            { key: 'soi_cam', label: 'Soi cam mất riêng tư' },
            { key: 'ha_tang', label: 'Hạ tầng xuống cấp' },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === cat.key ? 'all' : (cat.key as any))}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === cat.key
                  ? 'bg-brand text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
              }`}
            >
              {cat.label}
            </button>
          ))}

          {(searchTerm || selectedCity !== 'all' || ratingFilter !== 'all' || categoryFilter !== 'all') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-brand font-semibold hover:underline ml-auto"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Hiển thị số lượng kết quả */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4 px-1">
        <span>
          Hiển thị <strong>{displayedList.length}</strong> trên <strong>{filteredReviews.length}</strong> bài đánh giá phù hợp
        </span>
        {searchTerm && (
          <span>
            Từ khóa: &quot;<strong>{searchTerm}</strong>&quot;
          </span>
        )}
      </div>

      {/* Grid danh sách bài đánh giá */}
      {displayedList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedList.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            Không tìm thấy bài đánh giá phù hợp
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">
            Hãy thử thay đổi từ khóa hoặc xóa bớt tiêu chí trong bộ lọc
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Hiển thị lại toàn bộ 899 đánh giá
          </button>
        </div>
      )}

      {/* Nút Xem thêm */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 12)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 py-3 text-xs sm:text-sm font-bold text-slate-800 shadow-xs hover:border-brand/40 hover:text-brand hover:shadow-sm active:scale-95 transition-all"
          >
            <span>Tải thêm {Math.min(12, filteredReviews.length - visibleCount)} bài phản ánh</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Modal gửi đánh giá */}
      <SubmitReviewModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  );
}
