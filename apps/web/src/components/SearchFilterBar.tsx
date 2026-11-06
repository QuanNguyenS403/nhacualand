'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { HANOI_DISTRICT_GROUPS } from '@/lib/hanoi-wards';
import { VIETNAM_UNIVERSITIES } from '@/lib/vietnam-universities';
import { triggerPageLoading } from '@/lib/nav-utils';

interface UniversityOption {
  slug: string;
  name: string;
  abbreviation?: string | null;
  region?: string;
  category?: 'dai_hoc' | 'cao_dang';
}

interface SearchFilterBarProps {
  basePath: string;
  transactionType?: 'rent';
  initialParams?: { [key: string]: string | undefined };
  propertyTypes?: { value: string; label: string }[];
  universities?: UniversityOption[];
  customPricePresets?: { label: string; min: string; max: string }[];
  customAreaPresets?: { label: string; min: string; max: string }[];
  placeholder?: string;
  title?: string;
  subtitle?: string;
}

// 4 loại phòng chuẩn theo đúng yêu cầu: Phòng trọ, Chung cư, Chung cư mini, Mặt bằng kinh doanh
export const PROPERTY_TYPES_STANDARD = [
  { value: '', label: 'Tất cả loại hình' },
  { value: 'phong_tro', label: 'Phòng trọ sinh viên' },
  { value: 'chung_cu_mini', label: 'Chung cư mini' },
  { value: 'can_ho', label: 'Chung cư' },
  { value: 'mat_bang', label: 'Mặt bằng kinh doanh' },
];

export const PROPERTY_TYPES_CAN_HO = PROPERTY_TYPES_STANDARD;
export const PROPERTY_TYPES_STUDIO = PROPERTY_TYPES_STANDARD;

const DEFAULT_UNIVERSITIES: UniversityOption[] = VIETNAM_UNIVERSITIES;

function formatPriceNumber(num: number): string {
  if (num >= 1000000000) {
    const val = num / 1000000000;
    return val % 1 === 0 ? `${val} tỷ` : `${val.toFixed(1)} tỷ`;
  }
  if (num >= 1000000) {
    const val = num / 1000000;
    return val % 1 === 0 ? `${val} triệu` : `${val.toFixed(1)} triệu`;
  }
  if (num > 0) {
    return `${Math.round(num / 1000)}k`;
  }
  return '0đ';
}

const APARTMENT_PROJECT_SUGGESTIONS = [
  'Masteri Thảo Điền',
  'Vinhomes Central Park',
  'The Matrix One',
  'Vinhomes Smart City',
  'Masteri West Heights',
  'Sunrise City',
  'Vinhomes Ocean Park',
  'Ecopark',
];

const BALCONY_DIRECTIONS = [
  'Đông Nam',
  'Nam',
  'Đông',
  'Bắc',
  'Tây',
  'Tây Bắc',
  'Tây Nam',
  'Đông Bắc',
];

export function SearchFilterBar({
  basePath,
  initialParams = {},
  propertyTypes: propPropertyTypes,
  universities = DEFAULT_UNIVERSITIES,
  placeholder = 'Tìm theo khu vực, tên đường, loại phòng...',
  title: propTitle,
  subtitle: propSubtitle,
}: SearchFilterBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Basic search inputs
  const [keyword, setKeyword] = useState(initialParams.keyword ?? '');
  const [propertyType, setPropertyType] = useState(initialParams.propertyType ?? '');
  const [locationWard, setLocationWard] = useState(
    initialParams.locationSlug ?? initialParams.ward ?? ''
  );
  const [universitySlug, setUniversitySlug] = useState(
    initialParams.universitySlug ?? ''
  );

  // Dynamic Segment determination
  const effectiveType = propertyType || (
    initialParams.categoryGroup === 'thue_can_ho' ? 'can_ho' :
    initialParams.categoryGroup === 'thue_studio' ? 'chung_cu_mini' :
    initialParams.categoryGroup === 'thue_mat_bang' || basePath === '/cho-thue-mat-bang' ? 'mat_bang' :
    initialParams.categoryGroup === 'thue_tro' || basePath === '/cho-thue-tro' ? 'phong_tro' : ''
  );

  const isApartment = effectiveType === 'can_ho' || effectiveType === 'chung_cu';
  const isCommercialSpace = effectiveType === 'mat_bang' || effectiveType === 'mat_bang_kinh_doanh';
  const isStudentRoomOrMini = !isApartment && !isCommercialSpace;

  // Max price limit based on mode
  const currentMaxPriceLimit = isCommercialSpace
    ? 150000000
    : isApartment
      ? 60000000
      : 30000000;

  const currentPriceStep = isCommercialSpace
    ? 2500000
    : isApartment
      ? 1000000
      : 500000;

  // Price range slider state
  const initialMinPrice = (() => {
    const raw = Number(initialParams.priceMin);
    return !isNaN(raw) && raw >= 0 && raw <= currentMaxPriceLimit ? raw : 0;
  })();
  const initialMaxPrice = (() => {
    const raw = Number(initialParams.priceMax);
    return !isNaN(raw) && raw >= 0 && raw <= currentMaxPriceLimit ? raw : currentMaxPriceLimit;
  })();

  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const pricePopoverRef = useRef<HTMLDivElement>(null);

  // Area range filter
  const [areaRange, setAreaRange] = useState(initialParams.areaRange ?? '');

  // Apartment specialized filters
  const [projectName, setProjectName] = useState(initialParams.projectName ?? '');
  const [bedrooms, setBedrooms] = useState(initialParams.bedrooms ?? '');
  const [furnishing, setFurnishing] = useState(initialParams.furnishing ?? '');
  const [balconyDirection, setBalconyDirection] = useState(initialParams.balconyDirection ?? '');
  const [hasCarParking, setHasCarParking] = useState(initialParams.hasCarParking === 'true');
  const [mgmtFeeIncluded, setMgmtFeeIncluded] = useState(initialParams.mgmtFeeIncluded === 'true');
  const [foreignerEligible, setForeignerEligible] = useState(initialParams.foreignerEligible === 'true');

  // Commercial Space specialized filters
  const [frontage, setFrontage] = useState(initialParams.frontage ?? '');
  const [businessType, setBusinessType] = useState(initialParams.businessType ?? '');
  const [floorsCount, setFloorsCount] = useState(initialParams.floorsCount ?? '');
  const [pcccCertified, setPcccCertified] = useState(initialParams.pccc === 'true');
  const [vatSupported, setVatSupported] = useState(initialParams.vat === 'true');
  const [wideSidewalk, setWideSidewalk] = useState(initialParams.wideSidewalk === 'true');
  const [privateEntrance, setPrivateEntrance] = useState(initialParams.privateEntrance === 'true');
  const [rentFreePeriod, setRentFreePeriod] = useState(initialParams.rentFree === 'true');

  // Shared / Student room chips
  const [petAllowed, setPetAllowed] = useState(initialParams.petAllowed === 'true');
  const [electricVehicle, setElectricVehicle] = useState(initialParams.electricVehicle === 'true');
  const [hasBalconyWindow, setHasBalconyWindow] = useState(initialParams.hasBalconyWindow === 'true');
  const [hasElevator, setHasElevator] = useState(initialParams.hasElevator === 'true');
  const [freeTime, setFreeTime] = useState(initialParams.freeTime === 'true');
  const [hasVideo, setHasVideo] = useState(initialParams.hasVideo === 'true');

  // Mobile advanced filter expand state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Close price popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pricePopoverRef.current && !pricePopoverRef.current.contains(e.target as Node)) {
        setIsPriceOpen(false);
      }
    }
    if (isPriceOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPriceOpen]);

  // When switching segment, adjust maxPrice if it exceeds limit
  useEffect(() => {
    if (maxPrice > currentMaxPriceLimit) {
      setMaxPrice(currentMaxPriceLimit);
    }
  }, [currentMaxPriceLimit, maxPrice]);

  const availablePropertyTypes = propPropertyTypes ?? PROPERTY_TYPES_STANDARD;

  // Section title & subtitle
  const sectionTitle = (() => {
    if (propTitle) return propTitle;
    const group = initialParams.categoryGroup;
    if (group === 'thue_can_ho' || isApartment) return 'Chung cư thương mại & Căn hộ';
    if (group === 'thue_studio') return 'Chung cư mini (CCMN)';
    if (group === 'thue_tro' || basePath === '/cho-thue-tro') return 'Phòng trọ & Ký túc xá';
    if (group === 'thue_mat_bang' || basePath === '/cho-thue-mat-bang' || isCommercialSpace) return 'Mặt bằng kinh doanh & Cửa hàng';
    return 'Bộ lọc tìm kiếm';
  })();

  const sectionSubtitle = propSubtitle || '';

  function handleFilter(
    e?: React.FormEvent,
    overridePrices?: { min?: number; max?: number },
  ) {
    if (e) e.preventDefault();
    const params = new URLSearchParams();

    if (initialParams.locationId) params.set('locationId', initialParams.locationId);
    if (initialParams.categoryGroup) params.set('categoryGroup', initialParams.categoryGroup);
    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (locationWard) params.set('locationSlug', locationWard);
    if (propertyType) params.set('propertyType', propertyType);

    // University (only in student/mini mode)
    if (isStudentRoomOrMini && universitySlug) params.set('universitySlug', universitySlug);

    // Common chips
    if (hasVideo) params.set('hasVideo', 'true');

    // Apartment filters
    if (isApartment) {
      if (projectName.trim()) params.set('projectName', projectName.trim());
      if (bedrooms) params.set('bedrooms', bedrooms);
      if (furnishing) params.set('furnishing', furnishing);
      if (balconyDirection) params.set('balconyDirection', balconyDirection);
      if (hasCarParking) params.set('hasCarParking', 'true');
      if (mgmtFeeIncluded) params.set('mgmtFeeIncluded', 'true');
      if (foreignerEligible) params.set('foreignerEligible', 'true');
      if (petAllowed) params.set('petAllowed', 'true');
    }

    // Commercial Space filters
    if (isCommercialSpace) {
      if (frontage) params.set('frontage', frontage);
      if (businessType) params.set('businessType', businessType);
      if (floorsCount) params.set('floorsCount', floorsCount);
      if (pcccCertified) params.set('pccc', 'true');
      if (vatSupported) params.set('vat', 'true');
      if (wideSidewalk) params.set('wideSidewalk', 'true');
      if (privateEntrance) params.set('privateEntrance', 'true');
      if (rentFreePeriod) params.set('rentFree', 'true');
    }

    // Student room / mini filters
    if (isStudentRoomOrMini) {
      if (petAllowed) params.set('petAllowed', 'true');
      if (electricVehicle) params.set('electricVehicle', 'true');
      if (hasBalconyWindow) params.set('hasBalconyWindow', 'true');
      if (hasElevator) params.set('hasElevator', 'true');
      if (freeTime) params.set('freeTime', 'true');
    }

    // Area range
    if (areaRange) params.set('areaRange', areaRange);

    // Price range
    const effectiveMin = overridePrices?.min !== undefined ? overridePrices.min : minPrice;
    const effectiveMax = overridePrices?.max !== undefined ? overridePrices.max : maxPrice;

    if (effectiveMin > 0) params.set('priceMin', String(effectiveMin));
    if (effectiveMax < currentMaxPriceLimit) params.set('priceMax', String(effectiveMax));

    params.set('page', '1');

    const targetUrl = `${basePath}?${params.toString()}`;
    triggerPageLoading(targetUrl);
    startTransition(() => {
      router.push(targetUrl);
    });
  }

  function handleReset() {
    setKeyword('');
    setLocationWard('');
    setUniversitySlug('');
    setPropertyType('');
    setAreaRange('');
    setMinPrice(0);
    setMaxPrice(currentMaxPriceLimit);
    setIsPriceOpen(false);

    setProjectName('');
    setBedrooms('');
    setFurnishing('');
    setBalconyDirection('');
    setHasCarParking(false);
    setMgmtFeeIncluded(false);
    setForeignerEligible(false);

    setFrontage('');
    setBusinessType('');
    setFloorsCount('');
    setPcccCertified(false);
    setVatSupported(false);
    setWideSidewalk(false);
    setPrivateEntrance(false);
    setRentFreePeriod(false);

    setPetAllowed(false);
    setElectricVehicle(false);
    setHasBalconyWindow(false);
    setHasElevator(false);
    setFreeTime(false);
    setHasVideo(false);

    const resetParams = new URLSearchParams();
    if (initialParams.locationId) resetParams.set('locationId', initialParams.locationId);
    if (initialParams.categoryGroup) resetParams.set('categoryGroup', initialParams.categoryGroup);
    const queryStr = resetParams.toString();
    const targetUrl = queryStr ? `${basePath}?${queryStr}` : basePath;
    triggerPageLoading(targetUrl);
    startTransition(() => {
      router.push(targetUrl);
    });
  }

  // Count active filters
  let activeFilterCount = 0;
  if (keyword.trim()) activeFilterCount++;
  if (locationWard) activeFilterCount++;
  if (propertyType) activeFilterCount++;
  if (isStudentRoomOrMini && universitySlug) activeFilterCount++;
  if (minPrice > 0 || maxPrice < currentMaxPriceLimit) activeFilterCount++;
  if (areaRange) activeFilterCount++;
  if (hasVideo) activeFilterCount++;

  if (isApartment) {
    if (projectName.trim()) activeFilterCount++;
    if (bedrooms) activeFilterCount++;
    if (furnishing) activeFilterCount++;
    if (balconyDirection) activeFilterCount++;
    if (hasCarParking) activeFilterCount++;
    if (mgmtFeeIncluded) activeFilterCount++;
    if (foreignerEligible) activeFilterCount++;
    if (petAllowed) activeFilterCount++;
  } else if (isCommercialSpace) {
    if (frontage) activeFilterCount++;
    if (businessType) activeFilterCount++;
    if (floorsCount) activeFilterCount++;
    if (pcccCertified) activeFilterCount++;
    if (vatSupported) activeFilterCount++;
    if (wideSidewalk) activeFilterCount++;
    if (privateEntrance) activeFilterCount++;
    if (rentFreePeriod) activeFilterCount++;
  } else {
    if (petAllowed) activeFilterCount++;
    if (electricVehicle) activeFilterCount++;
    if (hasBalconyWindow) activeFilterCount++;
    if (hasElevator) activeFilterCount++;
    if (freeTime) activeFilterCount++;
  }

  const isPriceActive = minPrice > 0 || maxPrice < currentMaxPriceLimit;
  const minPercent = (minPrice / currentMaxPriceLimit) * 100;
  const maxPercent = (maxPrice / currentMaxPriceLimit) * 100;

  function getPriceLabel(min: number, max: number): string {
    const isMinSet = min > 0;
    const isMaxSet = max < currentMaxPriceLimit;
    if (!isMinSet && !isMaxSet) return 'Khoảng giá';
    if (isMinSet && isMaxSet) {
      return `${formatPriceNumber(min)} – ${formatPriceNumber(max)}`;
    }
    if (isMinSet) return `Từ ${formatPriceNumber(min)}`;
    return `Dưới ${formatPriceNumber(max)}`;
  }

  // University groupings
  const hanoiUnis = universities.filter((u) => {
    const isHanoi = u.region ? u.region === 'Hà Nội' : true;
    const isCD = u.category === 'cao_dang' || u.name.toLowerCase().includes('cao đẳng');
    return isHanoi && !isCD;
  });

  const hanoiColleges = universities.filter((u) => {
    const isHanoi = u.region ? u.region === 'Hà Nội' : true;
    const isCD = u.category === 'cao_dang' || u.name.toLowerCase().includes('cao đẳng');
    return isHanoi && isCD;
  });

  return (
    <form
      onSubmit={handleFilter}
      className="rounded-2xl md:rounded-[22px] border border-slate-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Title & Subtitle */}
      <div className="mb-3.5 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            {sectionTitle}
          </h2>
          {sectionSubtitle ? (
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              {sectionSubtitle}
            </p>
          ) : null}
        </div>

        {/* Quick segment badge indicator */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span className={`px-2.5 py-1 rounded-full border ${
            isApartment ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
            isCommercialSpace ? 'bg-amber-50 text-amber-700 border-amber-200' :
            'bg-brand-50 text-brand-800 border-brand-200'
          }`}>
            {isApartment ? 'Chung cư Pro' : isCommercialSpace ? 'Mặt bằng B2B' : 'Phòng trọ & CCMN'}
          </span>
        </div>
      </div>

      {/* Main Search Row */}
      <div className="grid grid-cols-2 lg:flex lg:items-center gap-2.5 sm:gap-3">
        {/* Search input */}
        <div className="relative col-span-2 lg:flex-[1.3] lg:min-w-[190px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder={placeholder}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleFilter(e);
              }
            }}
            className={`h-12 w-full rounded-xl border bg-white pl-10 pr-9 text-sm sm:text-[14.5px] text-slate-800 placeholder:text-slate-400 outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 hover:border-slate-300 ${
              keyword ? 'border-brand/40 bg-brand-50/20' : 'border-slate-200'
            }`}
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Xóa từ khóa"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* Location Dropdown */}
        <div className="relative col-span-1 lg:flex-[1.05] lg:min-w-[135px]">
          <select
            value={locationWard}
            onChange={(e) => setLocationWard(e.target.value)}
            className={`h-12 w-full appearance-none rounded-xl border bg-white pl-3.5 pr-8 text-sm sm:text-[14.5px] outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 hover:border-slate-300 cursor-pointer text-ellipsis overflow-hidden ${
              locationWard
                ? 'border-brand/50 text-brand font-medium bg-brand-50/30'
                : 'border-slate-200 text-slate-700'
            }`}
          >
            <option value="">Khu vực</option>
            {HANOI_DISTRICT_GROUPS.map((group) => (
              <optgroup key={group.districtSlug} label={group.district}>
                {group.wards.map((ward) => (
                  <option key={ward.slug} value={ward.slug}>
                    {ward.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Dropdown 2: Gần trường ĐH (Chỉ hiện khi ở chế độ Phòng trọ / CCMN) */}
        {isStudentRoomOrMini && (
          <div className="relative col-span-1 lg:flex-[1.25] lg:min-w-[160px]">
            <select
              value={universitySlug}
              onChange={(e) => setUniversitySlug(e.target.value)}
              aria-label="Gần trường ĐH / CĐ"
              className={`h-12 w-full appearance-none rounded-xl border bg-white pl-3.5 pr-8 text-sm sm:text-[14.5px] outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 hover:border-slate-300 cursor-pointer text-ellipsis overflow-hidden ${
                universitySlug
                  ? 'border-brand/50 text-brand font-medium bg-brand-50/30'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <option value="">Gần trường ĐH / CĐ</option>
              {hanoiUnis.length > 0 && (
                <optgroup label="── ĐẠI HỌC & HỌC VIỆN TẠI HÀ NỘI ──">
                  {hanoiUnis.map((uni) => (
                    <option key={uni.slug} value={uni.slug}>
                      {uni.abbreviation ? `[${uni.abbreviation}] ${uni.name}` : uni.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {hanoiColleges.length > 0 && (
                <optgroup label="── TRƯỜNG CAO ĐẲNG TẠI HÀ NỘI ──">
                  {hanoiColleges.map((col) => (
                    <option key={col.slug} value={col.slug}>
                      {col.abbreviation ? `[${col.abbreviation}] ${col.name}` : col.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Dropdown: Tên dự án (Chỉ hiện khi ở chế độ Chung cư) */}
        {isApartment && (
          <div className="relative col-span-1 lg:flex-[1.25] lg:min-w-[160px]">
            <select
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className={`h-12 w-full appearance-none rounded-xl border bg-white pl-3.5 pr-8 text-sm sm:text-[14.5px] outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 hover:border-slate-300 cursor-pointer text-ellipsis overflow-hidden ${
                projectName
                  ? 'border-brand/50 text-brand font-medium bg-brand-50/30'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <option value="">Dự án / Tòa nhà</option>
              {APARTMENT_PROJECT_SUGGESTIONS.map((proj) => (
                <option key={proj} value={proj}>
                  {proj}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Dropdown: Ngành nghề cho phép (Chỉ hiện khi ở chế độ Mặt bằng) */}
        {isCommercialSpace && (
          <div className="relative col-span-1 lg:flex-[1.25] lg:min-w-[160px]">
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              className={`h-12 w-full appearance-none rounded-xl border bg-white pl-3.5 pr-8 text-sm sm:text-[14.5px] outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 hover:border-slate-300 cursor-pointer text-ellipsis overflow-hidden ${
                businessType
                  ? 'border-brand/50 text-brand font-medium bg-brand-50/30'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <option value="">Ngành nghề phù hợp</option>
              <option value="fnb">Được làm F&B / Hàng ăn</option>
              <option value="cafe">Cafe / Đồ uống</option>
              <option value="thoi_trang">Thời trang / Showroom</option>
              <option value="van_phong">Văn phòng công ty</option>
              <option value="spa">Spa / Thẩm mỹ</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        )}

        {/* Dropdown Loại phòng */}
        <div className="relative col-span-1 lg:flex-1 lg:min-w-[130px]">
          <select
            value={propertyType}
            onChange={(e) => {
              setPropertyType(e.target.value);
            }}
            className={`h-12 w-full appearance-none rounded-xl border bg-white pl-3.5 pr-8 text-sm sm:text-[14.5px] outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 hover:border-slate-300 cursor-pointer text-ellipsis overflow-hidden ${
              propertyType
                ? 'border-brand/50 text-brand font-medium bg-brand-50/30'
                : 'border-slate-200 text-slate-700'
            }`}
          >
            {availablePropertyTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Dropdown Giá thuê với Range Slider */}
        <div className="relative col-span-1 lg:flex-1 lg:min-w-[145px]" ref={pricePopoverRef}>
          <button
            type="button"
            onClick={() => setIsPriceOpen(!isPriceOpen)}
            className={`h-12 w-full flex items-center justify-between rounded-xl border bg-white pl-3.5 pr-3 text-sm sm:text-[14.5px] outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 hover:border-slate-300 cursor-pointer ${
              isPriceActive
                ? 'border-brand/50 text-brand font-medium bg-brand-50/30'
                : 'border-slate-200 text-slate-700'
            }`}
          >
            <span className="truncate pr-1">
              {getPriceLabel(minPrice, maxPrice)}
            </span>
            <svg
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                isPriceOpen ? 'rotate-180 text-brand' : 'text-slate-400'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Range Slider Popover */}
          {isPriceOpen && (
            <div className="absolute left-0 sm:left-auto right-auto sm:right-0 top-full mt-2 z-40 w-[310px] sm:w-[360px] rounded-2xl bg-white p-4 sm:p-5 shadow-2xl border border-slate-200/90 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Khoảng giá thuê
                </span>
                <span className="text-xs sm:text-sm font-bold text-brand">
                  {isPriceActive
                    ? `${formatPriceNumber(minPrice)} – ${
                        maxPrice >= currentMaxPriceLimit ? `Trên ${formatPriceNumber(currentMaxPriceLimit)}` : formatPriceNumber(maxPrice)
                      }`
                    : 'Tất cả mức giá'}
                </span>
              </div>

              {/* Slider */}
              <div className="pt-5 pb-2">
                <div className="relative h-2 w-full rounded-full bg-slate-200">
                  <div
                    className="absolute h-2 rounded-full bg-brand transition-all duration-75"
                    style={{
                      left: `${minPercent}%`,
                      width: `${Math.max(0, maxPercent - minPercent)}%`,
                    }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={currentMaxPriceLimit}
                    step={currentPriceStep}
                    value={minPrice}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), maxPrice - currentPriceStep);
                      setMinPrice(val);
                    }}
                    className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none"
                    aria-label="Giá tối thiểu"
                  />
                  <input
                    type="range"
                    min={0}
                    max={currentMaxPriceLimit}
                    step={currentPriceStep}
                    value={maxPrice}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), minPrice + currentPriceStep);
                      setMaxPrice(val);
                    }}
                    className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none"
                    aria-label="Giá tối đa"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 select-none">
                  <span>0đ</span>
                  <span>{formatPriceNumber(Math.round(currentMaxPriceLimit / 3))}</span>
                  <span>{formatPriceNumber(Math.round((currentMaxPriceLimit * 2) / 3))}</span>
                  <span>{formatPriceNumber(currentMaxPriceLimit)}+</span>
                </div>
              </div>

              {/* Presets by Mode */}
              <div className="mt-2 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice(0);
                    setMaxPrice(currentMaxPriceLimit);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    minPrice === 0 && maxPrice === currentMaxPriceLimit
                      ? 'border-brand bg-brand-50 text-brand font-semibold'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tất cả
                </button>

                {isCommercialSpace ? (
                  [
                    { label: '10 – 20 triệu', min: 10000000, max: 20000000 },
                    { label: '20 – 40 triệu', min: 20000000, max: 40000000 },
                    { label: '40 – 70 triệu', min: 40000000, max: 70000000 },
                    { label: '> 70 triệu', min: 70000000, max: currentMaxPriceLimit },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMinPrice(preset.min);
                        setMaxPrice(preset.max);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        minPrice === preset.min && maxPrice === preset.max
                          ? 'border-brand bg-brand-50 text-brand font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))
                ) : isApartment ? (
                  [
                    { label: '5 – 10 triệu', min: 5000000, max: 10000000 },
                    { label: '10 – 15 triệu', min: 10000000, max: 15000000 },
                    { label: '15 – 25 triệu', min: 15000000, max: 25000000 },
                    { label: '25 – 40 triệu', min: 25000000, max: 40000000 },
                    { label: '> 40 triệu', min: 40000000, max: currentMaxPriceLimit },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMinPrice(preset.min);
                        setMaxPrice(preset.max);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        minPrice === preset.min && maxPrice === preset.max
                          ? 'border-brand bg-brand-50 text-brand font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))
                ) : (
                  [
                    { label: '< 3 triệu', min: 0, max: 3000000 },
                    { label: '3 – 5 triệu', min: 3000000, max: 5000000 },
                    { label: '5 – 10 triệu', min: 5000000, max: 10000000 },
                    { label: '10 – 15 triệu', min: 10000000, max: 15000000 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMinPrice(preset.min);
                        setMaxPrice(preset.max);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        minPrice === preset.min && maxPrice === preset.max
                          ? 'border-brand bg-brand-50 text-brand font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice(0);
                    setMaxPrice(currentMaxPriceLimit);
                  }}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Đặt lại
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPriceOpen(false);
                    handleFilter();
                  }}
                  className="text-xs font-bold text-white bg-brand hover:bg-brand-700 px-4 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <div className="col-span-2 lg:col-span-1 lg:shrink-0">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-12 w-full lg:w-auto items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand px-6 text-sm sm:text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-brand-700 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Đang tìm</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span>{isCommercialSpace ? 'Tìm mặt bằng' : isApartment ? 'Tìm căn hộ' : 'Tìm phòng'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Sub-Filter Row (Area & Specialized Selectors) ── */}
      <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
        {/* Diện tích Filter Chips */}
        <span className="text-xs font-semibold text-slate-500 mr-1">
          Diện tích:
        </span>
        {(isCommercialSpace ? [
          { label: '< 50m²', val: '<50' },
          { label: '50 – 100m²', val: '50-100' },
          { label: '100 – 200m²', val: '100-200' },
          { label: '> 200m²', val: '>200' },
        ] : isApartment ? [
          { label: '< 45m²', val: '<45' },
          { label: '45 – 70m²', val: '45-70' },
          { label: '70 – 100m²', val: '70-100' },
          { label: '> 100m²', val: '>100' },
        ] : [
          { label: '< 20m²', val: '<20' },
          { label: '20 – 30m²', val: '20-30' },
          { label: '> 30m²', val: '>30' },
        ]).map((item) => (
          <button
            key={item.val}
            type="button"
            onClick={() => setAreaRange(areaRange === item.val ? '' : item.val)}
            className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              areaRange === item.val
                ? 'border-brand bg-brand-50 text-brand font-semibold shadow-xs'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}

        {/* Mode-specific secondary selectors */}
        {isApartment && (
          <>
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-xs font-semibold text-slate-500 mr-1">Số PN:</span>
            {['Studio', '1PN', '2PN', '3PN+'].map((pn) => (
              <button
                key={pn}
                type="button"
                onClick={() => setBedrooms(bedrooms === pn ? '' : pn)}
                className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  bedrooms === pn
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pn}
              </button>
            ))}

            <span className="text-slate-300 mx-1 hidden sm:inline">|</span>
            <select
              value={furnishing}
              onChange={(e) => setFurnishing(e.target.value)}
              className="h-7 sm:h-8 px-2 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
            >
              <option value="">Nội thất</option>
              <option value="full">Full nội thất</option>
              <option value="co_ban">Nội thất cơ bản</option>
              <option value="trong">Nhà trống</option>
            </select>

            <select
              value={balconyDirection}
              onChange={(e) => setBalconyDirection(e.target.value)}
              className="h-7 sm:h-8 px-2 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
            >
              <option value="">Hướng ban công</option>
              {BALCONY_DIRECTIONS.map((dir) => (
                <option key={dir} value={dir}>{dir}</option>
              ))}
            </select>
          </>
        )}

        {isCommercialSpace && (
          <>
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-xs font-semibold text-slate-500 mr-1">Mặt tiền:</span>
            {['< 4m', '4m – 6m', '6m – 8m', '> 8m'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFrontage(frontage === m ? '' : m)}
                className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  frontage === m
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m}
              </button>
            ))}

            <span className="text-slate-300 mx-1 hidden sm:inline">|</span>
            <select
              value={floorsCount}
              onChange={(e) => setFloorsCount(e.target.value)}
              className="h-7 sm:h-8 px-2 rounded-lg text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
            >
              <option value="">Số tầng cho thuê</option>
              <option value="tang_tret">Chỉ tầng trệt (Tầng 1)</option>
              <option value="thong_san">Thông sàn 1–2 tầng</option>
              <option value="nguyen_can">Nguyên căn nhiều tầng</option>
            </select>
          </>
        )}
      </div>

      {/* ── Quick Filter Chips Row ── */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
            Tiêu chí ưu tiên:
          </span>

          {/* Video Chip (for all modes) */}
          <button
            type="button"
            onClick={() => setHasVideo(!hasVideo)}
            className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
              hasVideo
                ? 'border-rose-500 bg-rose-50 text-rose-700 font-semibold shadow-xs'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="text-[11px] font-bold">▶</span>
            <span>Có Video thực tế</span>
          </button>

          {/* Mode 1: Student room & CCMN Chips */}
          {isStudentRoomOrMini && (
            <>
              <button
                type="button"
                onClick={() => setPetAllowed(!petAllowed)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  petAllowed
                    ? 'border-brand bg-brand-50 text-brand font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {petAllowed && <span>✓</span>}
                <span>Nuôi thú cưng</span>
              </button>

              <button
                type="button"
                onClick={() => setElectricVehicle(!electricVehicle)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  electricVehicle
                    ? 'border-brand bg-brand-50 text-brand font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {electricVehicle && <span>✓</span>}
                <span>Sạc xe điện</span>
              </button>

              <button
                type="button"
                onClick={() => setHasBalconyWindow(!hasBalconyWindow)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  hasBalconyWindow
                    ? 'border-brand bg-brand-50 text-brand font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {hasBalconyWindow && <span>✓</span>}
                <span>Ban công/Cửa sổ lớn</span>
              </button>

              <button
                type="button"
                onClick={() => setHasElevator(!hasElevator)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  hasElevator
                    ? 'border-brand bg-brand-50 text-brand font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {hasElevator && <span>✓</span>}
                <span>Có thang máy</span>
              </button>

              <button
                type="button"
                onClick={() => setFreeTime(!freeTime)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  freeTime
                    ? 'border-brand bg-brand-50 text-brand font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {freeTime && <span>✓</span>}
                <span>Giờ giấc tự do</span>
              </button>
            </>
          )}

          {/* Mode 2: Apartment Chips */}
          {isApartment && (
            <>
              <button
                type="button"
                onClick={() => setHasCarParking(!hasCarParking)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  hasCarParking
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {hasCarParking && <span>✓</span>}
                <span>Có suất đỗ ô tô</span>
              </button>

              <button
                type="button"
                onClick={() => setMgmtFeeIncluded(!mgmtFeeIncluded)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  mgmtFeeIncluded
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {mgmtFeeIncluded && <span>✓</span>}
                <span>Bao phí quản lý</span>
              </button>

              <button
                type="button"
                onClick={() => setPetAllowed(!petAllowed)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  petAllowed
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {petAllowed && <span>✓</span>}
                <span>Cho nuôi thú cưng</span>
              </button>

              <button
                type="button"
                onClick={() => setForeignerEligible(!foreignerEligible)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  foreignerEligible
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {foreignerEligible && <span>✓</span>}
                <span>Cho người nước ngoài</span>
              </button>
            </>
          )}

          {/* Mode 3: Commercial Space Chips */}
          {isCommercialSpace && (
            <>
              <button
                type="button"
                onClick={() => setPcccCertified(!pcccCertified)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  pcccCertified
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pcccCertified && <span>✓</span>}
                <span>Có nghiệm thu PCCC</span>
              </button>

              <button
                type="button"
                onClick={() => setVatSupported(!vatSupported)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  vatSupported
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {vatSupported && <span>✓</span>}
                <span>Xuất hóa đơn VAT & GPKD</span>
              </button>

              <button
                type="button"
                onClick={() => setWideSidewalk(!wideSidewalk)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  wideSidewalk
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {wideSidewalk && <span>✓</span>}
                <span>Vỉa hè rộng đỗ xe</span>
              </button>

              <button
                type="button"
                onClick={() => setPrivateEntrance(!privateEntrance)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  privateEntrance
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {privateEntrance && <span>✓</span>}
                <span>Lối đi riêng</span>
              </button>

              <button
                type="button"
                onClick={() => setRentFreePeriod(!rentFreePeriod)}
                className={`inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                  rentFreePeriod
                    ? 'border-amber-600 bg-amber-50 text-amber-800 font-semibold shadow-xs'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {rentFreePeriod && <span>✓</span>}
                <span>Hỗ trợ ngày thi công (Rent-free)</span>
              </button>
            </>
          )}
        </div>

        {/* Reset Button */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-end shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-rose-50 cursor-pointer"
              title="Xóa tất cả bộ lọc đang chọn"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>Xóa bộ lọc ({activeFilterCount})</span>
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
