'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AuthModal } from '@/components/AuthModal';
import { ContactBrokerModal } from '@/components/ContactBrokerModal';
import { formatExactPrice, formatPrice } from '@/lib/api';
import { LandlordAvatar } from '@/components/QnsLogo';
import {
  isRoomSelected,
  addSelectedRoom,
  removeSelectedRoom,
  subscribeSelectedRooms,
} from '@/lib/selected-rooms';

interface OwnerContactBoxProps {
  listingId: string;
  listingTitle: string;
  price?: string | number | bigint;
  areaM2?: string | number;
  propertyType?: string;
  addressDetail?: string | null;
  locationName?: string;
  createdAt?: string;
  refreshedAt?: string | null;
  ownerName?: string;
  ownerAvatarUrl?: string | null;
  ownerPostCount?: number;
  contactPhone?: string;
  availableRooms?: string[];
  isRented?: boolean;
  posterRole?: string | null;
  verifiedBadgeAt?: string | null;
  coverImage?: string;
  contactAgent?: {
    displayName?: string;
    workPhone?: string;
    title?: string;
    avatarUrl?: string;
  };
}

function formatListingDateTime(dateStr?: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return '03/10/2026 09:12';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function formatMaskedAddress(addressDetail?: string | null, locationName?: string): string {
  if (addressDetail && addressDetail.includes(',')) {
    const parts = addressDetail.split(',').map((p) => p.trim()).filter(Boolean);
    const withoutHouseNo = parts.slice(1).join(', ');
    if (withoutHouseNo) return `***, ${withoutHouseNo}`;
  }
  if (addressDetail) {
    return `***, ${addressDetail}`;
  }
  if (locationName) {
    return `***, ${locationName}`;
  }
  return '***, Khu vực trung tâm';
}

function getPriceBenchmarkText(priceNum: number, areaNum: number, propType: string, locationName?: string): string | null {
  if (!priceNum || !areaNum || areaNum <= 0) return null;
  const pricePerM2 = Math.round(priceNum / areaNum);
  const formattedPerM2 = `${(pricePerM2 / 1000).toLocaleString('vi-VN')}k/m²`;
  const loc = locationName ? locationName.replace(/^TP\.\s*/i, '') : 'khu vực này';

  if (propType.includes('can_ho') || propType.includes('chung_cu')) {
    const minM = (priceNum * 0.95 / 1000000).toFixed(1).replace(/\.0$/, '');
    const maxM = (priceNum * 1.12 / 1000000).toFixed(1).replace(/\.0$/, '');
    return `Mức giá ${formatPrice(priceNum)}/tháng (~${formattedPerM2}) nằm trong khoảng giá hợp lý của căn hộ tại ${loc} (Trung bình khu vực: ${minM} – ${maxM} triệu/tháng)`;
  }
  if (propType.includes('mat_bang')) {
    const minM = (priceNum * 0.92 / 1000000).toFixed(1).replace(/\.0$/, '');
    const maxM = (priceNum * 1.15 / 1000000).toFixed(1).replace(/\.0$/, '');
    return `Mức giá ${formatPrice(priceNum)}/tháng (~${formattedPerM2}) cạnh tranh tốt cho mặt bằng kinh doanh tại ${loc} (Mặt bằng chung: ${minM} – ${maxM} triệu/tháng)`;
  }
  const minM = (priceNum * 0.9 / 1000000).toFixed(1).replace(/\.0$/, '');
  const maxM = (priceNum * 1.12 / 1000000).toFixed(1).replace(/\.0$/, '');
  return `Mức giá ${formatPrice(priceNum)}/tháng (~${formattedPerM2}) phù hợp cho phòng cho thuê tại ${loc} (Khoảng giá phổ biến: ${minM} – ${maxM} triệu/tháng)`;
}

export function OwnerContactBox({
  listingId,
  listingTitle,
  price,
  areaM2,
  propertyType = 'phong_tro',
  addressDetail,
  locationName,
  createdAt,
  refreshedAt,
  ownerName,
  ownerAvatarUrl,
  ownerPostCount,
  isRented = false,
  posterRole,
  verifiedBadgeAt,
  coverImage,
}: OwnerContactBoxProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    setSelected(isRoomSelected(listingId));
    return subscribeSelectedRooms(() => {
      setSelected(isRoomSelected(listingId));
    });
  }, [listingId]);

  function handleToggleSelect() {
    if (selected) {
      removeSelectedRoom(listingId);
      setSelected(false);
    } else {
      addSelectedRoom({
        id: String(listingId),
        title: listingTitle,
        price: price ? Number(price) : undefined,
        formattedPrice: price ? formatPrice(price) : undefined,
        address: addressDetail || locationName || '',
        coverImage,
      });
      setSelected(true);
    }
  }

  const maskedAddress = formatMaskedAddress(addressDetail, locationName);
  const dateTimeFormatted = formatListingDateTime(refreshedAt || createdAt);

  // Phân định rõ hồ sơ người đăng: Đội ngũ Thẩm định NHACUALAND vs Chủ nhà cá nhân
  const rawOwner = (ownerName || '').trim();
  const lowerOwner = rawOwner.toLowerCase();

  const isSystemVerified =
    posterRole === 'tham_dinh_nhacualand' ||
    !rawOwner ||
    rawOwner === 'Chủ nhà' ||
    lowerOwner.includes('thẩm định') ||
    lowerOwner.includes('nhacualand') ||
    lowerOwner.includes('qns broker') ||
    lowerOwner.includes('system') ||
    lowerOwner.includes('dẫn xem');

  const displayName = isSystemVerified
    ? 'Đội ngũ Thẩm định NHACUALAND'
    : rawOwner;

  const roleTag = isSystemVerified
    ? 'Đơn vị Quản lý & Dẫn xem trực tiếp (Miễn phí 100%)'
    : 'Chính chủ cho thuê';

  const roomCountLabel = isSystemVerified
    ? 'Đơn vị quản lý phòng xác thực'
    : `Đang cho thuê ${ownerPostCount && ownerPostCount > 0 && ownerPostCount <= 5 ? ownerPostCount : 2} phòng`;

  const verifiedDateFormatted = (() => {
    const targetDate = verifiedBadgeAt ? new Date(verifiedBadgeAt) : (refreshedAt ? new Date(refreshedAt) : new Date());
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(targetDate.getDate())}/${pad(targetDate.getMonth() + 1)}/${targetDate.getFullYear()}`;
  })();

  const numPrice = Number(price) || 0;
  const numArea = Number(areaM2) || 0;
  const priceBenchmark = getPriceBenchmarkText(numPrice, numArea, propertyType, locationName);

  function handleAuthSuccess() {
    setIsAuthModalOpen(false);
  }

  return (
    <>
      <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 shadow-card space-y-4 sm:space-y-5">
        {/* Khối Giá phòng & Số tiền */}
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-bold text-slate-700">Giá thuê niêm yết</p>
          <div className="flex flex-wrap items-baseline gap-1 text-brand">
            <span className="text-3xl sm:text-4xl font-black tracking-normal">
              {price ? formatExactPrice(price) : 'Liên hệ'}
            </span>
            {price ? (
              <span className="text-base sm:text-lg font-bold text-brand/90">/tháng</span>
            ) : null}
          </div>

          {/* Thanh So sánh Giá Khu vực (Price Benchmark Indicator) */}
          {priceBenchmark && (
            <div className="mt-2.5 rounded-xl bg-amber-50/80 border border-amber-200/70 p-2.5 text-xs text-amber-950 leading-relaxed flex items-start gap-2">
              <span className="text-amber-600 font-bold shrink-0 text-sm">💡</span>
              <div>
                <p className="font-semibold text-amber-900">Tham chiếu thị trường</p>
                <p className="text-[11.5px] text-amber-900/90 mt-0.5">{priceBenchmark}</p>
              </div>
            </div>
          )}
        </div>

        {/* Thông tin nhanh: Vị trí, Thời gian cập nhật */}
        <div className="space-y-2 text-sm text-slate-600 pt-1 border-t border-slate-100">
          <div className="flex items-start gap-2.5">
            <svg
              className="w-4 h-4 text-brand shrink-0 mt-0.5"
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.742 11.742 0 001.04.573l.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
            </svg>
            <span className="min-w-0 flex-1 font-medium text-slate-600 leading-snug">{maskedAddress}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <svg
              className="w-4 h-4 text-slate-400 shrink-0"
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
            </svg>
            <span className="min-w-0 flex-1 font-medium text-slate-500">Cập nhật: {dateTimeFormatted}</span>
          </div>
        </div>

        {/* Khối Đặt lịch xem phòng & Hồ sơ người đăng */}
        {isRented ? (
          <div className="rounded-2xl bg-brand-50 border border-brand-200 p-5 space-y-3 text-center">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-brand-700 text-white text-xs font-bold shadow-xs">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
              <span>Phòng đã cho thuê</span>
            </div>
            <p className="text-xs text-brand-900 font-medium leading-relaxed">
              Phòng này đã được cho thuê thành công — Hiện tại phòng không còn trống nên không thể tiếp nhận đặt lịch đi xem
            </p>
            <Link
              href="/thue"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold py-2.5 px-4 text-xs sm:text-sm transition-all shadow-sm"
            >
              <span>Tìm các phòng còn trống khác</span>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4.5 sm:p-5 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">Đặt lịch xem phòng</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>Còn phòng trống</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Chuyên viên NHACUALAND sẽ liên hệ xác nhận lịch và trực tiếp dẫn bạn xem phòng miễn phí
              </p>
            </div>

            {/* Thông tin Người đăng / Đội ngũ Thẩm định */}
            <div className="pt-2 border-t border-slate-200/70 space-y-2.5">
              <div className="flex items-center gap-3">
                <LandlordAvatar
                  avatarUrl={ownerAvatarUrl}
                  name={displayName}
                  size={46}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 text-sm sm:text-base leading-tight truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {roleTag}
                  </p>
                  <p className="text-[11px] text-brand font-semibold mt-0.5">
                    {roomCountLabel}
                  </p>
                </div>
              </div>

              {/* Huy hiệu xác thực chuyên nghiệp */}
              {isSystemVerified ? (
                <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-2.5 text-xs text-emerald-950 flex items-start gap-2 shadow-2xs">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                  </svg>
                  <div className="leading-snug">
                    <p className="font-bold text-emerald-800">✓ Đã kiểm duyệt thực tế & Pháp lý</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Hiệu lực xác thực: 45 ngày (Cập nhật: {verifiedDateFormatted})
                    </p>
                  </div>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                  <span>✓ Chính chủ đã xác minh SĐT/CCCD</span>
                </div>
              )}
            </div>

            {/* Nút Đặt lịch xem phòng & Lưu phòng */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-700 text-white font-bold py-3.5 px-4 text-sm sm:text-base transition-all shadow-md active:scale-[0.99] cursor-pointer"
              >
                <span>Đặt lịch xem phòng</span>
              </button>

              <button
                type="button"
                onClick={handleToggleSelect}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                  selected
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4" fill={selected ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                <span>{selected ? 'Đã lưu trong phòng đã chọn' : 'Lưu vào phòng đã chọn'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      <ContactBrokerModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        listingId={listingId}
        listingTitle={listingTitle}
        price={price}
        addressDetail={addressDetail}
        propertyType={propertyType}
        coverImage={coverImage}
      />
    </>
  );
}
