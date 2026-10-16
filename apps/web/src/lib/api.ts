import type { ListingMapPin } from '@qns/shared';
export type { ListingMapPin };

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL !== undefined
  ? process.env.NEXT_PUBLIC_API_URL
  : (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');

const API_URL = typeof window === 'undefined'
  ? (process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000')
  : rawApiUrl;

export interface UniversityItem {
  id: number;
  name: string;
  abbreviation: string | null;
  slug: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  activeListingCount?: number;
}

export interface Listing {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  transactionType: 'rent';
  propertyType: string;
  price: string;
  depositAmount?: string | number | null;
  minLeaseMonths?: number | null;
  utilitiesIncluded?: boolean;
  electricityPricePerKwh?: number | null;
  waterPricePerM3?: number | null;
  waterPriceFlat?: number | null;
  amenities?: Record<string, any> | null;
  areaM2: string;
  bedrooms: number | null;
  bathrooms: number | null;
  legalStatus: string | null;
  addressDetail: string | null;
  lat?: number | null;
  lng?: number | null;
  distanceMeters?: number | null;
  distanceText?: string | null;
  status: string;
  rejectionReason?: string | null;
  verificationStatus?: 'chua_xac_thuc' | 'cho_xac_thuc' | 'da_xac_thuc';
  verifiedAt?: string | null;
  publishedAt: string | null;
  refreshedAt?: string | null;
  createdAt?: string;
  viewCount: number;
  images: { imageUrl: string; sortOrder: number }[];
  location: { id: number; name: string; slug: string; level: string };
  project: { id: string; name: string; slug: string } | null;
  owner: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    createdAt: string;
    isPhoneVerified?: boolean;
    isIdVerified?: boolean;
  };
  nearbyUniversities?: {
    distanceMeters: number | null;
    travelTimeMinutes: number | null;
    university: {
      id: number;
      name: string;
      abbreviation: string | null;
      slug: string;
      address?: string | null;
    };
  }[];
}

export interface ListingListResponse {
  items: Listing[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

// Circuit breaker: bảo vệ SSR và giảm thời gian tải trang từ 4s xuống 0ms khi DB/API ngoại tuyến
let isCircuitOpen = false;
let lastFailureTimestamp = 0;
const CIRCUIT_BREAKER_COOLDOWN_MS = 20000; // 20 giây thăm dò lại 1 lần nếu backend lỗi

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const now = Date.now();
  if (isCircuitOpen && now - lastFailureTimestamp < CIRCUIT_BREAKER_COOLDOWN_MS) {
    throw new Error('API_CIRCUIT_OPEN: Backend tạm thời ngoại tuyến');
  }

  // Chống treo SSR nếu backend phản hồi chậm (timeout 1.2s tối đa thay vì 3.5s)
  const signal = init?.signal ?? AbortSignal.timeout(1200);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      // Trang danh sách/chi tiết cần dữ liệu tương đối mới — cache ngắn 60s (ISR-style) thay vì always dynamic hoàn toàn.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      if (res.status === 404) throw new Error('NOT_FOUND');
      if (res.status >= 500) {
        isCircuitOpen = true;
        lastFailureTimestamp = Date.now();
      }
      throw new Error(`API lỗi (${res.status})`);
    }

    isCircuitOpen = false;
    return (await res.json()) as T;
  } catch (err: any) {
    if (err?.message !== 'NOT_FOUND') {
      isCircuitOpen = true;
      lastFailureTimestamp = Date.now();
    }
    throw err;
  }
}

export async function fetchListings(searchParams: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const res = await apiFetch<ListingListResponse>(`/listings?${query.toString()}`);
  if (res && Array.isArray(res.items)) {
    res.items = res.items.map((item) => ({
      ...item,
      title: item.title ? item.title.replace(/^\[MẪU\]\s*/i, '').replace(/\[MẪU\]/gi, '').trim() : item.title,
    }));
  }
  return res;
}

export async function fetchListingBySlug(slug: string) {
  const res = await apiFetch<Listing>(`/listings/${slug}`);
  if (res && res.title) {
    res.title = res.title.replace(/^\[MẪU\]\s*/i, '').replace(/\[MẪU\]/gi, '').trim();
  }
  return res;
}

export interface MapPinsQuery {
  bbox?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  amenities?: string;
  updatedSince?: string;
  ownerId?: string;
  limit?: number;
}

export async function fetchMapPins(params?: MapPinsQuery): Promise<ListingMapPin[]> {
  const query = new URLSearchParams();
  if (params?.bbox) query.set('bbox', params.bbox);
  if (params?.propertyType) query.set('propertyType', params.propertyType);
  if (params?.minPrice !== undefined) query.set('minPrice', String(params.minPrice));
  if (params?.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
  if (params?.amenities) query.set('amenities', params.amenities);
  if (params?.updatedSince) query.set('updatedSince', params.updatedSince);
  if (params?.ownerId) query.set('ownerId', params.ownerId);
  if (params?.limit !== undefined) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = qs ? `/listings/map?${qs}` : '/listings/map';
  return apiFetch<ListingMapPin[]>(url, { next: { revalidate: 10 } });
}

export function fetchUniversities(params?: { locationSlug?: string; keyword?: string }) {
  const query = new URLSearchParams();
  if (params?.locationSlug) query.set('locationSlug', params.locationSlug);
  if (params?.keyword) query.set('keyword', params.keyword);
  return apiFetch<UniversityItem[]>(`/universities?${query.toString()}`);
}

/**
 * Format giá chính xác theo số nguyên VNĐ đầy đủ (P0-08, AF-02).
 * Dùng bắt buộc cho các màn hình tài chính, admin duyệt gói, thanh toán, chi tiết tiền cọc/điện/nước.
 */
export function formatExactPrice(price: string | number | bigint | null | undefined): string {
  if (price === null || price === undefined) return '0 đ';
  const value = typeof price === 'bigint' ? Number(price) : typeof price === 'string' ? Number(price) : price;
  if (isNaN(value)) return '0 đ';
  return `${value.toLocaleString('vi-VN')} đ`;
}

/**
 * Format giá hiển thị rút gọn cho thẻ danh sách tin đăng.
 * Đã sửa lỗi P0-08: Giữ tối đa 2 chữ số thập phân thay vì Math.round làm tròn mất 498.500 đ thành 1 triệu.
 */
export function formatPrice(price: string | number | bigint | null | undefined): string {
  if (price === null || price === undefined) return 'Thoả thuận';
  const value = typeof price === 'bigint' ? Number(price) : typeof price === 'string' ? Number(price) : price;
  if (!value || value <= 0) return 'Thoả thuận';

  if (value >= 1_000_000_000) {
    const ty = Math.floor(value / 1_000_000_000);
    const du = value % 1_000_000_000;
    if (du === 0) return `${ty} tỷ`;
    const trieuFormatted = (du / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return `${ty} tỷ ${trieuFormatted} tr`;
  }

  if (value >= 1_000_000) {
    const trieu = value / 1_000_000;
    // Nếu là số nguyên triệu (3.000.000 -> 3 triệu), nếu lẻ (1.498.500 -> 1,5 triệu)
    const formatted = trieu.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return `${formatted} triệu`;
  }

  return `${value.toLocaleString('vi-VN')} đ`;
}

export interface MembershipPlanItem {
  id: number;
  name: string;
  code: string;
  description: string | null;
  originalPrice: number;
  currentPrice: number;
  priceMultiplier: number;
  durationDays: number;
  maxActiveListings: number;
  regionScope: string;
  isFeatured: boolean;
  isSurgeActive: boolean;
}

export interface PricingSeasonItem {
  id: number;
  name: string;
  priceMultiplier: number;
  startDate: string;
  endDate: string;
  description: string | null;
  isActive?: boolean;
}

export interface PublicPlansResponse {
  plans: MembershipPlanItem[];
  activeSeason: PricingSeasonItem | null;
}

export interface UserMembershipInfo {
  hasActivePlan: boolean;
  plan: {
    id?: number;
    name: string;
    code: string;
    maxActiveListings: number;
    durationDays: number;
    regionScope?: string;
  };
  activeListingsCount: number;
  maxActiveListings: number;
  remainingSlots: number;
  canPostMore: boolean;
  startDate?: string | null;
  expiresAt?: string | null;
}

export function fetchPublicPlans() {
  return apiFetch<PublicPlansResponse>('/memberships/plans', { next: { revalidate: 30 } });
}

