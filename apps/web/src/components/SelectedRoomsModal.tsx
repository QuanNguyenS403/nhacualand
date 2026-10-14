'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  SelectedRoomItem,
  getSelectedRooms,
  removeSelectedRoom,
  clearSelectedRooms,
  subscribeSelectedRooms,
} from '@/lib/selected-rooms';

interface SelectedRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenConsultationWithRooms?: (rooms: SelectedRoomItem[]) => void;
}

export function SelectedRoomsModal({
  isOpen,
  onClose,
  onOpenConsultationWithRooms,
}: SelectedRoomsModalProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<SelectedRoomItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRooms(getSelectedRooms());
    }
  }, [isOpen]);

  useEffect(() => {
    return subscribeSelectedRooms(() => {
      setRooms(getSelectedRooms());
    });
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  function handleStartSearch() {
    handleClose();
    router.push('/thue');
  }

  function handleBookAll() {
    if (onOpenConsultationWithRooms) {
      onOpenConsultationWithRooms(rooms);
    }
    handleClose();
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="selected-rooms-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-2xl transition-all">
        {/* Nút đóng X ở góc trên phải */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Đóng"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Tiêu đề & phụ đề */}
        <div className="text-left mb-6 pr-6">
          <h2 id="selected-rooms-modal-title" className="text-xl font-bold text-slate-800 tracking-tight">
            Các phòng đã chọn
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Mẹo: Bạn có thể chọn nhiều phòng cùng lúc để đặt lịch xem
          </p>
        </div>

        {rooms.length === 0 ? (
          /* Trạng thái trống khớp 100% Ảnh 3 */
          <div className="py-10 text-center space-y-6">
            <p className="text-sm font-medium text-rose-600 sm:text-base">
              Bạn chưa có phòng nào trong &ldquo;Giỏ hàng&rdquo;
            </p>
            <div>
              <button
                type="button"
                onClick={handleStartSearch}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
              >
                <span>&rarr;</span>
                <span>Bắt đầu tìm kiếm</span>
              </button>
            </div>
          </div>
        ) : (
          /* Danh sách phòng khi người dùng đã bấm lưu/chọn */
          <div className="space-y-4">
            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1 divide-y divide-slate-100">
              {rooms.map((item) => (
                <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="h-12 w-16 rounded-lg object-cover bg-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-16 rounded-lg bg-brand-50 flex items-center justify-center text-brand font-bold text-xs shrink-0">
                        QNS
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {item.title}
                      </p>
                      {item.formattedPrice && (
                        <p className="text-xs font-bold text-rose-600">
                          {item.formattedPrice}
                        </p>
                      )}
                      {item.address && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSelectedRoom(item.id)}
                    aria-label="Xóa phòng này"
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={clearSelectedRooms}
                className="text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
              >
                Xóa tất cả
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartSearch}
                  className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Tìm thêm phòng
                </button>
                <button
                  type="button"
                  onClick={handleBookAll}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-600 active:scale-[0.98] transition-all"
                >
                  Đặt lịch xem các phòng đã chọn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
