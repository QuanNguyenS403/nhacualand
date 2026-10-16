'use client';

import { useState } from 'react';
import { AuthModal } from '@/components/AuthModal';
import { ContactBrokerModal } from '@/components/ContactBrokerModal';
import { formatExactPrice } from '@/lib/api';
import { LandlordAvatar } from '@/components/QnsLogo';

import Link from 'next/link';

interface OwnerContactBoxProps {
  listingId: string;
  listingTitle: string;
  price?: string | number | bigint;
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
  return '***, Xã Thanh Liệt, Thành phố Hà Nội';
}

export function OwnerContactBox({
  listingId,
  listingTitle,
  price,
  addressDetail,
  locationName,
  createdAt,
  refreshedAt,
  ownerName,
  ownerAvatarUrl,
  ownerPostCount = 507,
  isRented = false,
}: OwnerContactBoxProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const formattedPriceText = price ? `${formatExactPrice(price)}/tháng` : 'Liên hệ';
  const maskedAddress = formatMaskedAddress(addressDetail, locationName);
  const dateTimeFormatted = formatListingDateTime(refreshedAt || createdAt);
  const rawOwner = (ownerName || 'Chủ nhà').replace(/\s*\(\d+\)\s*/g, '').trim();
  const lowerOwner = rawOwner.toLowerCase();
  const ownerDisplayName =
    !rawOwner ||
    lowerOwner.includes('môi giới') ||
    lowerOwner.includes('nhacualand') ||
    lowerOwner.includes('qns broker') ||
    lowerOwner.includes('dẫn xem') ||
    lowerOwner.includes('đức quân')
      ? 'Chủ nhà'
      : rawOwner;

  function handleAuthSuccess() {
    setIsAuthModalOpen(false);
  }

  return (
    <>
      <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 shadow-card space-y-5">
        {/* Khối Giá phòng & Số tiền */}
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-700">Giá phòng</p>
          <div className="flex flex-wrap items-baseline gap-1 text-brand">
            <span className="text-3xl sm:text-4xl font-black tracking-normal">
              {price ? formatExactPrice(price) : 'Liên hệ'}
            </span>
            {price ? (
              <span className="text-base sm:text-lg font-bold text-brand/90">/tháng</span>
            ) : null}
          </div>
        </div>

        {/* Danh sách thông tin nhanh: Vị trí, Thời gian */}
        <div className="space-y-2.5 text-sm text-slate-600">
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
            <span className="min-w-0 flex-1 font-medium text-slate-500">{dateTimeFormatted}</span>
          </div>
        </div>

        {/* Khối Đặt lịch xem phòng với Chủ Nhà hoặc Thông báo đã cho thuê */}
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
              <h3 className="text-base font-bold text-slate-900">Đặt lịch xem phòng</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Đặt lịch xem phòng với chủ nhà, chủ nhà sẽ liên hệ lại với bạn
              </p>
            </div>

            {/* Thông tin Chủ Nhà */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col items-center shrink-0">
                  <LandlordAvatar
                    avatarUrl={ownerAvatarUrl}
                    name={ownerDisplayName}
                    size={44}
                  />
                  <span className="mt-1 rounded border border-brand/50 bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold text-brand leading-none shadow-2xs">
                    Chủ nhà
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm sm:text-base truncate">
                    {ownerDisplayName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {ownerPostCount} bài đăng
                  </p>
                </div>
              </div>

              <div className="relative shrink-0">
                <span className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-xs font-bold text-white shadow-2xs">
                  <svg className="w-3.5 h-3.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                  <span>Uy tín</span>
                </span>
                <div className="absolute -bottom-1 right-0 h-0 w-0 border-l-[5px] border-l-transparent border-t-[5px] border-t-brand-900 border-r-0" />
              </div>
            </div>

            {/* Nút hành động Đặt lịch xem phòng */}
            <button
              type="button"
              onClick={() => setIsContactModalOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-700 text-white font-bold py-3 px-4 text-sm sm:text-base transition-all shadow-sm active:scale-[0.99]"
            >
              <span>Đặt lịch xem phòng</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal đăng ký / đăng nhập */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Modal đặt lịch xem phòng */}
      <ContactBrokerModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        listingId={listingId}
        listingTitle={listingTitle}
      />
    </>
  );
}
