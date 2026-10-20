'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContactBrokerModal } from '@/components/ContactBrokerModal';
import { RevealPhoneButton } from './RevealPhoneButton';
import { AuthModal } from '@/components/AuthModal';
import { SITE_CONFIG } from '@/lib/constants';
import {
  isRoomSelected,
  addSelectedRoom,
  removeSelectedRoom,
  subscribeSelectedRooms,
} from '@/lib/selected-rooms';

interface MobileStickyContactBarProps {
  listingId: string;
  listingTitle: string;
  priceFormatted: string;
  depositFormatted?: string;
  isRented?: boolean;
}

export function MobileStickyContactBar({
  listingId,
  listingTitle,
  priceFormatted,
  depositFormatted,
  isRented = false,
}: MobileStickyContactBarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    setSelected(isRoomSelected(listingId));
    return subscribeSelectedRooms(() => {
      setSelected(isRoomSelected(listingId));
    });
  }, [listingId]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 420);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function handleToggleSelect() {
    if (selected) {
      removeSelectedRoom(listingId);
      setSelected(false);
    } else {
      addSelectedRoom({
        id: String(listingId),
        title: listingTitle,
        formattedPrice: priceFormatted,
      });
      setSelected(true);
    }
  }

  const activePhone = phone || SITE_CONFIG.hotline;

  return (
    <>
      {/* Sticky Bottom Bar: luôn hiện trên mobile, và tự động hiện mượt mà trên máy tính khi cuộn trang */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-surface-border px-4 sm:px-6 md:px-8 py-2.5 shadow-elevated transition-transform duration-300 ${
          scrolled ? 'translate-y-0' : 'translate-y-0 md:translate-y-full'
        }`}
      >
        <div className="container-max flex items-center justify-between gap-3">
          {/* Cụm thông tin phòng bên trái */}
          <div className="min-w-0 flex-1 flex items-center gap-3">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-bold text-brand truncate">{priceFormatted}</span>
                <span className="text-[11px] sm:text-xs text-text-muted font-normal">/tháng</span>
              </div>
              {depositFormatted && (
                <p className="text-[10px] sm:text-xs text-text-muted truncate">Cọc: {depositFormatted}</p>
              )}
            </div>
            <p className="hidden lg:block text-xs text-slate-500 truncate max-w-sm border-l border-slate-200 pl-3">
              {listingTitle}
            </p>
          </div>

          {/* Cụm nút CTA bên phải: Lưu phòng, Hiện số điện thoại, Đặt lịch */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Nút lưu phòng */}
            <button
              type="button"
              onClick={handleToggleSelect}
              className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                selected
                  ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-rose-500 hover:bg-slate-50'
              }`}
              title={selected ? 'Bỏ chọn phòng này' : 'Lưu vào phòng đã chọn'}
              aria-label={selected ? 'Bỏ chọn phòng này' : 'Lưu vào phòng đã chọn'}
            >
              <svg className="h-4.5 w-4.5" fill={selected ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>

            {phone ? (
              <a
                href={`tel:${activePhone.replace(/\s+/g, '')}`}
                aria-label={`Gọi điện cho người dẫn xem theo số ${activePhone}`}
                className="flex items-center justify-center rounded-xl bg-slate-900 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all"
              >
                <span>{activePhone}</span>
              </a>
            ) : (
              <div className="scale-90 sm:scale-100 origin-right">
                <RevealPhoneButton
                  listingId={listingId}
                  onPhoneRevealed={setPhone}
                  onRequireAuth={() => setIsAuthModalOpen(true)}
                />
              </div>
            )}

            {isRented ? (
              <Link
                href="/thue"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-700 hover:bg-brand-800 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition-all"
              >
                <span>Phòng đã cho thuê</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-label="Đặt lịch xem phòng"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-brand hover:bg-brand-700 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <span>Đặt lịch xem phòng</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal xác thực nếu cần đăng nhập khi xem số */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => setIsAuthModalOpen(false)}
      />

      {/* Modal đặt lịch xem phòng */}
      <ContactBrokerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        listingId={listingId}
        listingTitle={listingTitle}
      />
    </>
  );
}
