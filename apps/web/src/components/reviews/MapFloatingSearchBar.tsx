'use client';

import { useState, useEffect, useRef } from 'react';
import { HANOI_DISTRICT_GROUPS } from '@/lib/hanoi-wards';
import {
  getSearchHistory,
  addSearchHistory,
  removeSearchHistory,
  clearSearchHistory,
  type MapFilterParams,
} from '@/lib/map-rooms-data';

interface MapFloatingSearchBarProps {
  onSearch: (params: MapFilterParams) => void;
  totalFilteredCount: number;
}

type DropdownType = 'none' | 'filter' | 'amenities' | 'price' | 'history';

const MAX_PRICE_LIMIT = 30000000; // 30 triệu
const PRICE_STEP = 500000; // 500.000đ

function formatPriceNumber(val: number): string {
  if (val === 0) return '0đ';
  if (val >= 1000000) {
    const trieu = val / 1000000;
    return Number.isInteger(trieu) ? `${trieu} triệu` : `${trieu.toFixed(1)} triệu`;
  }
  return `${(val / 1000).toLocaleString('vi-VN')}k`;
}

function getPriceButtonLabel(min: number, max: number): string {
  if (min === 0 && max >= MAX_PRICE_LIMIT) return 'Khoảng giá';
  if (min === 0) return `< ${formatPriceNumber(max)}`;
  if (max >= MAX_PRICE_LIMIT) return `> ${formatPriceNumber(min)}`;
  return `${formatPriceNumber(min)} – ${formatPriceNumber(max)}`;
}

// Cập nhật theo yêu cầu: Căn hộ -> Chung cư, Nhà nguyên căn -> Mặt bằng kinh doanh, Xóa Ở ghép
const PROPERTY_TYPES = [
  { value: 'all', label: 'Tất cả loại phòng' },
  { value: 'phong_tro', label: 'Phòng trọ' },
  { value: 'chung_cu_mini', label: 'Chung cư mini' },
  { value: 'chung_cu', label: 'Chung cư' },
  { value: 'mat_bang', label: 'Mặt bằng kinh doanh' },
];

export const AMENITY_LIST = [
  // Hàng 1
  {
    key: 'balcony' as const,
    label: 'Ban công',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M5 10v9M9 10v9M13 10v9M17 10v9M21 10v9M3 19h18" />
      </svg>
    ),
  },
  {
    key: 'bunkBed' as const,
    label: 'Giường tầng',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4v16M21 4v16M3 9h18M3 16h18M7 9V4M7 16V9" />
      </svg>
    ),
  },
  {
    key: 'discount' as const,
    label: 'Giảm giá',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M3.5 12.5L12 4h7a1 1 0 011 1v7l-8.5 8.5a2.121 2.121 0 01-3 0l-5-5a2.121 2.121 0 010-3z" />
        <path strokeLinecap="round" d="M12 11l4 4M12 15h.01M16 11h.01" />
      </svg>
    ),
  },
  // Hàng 2
  {
    key: 'elevator' as const,
    label: 'Thang máy',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 3v18M14 3v18M7 8l1.5-1.5L10 8M7 16l1.5 1.5L10 16" />
      </svg>
    ),
  },
  {
    key: 'fridge' as const,
    label: 'Tủ lạnh',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path strokeLinecap="round" d="M6 9h12M9 5v2M9 13v3" />
      </svg>
    ),
  },
  {
    key: 'security247' as const,
    label: 'Bảo vệ 24/7',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 4.5v5.5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7.5L12 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  // Hàng 3
  {
    key: 'kitchen' as const,
    label: 'Bếp',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M5 19v-5a2 2 0 012-2h10a2 2 0 012 2v5M8 12V9a2 2 0 012-2h4a2 2 0 012 2v3M9 6a3 3 0 016 0" />
      </svg>
    ),
  },
  {
    key: 'dryingBalcony' as const,
    label: 'Ban công phơi',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4a2 2 0 012 2c0 1.5-2 2-2 3M3 13l9-5 9 5M6 11.5V20h12v-8.5" />
      </svg>
    ),
  },
  {
    key: 'mezzanine' as const,
    label: 'Giường gác lửng',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4v16M21 4v16M3 8h18M7 8v12M11 11v9M7 11h4M7 14h4M7 17h4" />
      </svg>
    ),
  },
  // Hàng 4
  {
    key: 'petsAllowed' as const,
    label: 'Cho phép thú cưng',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14c-1.5 0-3 .5-3 2.5 0 2 1.5 3.5 3 3.5s3-1.5 3-3.5c0-2-1.5-2.5-3-2.5zM6.5 12a2 2 0 100-4 2 2 0 000 4zM17.5 12a2 2 0 100-4 2 2 0 000 4zM10 7a2 2 0 100-4 2 2 0 000 4zM14 7a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    ),
  },
  {
    key: 'washingMachine' as const,
    label: 'Máy giặt',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="12" cy="13" r="4" />
        <circle cx="8" cy="6.5" r="1" fill="currentColor" />
        <circle cx="11" cy="6.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'wifi' as const,
    label: 'Wifi',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
      </svg>
    ),
  },
  // Hàng 5
  {
    key: 'window' as const,
    label: 'Cửa sổ',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" />
      </svg>
    ),
  },
  {
    key: 'electricVehicle' as const,
    label: 'Xe điện',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 18a3 3 0 100-6 3 3 0 000 6zM19 18a3 3 0 100-6 3 3 0 000 6zM8 15h8M12 15l-3-6h5l2 6M13 3l-2 4h3l-2 4" />
      </svg>
    ),
  },
  {
    key: 'foreigner' as const,
    label: 'Người nước ngoài',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  // Hàng 6
  {
    key: 'privateBathroom' as const,
    label: 'Vệ sinh riêng',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v5H7zM5 9h14v2a5 5 0 01-5 5h-4a5 5 0 01-5-5V9zM10 16v4M14 16v4M8 20h8" />
      </svg>
    ),
  },
  {
    key: 'dryer' as const,
    label: 'Máy sấy',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <circle cx="12" cy="13" r="4" strokeDasharray="3 3" />
        <path strokeLinecap="round" d="M10 13a2 2 0 014 0" />
        <circle cx="8" cy="6.5" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'waterHeater' as const,
    label: 'Máy nóng, lạnh',
    icon: (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h8a3 3 0 013 3v2M7 16v-4M9 14H5M16 16v-2M15 15h2M8 4v4M12 4v4" />
      </svg>
    ),
  },
] as const;

const DEFAULT_AMENITIES = {
  balcony: false,
  bunkBed: false,
  discount: false,
  elevator: false,
  fridge: false,
  security247: false,
  kitchen: false,
  dryingBalcony: false,
  mezzanine: false,
  petsAllowed: false,
  washingMachine: false,
  wifi: false,
  window: false,
  electricVehicle: false,
  foreigner: false,
  privateBathroom: false,
  dryer: false,
  waterHeater: false,
};

export function MapFloatingSearchBar({ onSearch, totalFilteredCount }: MapFloatingSearchBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [khuVuc, setKhuVuc] = useState('all');
  const [loaiPhong, setLoaiPhong] = useState('all');

  // Giá thuê dạng thanh kéo trượt (Dual Range Slider) giống bên mục tìm phòng
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE_LIMIT);

  const [amenities, setAmenities] = useState<typeof DEFAULT_AMENITIES>({ ...DEFAULT_AMENITIES });

  const [activeDropdown, setActiveDropdown] = useState<DropdownType>('none');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  useEffect(() => {
    setSearchHistory(getSearchHistory());
    setIsHistoryLoaded(true);
  }, []);

  // Đóng popover khi click ra ngoài vùng khung tìm kiếm
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown('none');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown('none');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleApplyFilter = (
    customQuery?: string,
    customKhuVuc?: string,
    customLoaiPhong?: string,
    customMinPrice?: number,
    customMaxPrice?: number,
    customAmenities?: typeof amenities
  ) => {
    const finalQuery = customQuery !== undefined ? customQuery : query;
    const finalKhuVuc = customKhuVuc !== undefined ? customKhuVuc : khuVuc;
    const finalLoaiPhong = customLoaiPhong !== undefined ? customLoaiPhong : loaiPhong;
    const finalMinPrice = customMinPrice !== undefined ? customMinPrice : minPrice;
    const finalMaxPrice = customMaxPrice !== undefined ? customMaxPrice : maxPrice;
    const finalAmenities = customAmenities !== undefined ? customAmenities : amenities;

    if (finalQuery.trim()) {
      const updated = addSearchHistory(finalQuery.trim());
      setSearchHistory(updated);
    }

    onSearch({
      query: finalQuery,
      khuVuc: finalKhuVuc,
      loaiPhong: finalLoaiPhong,
      minPrice: finalMinPrice,
      maxPrice: finalMaxPrice,
      amenities: finalAmenities,
    });
  };

  const handleSelectHistoryItem = (term: string) => {
    setQuery(term);
    setActiveDropdown('none');
    handleApplyFilter(term);
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, term: string) => {
    e.stopPropagation();
    const updated = removeSearchHistory(term);
    setSearchHistory(updated);
  };

  const handleClearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSearchHistory();
    setSearchHistory([]);
    setActiveDropdown('none');
  };

  const toggleAmenity = (key: keyof typeof amenities) => {
    const next = { ...amenities, [key]: !amenities[key] };
    setAmenities(next);
    handleApplyFilter(undefined, undefined, undefined, undefined, undefined, next);
  };

  const handleResetAmenities = () => {
    const reset = { ...DEFAULT_AMENITIES };
    setAmenities(reset);
    handleApplyFilter(undefined, undefined, undefined, undefined, undefined, reset);
  };

  const handleResetFilters = () => {
    setKhuVuc('all');
    setLoaiPhong('all');
    handleApplyFilter(undefined, 'all', 'all');
  };

  const isFilterActive = khuVuc !== 'all' || loaiPhong !== 'all';
  const activeAmenitiesCount = Object.values(amenities).filter(Boolean).length;
  const isAmenitiesActive = activeAmenitiesCount > 0;
  const isPriceActive = minPrice > 0 || maxPrice < MAX_PRICE_LIMIT;

  const minPercent = (minPrice / MAX_PRICE_LIMIT) * 100;
  const maxPercent = (maxPrice / MAX_PRICE_LIMIT) * 100;

  return (
    <div ref={containerRef} className="relative w-full max-w-[450px]">
      {/* Khung thẻ nổi trắng chuẩn bố trí Ảnh 1 */}
      <div className="w-full rounded-2xl bg-white p-3 sm:p-3.5 shadow-xl border border-slate-200/90 transition-all">
        {/* HÀNG 1: Ô nhập địa chỉ với icon MapPin bên trái + Nút tìm kiếm vuông góc bên phải (màu teal thương hiệu) */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            {/* Icon ghim vị trí (MapPin) như trong Ảnh 1 */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 21c-4.418-4.418-7-8.15-7-11.5a7 7 0 1114 0c0 3.35-2.582 7.082-7 11.5z"
                />
                <circle cx="12" cy="9.5" r="2.5" strokeWidth={1.8} />
              </svg>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (searchHistory.length > 0) {
                  setActiveDropdown('history');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setActiveDropdown('none');
                  handleApplyFilter();
                }
              }}
              placeholder="Nhập địa chỉ, đường, phường..."
              className="w-full h-11 pl-10 pr-8 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all font-normal"
            />

            {/* Nút ✕ xóa nhanh từ khóa */}
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  handleApplyFilter('');
                  inputRef.current?.focus();
                }}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title="Xóa từ khóa"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Nút tìm kiếm icon kính lúp chuẩn Ảnh 1 — Chỉnh màu Vàng Gold đồng bộ màu chủ đạo website */}
          <button
            type="button"
            onClick={() => {
              setActiveDropdown('none');
              handleApplyFilter();
            }}
            className="h-11 w-11 shrink-0 rounded-xl bg-brand hover:bg-brand-700 active:scale-95 text-white flex items-center justify-center shadow-sm shadow-brand/25 transition-all cursor-pointer"
            title="Tìm kiếm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* HÀNG 2: 3 nút ngang theo đúng bố cục Ảnh 1: [Bộ lọc] [Tiện ích ⌄] [Khoảng giá ⌄] */}
        <div className="mt-2.5 flex items-center gap-2">
          {/* Nút 1: Bộ lọc (Icon Sliders) */}
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'filter' ? 'none' : 'filter')}
            className={`flex-1 h-10 px-2.5 sm:px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              isFilterActive || activeDropdown === 'filter'
                ? 'border-brand text-brand bg-brand-50/50 font-semibold shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
            }`}
          >
            {/* Icon bộ lọc gạt ngang như Ảnh 1 */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} d="M3 6h6m4 0h8M3 12h12m4 0h2M3 18h6m4 0h8M9 4v4m6 2v4m-6 2v4" />
            </svg>
            <span>Bộ lọc</span>
            {isFilterActive && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
          </button>

          {/* Nút 2: Tiện ích (Icon Bed + Chevron) */}
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'amenities' ? 'none' : 'amenities')}
            className={`flex-1 h-10 px-2.5 sm:px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              isAmenitiesActive || activeDropdown === 'amenities'
                ? 'border-brand text-brand bg-brand-50/50 font-semibold shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
            }`}
          >
            {/* Icon giường tiện ích như Ảnh 1 */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 6v13M21 10v9M3 14h18M6 14V9a2 2 0 012-2h3a2 2 0 012 2v5" />
            </svg>
            <span>Tiện ích</span>
            {activeAmenitiesCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                {activeAmenitiesCount}
              </span>
            )}
            <svg
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                activeDropdown === 'amenities' ? 'rotate-180 text-brand' : 'text-slate-500'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Nút 3: Khoảng giá (Icon Tag + Chevron) — hiển thị nhãn khoảng giá linh hoạt */}
          <button
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'price' ? 'none' : 'price')}
            className={`flex-1 h-10 px-2.5 sm:px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
              isPriceActive || activeDropdown === 'price'
                ? 'border-brand text-brand bg-brand-50/50 font-semibold shadow-xs'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300'
            }`}
          >
            {/* Icon thẻ giá như Ảnh 1 */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M3 12.414l8.586 8.586a2 2 0 002.828 0l7.172-7.172a2 2 0 000-2.828L13 2.414A2 2 0 0011.586 2H4a2 2 0 00-2 2v7.586a2 2 0 00.586 1.414z" />
            </svg>
            <span className="truncate">
              {getPriceButtonLabel(minPrice, maxPrice)}
            </span>
            <svg
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                activeDropdown === 'price' ? 'rotate-180 text-brand' : 'text-slate-500'
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* POPUP 1: LỊCH SỬ TÌM KIẾM (Hiển thị khi focus ô tìm kiếm) */}
      {activeDropdown === 'history' && isHistoryLoaded && searchHistory.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Lịch sử tìm kiếm</span>
            </div>
            <button
              type="button"
              onClick={handleClearAllHistory}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Xóa tất cả
            </button>
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {searchHistory.map((term) => (
              <div
                key={term}
                onClick={() => handleSelectHistoryItem(term)}
                className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-brand-50/50 text-xs font-medium text-slate-700 cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="truncate group-hover:text-brand">{term}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleRemoveHistoryItem(e, term)}
                  className="w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-slate-100 transition-colors shrink-0 ml-1"
                  title="Xóa mục này"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* POPUP 2: BỘ LỌC NÂNG CAO (Khu vực, Loại phòng: Phòng trọ, Chung cư mini, Chung cư, Mặt bằng kinh doanh) */}
      {activeDropdown === 'filter' && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Bộ lọc tìm phòng</h3>
            <button
              type="button"
              onClick={() => setActiveDropdown('none')}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {/* Lọc theo Khu vực */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Khu vực (Hà Nội)
              </label>
              <select
                value={khuVuc}
                onChange={(e) => {
                  const val = e.target.value;
                  setKhuVuc(val);
                  handleApplyFilter(undefined, val);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs sm:text-sm font-medium text-slate-700 hover:border-slate-300 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none cursor-pointer transition-all"
              >
                <option value="all">Tất cả khu vực</option>
                {HANOI_DISTRICT_GROUPS.map((grp) => (
                  <option key={grp.districtSlug} value={grp.district}>
                    {grp.district}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc theo Loại phòng: Đã cập nhật Chung cư, Mặt bằng kinh doanh, loại bỏ Ở ghép */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Loại phòng
              </label>
              <select
                value={loaiPhong}
                onChange={(e) => {
                  const val = e.target.value;
                  setLoaiPhong(val);
                  handleApplyFilter(undefined, undefined, val);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs sm:text-sm font-medium text-slate-700 hover:border-slate-300 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none cursor-pointer transition-all"
              >
                {PROPERTY_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Đặt lại
            </button>
            <button
              type="button"
              onClick={() => setActiveDropdown('none')}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-700 text-white text-xs font-bold shadow-sm shadow-brand/20 transition-all cursor-pointer"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}

      {/* POPUP 3: TIỆN NGHI (Vị trí và kích thước đồng bộ như Bộ lọc và Khoảng giá) */}
      {activeDropdown === 'amenities' && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 sm:p-4.5 animate-in fade-in slide-in-from-top-1 duration-150 max-h-[calc(100vh-140px)] overflow-y-auto">
          {/* Header: Tiêu đề Tiện nghi & nút đóng ✕ */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Tiện nghi</h3>
            <button
              type="button"
              onClick={() => setActiveDropdown('none')}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
              title="Đóng"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Grid 3 cột x 6 hàng = 18 tiện nghi chuẩn theo ảnh */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {AMENITY_LIST.map((item) => {
              const active = amenities[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleAmenity(item.key)}
                  className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 sm:py-2.5 rounded-2xl border text-[11px] sm:text-xs font-semibold text-left transition-all cursor-pointer select-none min-w-0 ${
                    active
                      ? 'border-[#5B487A] bg-[#F2EEF8] text-[#332247] shadow-2xs ring-1 ring-[#5B487A]/25'
                      : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className={`shrink-0 transition-colors [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-4.5 sm:[&>svg]:h-4.5 ${active ? 'text-[#5B487A]' : 'text-slate-600'}`}>
                    {item.icon}
                  </span>
                  <span className="truncate leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Buttons: Xóa lựa chọn (trái) & Xác nhận (phải) */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleResetAmenities}
              className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
            >
              Xóa lựa chọn
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveDropdown('none');
                handleApplyFilter();
              }}
              className="px-6 sm:px-7 py-2 sm:py-2.5 rounded-2xl bg-[#4C3B65] hover:bg-[#3D2E53] text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}

      {/* POPUP 4: KHOẢNG GIÁ THUÊ DẠNG THANH KÉO TRƯỢT (DUAL RANGE SLIDER GIỐNG MỤC TÌM PHÒNG) */}
      {activeDropdown === 'price' && (
        <div className="absolute top-full left-0 right-0 sm:left-auto sm:right-0 mt-2 z-50 w-full sm:w-[360px] bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs sm:text-sm font-bold text-slate-800">
              Khoảng giá thuê
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-brand">
                {isPriceActive
                  ? `${formatPriceNumber(minPrice)} – ${
                      maxPrice >= MAX_PRICE_LIMIT ? 'Trên 30 triệu' : formatPriceNumber(maxPrice)
                    }`
                  : 'Tất cả mức giá'}
              </span>
              <button
                type="button"
                onClick={() => setActiveDropdown('none')}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>
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

            {/* Mốc hiển thị dưới thanh trượt */}
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
                      ? 'border-brand bg-brand-50 text-brand font-semibold shadow-xs'
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
                handleApplyFilter(undefined, undefined, undefined, 0, MAX_PRICE_LIMIT);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Đặt lại
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveDropdown('none');
                handleApplyFilter(undefined, undefined, undefined, minPrice, maxPrice);
              }}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-700 text-white text-xs font-bold shadow-sm shadow-brand/20 transition-all cursor-pointer"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
