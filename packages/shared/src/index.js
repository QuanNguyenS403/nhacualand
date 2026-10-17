"use strict";
/**
 * @qns/shared
 * Thư viện kiểu dữ liệu, hằng số và hàm tiện ích dùng chung duy nhất cho cả API và Web
 * Tuân thủ quy chuẩn Single Source of Truth
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TENANT_FEE_PERCENT = exports.DEFAULT_COMMISSION_RATE_BPS = exports.BROKERAGE_COMMISSION_PERCENT = exports.AMENITY_DEFINITIONS = exports.LISTING_STATUS_LABELS = exports.LISTING_STATUS = exports.PROPERTY_TYPES = void 0;
exports.getPropertyTypeLabel = getPropertyTypeLabel;
exports.normalizeLegacyPropertyType = normalizeLegacyPropertyType;
exports.isValidStatusTransition = isValidStatusTransition;
exports.canTransition = canTransition;
exports.normalizeAmenities = normalizeAmenities;
exports.formatPrice = formatPrice;
exports.formatArea = formatArea;
exports.maskAddress = maskAddress;
exports.buildSlug = buildSlug;
exports.isValidVietnamCoordinate = isValidVietnamCoordinate;
// ── 1. LOẠI HÌNH BẤT ĐỘNG SẢN (PROPERTY TYPES) ──
exports.PROPERTY_TYPES = [
    { value: 'phong_tro', label: 'Phòng trọ' },
    { value: 'chung_cu_mini', label: 'Chung cư mini' },
    { value: 'can_ho', label: 'Căn hộ' },
    { value: 'nha_nguyen_can', label: 'Nhà nguyên căn' },
    { value: 'o_ghep', label: 'Ở ghép' },
    { value: 'studio', label: 'Studio' },
    { value: 'mat_bang', label: 'Mặt bằng kinh doanh' },
];
function getPropertyTypeLabel(type) {
    if (!type)
        return 'Phòng trọ';
    const norm = normalizeLegacyPropertyType(type);
    const found = exports.PROPERTY_TYPES.find((p) => p.value === norm);
    return found ? found.label : 'Phòng trọ';
}
/**
 * Chuẩn hóa các biến thể cũ của loại hình về một bộ snake_case chuẩn duy nhất
 */
function normalizeLegacyPropertyType(type) {
    if (!type)
        return 'phong_tro';
    const clean = type.toLowerCase().trim().replace(/[-\s]+/g, '_');
    if (clean === 'chung_cu' || clean === 'can_ho' || clean === 'apartment')
        return 'can_ho';
    if (clean === 'phong_tro' || clean === 'tro')
        return 'phong_tro';
    if (clean === 'chung_cu_mini' || clean === 'ccmn')
        return 'chung_cu_mini';
    if (clean === 'nha_nguyen_can' || clean === 'nha_rieng')
        return 'nha_nguyen_can';
    if (clean === 'o_ghep')
        return 'o_ghep';
    if (clean === 'studio')
        return 'studio';
    if (clean === 'mat_bang')
        return 'mat_bang';
    return 'phong_tro';
}
// ── 2. TRẠNG THÁI TIN ĐĂNG (LISTING STATUS) ──
exports.LISTING_STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    EXPIRED: 'expired',
    REJECTED: 'rejected',
    REMOVED: 'removed',
    RENTED: 'rented',
};
exports.LISTING_STATUS_LABELS = {
    pending: 'Chờ duyệt',
    active: 'Đang hiển thị',
    expired: 'Hết hạn',
    rejected: 'Bị từ chối',
    removed: 'Đã gỡ',
    rented: 'Đã cho thuê',
};
/**
 * Kiểm tra xem trạng thái mới có hợp lệ từ trạng thái hiện tại hay không
 */
function isValidStatusTransition(current, next) {
    if (current === next)
        return true;
    switch (current) {
        case 'pending':
            return next === 'active' || next === 'rejected' || next === 'removed';
        case 'active':
            return next === 'rented' || next === 'removed' || next === 'expired';
        case 'rented':
            return next === 'active' || next === 'removed';
        case 'expired':
            return next === 'pending' || next === 'active' || next === 'removed';
        case 'rejected':
            return next === 'pending' || next === 'removed';
        case 'removed':
            return next === 'pending';
        default:
            return false;
    }
}
function canTransition(current, target, role, isContentModified = false) {
    if (current === target) {
        return { allowed: true };
    }
    // Admin có quyền chuyển đổi hầu hết mọi trạng thái hợp lệ
    if (role === 'admin') {
        switch (current) {
            case 'pending':
                if (target === 'active' || target === 'rejected' || target === 'removed')
                    return { allowed: true };
                break;
            case 'active':
                if (target === 'rented' || target === 'removed' || target === 'expired')
                    return { allowed: true };
                break;
            case 'rented':
                if (target === 'active' || target === 'removed' || target === 'pending')
                    return { allowed: true };
                break;
            case 'rejected':
                if (target === 'active' || target === 'pending' || target === 'removed')
                    return { allowed: true };
                break;
            case 'expired':
                if (target === 'active' || target === 'pending' || target === 'removed')
                    return { allowed: true };
                break;
            case 'removed':
                if (target === 'active' || target === 'pending')
                    return { allowed: true };
                break;
        }
        return {
            allowed: false,
            message: `Quản trị viên không thể chuyển trạng thái từ "${exports.LISTING_STATUS_LABELS[current] || current}" sang "${exports.LISTING_STATUS_LABELS[target] || target}"`,
        };
    }
    // Chủ tin (Owner)
    if (role === 'owner') {
        switch (current) {
            case 'pending':
                if (target === 'removed')
                    return { allowed: true };
                if (target === 'pending')
                    return { allowed: true };
                break;
            case 'active':
                if (target === 'rented' || target === 'removed')
                    return { allowed: true };
                if (target === 'pending' && isContentModified)
                    return { allowed: true };
                break;
            case 'rented':
                if (target === 'removed')
                    return { allowed: true };
                if (target === 'active' || target === 'pending')
                    return { allowed: true };
                break;
            case 'rejected':
                if (target === 'removed')
                    return { allowed: true };
                if (target === 'pending')
                    return { allowed: true };
                break;
            case 'expired':
                if (target === 'removed')
                    return { allowed: true };
                if (target === 'pending')
                    return { allowed: true };
                break;
            case 'removed':
                return {
                    allowed: false,
                    message: 'Tin đã gỡ không thể tự kích hoạt lại, vui lòng đăng tin mới hoặc liên hệ quản trị viên',
                };
        }
        return {
            allowed: false,
            message: `Bạn không thể chuyển trạng thái tin từ "${exports.LISTING_STATUS_LABELS[current] || current}" sang "${exports.LISTING_STATUS_LABELS[target] || target}"`,
        };
    }
    return { allowed: false, message: 'Thao tác không được hỗ trợ' };
}
// ── 3. TIỆN NGHI CHUẨN (AMENITY DEFINITIONS) ──
exports.AMENITY_DEFINITIONS = [
    { key: 'balcony', label: 'Ban công', icon: 'Sun' },
    { key: 'bunkBed', label: 'Giường tầng', icon: 'Bed' },
    { key: 'elevator', label: 'Thang máy', icon: 'ArrowUpDown' },
    { key: 'fridge', label: 'Tủ lạnh', icon: 'Refrigerator' },
    { key: 'security247', label: 'Bảo vệ 24/7', icon: 'ShieldCheck' },
    { key: 'kitchen', label: 'Khu bếp', icon: 'Utensils' },
    { key: 'dryingBalcony', label: 'Ban công phơi', icon: 'Wind' },
    { key: 'mezzanine', label: 'Gác xép', icon: 'Layers' },
    { key: 'petsAllowed', label: 'Nuôi thú cưng', icon: 'PawPrint' },
    { key: 'washingMachine', label: 'Máy giặt', icon: 'WashingMachine' },
    { key: 'wifi', label: 'Wifi', icon: 'Wifi' },
    { key: 'window', label: 'Cửa sổ', icon: 'AppWindow' },
    { key: 'electricVehicle', label: 'Sạc xe điện', icon: 'Zap' },
    { key: 'foreigner', label: 'Người nước ngoài', icon: 'Globe' },
    { key: 'privateBathroom', label: 'Vệ sinh riêng', icon: 'Bath' },
    { key: 'dryer', label: 'Máy sấy', icon: 'SunMedium' },
    { key: 'waterHeater', label: 'Bình nóng lạnh', icon: 'Flame' },
    { key: 'airConditioner', label: 'Điều hòa', icon: 'AirVent' },
    { key: 'freeTime', label: 'Giờ giấc tự do', icon: 'Clock' },
];
/**
 * Chuyển đổi tiện nghi từ bất kỳ dạng cũ (tiếng Việt hoặc tiếng Anh) sang cấu trúc chuẩn
 */
function normalizeAmenities(input) {
    const result = {
        balcony: false,
        bunkBed: false,
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
        airConditioner: false,
        freeTime: false,
    };
    if (!input || typeof input !== 'object')
        return result;
    // Bản đồ ánh xạ từ các khóa tiếng Việt hoặc khóa biến thể sang khóa chuẩn
    const aliasMap = {
        bancong: 'balcony',
        balcony: 'balcony',
        giuongtang: 'bunkBed',
        bunkbed: 'bunkBed',
        thangmay: 'elevator',
        elevator: 'elevator',
        tulanh: 'fridge',
        fridge: 'fridge',
        baove247: 'security247',
        security247: 'security247',
        bep: 'kitchen',
        beprieng: 'kitchen',
        kitchen: 'kitchen',
        bancongphoi: 'dryingBalcony',
        dryingbalcony: 'dryingBalcony',
        gacxep: 'mezzanine',
        mezzanine: 'mezzanine',
        thucung: 'petsAllowed',
        petsallowed: 'petsAllowed',
        maygiat: 'washingMachine',
        washingmachine: 'washingMachine',
        wifi: 'wifi',
        cuaso: 'window',
        window: 'window',
        xedien: 'electricVehicle',
        electricvehicle: 'electricVehicle',
        nguoinuocngoai: 'foreigner',
        foreigner: 'foreigner',
        vesinhrieng: 'privateBathroom',
        privatebathroom: 'privateBathroom',
        maysay: 'dryer',
        dryer: 'dryer',
        nonglanh: 'waterHeater',
        waterheater: 'waterHeater',
        dieuhoa: 'airConditioner',
        airconditioner: 'airConditioner',
        giotudo: 'freeTime',
        freetime: 'freeTime',
    };
    for (const [k, v] of Object.entries(input)) {
        if (!v)
            continue;
        const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        const mapped = aliasMap[cleanKey];
        if (mapped) {
            result[mapped] = true;
        }
    }
    return result;
}
// ── 5. HÀM TIỆN ÍCH DÙNG CHUNG (HELPERS) ──
/**
 * Định dạng giá tiền VNĐ số nguyên
 */
function formatPrice(price) {
    const num = typeof price === 'string' ? parseInt(price, 10) : Number(price || 0);
    if (!num || isNaN(num) || num <= 0)
        return 'Thỏa thuận';
    if (num < 1000000) {
        return `${(num / 1000).toLocaleString('vi-VN')} nghìn/tháng`;
    }
    if (num < 1000000000) {
        const trieu = (num / 1000000).toFixed(1).replace(/\.0$/, '');
        return `${trieu} triệu/tháng`;
    }
    const ty = (num / 1000000000).toFixed(2).replace(/\.00$/, '');
    return `${ty} tỷ/tháng`;
}
/**
 * Định dạng diện tích m²
 */
function formatArea(area) {
    const num = typeof area === 'string' ? parseFloat(area) : Number(area || 0);
    if (!num || isNaN(num) || num <= 0)
        return 'Chưa rõ diện tích';
    return `${num} m²`;
}
/**
 * Che số nhà chi tiết để bảo đảm quyền riêng tư, chỉ giữ lại ngõ, phường, quận, thành phố
 */
function maskAddress(rawAddress, ward, district, city) {
    if (!rawAddress || !rawAddress.trim()) {
        const parts = [ward, district, city].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'Đang cập nhật vị trí';
    }
    let cleaned = rawAddress.trim();
    // Che số nhà đầu tiên: ví dụ "Số 12 ngõ 45" -> "Ngõ 45", "12/34 đường Láng" -> "Đường Láng"
    cleaned = cleaned.replace(/^(số\s*)?\d+[a-zA-Z]?(\/\d+[a-zA-Z]?)*\s*,?\s*/i, '');
    if (!cleaned) {
        const parts = [ward, district, city].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'Khu vực trung tâm';
    }
    return cleaned;
}
/**
 * Sinh slug chuẩn có hậu tố ID (-id{id}) theo CLAUDE.md § 2.9
 */
function buildSlug(title, id) {
    const cleanTitle = (title || 'phong-cho-thue')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 100);
    return `${cleanTitle}-id${id}`;
}
/**
 * Kiểm tra toạ độ nằm trong lãnh thổ Việt Nam hợp lệ
 */
function isValidVietnamCoordinate(lat, lng) {
    if (lat === null || lat === undefined || lng === null || lng === undefined)
        return false;
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (isNaN(numLat) || isNaN(numLng))
        return false;
    if (numLat === 0 && numLng === 0)
        return false;
    // Giới hạn vĩ độ: 8.5 đến 23.5, kinh độ: 102.0 đến 109.5
    return numLat >= 8.5 && numLat <= 23.5 && numLng >= 102.0 && numLng <= 109.5;
}
// ── 6. CHÍNH SÁCH KINH DOANH & PHÍ HOA HỒNG (BIZ-003) ──
/**
 * Tỷ lệ phí môi giới thành công mà chủ nhà chi trả cho QNS BROKER (40% tiền thuê tháng đầu tiên)
 * Khách thuê hoàn toàn không mất phí (0 đồng).
 */
exports.BROKERAGE_COMMISSION_PERCENT = 40;
exports.DEFAULT_COMMISSION_RATE_BPS = 4000;
exports.TENANT_FEE_PERCENT = 0;
//# sourceMappingURL=index.js.map