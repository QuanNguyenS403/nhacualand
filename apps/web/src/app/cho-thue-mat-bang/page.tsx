import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchListings } from '@/lib/api';
import { ListingCard } from '@/components/ListingCard';
import { Pagination } from '@/components/Pagination';
import { SearchFilterBar } from '@/components/SearchFilterBar';
import { findHanoiWard } from '@/lib/hanoi-wards';
import { VIETNAM_UNIVERSITIES, calculateDistanceKm } from '@/lib/vietnam-universities';
import { DEMO_SPACE_RENT_LISTINGS } from '@/lib/demo-data';

export const metadata: Metadata = {
  title: 'Cho thuê mặt bằng kinh doanh, cửa hàng, shophouse — NHACUALAND',
  description:
    'Kênh tìm kiếm mặt bằng kinh doanh, nhà mặt phố buôn bán, shophouse khối đế, kho xưởng, ki-ốt vị trí đẹp, tiềm năng thương mại cao trên toàn quốc — kết nối trực tiếp bên cho thuê',
};

const PROPERTY_TYPES_SPACE = [
  { value: '', label: 'Loại phòng' },
  { value: 'phong_tro', label: 'Phòng trọ' },
  { value: 'can_ho', label: 'Chung cư' },
  { value: 'chung_cu_mini', label: 'Chung cư mini' },
  { value: 'mat_bang', label: 'Mặt bằng kinh doanh' },
];

const PRICE_PRESETS_SPACE = [
  { label: 'Tất cả mức giá', min: '', max: '' },
  { label: 'Dưới 10 triệu', min: '', max: '10000000' },
  { label: '10 - 20 triệu', min: '10000000', max: '20000000' },
  { label: '20 - 50 triệu', min: '20000000', max: '50000000' },
  { label: '50 - 100 triệu', min: '50000000', max: '100000000' },
  { label: 'Trên 100 triệu', min: '100000000', max: '' },
];

const AREA_PRESETS_SPACE = [
  { label: 'Tất cả diện tích', min: '', max: '' },
  { label: 'Dưới 50 m²', min: '', max: '50' },
  { label: '50 - 100 m²', min: '50', max: '100' },
  { label: '100 - 200 m²', min: '100', max: '200' },
  { label: '200 - 500 m²', min: '200', max: '500' },
  { label: 'Trên 500 m²', min: '500', max: '' },
];

interface Props {
  searchParams: { [key: string]: string | undefined };
}

export default async function ChoThueMatBangPage({ searchParams }: Props) {
  const isProduction = process.env.NODE_ENV === 'production';
  let isApiError = false;

  const { items, pagination } = await fetchListings({
    transactionType: 'rent',
    categoryGroup: 'thue_mat_bang',
    keyword: searchParams.keyword,
    locationSlug: searchParams.locationSlug,
    universitySlug: searchParams.universitySlug,
    utilitiesIncluded: searchParams.utilitiesIncluded,
    propertyType: searchParams.propertyType,
    priceMin: searchParams.priceMin,
    priceMax: searchParams.priceMax,
    areaMin: searchParams.areaMin,
    areaMax: searchParams.areaMax,
    page: searchParams.page ?? '1',
  }).catch(() => {
    isApiError = true;
    return {
      items: DEMO_SPACE_RENT_LISTINGS,
      pagination: {
        page: 1,
        pageSize: 20,
        total: DEMO_SPACE_RENT_LISTINGS.length,
        totalPages: 1,
      },
    };
  });

  // Lọc bỏ triệt để tin rác/tin test nếu có từ dữ liệu chạy test cũ
  const isTestListing = (it: { slug: string; title: string }) => {
    const slug = (it.slug || '').toLowerCase();
    const title = (it.title || '').toLowerCase();
    return (
      slug.startsWith('listing-') ||
      slug.includes('-idtemp') ||
      slug.includes('test') ||
      title.includes('tin cũ') ||
      title.includes('test') ||
      title.includes('bảo toàn đầu mối') ||
      title.startsWith('listing')
    );
  };

  const cleanItems = (items || []).filter((it) => !isTestListing(it));

  // Gộp danh mục đầy đủ mặt bằng kinh doanh từ DB và demo data
  const mergedMap = new Map<string, (typeof DEMO_SPACE_RENT_LISTINGS)[number]>();
  for (const item of cleanItems) {
    if (item?.slug) {
      mergedMap.set(item.slug, item);
    }
  }
  for (const item of DEMO_SPACE_RENT_LISTINGS) {
    if (item?.slug && !mergedMap.has(item.slug)) {
      mergedMap.set(item.slug, item);
    }
  }
  let displayItems = Array.from(mergedMap.values());

  // Hỗ trợ lọc tìm kiếm trên toàn bộ danh mục mặt bằng
  if (searchParams.keyword) {
    const kw = searchParams.keyword.toLowerCase().trim();
    displayItems = displayItems.filter(
      (it) =>
        it.title.toLowerCase().includes(kw) ||
        it.description?.toLowerCase().includes(kw) ||
        it.addressDetail?.toLowerCase().includes(kw) ||
        it.location?.name?.toLowerCase().includes(kw)
    );
  }
  if (searchParams.locationSlug) {
    const loc = searchParams.locationSlug.toLowerCase().trim();
    const wardObj = findHanoiWard(loc);
    const wardShortName = wardObj ? wardObj.shortName.toLowerCase() : '';
    const wardName = wardObj ? wardObj.name.toLowerCase() : '';
    const districtName = wardObj ? wardObj.district.replace('Quận ', '').toLowerCase() : '';

    displayItems = displayItems.filter((it) => {
      if (it.location?.slug?.toLowerCase() === loc) return true;
      if (wardShortName && (
        it.addressDetail?.toLowerCase().includes(wardShortName) ||
        it.title?.toLowerCase().includes(wardShortName) ||
        it.description?.toLowerCase().includes(wardShortName) ||
        it.location?.name?.toLowerCase().includes(wardShortName)
      )) return true;
      if (wardName && (
        it.addressDetail?.toLowerCase().includes(wardName) ||
        it.location?.name?.toLowerCase().includes(wardName)
      )) return true;
      if (districtName && it.location?.name?.toLowerCase().includes(districtName)) return true;
      return false;
    });
  }
  if (searchParams.priceMin) {
    const min = Number(searchParams.priceMin);
    displayItems = displayItems.filter((it) => Number(it.price) >= min);
  }
  if (searchParams.priceMax) {
    const max = Number(searchParams.priceMax);
    displayItems = displayItems.filter((it) => Number(it.price) <= max);
  }
  if (searchParams.areaMin) {
    const min = Number(searchParams.areaMin);
    displayItems = displayItems.filter((it) => Number(it.areaM2) >= min);
  }
  if (searchParams.areaMax) {
    const max = Number(searchParams.areaMax);
    displayItems = displayItems.filter((it) => Number(it.areaM2) <= max);
  }
  if (searchParams.propertyType) {
    const pt = searchParams.propertyType;
    displayItems = displayItems.filter((it) => {
      if (it.propertyType === pt) return true;
      if (pt === 'phong_tro') {
        return (
          it.propertyType === 'phong_tro' ||
          it.propertyType === 'phong-tro' ||
          it.propertyType === 'nha_tro' ||
          it.propertyType === 'ky_tuc_xa'
        );
      }
      if (pt === 'can_ho') {
        return (
          it.propertyType === 'can_ho' ||
          it.propertyType === 'chung-cu' ||
          it.propertyType === 'chung_cu' ||
          it.propertyType === 'can_ho_chung_cu' ||
          it.propertyType === 'can_ho_dich_vu' ||
          it.propertyType === 'can_ho_cao_cap'
        );
      }
      if (pt === 'chung_cu_mini') {
        return (
          it.propertyType === 'chung_cu_mini' ||
          it.propertyType === 'chung-cu-mini' ||
          it.propertyType === 'studio' ||
          it.propertyType === 'can_ho_mini' ||
          it.propertyType?.startsWith('studio_')
        );
      }
      if (pt === 'mat_bang') {
        return (
          it.propertyType === 'mat_bang' ||
          it.propertyType === 'mat-bang-kinh-doanh' ||
          it.propertyType === 'cua_hang' ||
          it.propertyType === 'shophouse' ||
          it.propertyType === 'kho_xuong' ||
          it.propertyType === 'van_phong'
        );
      }
      return false;
    });
  }
  if (searchParams.universitySlug) {
    const targetSlug = searchParams.universitySlug;
    const targetUni = VIETNAM_UNIVERSITIES.find((u) => u.slug === targetSlug);
    const targetKeywords = targetUni
      ? [
          targetUni.abbreviation?.toLowerCase(),
          targetUni.name.toLowerCase(),
          targetSlug.replace(/-/g, ' '),
        ].filter(Boolean) as string[]
      : [targetSlug.replace(/-/g, ' ')];

    displayItems = displayItems.filter((it) => {
      // 1. Khớp theo nearbyUniversities có sẵn trong tin đăng
      if (it.nearbyUniversities?.some((u) => u.university.slug === targetSlug)) {
        return true;
      }
      // 2. Tính khoảng cách địa lý theo tọa độ GPS (bán kính <= 4.5km)
      if (targetUni && it.lat != null && it.lng != null && !isNaN(it.lat) && !isNaN(it.lng)) {
        const dist = calculateDistanceKm(it.lat, it.lng, targetUni.lat, targetUni.lng);
        if (dist <= 4.5) return true;
      }
      // 3. Khớp theo từ khóa tên trường / tên viết tắt trong tiêu đề, địa chỉ hoặc mô tả
      const text = `${it.title} ${it.description || ''} ${it.addressDetail || ''} ${it.location?.name || ''}`.toLowerCase();
      return targetKeywords.some((kw) => kw && text.includes(kw));
    });
  }
  if (searchParams.utilitiesIncluded === 'true') {
    displayItems = displayItems.filter((it) => it.utilitiesIncluded);
  }
  if (searchParams.petAllowed === 'true') {
    displayItems = displayItems.filter(
      (it) =>
        Boolean((it as any).amenities?.thuCung) ||
        Boolean((it as any).amenities?.petAllowed) ||
        Boolean((it as any).amenities?.pets) ||
        it.description?.toLowerCase().includes('thú cưng') ||
        it.description?.toLowerCase().includes('chó mèo') ||
        it.description?.toLowerCase().includes('pet')
    );
  }
  if (searchParams.electricVehicle === 'true') {
    displayItems = displayItems.filter(
      (it) =>
        Boolean((it as any).amenities?.xeDien) ||
        Boolean((it as any).amenities?.electricVehicle) ||
        Boolean((it as any).amenities?.sacXeDien) ||
        it.description?.toLowerCase().includes('xe điện') ||
        it.description?.toLowerCase().includes('sạc điện') ||
        it.description?.toLowerCase().includes('chỗ sạc')
    );
  }

  const totalCount = displayItems.length;
  const currentPage = Math.max(1, Number(searchParams.page) || 1);
  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pagedItems = displayItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedUni = searchParams.universitySlug
    ? VIETNAM_UNIVERSITIES.find((u) => u.slug === searchParams.universitySlug)
    : null;

  const filterSummary = searchParams.keyword
    ? ` — "${searchParams.keyword}"`
    : selectedUni
      ? ` — Gần ${selectedUni.abbreviation ? `${selectedUni.abbreviation} (${selectedUni.name})` : selectedUni.name}`
      : searchParams.universitySlug
        ? ` — Gần ${searchParams.universitySlug.replace(/-/g, ' ').toUpperCase()}`
        : '';

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="container-max py-8 sm:py-10 md:py-12">
        {isApiError && isProduction && (
          <div className="mb-4 sm:mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
            Đang có gián đoạn kết nối tới máy chủ dữ liệu. Danh sách mặt bằng tạm thời chưa tải được
          </div>
        )}
        {/* Breadcrumb */}
        <nav className="mb-4 sm:mb-5 flex items-center gap-2 text-xs sm:text-sm text-text-muted">
          <Link href="/" className="hover:text-brand transition-colors">Trang chủ</Link>
          <span>›</span>
          <Link href="/thue" className="hover:text-brand transition-colors">Tìm phòng</Link>
          <span>›</span>
          <span className="text-text-secondary font-medium">Mặt bằng kinh doanh</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-rose-500/10 text-rose-700 text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5">
              <span>Chuyên mục Mặt bằng kinh doanh</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-3.5xl font-bold text-text-primary">
              Cho thuê mặt bằng kinh doanh{filterSummary} mới nhất
            </h1>
            <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-text-muted">
              {totalCount.toLocaleString('vi-VN')} mặt bằng, cửa hàng, shophouse vị trí đẹp đang cho thuê
            </p>
          </div>
        </div>

        <div className="mt-5 sm:mt-6">
          <SearchFilterBar
            basePath="/cho-thue-mat-bang"
            transactionType="rent"
            propertyTypes={PROPERTY_TYPES_SPACE}
            customPricePresets={PRICE_PRESETS_SPACE}
            customAreaPresets={AREA_PRESETS_SPACE}
            placeholder="Tìm theo tuyến phố, khu thương mại, quận/huyện..."
            initialParams={searchParams}
          />
        </div>

        {displayItems.length === 0 ? (
          <div className="mt-6 sm:mt-8 rounded-2xl border border-surface-border bg-white p-8 sm:p-10 text-center">
            <p className="font-semibold text-text-primary text-base sm:text-lg">Không tìm thấy mặt bằng phù hợp</p>
            <p className="mt-2 text-sm sm:text-base text-text-secondary">
              Thử điều chỉnh bộ lọc hoặc tìm kiếm theo khu vực/tuyến phố khác
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
              {pagedItems.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8 sm:mt-10 md:mt-12">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath="/cho-thue-mat-bang"
                  searchParams={searchParams}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
