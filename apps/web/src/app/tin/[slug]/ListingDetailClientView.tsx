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

interface Props {
  initialListing: Listing | null;
  slug: string;
  similarListings: Listing[];
}

import { extractListingFurnitureList } from '@/lib/furniture-utils';


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

export function ListingDetailClientView({ initialListing, slug, similarListings }: Props) {
  const [listing, setListing] = useState<Listing | null>(initialListing);
  const [hydrated, setHydrated] = useState(false);

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

  const allowsPets = Boolean(
    currentListing.amenities?.thuCung ||
      currentListing.amenities?.pet ||
      currentListing.amenities?.petsAllowed ||
      currentListing.amenities?.choNuoiThuCung ||
      currentListing.description?.toLowerCase().includes('thú cưng') ||
      currentListing.description?.toLowerCase().includes('cho nuôi')
  );

  const allowsEv = Boolean(
    currentListing.amenities?.xeDien ||
      currentListing.amenities?.electricVehicle ||
      currentListing.amenities?.sacXeDien ||
      currentListing.description?.toLowerCase().includes('xe điện') ||
      currentListing.description?.toLowerCase().includes('sạc xe')
  );

  const furnitureList = extractListingFurnitureList(currentListing);

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

            {/* Khối Thông tin chính & Biểu phí */}
            <div className="rounded-2xl border border-surface-border bg-white p-5 sm:p-6 md:p-7 shadow-card">
              <h2 className="mb-4 sm:mb-5 font-bold text-text-primary text-lg sm:text-xl">Thông tin chính & Biểu phí</h2>
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
              <h2 className="font-bold text-text-primary text-lg sm:text-xl">Nội Thất</h2>
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

          {/* Cột phải — Sidebar người đăng */}
          <aside>
            <div className="sticky top-20 space-y-5">
              <OwnerContactBox
                listingId={currentListing.id}
                listingTitle={displayTitle}
                price={currentListing.price}
                addressDetail={currentListing.addressDetail}
                locationName={currentListing.location?.name}
                createdAt={currentListing.createdAt}
                refreshedAt={currentListing.refreshedAt}
                ownerName={cleanOwnerName}
                ownerAvatarUrl={currentListing.owner?.avatarUrl}
                ownerPostCount={507}
                contactPhone={(currentListing as any).contactPhone}
                contactAgent={(currentListing as any).contactAgent}
                isRented={(currentListing.status || '').toLowerCase() === 'rented'}
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
      />
    </div>
  );
}
