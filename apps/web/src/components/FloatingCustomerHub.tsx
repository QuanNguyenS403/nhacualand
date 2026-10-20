'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { SITE_CONFIG } from '@/lib/constants';
import { getSelectedRooms, subscribeSelectedRooms } from '@/lib/selected-rooms';

const ConsultationModal = dynamic(
  () => import('./ConsultationModal').then((mod) => mod.ConsultationModal),
  { ssr: false },
);

const SelectedRoomsModal = dynamic(
  () => import('./SelectedRoomsModal').then((mod) => mod.SelectedRoomsModal),
  { ssr: false },
);

export function FloatingCustomerHub() {
  const pathname = usePathname();
  const [selectedCount, setSelectedCount] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [selectedRoomsOpen, setSelectedRoomsOpen] = useState(false);
  const [consultationPreload, setConsultationPreload] = useState<{
    reason?: string;
    description?: string;
    selectedRoomIds?: string[];
  }>({});

  useEffect(() => {
    setSelectedCount(getSelectedRooms().length);
    return subscribeSelectedRooms(() => {
      setSelectedCount(getSelectedRooms().length);
    });
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setShowBackToTop(window.scrollY > 320);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Không hiển thị trong khu vực quản trị viên
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/qnsbroker/admin')) {
    return null;
  }

  // Trên trang chi tiết phòng có sticky contact bar ở đáy màn hình di động, nên tăng khoảng cách đệm
  const isListingDetail = pathname?.startsWith('/tin/');
  const bottomOffsetClass = isListingDetail ? 'bottom-20 md:bottom-6' : 'bottom-5 sm:bottom-6';

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const hotlineTel = `tel:${SITE_CONFIG.hotline.replace(/\s+/g, '')}`;
  const zaloUrl = `https://zalo.me/${SITE_CONFIG.zalo.replace(/\s+/g, '')}`;

  return (
    <>
      <aside
        aria-label="Cụm hỗ trợ và tiện ích khách hàng"
        className={`fixed right-3.5 sm:right-5 ${bottomOffsetClass} z-40 flex flex-col items-end gap-2.5 pointer-events-auto select-none`}
      >
        {/* Nút Các phòng đã chọn (hiển thị khi có phòng được chọn) */}
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={() => setSelectedRoomsOpen(true)}
            className="group relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-rose-600 text-white shadow-xl hover:bg-rose-700 hover:scale-110 active:scale-95 transition-all cursor-pointer ring-2 ring-white/80"
            title={`Các phòng đã chọn (${selectedCount})`}
            aria-label={`Xem ${selectedCount} phòng đã chọn`}
          >
            <svg className="h-5 w-5 sm:h-5.5 sm:w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[11px] font-black text-rose-600 shadow-md ring-2 ring-rose-600">
              {selectedCount > 9 ? '9+' : selectedCount}
            </span>
            <span className="pointer-events-none absolute right-full mr-2.5 hidden rounded-lg bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white shadow-md sm:group-hover:inline-block whitespace-nowrap">
              Phòng đã chọn ({selectedCount})
            </span>
          </button>
        )}

        {/* Nút Cần tư vấn (Modal) */}
        <button
          type="button"
          onClick={() => {
            setConsultationPreload({ reason: 'Khác' });
            setConsultationOpen(true);
          }}
          className="group relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-brand text-white shadow-xl hover:bg-brand-700 hover:scale-110 active:scale-95 transition-all cursor-pointer ring-2 ring-white/80"
          title="Yêu cầu tư vấn tìm phòng miễn phí"
          aria-label="Yêu cầu tư vấn tìm phòng miễn phí"
        >
          <svg className="h-5 w-5 sm:h-5.5 sm:w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75v3.75a3 3 0 01-3 3h-1.5a1.5 1.5 0 01-1.5-1.5v-3.75a1.5 1.5 0 011.5-1.5h3v-.75a8.25 8.25 0 10-16.5 0v.75h3a1.5 1.5 0 011.5 1.5V17.25a1.5 1.5 0 01-1.5 1.5h-1.5a3 3 0 01-3-3V12z" />
          </svg>
          <span className="pointer-events-none absolute right-full mr-2.5 hidden rounded-lg bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white shadow-md sm:group-hover:inline-block whitespace-nowrap">
            Cần tư vấn tìm phòng
          </span>
        </button>

        {/* Nút Chat Zalo */}
        <a
          href={zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#0068FF] text-white shadow-xl hover:brightness-110 hover:scale-110 active:scale-95 transition-all ring-2 ring-white/80"
          title={`Chat Zalo: ${SITE_CONFIG.zalo}`}
          aria-label={`Chat Zalo với số ${SITE_CONFIG.zalo}`}
        >
          <span className="text-[13px] font-black tracking-tight leading-none">Zalo</span>
          <span className="pointer-events-none absolute right-full mr-2.5 hidden rounded-lg bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white shadow-md sm:group-hover:inline-block whitespace-nowrap">
            Chat Zalo: {SITE_CONFIG.zalo}
          </span>
        </a>

        {/* Nút Hotline 24/7 */}
        <a
          href={hotlineTel}
          className="group relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-700 hover:scale-110 active:scale-95 transition-all ring-2 ring-white/80"
          title={`Hotline 24/7: ${SITE_CONFIG.hotline}`}
          aria-label={`Gọi Hotline 24/7 theo số ${SITE_CONFIG.hotline}`}
        >
          <svg className="h-5 w-5 sm:h-5.5 sm:w-5.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          <span className="pointer-events-none absolute right-full mr-2.5 hidden rounded-lg bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white shadow-md sm:group-hover:inline-block whitespace-nowrap">
            Hotline: {SITE_CONFIG.hotline} (24/7)
          </span>
        </a>

        {/* Nút Cuộn lên đầu trang */}
        {showBackToTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="group relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-slate-800 text-white shadow-lg hover:bg-slate-900 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-1 ring-white/30"
            title="Cuộn lên đầu trang"
            aria-label="Cuộn lên đầu trang"
          >
            <svg className="h-4 w-4 sm:h-4.5 sm:w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
            <span className="pointer-events-none absolute right-full mr-2.5 hidden rounded-lg bg-slate-900/90 px-2 py-1 text-[11px] font-semibold text-white shadow-md sm:group-hover:inline-block whitespace-nowrap">
              Về đầu trang
            </span>
          </button>
        )}
      </aside>

      {/* Modals tiện ích */}
      {consultationOpen && (
        <ConsultationModal
          isOpen
          onClose={() => setConsultationOpen(false)}
          initialReason={consultationPreload.reason}
          initialDescription={consultationPreload.description}
          selectedRoomIds={consultationPreload.selectedRoomIds}
        />
      )}

      {selectedRoomsOpen && (
        <SelectedRoomsModal
          isOpen
          onClose={() => setSelectedRoomsOpen(false)}
          onOpenConsultationWithRooms={(rooms) => {
            setConsultationPreload({
              reason: 'Xem phòng trực tiếp',
              description: `Tôi muốn đặt lịch xem các phòng đã chọn:\n${rooms.map((r) => `- ${r.title} (${r.formattedPrice || ''})`).join('\n')}`,
              selectedRoomIds: rooms.map((r) => String(r.id)),
            });
            setConsultationOpen(true);
          }}
        />
      )}
    </>
  );
}
