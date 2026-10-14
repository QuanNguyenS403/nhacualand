'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ContactBrokerModal } from '@/components/ContactBrokerModal';
import { RevealPhoneButton } from './RevealPhoneButton';
import { AuthModal } from '@/components/AuthModal';
import { SITE_CONFIG } from '@/lib/constants';

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

  const activePhone = phone || SITE_CONFIG.hotline;

  return (
    <>
      {/* Sticky Bottom Bar chỉ hiển thị trên màn hình nhỏ hơn 768px (Mobile CTA) */}
      <div className="fixed bottom-0 inset-x-0 z-40 block md:hidden bg-white/95 backdrop-blur-md border-t border-surface-border px-4 py-2.5 shadow-elevated">
        <div className="flex items-center justify-between gap-3">
          {/* Cụm giá tiền bên trái */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-brand truncate">{priceFormatted}</span>
              <span className="text-[11px] text-text-muted font-normal">/tháng</span>
            </div>
            {depositFormatted && (
              <p className="text-[10px] text-text-muted truncate">Cọc: {depositFormatted}</p>
            )}
          </div>

          {/* Cụm nút CTA bên phải */}
          <div className="flex items-center gap-2 shrink-0">
            {phone ? (
              <a
                href={`tel:${activePhone.replace(/\s+/g, '')}`}
                aria-label={`Gọi điện cho người dẫn xem theo số ${activePhone}`}
                className="flex items-center justify-center rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all"
              >
                <span>{activePhone}</span>
              </a>
            ) : (
              <div className="scale-90 origin-right">
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
                className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-700 hover:bg-brand-800 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all"
              >
                <span>Phòng đã cho thuê</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                aria-label="Đặt lịch xem phòng"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-brand hover:bg-brand-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm active:scale-95 transition-all"
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
