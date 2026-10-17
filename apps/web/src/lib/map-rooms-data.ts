import type { ListingMapPin } from '@qns/shared';
import rawReviewsData from '../../data/nhaminhbach-reviews-899.json';
import { removeDiacritics } from './reviews-types';
import { ALL_DEMO_LISTINGS } from './demo-data';

export interface RoomReview {
  id: string;
  authorName: string;
  authorRole: string;
  rating: number;
  content: string;
  createdAt: string;
  tags?: string[];
  isWarning?: boolean;
}

export interface MapRoom extends ListingMapPin {
  maskedAddress: string;
  rawAddress?: string;
  images: string[];
  rating?: number;
  reviewCount?: number;
  reviews?: RoomReview[];
  electricityPricePerKwh?: number;
  waterPrice?: string;
  isCustom?: boolean;
  isDemo?: boolean;
  isOwnerListing?: boolean;
  isOwnerPending?: boolean;
}

export interface CommunityReviewPin {
  id: string;
  shortId: string;
  lat: number;
  lng: number;
  rating: number;
  content: string;
  addressRaw: string;
  createdAt: string;
  authorRole: string;
}

export interface MapFilterParams {
  query?: string;
  khuVuc?: string;
  loaiPhong?: string;
  giaThue?: string;
  minPrice?: number;
  maxPrice?: number;
  amenities?: Record<string, boolean>;
}

/**
 * Ẩn số nhà chi tiết, chỉ hiển thị: ngõ/ngách bao nhiêu, phường nào, quận nào, thành phố nào
 * Tuyệt đối không để lộ số nhà riêng tư theo yêu cầu bảo mật
 */
export function maskListingAddress(
  address?: string | null,
  ward?: string | null,
  district?: string | null,
  city?: string | null
): string {
  if (!address && !ward && !district) return 'Khu vực đang cập nhật địa chỉ';
  let clean = (address || '').trim();

  // 1. Loại bỏ các tiền tố căn hộ, phòng trọ, tầng, tòa nhà cụ thể nếu có ở đầu
  clean = clean.replace(/^(căn\s*hộ|căn|phòng|p\.?|tầng\s*[0-9]+|tòa\s*nhà|toà\s*nhà|chung\s*cư(\s*mini)?|khu\s*tập\s*thể|ktt)\s*[0-9a-zA-Z\/-]+(\s*dãy\s*[a-zA-Z0-9]+)?(\s*tòa\s*[a-zA-Z0-9]+)?\s*[,.-]?\s*/i, '').trim();

  // 2. Nếu có ngõ, ngách, hẻm thì trích xuất từ ngõ/ngách/hẻm trở đi
  const ngoMatch = clean.match(/(ngõ|ngách|hẻm)\s*([0-9a-zA-Z\/-]+)/i);
  if (ngoMatch) {
    const idx = clean.toLowerCase().indexOf(ngoMatch[0].toLowerCase());
    clean = clean.substring(idx);
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  } else {
    // 3. Xóa triệt để số nhà cụ thể ở đầu chuỗi (ví dụ: '212B/C84A', 'Số 15', 'Sn 96', 'Nhà 28 dãy c7 số 10a', '234')
    clean = clean.replace(/^(số\s*nhà|số|sn|nhà)?\s*[0-9]+[a-zA-Z]?(\/[0-9a-zA-Z]+)*(\s*dãy\s*[a-zA-Z0-9]+)?(\s*số\s*[0-9]+[a-zA-Z]?)?\s*[,.-]?\s*/i, '');
    clean = clean.trim();
    clean = clean.replace(/^[0-9]+[a-zA-Z]?\s*[,.-]?\s*/, '').trim();

    if (clean.toLowerCase().startsWith('phố ')) {
      clean = 'Phố ' + clean.slice(4).trim();
    } else if (clean.toLowerCase().startsWith('đường ')) {
      clean = 'Đường ' + clean.slice(6).trim();
    } else if (
      clean &&
      !clean.toLowerCase().startsWith('khu') &&
      !clean.toLowerCase().startsWith('ngõ') &&
      !clean.toLowerCase().startsWith('hẻm') &&
      !clean.toLowerCase().startsWith('phường') &&
      !clean.toLowerCase().startsWith('quận')
    ) {
      clean = 'Đường ' + clean;
    }
  }

  // Viết hoa chữ cái đầu tiên
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  // Đảm bảo có đầy đủ phường, quận, thành phố nếu truyền vào
  const lower = clean.toLowerCase();
  if (ward && !lower.includes(ward.toLowerCase())) {
    clean += `, ${ward}`;
  }
  if (district && !lower.includes(district.toLowerCase())) {
    clean += `, ${district}`;
  }
  const defaultCity = city || 'Hà Nội';
  if (
    !lower.includes('hà nội') &&
    !lower.includes('hồ chí minh') &&
    !lower.includes('tp.hcm') &&
    !lower.includes('tphcm')
  ) {
    clean += `, ${defaultCity}`;
  }

  return clean;
}

/**
 * Chuyển ListingMapPin nhận từ API sang MapRoom chuẩn để hiển thị trên bản đồ
 */
export function pinToMapRoom(pin: ListingMapPin): MapRoom {
  const images = pin.thumbnailUrl ? [pin.thumbnailUrl] : [];
  const rawAddr = pin.addressDetail || pin.locationName;
  return {
    ...pin,
    rawAddress: rawAddr,
    maskedAddress: maskListingAddress(rawAddr, pin.ward, pin.district, 'Hà Nội'),
    images,
  };
}

/**
 * Dữ liệu phòng dự phòng từ danh sách tin chuẩn khi API máy chủ ngoại tuyến
 */
export function getFallbackDemoPins(): ListingMapPin[] {
  return ALL_DEMO_LISTINGS
    .filter((l) => l.lat != null && l.lng != null)
    .map((l) => ({
      id: String(l.id),
      slug: l.slug,
      title: l.title,
      price: parseInt(String(l.price), 10) || 0,
      depositAmount: l.depositAmount ? parseInt(String(l.depositAmount), 10) : undefined,
      areaM2: parseInt(String(l.areaM2), 10) || 20,
      propertyType: (l.propertyType as any) || 'phong_tro',
      lat: l.lat!,
      lng: l.lng!,
      thumbnailUrl: l.images?.[0]?.imageUrl || null,
      locationName: l.addressDetail || l.location?.name || 'Hà Nội',
      addressDetail: l.addressDetail || undefined,
      district: l.location?.name,
      status: 'active',
      electricityPricePerKwh: l.electricityPricePerKwh || undefined,
      waterPricePerM3: l.waterPricePerM3 || undefined,
      waterPriceFlat: l.waterPriceFlat || undefined,
      amenities: l.amenities || undefined,
    }));
}

/**
 * Lấy danh sách điểm đánh giá cộng đồng (899 bài đánh giá) có tọa độ thật
 * Tách biệt hoàn toàn khỏi danh sách phòng cho thuê, không bịa thông tin phòng
 */
let cachedCommunityPins: CommunityReviewPin[] | null = null;
export function getCommunityReviewPins(): CommunityReviewPin[] {
  if (cachedCommunityPins) return cachedCommunityPins;

  const results: CommunityReviewPin[] = [];
  const list = Array.isArray(rawReviewsData) ? rawReviewsData : [];

  for (const item of list) {
    const lat = item.extracted_data?.lat;
    const lng = item.extracted_data?.lng;
    if (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= 8.18 &&
      lat <= 23.39 &&
      lng >= 102.14 &&
      lng <= 109.46
    ) {
      results.push({
        id: item.id,
        shortId: item.short_id || 'REV',
        lat,
        lng,
        rating: Number(item.rating) || 5,
        content: item.content || 'Đánh giá từ người thuê',
        addressRaw: item.extracted_data?.address_raw || item.buildings?.address_text || '',
        createdAt: item.created_at || '2026-09-01',
        authorRole: item.author_role === 'former_tenant' ? 'Cựu người thuê' : 'Người đang thuê',
      });
    }
  }

  cachedCommunityPins = results;
  return results;
}

/**
 * Lọc danh sách phòng theo tham số tìm kiếm
 */
export function filterMapRooms(rooms: MapRoom[], params: MapFilterParams): MapRoom[] {
  let result = rooms;

  // 1. Lọc theo từ khóa tìm kiếm (hỗ trợ tiếng Việt có dấu và không dấu)
  if (params.query && params.query.trim()) {
    const qNorm = removeDiacritics(params.query.toLowerCase().trim());
    result = result.filter((r) => {
      const matchTitle = removeDiacritics(r.title.toLowerCase()).includes(qNorm);
      const matchMasked = removeDiacritics(r.maskedAddress.toLowerCase()).includes(qNorm);
      const matchRaw = r.rawAddress ? removeDiacritics(r.rawAddress.toLowerCase()).includes(qNorm) : false;
      return matchTitle || matchMasked || matchRaw;
    });
  }

  // 2. Lọc theo Khu vực
  if (params.khuVuc && params.khuVuc !== 'all' && params.khuVuc !== 'Khu vực') {
    const kvNorm = removeDiacritics(params.khuVuc.toLowerCase());
    result = result.filter((r) => {
      const addrNorm = removeDiacritics(r.maskedAddress.toLowerCase());
      const distNorm = r.district ? removeDiacritics(r.district.toLowerCase()) : '';
      return addrNorm.includes(kvNorm) || distNorm.includes(kvNorm);
    });
  }

  // 3. Lọc theo Loại phòng
  if (params.loaiPhong && params.loaiPhong !== 'all' && params.loaiPhong !== 'Loại phòng') {
    const lpVal = params.loaiPhong;
    result = result.filter((r) => {
      if (lpVal === 'phong_tro') return r.propertyType === 'phong_tro';
      if (lpVal === 'chung_cu_mini') return r.propertyType === 'chung_cu_mini';
      if (lpVal === 'chung_cu' || lpVal === 'can_ho') return r.propertyType === 'can_ho';
      if (lpVal === 'mat_bang' || lpVal === 'nha_nguyen_can') return r.propertyType === 'nha_nguyen_can' || r.propertyType === 'mat_bang';
      return true;
    });
  }

  // 4. Lọc theo Giá thuê
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const minP = params.minPrice ?? 0;
    const maxP = params.maxPrice ?? 30000000;
    if (minP > 0 || maxP < 30000000) {
      result = result.filter((r) => {
        if (maxP >= 30000000) {
          return r.price >= minP;
        }
        return r.price >= minP && r.price <= maxP;
      });
    }
  } else if (params.giaThue && params.giaThue !== 'all' && params.giaThue !== 'Giá thuê') {
    const gtVal = params.giaThue;
    result = result.filter((r) => {
      if (gtVal === 'under_3m') return r.price < 3000000;
      if (gtVal === '3m_5m') return r.price >= 3000000 && r.price <= 5000000;
      if (gtVal === '5m_8m') return r.price > 5000000 && r.price <= 8000000;
      if (gtVal === 'above_8m') return r.price > 8000000;
      return true;
    });
  }

  return result;
}

// ────────────────────────────────────────────────────────────
// Quản lý Lịch sử tìm kiếm (Search History)
// ────────────────────────────────────────────────────────────
const SEARCH_HISTORY_STORAGE_KEY = 'qns_map_search_history';

export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (raw === null) {
      const initialHistory = ['Ngõ 177 Định Công', 'Quận Thanh Xuân', 'Phố Chùa Láng', 'Đường Cầu Giấy'];
      localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(initialHistory));
      return initialHistory;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(term: string): string[] {
  if (typeof window === 'undefined') return [];
  const clean = term.trim();
  if (!clean) return getSearchHistory();

  try {
    const current = getSearchHistory();
    const filtered = current.filter((item) => item.toLowerCase() !== clean.toLowerCase());
    const updated = [clean, ...filtered].slice(0, 10);
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeSearchHistory(term: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getSearchHistory();
    const updated = current.filter((item) => item.toLowerCase() !== term.toLowerCase());
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify([]));
  } catch {}
}
