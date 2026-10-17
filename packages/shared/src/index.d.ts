/**
 * @qns/shared
 * Thư viện kiểu dữ liệu, hằng số và hàm tiện ích dùng chung duy nhất cho cả API và Web
 * Tuân thủ quy chuẩn Single Source of Truth
 */
export declare const PROPERTY_TYPES: readonly [{
    readonly value: "phong_tro";
    readonly label: "Phòng trọ";
}, {
    readonly value: "chung_cu_mini";
    readonly label: "Chung cư mini";
}, {
    readonly value: "can_ho";
    readonly label: "Căn hộ";
}, {
    readonly value: "nha_nguyen_can";
    readonly label: "Nhà nguyên căn";
}, {
    readonly value: "o_ghep";
    readonly label: "Ở ghép";
}, {
    readonly value: "studio";
    readonly label: "Studio";
}, {
    readonly value: "mat_bang";
    readonly label: "Mặt bằng kinh doanh";
}];
export type PropertyType = (typeof PROPERTY_TYPES)[number]['value'];
export declare function getPropertyTypeLabel(type: string | null | undefined): string;
/**
 * Chuẩn hóa các biến thể cũ của loại hình về một bộ snake_case chuẩn duy nhất
 */
export declare function normalizeLegacyPropertyType(type: string | null | undefined): PropertyType;
export declare const LISTING_STATUS: {
    readonly PENDING: "pending";
    readonly ACTIVE: "active";
    readonly EXPIRED: "expired";
    readonly REJECTED: "rejected";
    readonly REMOVED: "removed";
    readonly RENTED: "rented";
};
export type ListingStatusType = (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS];
export declare const LISTING_STATUS_LABELS: Record<ListingStatusType, string>;
/**
 * Kiểm tra xem trạng thái mới có hợp lệ từ trạng thái hiện tại hay không
 */
export declare function isValidStatusTransition(current: ListingStatusType, next: ListingStatusType): boolean;
export interface TransitionResult {
    allowed: boolean;
    message?: string;
}
export declare function canTransition(current: ListingStatusType, target: ListingStatusType, role: 'owner' | 'admin' | 'system', isContentModified?: boolean): TransitionResult;
export declare const AMENITY_DEFINITIONS: readonly [{
    readonly key: "balcony";
    readonly label: "Ban công";
    readonly icon: "Sun";
}, {
    readonly key: "bunkBed";
    readonly label: "Giường tầng";
    readonly icon: "Bed";
}, {
    readonly key: "elevator";
    readonly label: "Thang máy";
    readonly icon: "ArrowUpDown";
}, {
    readonly key: "fridge";
    readonly label: "Tủ lạnh";
    readonly icon: "Refrigerator";
}, {
    readonly key: "security247";
    readonly label: "Bảo vệ 24/7";
    readonly icon: "ShieldCheck";
}, {
    readonly key: "kitchen";
    readonly label: "Khu bếp";
    readonly icon: "Utensils";
}, {
    readonly key: "dryingBalcony";
    readonly label: "Ban công phơi";
    readonly icon: "Wind";
}, {
    readonly key: "mezzanine";
    readonly label: "Gác xép";
    readonly icon: "Layers";
}, {
    readonly key: "petsAllowed";
    readonly label: "Nuôi thú cưng";
    readonly icon: "PawPrint";
}, {
    readonly key: "washingMachine";
    readonly label: "Máy giặt";
    readonly icon: "WashingMachine";
}, {
    readonly key: "wifi";
    readonly label: "Wifi";
    readonly icon: "Wifi";
}, {
    readonly key: "window";
    readonly label: "Cửa sổ";
    readonly icon: "AppWindow";
}, {
    readonly key: "electricVehicle";
    readonly label: "Sạc xe điện";
    readonly icon: "Zap";
}, {
    readonly key: "foreigner";
    readonly label: "Người nước ngoài";
    readonly icon: "Globe";
}, {
    readonly key: "privateBathroom";
    readonly label: "Vệ sinh riêng";
    readonly icon: "Bath";
}, {
    readonly key: "dryer";
    readonly label: "Máy sấy";
    readonly icon: "SunMedium";
}, {
    readonly key: "waterHeater";
    readonly label: "Bình nóng lạnh";
    readonly icon: "Flame";
}, {
    readonly key: "airConditioner";
    readonly label: "Điều hòa";
    readonly icon: "AirVent";
}, {
    readonly key: "freeTime";
    readonly label: "Giờ giấc tự do";
    readonly icon: "Clock";
}];
export type AmenityKey = (typeof AMENITY_DEFINITIONS)[number]['key'];
/**
 * Chuyển đổi tiện nghi từ bất kỳ dạng cũ (tiếng Việt hoặc tiếng Anh) sang cấu trúc chuẩn
 */
export declare function normalizeAmenities(input: Record<string, any> | null | undefined): Record<AmenityKey, boolean>;
export interface ListingMapPin {
    id: string;
    slug: string;
    lat: number;
    lng: number;
    title: string;
    price: number;
    propertyType: PropertyType;
    areaM2: number;
    thumbnailUrl: string | null;
    locationName: string;
    addressDetail?: string;
    district?: string;
    ward?: string;
    status: ListingStatusType;
    depositAmount?: number;
    electricityPricePerKwh?: number;
    waterPricePerM3?: number;
    waterPriceFlat?: number;
    amenities?: Record<string, boolean>;
    isOwnerPending?: boolean;
}
export interface ListingPublic {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    transactionType: 'rent';
    propertyType: PropertyType;
    price: number;
    depositAmount: number | null;
    minLeaseMonths: number | null;
    utilitiesIncluded: boolean;
    electricityPricePerKwh: number | null;
    waterPricePerM3: number | null;
    waterPriceFlat: number | null;
    amenities: Record<string, boolean>;
    areaM2: number;
    bedrooms: number | null;
    bathrooms: number | null;
    legalStatus: string | null;
    addressDetail: string | null;
    maskedAddress: string;
    lat: number | null;
    lng: number | null;
    status: ListingStatusType;
    publishedAt: string | null;
    createdAt: string;
    viewCount: number;
    images: Array<{
        imageUrl: string;
        sortOrder: number;
    }>;
    location: {
        id: number;
        name: string;
        slug: string;
        level: string;
    } | null;
    project: {
        id: number;
        name: string;
        slug: string;
    } | null;
    owner: {
        id: string;
        fullName: string;
        avatarUrl: string | null;
        createdAt: string;
    };
    nearbyUniversities: Array<{
        distanceMeters: number;
        travelTimeMinutes: number;
        university: {
            id: number;
            name: string;
            abbreviation: string | null;
            slug: string;
        };
    }>;
}
/**
 * Định dạng giá tiền VNĐ số nguyên
 */
export declare function formatPrice(price: number | string | null | undefined): string;
/**
 * Định dạng diện tích m²
 */
export declare function formatArea(area: number | string | null | undefined): string;
/**
 * Che số nhà chi tiết để bảo đảm quyền riêng tư, chỉ giữ lại ngõ, phường, quận, thành phố
 */
export declare function maskAddress(rawAddress: string, ward?: string, district?: string, city?: string): string;
/**
 * Sinh slug chuẩn có hậu tố ID (-id{id}) theo CLAUDE.md § 2.9
 */
export declare function buildSlug(title: string, id: string | bigint | number): string;
/**
 * Kiểm tra toạ độ nằm trong lãnh thổ Việt Nam hợp lệ
 */
export declare function isValidVietnamCoordinate(lat: number | null | undefined, lng: number | null | undefined): boolean;
/**
 * Tỷ lệ phí môi giới thành công mà chủ nhà chi trả cho QNS BROKER (40% tiền thuê tháng đầu tiên)
 * Khách thuê hoàn toàn không mất phí (0 đồng).
 */
export declare const BROKERAGE_COMMISSION_PERCENT = 40;
export declare const DEFAULT_COMMISSION_RATE_BPS = 4000;
export declare const TENANT_FEE_PERCENT = 0;
//# sourceMappingURL=index.d.ts.map