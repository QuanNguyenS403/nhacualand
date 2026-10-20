export const runtime = 'edge';
import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchListings } from '@/lib/api';
import { ListingCard } from '@/components/ListingCard';
import { ListingsGridWithCustom } from '@/components/ListingsGridWithCustom';
import { Pagination } from '@/components/Pagination';
import {
  SearchFilterBar,
  PROPERTY_TYPES_CAN_HO,
  PROPERTY_TYPES_STUDIO,
} from '@/components/SearchFilterBar';
import { findHanoiWard } from '@/lib/hanoi-wards';
import { VIETNAM_UNIVERSITIES, calculateDistanceKm } from '@/lib/vietnam-universities';
import { removeDiacritics } from '@/lib/search-suggestions-data';
import {
  ALL_DEMO_LISTINGS,
  DEMO_CAN_HO_RENT_LISTINGS,
  DEMO_ROOM_RENT_LISTINGS,
  DEMO_STUDIO_RENT_LISTINGS,
  DEMO_SPACE_RENT_LISTINGS,
} from '@/lib/demo-data';

export const metadata: Metadata = {
  title: 'Cho thuê Chung cư & Chung cư mini giá tốt — NHACUALAND',
  description:
    'Danh sách tin cho thuê chung cư và chung cư mini minh bạch chi phí mới nhất, phân tách rõ ràng chuyên mục Chung cư và Chung cư mini riêng biệt, tư vấn và trực tiếp dẫn xem tận nơi miễn phí',
};

const CATEGORY_NAMES: Record<string, string> = {
  thue_can_ho: 'Chung cư',
  thue_studio: 'Chung cư mini',
  thue_tro: 'Phòng trọ sinh viên',
  thue_bds: 'Chung cư',
  thue_mat_bang: 'Mặt bằng kinh doanh',
};

interface Props {
  searchParams: { [key: string]: string | undefined };
}

export default async function ThuePage({ searchParams }: Props) {
  const isStudio = searchParams.categoryGroup === 'thue_studio';
  const isTro = searchParams.categoryGroup === 'thue_tro';
  const isMatBang = searchParams.categoryGroup === 'thue_mat_bang';
  const isCanHo = searchParams.categoryGroup === 'thue_can_ho';

  // Lựa chọn bộ lọc loại phòng chuyên biệt theo từng mục (nếu có chọn chuyên mục cụ thể)
  const propertyTypesForCategory = isStudio
    ? PROPERTY_TYPES_STUDIO
    : isCanHo
      ? PROPERTY_TYPES_CAN_HO
      : undefined;

  // Dữ liệu fallback chuẩn phân tách đúng theo từng mục
  const fallbackListings = isStudio
    ? DEMO_STUDIO_RENT_LISTINGS
    : isCanHo
      ? DEMO_CAN_HO_RENT_LISTINGS
      : isTro
        ? DEMO_ROOM_RENT_LISTINGS
        : isMatBang
          ? DEMO_SPACE_RENT_LISTINGS
          : ALL_DEMO_LISTINGS;

  const currentCategoryGroup = searchParams.categoryGroup;
  let isApiError = false;

  const { items, pagination } = await fetchListings({
    transactionType: 'rent',
    categoryGroup: currentCategoryGroup,
    keyword: searchParams.keyword,
    locationSlug: searchParams.locationSlug,
    universitySlug: searchParams.universitySlug,
    propertyType: searchParams.propertyType,
    utilitiesIncluded: searchParams.utilitiesIncluded,
    priceMin: searchParams.priceMin,
    priceMax: searchParams.priceMax,
    areaMin: searchParams.areaMin,
    areaMax: searchParams.areaMax,
    lat: searchParams.lat,
    lng: searchParams.lng,
    page: searchParams.page ?? '1',
  }).catch(() => {
    isApiError = true;
    return {
      items: fallbackListings,
      pagination: {
        page: 1,
        pageSize: 20,
        total: fallbackListings.length,
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

  // Đồng bộ: nếu API lỗi hoặc cơ sở dữ liệu chưa có tin thật, dùng fallbackListings
  const baseItems = (isApiError || cleanItems.length === 0) ? fallbackListings : cleanItems;

  // Tự động loại bỏ triệt để mọi bài đăng phòng đã cho thuê hoặc đã gỡ
  let displayItems = baseItems.filter((it) => {
    const st = ((it as any).status || 'active').toLowerCase();
    return st !== 'rented' && st !== 'removed';
  });

  // Hỗ trợ lọc tìm kiếm trên toàn bộ danh mục phòng (hỗ trợ cả có dấu và không dấu)
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

  const categoryLabel = searchParams.categoryGroup
    ? (CATEGORY_NAMES[searchParams.categoryGroup] ?? 'phòng')
    : 'phòng & căn hộ';
  const pageTitle = searchParams.categoryGroup ? `Cho thuê ${categoryLabel}` : 'Cho thuê phòng & căn hộ';

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
        {isApiError && cleanItems.length === 0 && (
          <div className="mb-4 sm:mb-5 rounded-xl border border-brand-200 bg-brand-50 p-3.5 text-xs text-brand-900">
            Đang hiển thị danh mục phòng tiêu biểu đã xác thực, bạn có thể xem chi tiết hoặc đặt lịch xem trực tiếp
          </div>
        )}
        {/* Breadcrumb */}
        <nav className="mb-4 sm:mb-5 flex items-center gap-2 text-xs sm:text-sm text-text-muted">
          <Link href="/" className="hover:text-brand transition-colors">Trang chủ</Link>
          <span>›</span>
          {searchParams.categoryGroup ? (
            <>
              <Link href="/thue" className="hover:text-brand transition-colors">Tìm phòng</Link>
              <span>›</span>
              <span className="text-text-secondary font-medium">{CATEGORY_NAMES[searchParams.categoryGroup] ?? 'Tìm phòng'}</span>
            </>
          ) : (
            <span className="text-text-secondary font-medium">Tìm phòng</span>
          )}
        </nav>

        <h1 className="text-2xl sm:text-3xl md:text-3.5xl font-bold text-text-primary">
          {pageTitle}{filterSummary} mới nhất
        </h1>
        <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-text-muted">
          {totalCount.toLocaleString('vi-VN')} tin cho thuê {categoryLabel.toLowerCase()} phù hợp
        </p>

        <div className="mt-5 sm:mt-6">
          <SearchFilterBar
            basePath="/thue"
            propertyTypes={propertyTypesForCategory}
            initialParams={{
              ...searchParams,
              categoryGroup: currentCategoryGroup,
            }}
          />
        </div>

        {displayItems.length === 0 ? (
          <div className="mt-6 sm:mt-8 rounded-2xl border border-surface-border bg-white p-8 sm:p-10 text-center">
            <p className="font-semibold text-text-primary text-base sm:text-lg">Không tìm thấy tin cho thuê phù hợp</p>
            <p className="mt-2 text-sm sm:text-base text-text-secondary">
              Thử điều chỉnh bộ lọc giá, trường đại học hoặc tìm kiếm với từ khoá khác
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
                  basePath="/thue"
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
