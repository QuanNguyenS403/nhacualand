'use client';

import { useState } from 'react';
import type { ReviewItem } from '@/lib/reviews-types';

interface ReviewCardProps {
  review: ReviewItem;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Xác định mức độ cảnh báo dựa trên số sao
  const isDanger = review.rating <= 2;
  const isGood = review.rating >= 4;

  const content = review.content || '';
  const isLong = content.length > 240;
  const displayContent = expanded || !isLong ? content : content.slice(0, 240) + '...';

  const roleText =
    review.author_role === 'former_tenant'
      ? 'Cựu người thuê'
      : review.author_role === 'tenant'
      ? 'Người đang ở'
      : 'Khách thuê thực tế';

  const dateText = review.created_at
    ? new Date(review.created_at).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    : 'Mới cập nhật';

  const formatPrice = (p: number | null) => {
    if (!p) return null;
    return new Intl.NumberFormat('vi-VN').format(p) + ' đ/tháng';
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/danh-gia?q=${encodeURIComponent(review.short_id || review.id)}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-card">
      <div>
        {/* Header card: Rating stars & Status badge */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-4 w-4 ${
                    star <= review.rating
                      ? isDanger
                        ? 'text-rose-500 fill-rose-500'
                        : isGood
                        ? 'text-brand fill-brand'
                        : 'text-amber-400 fill-amber-400'
                      : 'text-slate-200 fill-slate-100'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                isDanger
                  ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/60'
                  : isGood
                  ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-200/60'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60'
              }`}
            >
              {isDanger ? 'Cảnh báo bẫy trọ' : isGood ? 'Đánh giá tích cực' : 'Ý kiến trung lập'}
            </span>
          </div>

          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
            {roleText}
          </span>
        </div>

        {/* Địa chỉ & Nhận diện tòa nhà */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-slate-900 font-semibold text-sm mb-1">
            <svg className="w-4 h-4 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{review.displayAddress || 'Khu vực nội thành'}</span>
          </div>

          {/* SĐT hoặc Tên chủ trọ / Chuỗi nếu có */}
          {(review.target_phone || review.target_brand || review.extracted_data?.landlord_name) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
              {review.target_phone && (
                <span className="inline-flex items-center gap-1 text-rose-600 font-medium bg-rose-50/80 px-2 py-0.5 rounded">
                  <span>SĐT phản ánh:</span>
                  <span>{review.target_phone}</span>
                </span>
              )}
              {review.target_brand && (
                <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-medium">
                  <span>Chuỗi: {review.target_brand}</span>
                </span>
              )}
              {review.extracted_data?.landlord_name && (
                <span className="text-slate-500">Chủ nhà: {review.extracted_data.landlord_name}</span>
              )}
            </div>
          )}
        </div>

        {/* Nội dung trải nghiệm */}
        <div className="text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-line font-normal">
          {displayContent}
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="ml-1 text-brand font-semibold hover:underline inline-block focus:outline-none"
            >
              {expanded ? 'Thu gọn' : 'Xem thêm'}
            </button>
          )}
        </div>

        {/* Media hình ảnh bằng chứng nếu có */}
        {review.media && review.media.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-thin">
            {review.media.slice(0, 3).map((imgUrl, i) => (
              <a
                key={i}
                href={imgUrl}
                target="_blank"
                rel="noreferrer"
                className="relative h-16 w-24 shrink-0 rounded-lg overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  alt={`Bằng chứng ${i + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}

        {/* Category tags */}
        {review.categoryTags && review.categoryTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {review.categoryTags.map((tag) => {
              let label = '';
              let badgeClass = 'bg-slate-100 text-slate-600';

              if (tag === 'dien_nuoc') {
                label = 'Điện nước cắt cổ';
                badgeClass = 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/60';
              } else if (tag === 'coc_tien') {
                label = 'Chiếm đoạt cọc';
                badgeClass = 'bg-rose-50 text-rose-800 ring-1 ring-rose-200/60';
              } else if (tag === 'anh_ao') {
                label = 'Ảnh ảo 0.5x';
                badgeClass = 'bg-purple-50 text-purple-800 ring-1 ring-purple-200/60';
              } else if (tag === 'soi_cam') {
                label = 'Soi cam mất riêng tư';
                badgeClass = 'bg-orange-50 text-orange-800 ring-1 ring-orange-200/60';
              } else if (tag === 'ha_tang') {
                label = 'Hạ tầng xuống cấp';
                badgeClass = 'bg-slate-100 text-slate-800 ring-1 ring-slate-200/60';
              } else if (tag === 'tro_tot') {
                label = 'Trọ uy tín';
                badgeClass = 'bg-brand-50 text-brand-900 ring-1 ring-brand-200/60';
              }

              if (!label) return null;
              return (
                <span key={tag} className={`text-[11px] font-medium px-2 py-0.5 rounded ${badgeClass}`}>
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer card: Giá thuê, Ngày tạo, Nút chia sẻ */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-1">
        <div className="flex items-center gap-2">
          {review.price ? (
            <span className="font-semibold text-brand">{formatPrice(review.price)}</span>
          ) : (
            <span>Mã hồ sơ: #{review.short_id || review.id.slice(0, 6)}</span>
          )}
          <span className="text-slate-300">•</span>
          <span>{dateText}</span>
        </div>

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-brand font-medium transition-colors"
          title="Sao chép liên kết chia sẻ hồ sơ"
        >
          {copied ? (
            <span className="text-brand font-semibold">Đã chép mã</span>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Chia sẻ</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}
