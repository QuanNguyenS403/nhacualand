'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Listing } from '@/lib/api';
import { formatPrice, formatExactPrice } from '@/lib/api';
import { PropertyGallery } from './PropertyGallery';
import { ReportListingModal } from '@/components/ReportListingModal';
import { OwnerContactBox } from './OwnerContactBox';
import { LandlordAvatar } from '@/components/QnsLogo';
import { MobileStickyContactBar } from './MobileStickyContactBar';
import { getNearbyUniversities, getGoogleMapsEmbedUrl } from '@/lib/vietnam-universities';
import { sanitizeListingImages } from '@/lib/image-compressor';
import { extractListingFurnitureList } from '@/lib/furniture-utils';

interface Props {
  initialListing: Listing | null;
  slug: string;
  similarListings: Listing[];
}

function formatJoinedDuration(createdAt: string): string {
  const diffDays = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
  if (diffDays < 30) return `${diffDays} ngày`;
  const months = Math.floor(diffDays / 30);
  if (months < 12) return `${months} tháng`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return remMonths > 0 ? `${years} năm ${remMonths} tháng` : `${years} năm`;
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs sm:text-sm text-text-muted font-medium">{label}</p>
      <p className={`text-sm sm:text-base font-bold text-text-primary ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function SpecItem({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value?: string | number | null;
  highlight?: boolean;
  mono?: boolean;
}) {
  if (value == null || value === '') return null;
  return (
    <div className="flex flex-col space-y-1 p-3 sm:p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-brand/30 transition-colors">
      <span className="text-xs text-text-muted font-medium">{label}</span>
      <span
        className={`text-sm sm:text-base font-bold truncate ${
          highlight ? 'text-brand' : 'text-text-primary'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value}
      </span>
    </div>
  );
}

function getYouTubeEmbedUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
  );
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0` : null;
}

export function ListingDetailClientView({ initialListing, slug, similarListings }: Props) {
  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [hydrated, setHydrated] = useState(false);
  const [floorplanZoom, setFloorplanZoom] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (initialListing) {
      setListing({
        ...initialListing,
        images: sanitizeListingImages(initialListing.images),
      });
    }
  }, [initialListing]);

  // Nếu không tìm thấy tin cả trên máy chủ lẫn trình duyệt
  if (!listing && hydrated) {
    return (
      <div className="min-h-[70vh] bg-surface-muted flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full rounded-3xl border border-surface-border bg-white p-8 sm:p-10 text-center shadow-card space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
              Không tìm thấy thông tin phòng cho thuê
            </h1>
            <p className="mt-2 text-sm text-text-muted leading-relaxed">
              Phòng cho thuê này có thể đã hết hạn hiển thị, được chủ nhà gỡ xuống hoặc đường dẫn chưa chính xác
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/thue"
              className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-600 transition-colors"
            >
              Xem danh sách phòng cho thuê
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-surface-border bg-white px-5 py-2.5 text-sm font-semibold text-text-secondary hover:bg-surface-muted transition-colors"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Đang render hoặc có listing
  const currentListing = listing || initialListing;
  if (!currentListing) {
    return (
      <div className="min-h-screen bg-surface-muted flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  const rawListingTitle = currentListing.title ?? 'Phòng cho thuê';
  const displayTitle = rawListingTitle.replace(/^\[MẪU\]\s*/i, '').replace(/\[MẪU\]/gi, '').trim();

  const rawOwnerName = (currentListing.owner?.fullName ?? 'Chủ nhà').replace(/\s*\(\d+\)\s*/g, '').trim();
  const lowerOwner = rawOwnerName.toLowerCase();
  const cleanOwnerName =
    !rawOwnerName ||
    lowerOwner.includes('môi giới') ||
    lowerOwner.includes('nhacualand') ||
    lowerOwner.includes('qns broker') ||
    lowerOwner.includes('dẫn xem') ||
    lowerOwner.includes('đức quân')
      ? 'Chủ nhà'
      : rawOwnerName;

  // Đảm bảo ảnh luôn hợp lệ
  const sanitizedImages = sanitizeListingImages(currentListing.images);

  // Xử lý danh sách trường Đại học lân cận
  const displayUnis = (() => {
    if (currentListing.nearbyUniversities && currentListing.nearbyUniversities.length > 0) {
      return currentListing.nearbyUniversities.map((item) => {
        const distKm = item.distanceMeters != null ? Number((item.distanceMeters / 1000).toFixed(1)) : 1;
        const distMeters = item.distanceMeters ?? Math.round(distKm * 1000);
        const timeMins = item.travelTimeMinutes ?? Math.max(1, Math.round((distKm / 22) * 60));
        return {
          name: item.university.name,
          abbreviation: item.university.abbreviation,
          address: item.university.address,
          distanceKm: distKm,
          distanceMeters: distMeters,
          travelTimeMinutes: timeMins,
        };
      });
    }

    if (currentListing.lat != null && currentListing.lng != null) {
      const computed = getNearbyUniversities(currentListing.lat, currentListing.lng, 10, 4);
      return computed.map((u) => ({
        name: u.name,
        abbreviation: u.abbreviation,
        address: u.address,
        distanceKm: u.distanceKm,
        distanceMeters: u.distanceMeters,
        travelTimeMinutes: u.travelTimeMinutes,
      }));
    }

    return [];
  })();

  const segAttrs = (currentListing.segmentAttributes as any) || {};

  const allowsPets = Boolean(
    segAttrs.petsAllowed ||
      currentListing.amenities?.thuCung ||
      currentListing.amenities?.pet ||
      currentListing.amenities?.petsAllowed ||
      currentListing.amenities?.choNuoiThuCung ||
      currentListing.description?.toLowerCase().includes('thú cưng') ||
      currentListing.description?.toLowerCase().includes('cho nuôi'),
  );

  const allowsEv = Boolean(
    segAttrs.hasEvCharging ||
      currentListing.amenities?.xeDien ||
      currentListing.amenities?.electricVehicle ||
      currentListing.amenities?.sacXeDien ||
      currentListing.description?.toLowerCase().includes('xe điện') ||
      currentListing.description?.toLowerCase().includes('sạc xe'),
  );

  const furnitureList = extractListingFurnitureList(currentListing);

  const pType = currentListing.propertyType || 'phong_tro';
  const isApartment = pType === 'can_ho';
  const isCommercial = pType === 'mat_bang';
  const isRoomOrMini = pType === 'phong_tro' || pType === 'ccmn' || (!isApartment && !isCommercial);

  const youtubeEmbed = getYouTubeEmbedUrl(currentListing.videoUrl);

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="container-max py-8 md:py-12 lg:py-14">
        {/* Breadcrumb điều hướng + nút Về danh sách */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-text-muted">
          <nav className="flex flex-wrap items-center gap-2">
            <Link href="/" className="hover:text-brand transition-colors">Trang chủ</Link>
            <span>›</span>
            <Link href="/thue" className="hover:text-brand transition-colors">Cho thuê phòng</Link>
            <span>›</span>
            <Link
              href={`/thue?locationSlug=${currentListing.location?.slug ?? ''}`}
              className="hover:text-brand transition-colors"
            >
              {currentListing.location?.name ?? 'Khu vực'}
            </Link>
            <span>›</span>
            <span className="text-text-secondary font-medium line-clamp-1 max-w-xs">{displayTitle}</span>
          </nav>

          <Link
            href="/thue"
            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
          >
            ‹ Về danh sách
          </Link>
        </div>

        {/* Banner cảnh báo nếu phòng đã cho thuê */}
        {(currentListing.status || '').toLowerCase() === 'rented' && (
          <div className="mb-5 rounded-2xl border border-brand-300 bg-brand-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white font-bold text-base shadow-xs">
                ✓
              </span>
              <div>
                <p className="font-bold text-brand-950 text-sm sm:text-base">Phòng này đã được cho thuê thành công</p>
                <p className="text-xs sm:text-sm text-brand-800 mt-0.5">Hiện tại phòng không còn trống nên không thể tiếp nhận đặt lịch đi xem</p>
              </div>
            </div>
            <Link
              href="/thue"
              className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-brand-800 transition-colors shrink-0 shadow-xs"
            >
              Tìm phòng đang còn trống khác →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:gap-8 lg:grid-cols-3">
          {/* Cột trái — nội dung chính (2/3 chiều rộng) */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">
            {/* Gallery ảnh */}
            <PropertyGallery images={sanitizedImages} title={displayTitle} />

            {/* Tiêu đề */}
            <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 md:p-7 shadow-card">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-primary leading-snug">{displayTitle}</h1>
                {(currentListing.status || '').toLowerCase() === 'rented' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-900 border border-brand-200">
                    Đã cho thuê
                  </span>
                )}
              </div>
            </div>

            {/* BẢNG THÔNG SỐ CHUYÊN SÂU & PHÁP LÝ (DYNAMIC SPEC GRID) */}
            <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 md:p-7 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-text-primary text-lg sm:text-xl flex items-center gap-2">
                  <svg className="w-5 h-5 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>
                    {isApartment
                      ? 'Thông số Kỹ thuật Căn hộ & Tòa nhà'
                      : isCommercial
                        ? 'Thông số Mặt bằng Kinh doanh & Pháp lý'
                        : 'Thông số Phòng & Tiêu chuẩn Bàn giao'}
                  </span>
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {isApartment ? 'Chung cư' : isCommercial ? 'Mặt bằng KD' : 'Phòng trọ / CCMN'}
                </span>
              </div>

              {/* SPEC GRID CHO CHUNG CƯ */}
              {isApartment && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <SpecItem label="Dự án / Khu đô thị" value={segAttrs.projectName || (currentListing.location?.name ? `Tại ${currentListing.location.name}` : null)} highlight />
                  <SpecItem label="Tòa / Tầng" value={segAttrs.buildingBlock ? `${segAttrs.buildingBlock}${segAttrs.floorNumber ? ` - Tầng ${segAttrs.floorNumber}` : ''}` : segAttrs.floorNumber ? `Tầng ${segAttrs.floorNumber}` : null} />
                  <SpecItem label="Diện tích thông thủy" value={segAttrs.netAreaM2 ? `${segAttrs.netAreaM2} m²` : currentListing.areaM2 ? `${currentListing.areaM2} m²` : null} />
                  <SpecItem label="Thiết kế" value={segAttrs.bedrooms ? `${segAttrs.bedrooms} PN${segAttrs.bathrooms ? ` • ${segAttrs.bathrooms} WC` : ''}` : null} highlight />
                  <SpecItem label="Tình trạng nội thất" value={segAttrs.furnishing === 'full' ? 'Nội thất đầy đủ (Full)' : segAttrs.furnishing === 'co_ban' ? 'Nội thất cơ bản' : segAttrs.furnishing === 'trong' ? 'Nhà trống' : 'Đầy đủ tiện nghi'} />
                  <SpecItem label="Hướng ban công" value={segAttrs.balconyDirection ? `Hướng ${segAttrs.balconyDirection}` : null} />
                  <SpecItem label="Phí quản lý tòa nhà" value={segAttrs.managementFeeIncluded ? 'Đã bao gồm trong giá thuê' : segAttrs.managementFeePerMonth ? `${segAttrs.managementFeePerMonth.toLocaleString('vi-VN')} đ/tháng` : 'Theo biểu phí BQL'} />
                  <SpecItem label="Chỗ đỗ ô tô" value={segAttrs.hasCarParking ? 'Có slot đỗ ô tô hầm' : 'Chỉ đỗ xe máy'} />
                  <SpecItem label="Người nước ngoài" value={segAttrs.foreignerEligible ? 'Hỗ trợ đăng ký tạm trú khách nước ngoài' : null} />
                </div>
              )}

              {/* SPEC GRID CHO MẶT BẰNG KINH DOANH */}
              {isCommercial && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <SpecItem label="Mặt tiền x Chiều sâu" value={segAttrs.frontageM ? `${segAttrs.frontageM}m${segAttrs.depthM ? ` x ${segAttrs.depthM}m` : ''}` : null} highlight />
                  <SpecItem label="Tổng diện tích sàn" value={segAttrs.totalUsableAreaM2 ? `${segAttrs.totalUsableAreaM2} m²` : currentListing.areaM2 ? `${currentListing.areaM2} m²` : null} highlight />
                  <SpecItem label="Số tầng cho thuê" value={segAttrs.floorsCount ? `${segAttrs.floorsCount} tầng` : '1 tầng trệt'} />
                  <SpecItem label="Lộ giới đường & Vỉa hè" value={segAttrs.roadWidthM ? `Đường ${segAttrs.roadWidthM}m${segAttrs.sidewalkWidthM ? ` • Vỉa hè ${segAttrs.sidewalkWidthM}m` : ''}` : segAttrs.wideSidewalk ? 'Vỉa hè rộng rãi' : null} />
                  <SpecItem label="Nguồn điện" value={segAttrs.hasThreePhasePower ? 'Có sẵn điện 3 pha sản xuất' : 'Điện sinh hoạt 1 pha'} />
                  <SpecItem label="Tiêu chuẩn PCCC" value={segAttrs.pcccCertified ? 'Hệ thống PCCC nghiệm thu chuẩn' : 'Trang bị bình chữa cháy'} highlight />
                  <SpecItem label="Hóa đơn VAT" value={segAttrs.vatInvoiceAvailable ? 'Hỗ trợ xuất hóa đơn VAT đầy đủ' : 'Thỏa thuận trực tiếp'} />
                  <SpecItem label="Lối đi" value={segAttrs.privateEntrance ? 'Lối đi riêng biệt 100%' : 'Chung cổng chính'} />
                  <SpecItem label="Miễn phí thi công (Rent-free)" value={segAttrs.rentFreeDays ? `${segAttrs.rentFreeDays} ngày setup` : 'Thương lượng theo hợp đồng'} />
                  <SpecItem label="Kỳ thanh toán & Cọc" value={segAttrs.paymentCycleMonths ? `Đóng ${segAttrs.paymentCycleMonths} tháng/lần • Cọc ${segAttrs.depositMonths || 2} tháng` : null} />
                  {segAttrs.suitableBusinessTypes && (
                    <div className="col-span-2 sm:col-span-3 p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                      <span className="text-text-muted font-medium">Ngành nghề phù hợp: </span>
                      <span className="font-semibold text-slate-900">{segAttrs.suitableBusinessTypes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* SPEC GRID CHO PHÒNG TRỌ / CCMN */}
              {isRoomOrMini && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SpecItem label="Diện tích phòng" value={currentListing.areaM2 ? `${currentListing.areaM2} m²` : null} highlight />
                  <SpecItem label="Gác lửng" value={segAttrs.hasMezzanine || segAttrs.has_mezzanine ? 'Có gác lửng cao ráo' : 'Không gác'} />
                  <SpecItem label="Thang máy" value={segAttrs.hasElevator || segAttrs.has_elevator || currentListing.amenities?.thangMay ? 'Có thang máy' : 'Thang bộ'} />
                  <SpecItem label="Cửa sổ / Ban công" value={segAttrs.hasBalconyWindow || segAttrs.has_balcony_window || currentListing.amenities?.banCong ? 'Có ban công / Cửa sổ thoáng' : null} />
                  <SpecItem label="Giờ giấc" value={segAttrs.freeTime || segAttrs.gioTuDo || currentListing.amenities?.gioTuDo ? 'Tự do 24/7 không chung chủ' : 'Giờ giấc linh hoạt'} />
                  <SpecItem label="Khóa cổng" value={segAttrs.smartLock || segAttrs.fingerprint_lock || currentListing.amenities?.khoaVanTay ? 'Khóa vân tay / Thẻ từ an toàn' : 'Khóa số an ninh'} />
                  <SpecItem label="Sạc xe điện" value={allowsEv ? 'Hỗ trợ sạc xe điện' : null} />
                  <SpecItem label="Nuôi thú cưng" value={allowsPets ? 'Cho phép nuôi thú cưng' : null} />
                </div>
              )}
            </div>

            {/* VIDEO THỰC TẾ (NẾU CÓ) */}
            {currentListing.videoUrl && (
              <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 md:p-7 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-text-primary text-lg sm:text-xl flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      ▶
                    </span>
                    <span>Video thực tế không gian</span>
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                    Video quay thực tế 100%
                  </span>
                </div>
                <div className="aspect-video w-full overflow-hidden rounded-xl border border-surface-border bg-black shadow-md">
                  {youtubeEmbed ? (
                    <iframe
                      src={youtubeEmbed}
                      title={`Video thực tế ${displayTitle}`}
                      className="h-full w-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                      src={currentListing.videoUrl}
                    >
                      Trình duyệt không hỗ trợ phát video
                    </video>
                  )}
                </div>
              </div>
            )}

            {/* BẢN VẼ MẶT BẰNG & SƠ ĐỒ BỐ TRÍ (NẾU CÓ) */}
            {currentListing.floorplanImageUrl && (
              <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 md:p-7 shadow-card space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-text-primary text-lg sm:text-xl flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    <span>Sơ đồ mặt bằng & Bản vẽ bố trí (Floorplan)</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setFloorplanZoom(!floorplanZoom)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    {floorplanZoom ? 'Thu nhỏ' : 'Phóng to'}
                  </button>
                </div>
                <div
                  className={`w-full overflow-hidden rounded-xl border border-surface-border bg-slate-50 flex items-center justify-center transition-all ${
                    floorplanZoom ? 'max-h-[850px] p-2' : 'max-h-[480px] p-4'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentListing.floorplanImageUrl}
                    alt={`Bản vẽ sơ đồ bố trí ${displayTitle}`}
                    className="max-h-[600px] w-auto object-contain cursor-zoom-in rounded-lg shadow-2xs"
                    onClick={() => setFloorplanZoom(!floorplanZoom)}
                  />
                </div>
              </div>
            )}

            {/* Khối Thông tin dịch vụ */}
            <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 md:p-7 shadow-card">
              <h2 className="mb-4 sm:mb-5 font-bold text-text-primary text-lg sm:text-xl">Thông tin dịch vụ & Chi phí</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
                <InfoRow
                  label="Tình trạng phòng"
                  value={
                    (currentListing.status || '').toLowerCase() === 'rented'
                      ? 'Đã cho thuê'
                      : currentListing.status === 'expired'
                        ? 'Hết phòng'
                        : 'Còn phòng'
                  }
                />
                <InfoRow
                  label="Cọc"
                  value={
                    currentListing.depositAmount
                      ? formatExactPrice(currentListing.depositAmount)
                      : (currentListing.amenities as any)?.depositMethod ||
                        (currentListing.amenities as any)?.depositNote ||
                        (currentListing as any).depositMethod ||
                        (currentListing as any).depositNote ||
                        '1 tháng tiền thuê'
                  }
                />
                <InfoRow
                  label="Điện"
                  value={
                    currentListing.utilitiesIncluded
                      ? 'Đã bao gồm trong giá thuê'
                      : currentListing.electricityPricePerKwh
                        ? `${currentListing.electricityPricePerKwh.toLocaleString('vi-VN')} đ/kWh`
                        : '4.000 đ/kWh'
                  }
                />
                <InfoRow
                  label="Nước"
                  value={
                    currentListing.utilitiesIncluded
                      ? 'Đã bao gồm trong giá thuê'
                      : currentListing.waterPriceFlat
                        ? `${currentListing.waterPriceFlat.toLocaleString('vi-VN')} đ/người/tháng`
                        : currentListing.waterPricePerM3
                          ? `${currentListing.waterPricePerM3.toLocaleString('vi-VN')} đ/m³`
                          : '30.000 đ/m³'
                  }
                />
                {allowsPets && <InfoRow label="Nuôi thú cưng" value="Cho phép nuôi thú cưng" />}
                {allowsEv && <InfoRow label="Xe điện" value="Hỗ trợ sạc / để xe điện" />}
                <InfoRow label="Mã tin" value={`#${currentListing.id}`} mono />
                <InfoRow
                  label="Thời hạn hợp đồng"
                  value={currentListing.minLeaseMonths ? `Tối thiểu ${currentListing.minLeaseMonths} tháng` : 'Linh hoạt'}
                />
              </div>
            </div>

            {/* Khối Nội Thất */}
            <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 md:p-7 shadow-card space-y-3.5 sm:space-y-4">
              <h2 className="font-bold text-text-primary text-lg sm:text-xl">Nội Thất & Tiện Nghi</h2>
              <div className="flex flex-wrap gap-2.5 sm:gap-3">
                {furnitureList.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <span className="h-2 w-2 rounded-full bg-brand shrink-0" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Khối Giới thiệu */}
            <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 md:p-7 shadow-card space-y-4 sm:space-y-5">
              <h2 className="font-bold text-text-primary text-lg sm:text-xl">Giới thiệu</h2>
              <div className="whitespace-pre-line text-base sm:text-lg leading-relaxed text-text-secondary">
                {currentListing.description || 'Chưa có thông tin mô tả chi tiết cho phòng này'}
              </div>

              {/* Báo vi phạm */}
              <ReportListingModal listingId={currentListing.id} />

              {/* Tóm tắt người đăng bên dưới mô tả */}
              <div className="flex items-center gap-4 pt-3.5 border-t border-surface-border">
                <LandlordAvatar
                  avatarUrl={currentListing.owner?.avatarUrl}
                  name={cleanOwnerName}
                  size={48}
                />
                <div>
                  <p className="text-base font-bold text-text-primary">{cleanOwnerName}</p>
                  <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                    Đã tham gia: {currentListing.owner?.createdAt ? formatJoinedDuration(currentListing.owner.createdAt) : 'Gần đây'}
                  </p>
                </div>
              </div>
            </div>

            {/* Khối Bản đồ Google Maps & Tiện ích vị trí */}
            <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 md:p-7 shadow-card space-y-4 sm:space-y-5">
              <div>
                <h2 className="font-bold text-text-primary text-lg sm:text-xl">
                  <span>Vị trí trên Google Maps & Tiện ích xung quanh</span>
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  {(() => {
                    const addr = currentListing.addressDetail?.trim() || '';
                    const loc = currentListing.location?.name?.trim() || '';
                    if (!addr && !loc) return 'Khu vực đang cập nhật địa chỉ';
                    if (!addr) return loc;
                    if (!loc) return addr;
                    return addr.toLowerCase().includes(loc.toLowerCase()) ? addr : `${addr}, ${loc}`;
                  })()}
                </p>
              </div>

              <div className="relative h-[380px] sm:h-[460px] md:h-[520px] w-full overflow-hidden rounded-2xl border border-surface-border bg-slate-100 shadow-md">
                <iframe
                  title={`Bản đồ vị trí ${currentListing.addressDetail ?? currentListing.location?.name ?? 'Khu vực'}`}
                  src={getGoogleMapsEmbedUrl(
                    currentListing.lat != null && currentListing.lng != null
                      ? { lat: currentListing.lat, lng: currentListing.lng }
                      : { address: currentListing.addressDetail ?? currentListing.location?.name ?? 'Hà Nội' },
                  )}
                  className="h-full w-full border-0"
                  loading="lazy"
                  allowFullScreen
                />
              </div>

              {/* Danh sách trường Đại học lân cận */}
              {displayUnis.length > 0 && (
                <div className="pt-3.5 border-t border-surface-border space-y-3">
                  <h3 className="text-sm sm:text-base font-bold text-text-primary">
                    <span>Khoảng cách tới các trường Đại học lân cận</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {displayUnis.map((uni, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 rounded-xl border border-surface-border bg-slate-50/70 p-3 hover:border-brand/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-text-primary truncate">
                            {uni.abbreviation ? `[${uni.abbreviation}] ` : ''}
                            {uni.name}
                          </p>
                          {uni.address && (
                            <p className="text-xs text-text-muted truncate mt-0.5">{uni.address}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <span className="inline-block rounded-md bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-800 border border-brand-200">
                            {uni.distanceKm < 1 ? `~${uni.distanceMeters}m` : `~${uni.distanceKm} km`}
                          </span>
                          <p className="text-xs text-text-muted mt-0.5">~{uni.travelTimeMinutes} phút xe máy</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Khối Bài đăng liên quan */}
            {similarListings.length > 0 && (
              <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 md:p-7 shadow-card space-y-4">
                <h2 className="font-bold text-text-primary text-lg sm:text-xl">Bài đăng liên quan</h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
                  {similarListings.map((item) => (
                    <Link
                      key={item.id}
                      href={`/tin/${item.slug}`}
                      className="group flex flex-col justify-between overflow-hidden rounded-xl border border-surface-border bg-white hover:border-brand/40 hover:shadow-sm transition-all"
                    >
                      <div>
                        <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                          {item.images[0]?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.images[0].imageUrl}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-300">
                              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-1.5">
                          <p className="line-clamp-2 text-xs sm:text-sm font-semibold text-text-primary group-hover:text-brand transition-colors leading-snug">
                            {item.title.replace(/^\[MẪU\]\s*/i, '').replace(/\[MẪU\]/gi, '').trim()}
                          </p>
                          {item.areaM2 && (
                            <p className="text-xs text-text-muted">{item.areaM2} m²</p>
                          )}
                        </div>
                      </div>
                      <div className="px-3 pb-3">
                        <p className="text-sm sm:text-base font-bold text-brand">{formatPrice(item.price)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cột phải — Sidebar người đăng với Nhãn Thẩm định 45 ngày & Tham chiếu giá thị trường */}
          <aside>
            <div className="sticky top-20 space-y-5">
              <OwnerContactBox
                listingId={currentListing.id}
                listingTitle={displayTitle}
                price={currentListing.price}
                areaM2={currentListing.areaM2}
                propertyType={currentListing.propertyType}
                addressDetail={currentListing.addressDetail}
                locationName={currentListing.location?.name}
                createdAt={currentListing.createdAt}
                refreshedAt={currentListing.refreshedAt}
                ownerName={cleanOwnerName}
                ownerAvatarUrl={currentListing.owner?.avatarUrl}
                ownerPostCount={(currentListing as any).ownerPostCount ?? 1}
                contactPhone={(currentListing as any).contactPhone}
                contactAgent={(currentListing as any).contactAgent}
                isRented={(currentListing.status || '').toLowerCase() === 'rented'}
                posterRole={currentListing.posterRole}
                verifiedBadgeAt={currentListing.verifiedBadgeAt}
                coverImage={sanitizedImages[0]?.imageUrl}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Contact Bar */}
      <MobileStickyContactBar
        listingId={currentListing.id}
        listingTitle={displayTitle}
        priceFormatted={formatExactPrice(currentListing.price)}
        depositFormatted={currentListing.depositAmount ? formatExactPrice(currentListing.depositAmount) : undefined}
        isRented={(currentListing.status || '').toLowerCase() === 'rented'}
        propertyType={currentListing.propertyType}
        locationName={currentListing.location?.name}
        coverImage={sanitizedImages[0]?.imageUrl}
      />
    </div>
  );
}
