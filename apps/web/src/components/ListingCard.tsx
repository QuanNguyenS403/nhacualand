'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Listing, formatPrice } from '@/lib/api';
import { DEFAULT_ROOM_FALLBACK_IMAGES } from '@/lib/image-compressor';
import {
  isRoomSelected,
  addSelectedRoom,
  removeSelectedRoom,
  subscribeSelectedRooms,
} from '@/lib/selected-rooms';

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
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    setSelected(isRoomSelected(listing.id));
    return subscribeSelectedRooms(() => {
      setSelected(isRoomSelected(listing.id));
    });
  }, [listing.id]);

  function handleToggleSelect(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (selected) {
      removeSelectedRoom(listing.id);
      setSelected(false);
    } else {
      addSelectedRoom({
        id: String(listing.id),
        title: displayTitle,
        slug: listing.slug,
        price: Number(listing.price),
        formattedPrice: formatPrice(listing.price),
        address: listing.addressDetail || listing.location?.name || '',
        coverImage: cover,
      });
      setSelected(true);
    }
  }

  const pType = listing.propertyType || 'phong_tro';
  const seg = (listing.segmentAttributes as any) || {};

  // Xây dựng dòng thông số tóm tắt (Card Meta) động theo loại hình
  const metaParts: string[] = [];
  if (pType === 'can_ho') {
    if (listing.areaM2) metaParts.push(`${listing.areaM2}m²`);
    if (seg.bedrooms) metaParts.push(`${seg.bedrooms}PN${seg.bathrooms ? ` ${seg.bathrooms}WC` : ''}`);
    if (seg.furnishing) {
      metaParts.push(
        seg.furnishing === 'full'
          ? 'Full nội thất'
          : seg.furnishing === 'co_ban'
            ? 'Nội thất cơ bản'
            : 'Nhà trống',
      );
    }
    if (seg.projectName) metaParts.push(seg.projectName);
  } else if (pType === 'mat_bang') {
    if (listing.areaM2) metaParts.push(`${listing.areaM2}m²`);
    if (seg.frontageM) metaParts.push(`Mặt tiền ${seg.frontageM}m`);
    if (seg.floorsCount) metaParts.push(`${seg.floorsCount} tầng`);
    if (seg.pcccCertified || seg.vatInvoiceAvailable) metaParts.push('PCCC & VAT');
  } else {
    // phong_tro hoặc ccmn
    const am = (listing.amenities as any) || {};
    if (listing.areaM2) metaParts.push(`${listing.areaM2}m²`);
    if (seg.hasMezzanine || seg.has_mezzanine || am.gacLung || am.mezzanine) {
      metaParts.push('Gác lửng');
    } else if (seg.hasElevator || seg.has_elevator || am.thangMay || am.elevator) {
      metaParts.push('Thang máy');
    }
    if (nearestUni) {
      metaParts.push(
        `Gần ${nearestUni.university.abbreviation || nearestUni.university.name}${
          nearestUni.distanceMeters ? ` (~${nearestUni.distanceMeters}m)` : ''
        }`,
      );
    }
  }

  const dynamicMetaText = metaParts.join(' • ');

  const isVerifiedBadge = Boolean(
    listing.verifiedBadgeAt ||
      (listing as any).isVerified ||
      listing.posterRole === 'nhacualand_team' ||
      listing.posterRole === 'verified_owner',
  );

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

          {/* Badges trên góc ảnh: Tin xác thực & Có Video */}
          <div className="absolute top-2.5 left-2.5 z-20 flex flex-col gap-1 items-start">
            {isVerifiedBadge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/95 text-white px-2 py-0.5 text-[10.5px] font-bold backdrop-blur-xs shadow-xs">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Tin xác thực</span>
              </span>
            )}
            {listing.videoUrl && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 text-white px-2 py-0.5 text-[10.5px] font-bold backdrop-blur-xs shadow-xs">
                <span className="text-[9px] text-rose-400">▶</span>
                <span>Có Video</span>
              </span>
            )}
          </div>

          {/* Nút Chọn phòng / Lưu phòng nhanh */}
          <button
            type="button"
            onClick={handleToggleSelect}
            className={`absolute top-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full transition-all shadow-md cursor-pointer ${
              selected
                ? 'bg-rose-500 text-white scale-105 ring-2 ring-white/80'
                : 'bg-white/90 text-slate-600 hover:bg-white hover:text-rose-500 hover:scale-105 backdrop-blur-xs'
            }`}
            title={selected ? 'Bỏ chọn phòng này' : 'Chọn phòng để đặt lịch xem'}
            aria-label={selected ? 'Bỏ chọn phòng này' : 'Chọn phòng để đặt lịch xem'}
          >
            <svg
              className="h-4.5 w-4.5"
              fill={selected ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              strokeWidth={selected ? 0 : 2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </button>

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

          {/* Số lượng ảnh */}
          {(listing.images?.length ?? 0) > 1 && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white backdrop-blur-sm pointer-events-none">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 21h18M3.75 3h16.5M4.5 3v18m15-18v18" />
              </svg>
              {listing.images?.length}
            </div>
          )}
        </div>

        {/* Nội dung card */}
        <div className="p-4 sm:p-4.5">
          {/* Giá thuê tháng */}
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

          {/* Dòng thông số động theo phân khúc (Card Meta) */}
          {dynamicMetaText ? (
            <p className="mt-2 text-xs font-medium text-text-secondary line-clamp-1">
              {dynamicMetaText}
            </p>
          ) : null}

          {/* Badge khoảng cách tìm kiếm theo địa chỉ nếu có */}
          {listing.distanceText ? (
            <div className="mt-2 inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800 border border-brand-200/70">
              <span>{listing.distanceText}</span>
            </div>
          ) : listing.distanceMeters != null ? (
            <div className="mt-2 inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800 border border-brand-200/70">
              <span>
                {listing.distanceMeters < 1000
                  ? `Cách địa chỉ ~${listing.distanceMeters}m`
                  : `Cách địa chỉ ~${(listing.distanceMeters / 1000).toFixed(1)} km`}
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
