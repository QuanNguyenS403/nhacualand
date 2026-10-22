export const runtime = 'edge';
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchListings } from '@/lib/api';
import { ListingsGridWithCustom } from '@/components/ListingsGridWithCustom';
import { Pagination } from '@/components/Pagination';
import { SearchFilterBar } from '@/components/SearchFilterBar';
import { findHanoiWard } from '@/lib/hanoi-wards';
import { VIETNAM_UNIVERSITIES, calculateDistanceKm } from '@/lib/vietnam-universities';
import { removeDiacritics } from '@/lib/search-suggestions-data';
import { DEMO_ROOM_RENT_LISTINGS } from '@/lib/demo-data';

export const metadata: Metadata = {
  title: 'Cho thuê phòng trọ, nhà trọ sinh viên & người đi làm — NHACUALAND',
  description:
    'Kênh tìm kiếm phòng trọ, nhà trọ giá rẻ, ký túc xá, căn hộ mini khép kín, an ninh tốt, minh bạch giá điện nước trên toàn quốc — kết nối trực tiếp bên cho thuê',
};

const PROPERTY_TYPES_ROOM = [
  { value: '', label: 'Loại phòng' },
  { value: 'phong_tro', label: 'Phòng trọ' },
  { value: 'can_ho', label: 'Chung cư' },
  { value: 'chung_cu_mini', label: 'Chung cư mini' },
  { value: 'mat_bang', label: 'Mặt bằng kinh doanh' },
];

const PRICE_PRESETS_ROOM = [
  { label: 'Tất cả mức giá', min: '', max: '' },
  { label: 'Dưới 2 triệu', min: '', max: '2000000' },
  { label: '2 - 3 triệu', min: '2000000', max: '3000000' },
  { label: '3 - 5 triệu', min: '3000000', max: '5000000' },
  { label: '5 - 8 triệu', min: '5000000', max: '8000000' },
  { label: 'Trên 8 triệu', min: '8000000', max: '' },
];

const AREA_PRESETS_ROOM = [
  { label: 'Tất cả diện tích', min: '', max: '' },
  { label: 'Dưới 20 m²', min: '', max: '20' },
  { label: '20 - 30 m²', min: '20', max: '30' },
  { label: '30 - 45 m²', min: '30', max: '45' },
  { label: 'Trên 45 m²', min: '45', max: '' },
];

interface Props {
  searchParams: { [key: string]: string | undefined };
}

export default async function ChoThueTroPage({ searchParams }: Props) {
  const { items, pagination } = await fetchListings({
    transactionType: 'rent',
    categoryGroup: 'thue_tro',
    keyword: searchParams.keyword,
    locationSlug: searchParams.locationSlug,
    universitySlug: searchParams.universitySlug,
    utilitiesIncluded: searchParams.utilitiesIncluded,
    propertyType: searchParams.propertyType,
    priceMin: searchParams.priceMin,
    priceMax: searchParams.priceMax,
    areaMin: searchParams.areaMin,
    areaMax: searchParams.areaMax,
    lat: searchParams.lat,
    lng: searchParams.lng,
    page: searchParams.page ?? '1',
  }).catch(() => {
    return {
      items: DEMO_ROOM_RENT_LISTINGS,
      pagination: {
        page: 1,
        pageSize: 20,
        total: DEMO_ROOM_RENT_LISTINGS.length,
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

  // Gộp danh mục đầy đủ phòng trọ từ DB và demo data
  const mergedMap = new Map<string, (typeof DEMO_ROOM_RENT_LISTINGS)[number]>();
  for (const item of cleanItems) {
    if (item?.slug) {
      mergedMap.set(item.slug, item);
    }
  }
  for (const item of DEMO_ROOM_RENT_LISTINGS) {
    if (item?.slug && !mergedMap.has(item.slug)) {
      mergedMap.set(item.slug, item);
    }
  }
  let displayItems = Array.from(mergedMap.values()).filter((it) => {
    const st = ((it as any).status || 'active').toLowerCase();
    return st !== 'rented' && st !== 'removed';
  });

  // Hỗ trợ lọc tìm kiếm trên toàn bộ danh mục phòng trọ (hỗ trợ cả có dấu và không dấu)
  if (searchParams.keyword) {
    const kw = searchParams.keyword.toLowerCase().trim();
    const kwNoDia = removeDiacritics(kw);
    displayItems = displayItems.filter((it) => {
      const title = (it.title || '').toLowerCase();
      const desc = (it.description || '').toLowerCase();
      const addr = (it.addressDetail || '').toLowerCase();
      const loc = (it.location?.name || '').toLowerCase();
      if (title.includes(kw) || desc.includes(kw) || addr.includes(kw) || loc.includes(kw)) {
        return true;
      }
      return (
        removeDiacritics(title).includes(kwNoDia) ||
        removeDiacritics(desc).includes(kwNoDia) ||
        removeDiacritics(addr).includes(kwNoDia) ||
        removeDiacritics(loc).includes(kwNoDia)
      );
    });
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
        {/* Breadcrumb */}
        <nav className="mb-4 sm:mb-5 flex items-center gap-2 text-xs sm:text-sm text-text-muted">
          <Link href="/" className="hover:text-brand transition-colors">Trang chủ</Link>
          <span>›</span>
          <Link href="/thue" className="hover:text-brand transition-colors">Tìm phòng</Link>
          <span>›</span>
          <span className="text-text-secondary font-medium">Phòng trọ & Nhà trọ</span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5">
              <span>Chuyên mục Cho thuê phòng trọ & Nhà trọ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-3.5xl font-bold text-text-primary">
              Cho thuê phòng trọ, nhà trọ{filterSummary} mới nhất
            </h1>
            <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-text-muted">
              {totalCount.toLocaleString('vi-VN')} phòng trọ, căn hộ mini đang cho thuê
            </p>
          </div>
        </div>

        <div className="mt-5 sm:mt-6">
          <SearchFilterBar
            basePath="/cho-thue-tro"
            transactionType="rent"
            propertyTypes={PROPERTY_TYPES_ROOM}
            customPricePresets={PRICE_PRESETS_ROOM}
            customAreaPresets={AREA_PRESETS_ROOM}
            placeholder="Tìm theo khu vực, trường ĐH, tuyến đường..."
            initialParams={searchParams}
          />
        </div>

        {displayItems.length === 0 ? (
          <div className="mt-6 sm:mt-8 rounded-2xl border border-surface-border bg-white p-8 sm:p-10 text-center">
            <p className="font-semibold text-text-primary text-base sm:text-lg">Không tìm thấy phòng trọ phù hợp</p>
            <p className="mt-2 text-sm sm:text-base text-text-secondary">
              Thử bỏ bộ lọc hoặc mở rộng khoảng giá/diện tích để tìm được phòng trọ ưng ý
            </p>
          </div>
        ) : (
          <>
            <ListingsGridWithCustom initialListings={pagedItems} />
            {totalPages > 1 && (
              <div className="mt-8 sm:mt-10 md:mt-12">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  basePath="/cho-thue-tro"
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
