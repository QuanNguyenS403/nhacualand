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
  basePath: string; // '/thue', '/cho-thue-tro', '/cho-thue-mat-bang'
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
  { value: '', label: 'Loại phòng' },
  { value: 'phong_tro', label: 'Phòng trọ' },
  { value: 'can_ho', label: 'Chung cư' },
  { value: 'chung_cu_mini', label: 'Chung cư mini' },
  { value: 'mat_bang', label: 'Mặt bằng kinh doanh' },
];

export const PROPERTY_TYPES_CAN_HO = PROPERTY_TYPES_STANDARD;
export const PROPERTY_TYPES_STUDIO = PROPERTY_TYPES_STANDARD;
const PROPERTY_TYPES = PROPERTY_TYPES_STANDARD;

const DEFAULT_UNIVERSITIES: UniversityOption[] = VIETNAM_UNIVERSITIES;

const MAX_PRICE_LIMIT = 30000000; // 30 triệu VNĐ
const PRICE_STEP = 500000; // 500.000đ

function formatPriceNumber(num: number): string {
  if (num >= 1000000) {
    const val = num / 1000000;
    return val % 1 === 0 ? `${val} triệu` : `${val.toFixed(1)} triệu`;
  }
  if (num > 0) {
    return `${Math.round(num / 1000)}k`;
  }
  return '0đ';
}

function getPriceButtonLabel(min: number, max: number): string {
  const isMinSet = min > 0;
  const isMaxSet = max < MAX_PRICE_LIMIT;
  if (!isMinSet && !isMaxSet) return 'Giá thuê';
  if (isMinSet && isMaxSet) {
    return `${formatPriceNumber(min)} – ${formatPriceNumber(max)}`;
  }
  if (isMinSet) return `Từ ${formatPriceNumber(min)}`;
  return `Dưới ${formatPriceNumber(max)}`;
}

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

  const [keyword, setKeyword] = useState(initialParams.keyword ?? '');
  const [propertyType, setPropertyType] = useState(initialParams.propertyType ?? '');
  const [locationWard, setLocationWard] = useState(
    initialParams.locationSlug ?? initialParams.ward ?? ''
  );
  const [universitySlug, setUniversitySlug] = useState(
    initialParams.universitySlug ?? ''
  );
  const [petAllowed, setPetAllowed] = useState(initialParams.petAllowed === 'true');
  const [electricVehicle, setElectricVehicle] = useState(initialParams.electricVehicle === 'true');

  // Khoảng giá với thanh kéo (Price Range Slider)
  const initialMinPrice = (() => {
    const raw = Number(initialParams.priceMin);
    return !isNaN(raw) && raw >= 0 && raw <= MAX_PRICE_LIMIT ? raw : 0;
  })();
  const initialMaxPrice = (() => {
    const raw = Number(initialParams.priceMax);
    return !isNaN(raw) && raw >= 0 && raw <= MAX_PRICE_LIMIT ? raw : MAX_PRICE_LIMIT;
  })();

  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [isPriceOpen, setIsPriceOpen] = useState(false);
  const pricePopoverRef = useRef<HTMLDivElement>(null);

  // Đóng popover khi click ra ngoài
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

  const availablePropertyTypes = propPropertyTypes ?? PROPERTY_TYPES_STANDARD;

  // Tính toán Tiêu đề & Subtitle đồng bộ theo các mục ở trang chủ (Chung cư, CCMN, Phòng trọ SV, Mặt bằng)
  const sectionTitle = (() => {
    if (propTitle) return propTitle;
    const group = initialParams.categoryGroup;
    if (group === 'thue_can_ho') return 'Chung cư';
    if (group === 'thue_studio') return 'Chung cư mini (CCMN)';
    if (group === 'thue_tro' || basePath === '/cho-thue-tro') return 'Phòng trọ sinh viên';
    if (group === 'thue_mat_bang' || basePath === '/cho-thue-mat-bang') return 'Mặt bằng kinh doanh';
    if (propertyType) {
      const match = availablePropertyTypes.find((p) => p.value === propertyType);
      if (match && match.value && match.label) return match.label;
    }
    return 'Bộ lọc tìm kiếm';
  })();

  const sectionSubtitle = propSubtitle || '';


  // Nhãn rút gọn cho các dropdown mặc định
  const displayPropertyTypes = availablePropertyTypes.map((t, idx) =>
    idx === 0 ? { ...t, label: 'Loại phòng' } : t,
  );

  function handleFilter(
    e?: React.FormEvent,
    overridePrices?: { min?: number; max?: number },
  ) {
    if (e) e.preventDefault();
    const params = new URLSearchParams();

    // Giữ nguyên categoryGroup và locationId nếu có
    if (initialParams.locationId) params.set('locationId', initialParams.locationId);
    if (initialParams.categoryGroup) params.set('categoryGroup', initialParams.categoryGroup);
    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (locationWard) params.set('locationSlug', locationWard);
    if (universitySlug) params.set('universitySlug', universitySlug);
    if (propertyType) params.set('propertyType', propertyType);
    if (petAllowed) params.set('petAllowed', 'true');
    if (electricVehicle) params.set('electricVehicle', 'true');

    const effectiveMin = overridePrices?.min !== undefined ? overridePrices.min : minPrice;
    const effectiveMax = overridePrices?.max !== undefined ? overridePrices.max : maxPrice;

    if (effectiveMin > 0) params.set('priceMin', String(effectiveMin));
    if (effectiveMax < MAX_PRICE_LIMIT) params.set('priceMax', String(effectiveMax));

    // Reset về trang 1 khi lọc mới
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
    setPetAllowed(false);
    setElectricVehicle(false);
    setMinPrice(0);
    setMaxPrice(MAX_PRICE_LIMIT);
    setIsPriceOpen(false);

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

  // Đếm số lượng điều kiện lọc đang kích hoạt
  let activeFilterCount = 0;
  if (keyword.trim()) activeFilterCount++;
  if (locationWard) activeFilterCount++;
  if (universitySlug) activeFilterCount++;
  if (propertyType) activeFilterCount++;
  if (minPrice > 0 || maxPrice < MAX_PRICE_LIMIT) activeFilterCount++;
  if (petAllowed) activeFilterCount++;
  if (electricVehicle) activeFilterCount++;

  const isPriceActive = minPrice > 0 || maxPrice < MAX_PRICE_LIMIT;
  const minPercent = (minPrice / MAX_PRICE_LIMIT) * 100;
  const maxPercent = (maxPrice / MAX_PRICE_LIMIT) * 100;

  // Phân chia trường Đại học & Học viện vs Trường Cao đẳng tại Hà Nội
  const hanoiUnis = universities.filter((u) => {
    const isHanoi = u.region ? u.region === 'Hà Nội' : true;
    const isCĐ = u.category === 'cao_dang' || u.name.toLowerCase().includes('cao đẳng');
    return isHanoi && !isCĐ;
  });

  const hanoiColleges = universities.filter((u) => {
    const isHanoi = u.region ? u.region === 'Hà Nội' : true;
    const isCĐ = u.category === 'cao_dang' || u.name.toLowerCase().includes('cao đẳng');
    return isHanoi && isCĐ;
  });

  return (
    <form
      onSubmit={handleFilter}
      className="rounded-2xl md:rounded-[22px] border border-slate-200 bg-white p-4 sm:p-5 md:p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Tiêu đề & Subtitle đồng bộ theo các mục trang chủ (Chung cư, CCMN, Phòng trọ SV, Mặt bằng) */}
      <div className="mb-3.5 sm:mb-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          {sectionTitle}
        </h2>
        {sectionSubtitle ? (
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {sectionSubtitle}
          </p>
        ) : null}
      </div>

      {/* Hàng tìm kiếm chính: Search, Khu vực, Gần trường ĐH / CĐ, Loại phòng, Khoảng giá & Nút Tìm phòng */}
      <div className="grid grid-cols-2 lg:flex lg:items-center gap-2.5 sm:gap-3">
        {/* Search Input lớn nổi bật */}
        <div className="relative col-span-2 lg:flex-[1.35] lg:min-w-[195px]">
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

        {/* Dropdown 1: Khu vực — Tất cả các phường thuộc thành phố Hà Nội */}
        <div className="relative col-span-1 lg:flex-[1.05] lg:min-w-[140px]">
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

        {/* Dropdown 2: Gần trường ĐH / CĐ — Toàn bộ các trường ĐH, Học viện & CĐ tại Hà Nội */}
        <div className="relative col-span-1 lg:flex-[1.25] lg:min-w-[170px]">
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
            {hanoiUnis.length === 0 && hanoiColleges.length === 0 && (
              universities.map((uni) => (
                <option key={uni.slug} value={uni.slug}>
                  {uni.abbreviation ? `[${uni.abbreviation}] ${uni.name}` : uni.name}
                </option>
              ))
            )}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Dropdown 3: Loại phòng */}
        <div className="relative col-span-1 lg:flex-1 lg:min-w-[130px]">
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className={`h-12 w-full appearance-none rounded-xl border bg-white pl-3.5 pr-8 text-sm sm:text-[14.5px] outline-none transition-all duration-150 focus:border-brand focus:ring-2 focus:ring-brand/20 hover:border-slate-300 cursor-pointer text-ellipsis overflow-hidden ${
              propertyType
                ? 'border-brand/50 text-brand font-medium bg-brand-50/30'
                : 'border-slate-200 text-slate-700'
            }`}
          >
            {displayPropertyTypes.map((t) => (
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

        {/* Dropdown 3: Giá thuê dạng Thanh Kéo Khoảng Giá (Range Slider Popover) */}
        <div className="relative col-span-1 lg:flex-1 lg:min-w-[150px]" ref={pricePopoverRef}>
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
              {getPriceButtonLabel(minPrice, maxPrice)}
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

          {/* Khung Popover Thanh Kéo Khoảng Giá */}
          {isPriceOpen && (
            <div className="absolute left-0 sm:left-auto right-auto sm:right-0 top-full mt-2 z-40 w-[310px] sm:w-[360px] rounded-2xl bg-white p-4 sm:p-5 shadow-2xl border border-slate-200/90 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs sm:text-sm font-bold text-slate-900">
                  Khoảng giá thuê
                </span>
                <span className="text-xs sm:text-sm font-bold text-brand">
                  {isPriceActive
                    ? `${formatPriceNumber(minPrice)} – ${
                        maxPrice >= MAX_PRICE_LIMIT ? 'Trên 30 triệu' : formatPriceNumber(maxPrice)
                      }`
                    : 'Tất cả mức giá'}
                </span>
              </div>

              {/* Thanh kéo kép (Dual Range Slider) */}
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
                    max={MAX_PRICE_LIMIT}
                    step={PRICE_STEP}
                    value={minPrice}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), maxPrice - PRICE_STEP);
                      setMinPrice(val);
                    }}
                    className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-brand [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                    aria-label="Giá tối thiểu"
                  />
                  <input
                    type="range"
                    min={0}
                    max={MAX_PRICE_LIMIT}
                    step={PRICE_STEP}
                    value={maxPrice}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), minPrice + PRICE_STEP);
                      setMaxPrice(val);
                    }}
                    className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 w-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-brand [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none"
                    aria-label="Giá tối đa"
                  />
                </div>

                {/* Hiển thị khoảng giá dưới thanh trượt */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 select-none">
                  <span>0đ</span>
                  <span>10 triệu</span>
                  <span>20 triệu</span>
                  <span>30+ triệu</span>
                </div>
              </div>

              {/* Các mốc giá gợi ý nhanh */}
              <div className="mt-2 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                {[
                  { label: 'Tất cả', min: 0, max: MAX_PRICE_LIMIT },
                  { label: '< 3 triệu', min: 0, max: 3000000 },
                  { label: '3 – 5 triệu', min: 3000000, max: 5000000 },
                  { label: '5 – 10 triệu', min: 5000000, max: 10000000 },
                  { label: '10 – 20 triệu', min: 10000000, max: 20000000 },
                  { label: '> 20 triệu', min: 20000000, max: MAX_PRICE_LIMIT },
                ].map((preset) => {
                  const isSelected = minPrice === preset.min && maxPrice === preset.max;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMinPrice(preset.min);
                        setMaxPrice(preset.max);
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand bg-brand-50 text-brand font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Nút hành động trong popover */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice(0);
                    setMaxPrice(MAX_PRICE_LIMIT);
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

        {/* CTA: Nút Bộ lọc tìm kiếm đồng bộ chiều cao và nằm cùng hàng trên desktop */}
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
                <span>Đang tìm...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <span>Bộ lọc tìm kiếm</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Khu vực Bộ lọc thêm (Nuôi thú cưng, Sạc xe điện) & Đặt lại (Đã xóa Bao điện nước theo yêu cầu) */}
      <div className="mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
        {/* Nhóm Bộ lọc thêm: 2 mục Nuôi thú cưng, Sạc xe điện */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs sm:text-sm font-medium text-slate-500 whitespace-nowrap">
            Bộ lọc thêm:
          </span>

          {/* Mục 1: Nuôi thú cưng */}
          <button
            type="button"
            onClick={() => setPetAllowed(!petAllowed)}
            className={`inline-flex items-center gap-1.5 h-9 rounded-full px-3.5 text-xs sm:text-sm font-medium transition-all duration-150 border cursor-pointer ${
              petAllowed
                ? 'border-brand bg-brand-50 text-brand font-semibold shadow-xs'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            {petAllowed && (
              <svg className="w-3.5 h-3.5 text-brand" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <span>Nuôi thú cưng</span>
          </button>

          {/* Mục 2: Sạc xe điện */}
          <button
            type="button"
            onClick={() => setElectricVehicle(!electricVehicle)}
            className={`inline-flex items-center gap-1.5 h-9 rounded-full px-3.5 text-xs sm:text-sm font-medium transition-all duration-150 border cursor-pointer ${
              electricVehicle
                ? 'border-brand bg-brand-50 text-brand font-semibold shadow-xs'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
            }`}
          >
            {electricVehicle && (
              <svg className="w-3.5 h-3.5 text-brand" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <span>Sạc xe điện</span>
          </button>
        </div>

        {/* Nút Xóa bộ lọc (chỉ hiện khi có filter active) */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors py-1.5 px-3 rounded-lg hover:bg-rose-50 cursor-pointer"
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
