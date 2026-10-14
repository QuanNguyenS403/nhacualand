'use client';

import Link from 'next/link';
import { Listing, formatPrice } from '@/lib/api';
import { DEFAULT_ROOM_FALLBACK_IMAGES } from '@/lib/image-compressor';

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`;
  return `${Math.floor(days / 30)} tháng trước`;
}

export function ListingCard({ listing }: { listing: Listing }) {
  const rawCover = listing.images?.[0]?.imageUrl;
  const cover = (!rawCover || rawCover.startsWith('blob:')) ? DEFAULT_ROOM_FALLBACK_IMAGES[0] : rawCover;
  const timeLabel = formatTimeAgo(listing.publishedAt);
  const rawTitle = listing.title ?? 'Phòng cho thuê';
  const displayTitle = rawTitle.replace(/^\[MẪU\]\s*/i, '').replace(/\[MẪU\]/gi, '').trim();
  const nearestUni = listing.nearbyUniversities?.[0];

  return (
    <Link href={`/tin/${listing.slug}`} className="listing-card group flex flex-col justify-between">
      <div>
        {/* Ảnh: tỷ lệ 16:10 */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={displayTitle}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('unsplash.com')) {
                  target.src = DEFAULT_ROOM_FALLBACK_IMAGES[0];
                }
              }}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              style={{ willChange: 'transform', transform: 'translateZ(0)' }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M4.5 3v18m15-18v18" />
              </svg>
            </div>
          )}

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Số lượng ảnh */}
          {(listing.images?.length ?? 0) > 1 && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M4.5 3v18m15-18v18" />
              </svg>
              {listing.images?.length}
            </div>
          )}
        </div>

        {/* Nội dung card */}
        <div className="p-4 sm:p-4.5">
          {/* Giá thuê tháng (Đã loại bỏ số diện tích 74m², 45m², 28m² theo yêu cầu) */}
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-bold text-brand">
              {formatPrice(listing.price)}
            </span>
            <span className="text-xs font-medium text-text-muted">/ tháng</span>
          </div>

          {/* Tiêu đề */}
          <p className="mt-2 line-clamp-2 text-sm sm:text-[14.5px] font-semibold text-text-primary leading-snug group-hover:text-brand transition-colors">
            {displayTitle}
          </p>

          {/* Badge khoảng cách tìm kiếm theo địa chỉ nếu có */}
          {listing.distanceText ? (
            <div className="mt-2.5 inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800 border border-brand-200/70">
              <span>{listing.distanceText}</span>
            </div>
          ) : listing.distanceMeters != null ? (
            <div className="mt-2.5 inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800 border border-brand-200/70">
              <span>
                {listing.distanceMeters < 1000
                  ? `Cách địa chỉ ~${listing.distanceMeters}m`
                  : `Cách địa chỉ ~${(listing.distanceMeters / 1000).toFixed(1)} km`}
              </span>
            </div>
          ) : nearestUni ? (
            <div className="mt-2.5 flex items-center text-xs text-brand font-medium truncate">
              <span className="truncate">
                Gần {nearestUni.university.abbreviation || nearestUni.university.name}
                {nearestUni.distanceMeters ? ` (~${nearestUni.distanceMeters}m)` : ''}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Thông tin thời gian */}
      {timeLabel ? (
        <div className="px-4 sm:px-4.5 pb-3.5 pt-0">
          <div className="flex items-center justify-end border-t border-surface-border pt-2.5 text-xs text-text-muted" suppressHydrationWarning>
            <span suppressHydrationWarning>{timeLabel}</span>
          </div>
        </div>
      ) : null}
    </Link>
  );
}
