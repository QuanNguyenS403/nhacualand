'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import type { MapRoom, CommunityReviewPin } from '@/lib/map-rooms-data';
import { fetchListingBySlug, formatPrice, type Listing } from '@/lib/api';
import { extractListingFurnitureList } from '@/lib/furniture-utils';
import { ContactBrokerModal } from '@/components/ContactBrokerModal';

interface MapRoomDetailDrawerProps {
  room: MapRoom | null;
  clusterRooms?: MapRoom[];
  onSelectClusterRoom?: (room: MapRoom) => void;
  selectedReview?: CommunityReviewPin | null;
  onClose: () => void;
}

export function MapRoomDetailDrawer({
  room,
  clusterRooms,
  onSelectClusterRoom,
  selectedReview,
  onClose,
}: MapRoomDetailDrawerProps) {
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [fullListing, setFullListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(false);
  const [listingNotice, setListingNotice] = useState<string | null>(null);

  // Khi room thay đổi, reset ảnh và tải chi tiết tin đăng thật từ API
  useEffect(() => {
    setActiveImageIdx(0);
    setListingNotice(null);

    if (!room) {
      setFullListing(null);
      return;
    }

    let isSubscribed = true;
    setLoadingListing(true);

    async function loadListingDetails() {
      try {
        const data = await fetchListingBySlug(room!.slug);
        if (!isSubscribed) return;

        // Nếu phòng đã bị cho thuê hoặc bị gỡ, thông báo và tự động đóng
        if (data.status === 'rented' || data.status === 'removed' || data.status === 'rejected') {
          setListingNotice('Phòng này hiện đã cho thuê hoặc tạm ngừng hiển thị');
          setTimeout(() => {
            if (isSubscribed) onClose();
          }, 2500);
          return;
        }

        setFullListing(data);
      } catch {
        if (!isSubscribed) return;
        // Nếu không tải được (có thể phòng vừa gỡ), hiển thị dữ liệu từ pin
        setFullListing(null);
      } finally {
        if (isSubscribed) setLoadingListing(false);
      }
    }

    loadListingDetails();

    return () => {
      isSubscribed = false;
    };
  }, [room?.slug, onClose]);

  // Lắng nghe phím Escape để đóng nhanh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Danh sách hình ảnh thực tế từ listing hoặc pin
  const displayImages = useMemo(() => {
    if (fullListing?.images && fullListing.images.length > 0) {
      return fullListing.images.map((img) => img.imageUrl).filter(Boolean);
    }
    if (room?.images && room.images.length > 0) {
      return room.images;
    }
    return [];
  }, [fullListing, room]);

  // Danh sách tiện nghi thực tế
  const furnitureList = useMemo(() => {
    return extractListingFurnitureList(fullListing || room);
  }, [fullListing, room]);

  if (!room && !selectedReview) return null;

  // ════════════════════════════════════════════════════════════════
  // PANEL HIỂN THỊ ĐÁNH GIÁ CỘNG ĐỒNG (THỰC THỂ ĐÁNH GIÁ ĐỘC LẬP)
  // ════════════════════════════════════════════════════════════════
  if (selectedReview && !room) {
    return (
      <div className="absolute top-0 right-0 z-40 h-full w-full sm:w-[440px] md:w-[480px] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto animate-slide-left p-5 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 font-bold text-xs border border-amber-500/20">
                Đánh giá cộng đồng
              </span>
              <span className="text-xs text-slate-400 font-mono">#{selectedReview.shortId}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Đóng bảng"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 font-black text-xl border border-amber-200">
              ★ {selectedReview.rating.toFixed(1)}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{selectedReview.authorRole}</p>
              <p className="text-xs text-slate-500">
                Đăng ngày: {new Date(selectedReview.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Địa chỉ phản ánh</span>
            <p className="font-medium text-slate-900">{selectedReview.addressRaw || 'Khu vực chưa định danh số nhà'}</p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nội dung đánh giá thực tế</span>
            <p className="text-sm text-slate-800 leading-relaxed bg-white p-4 rounded-xl border border-slate-200">
              "{selectedReview.content}"
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Đóng bảng đánh giá
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // PANEL HIỂN THỊ CHI TIẾT PHÒNG CHO THUÊ (ĐỒNG BỘ 100% VỚI /tin/[slug])
  // ════════════════════════════════════════════════════════════════
  const displayTitle = (fullListing?.title || room!.title).replace(/^\[MẪU\]\s*/i, '').trim();
  const displayPrice = formatPrice(fullListing?.price || room!.price);
  const displayDeposit = fullListing?.depositAmount
    ? formatPrice(fullListing.depositAmount)
    : room!.depositAmount
      ? formatPrice(room!.depositAmount)
      : null;
  const displayArea = fullListing?.areaM2 || room!.areaM2;
  const displayAddress = room!.maskedAddress;
  const targetSlug = fullListing?.slug || room!.slug;
  const isPending = room!.status === 'pending' || Boolean(room!.isOwnerListing) || Boolean(room!.isOwnerPending);

  return (
    <div className="absolute top-0 right-0 z-40 h-full w-full sm:w-[440px] md:w-[480px] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto animate-slide-left flex flex-col">
      {/* Thông báo nếu có */}
      {listingNotice && (
        <div className="p-3 bg-amber-50 text-amber-800 border-b border-amber-200 text-xs font-bold text-center">
          {listingNotice}
        </div>
      )}

      {/* Header Panel */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPending ? (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 font-bold text-xs border border-amber-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>Chờ duyệt</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
              Đang cho thuê
            </span>
          )}
          {loadingListing && (
            <span className="text-[11px] text-slate-400 animate-pulse">Đang đồng bộ...</span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Đóng bảng"
        >
          ✕
        </button>
      </div>

      <div className="p-4 sm:p-5 space-y-5 flex-1">
        {/* Hình ảnh phòng */}
        {displayImages.length > 0 && (
          <div className="space-y-2">
            <div className="relative aspect-16/10 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
              <img
                src={displayImages[activeImageIdx]}
                alt={displayTitle}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/70 text-white text-[11px] font-bold">
                {activeImageIdx + 1} / {displayImages.length}
              </div>
            </div>

            {displayImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {displayImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative w-14 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      idx === activeImageIdx
                        ? 'border-brand ring-2 ring-brand/30'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tiêu đề & Giá thuê */}
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
            {displayTitle}
          </h3>
          <div className="mt-2.5 flex items-baseline gap-3 flex-wrap">
            <span className="text-xl sm:text-2xl font-black text-brand">
              {displayPrice}
            </span>
            {displayDeposit && (
              <span className="text-xs text-slate-500 font-medium">
                Cọc: <strong className="text-slate-700">{displayDeposit}</strong>
              </span>
            )}
            <span className="text-xs text-slate-500 font-medium">
              Diện tích: <strong className="text-slate-700">{displayArea} m²</strong>
            </span>
          </div>
        </div>

        {/* Địa chỉ trên bản đồ */}
        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 text-slate-700 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-800">
            <span>Vị trí trên bản đồ</span>
            <span className="text-[10px] font-mono text-amber-700">
              {room!.lat.toFixed(4)}, {room!.lng.toFixed(4)}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-900 leading-snug">
            {displayAddress}
          </p>
        </div>

        {/* Bộ chọn phòng trong cùng cụm nếu có */}
        {clusterRooms && clusterRooms.length > 1 && (
          <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-100 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              <span>Tại vị trí này có {clusterRooms.length} phòng cho thuê</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {clusterRooms.map((clRoom, cIdx) => (
                <button
                  key={clRoom.id}
                  type="button"
                  onClick={() => onSelectClusterRoom?.(clRoom)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    clRoom.id === room!.id
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white text-purple-800 border border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  Phòng {cIdx + 1} ({formatPrice(clRoom.price)})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tiện nghi & Nội thất có sẵn */}
        {furnitureList.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Tiện nghi & Nội thất có sẵn
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {furnitureList.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/60"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                  <span>{item}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Chi phí điện / nước */}
        {(fullListing?.electricityPricePerKwh || fullListing?.waterPricePerM3 || fullListing?.waterPriceFlat) && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
            <span className="font-bold text-slate-400 uppercase text-[10px]">Định mức chi phí dịch vụ</span>
            <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
              {fullListing.electricityPricePerKwh && (
                <div>
                  Điện: <strong>{fullListing.electricityPricePerKwh.toLocaleString('vi-VN')} đ/kWh</strong>
                </div>
              )}
              {fullListing.waterPricePerM3 ? (
                <div>
                  Nước: <strong>{fullListing.waterPricePerM3.toLocaleString('vi-VN')} đ/m³</strong>
                </div>
              ) : fullListing.waterPriceFlat ? (
                <div>
                  Nước: <strong>{fullListing.waterPriceFlat.toLocaleString('vi-VN')} đ/người</strong>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions: Đặt lịch xem & Xem bài chi tiết */}
      <div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 p-4 flex items-center gap-3">
        <Link
          href={`/tin/${targetSlug}`}
          className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs text-center transition-colors border border-slate-200"
        >
          Xem bài chi tiết →
        </Link>

        {!isPending && (
          <button
            type="button"
            onClick={() => setIsBookingModalOpen(true)}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-brand to-amber-400 text-slate-950 font-bold text-xs text-center transition-all shadow-md hover:brightness-105"
          >
            Đặt lịch xem phòng
          </button>
        )}
      </div>

      {/* Modal đặt lịch hẹn */}
      <ContactBrokerModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        listingTitle={displayTitle}
        listingId={room!.id}
      />
    </div>
  );
}
