import rawReviewsData from '../data/nhaminhbach-reviews-899.json';
import {
  ReviewItem,
  TransparencyStats,
  BlacklistCheckResult,
  SearchReviewsParams,
  removeDiacritics,
} from './reviews-types';

export * from './reviews-types';

let cachedReviews: ReviewItem[] | null = null;

// Phân tích category tags từ nội dung
function detectCategoryTags(content: string, rating: number): string[] {
  const normalized = removeDiacritics(content);
  const tags: string[] = [];

  if (
    normalized.includes('dien') ||
    normalized.includes('nuoc') ||
    normalized.includes('5k') ||
    normalized.includes('4k') ||
    normalized.includes('4.5k') ||
    normalized.includes('cong to') ||
    normalized.includes('phu phi') ||
    normalized.includes('dich vu') ||
    normalized.includes('gia dien')
  ) {
    tags.push('dien_nuoc');
  }

  if (
    normalized.includes('coc') ||
    normalized.includes('tien coc') ||
    normalized.includes('hoan coc') ||
    normalized.includes('tra coc') ||
    normalized.includes('quyt') ||
    normalized.includes('tru coc') ||
    normalized.includes('giam coc')
  ) {
    tags.push('coc_tien');
  }

  if (
    normalized.includes('anh') ||
    normalized.includes('goc rong') ||
    normalized.includes('0.5x') ||
    normalized.includes('lua') ||
    normalized.includes('ao') ||
    normalized.includes('phong mau') ||
    normalized.includes('khong giong') ||
    normalized.includes('catfish')
  ) {
    tags.push('anh_ao');
  }

  if (
    normalized.includes('camera') ||
    normalized.includes('soi cam') ||
    normalized.includes('rieng tu') ||
    normalized.includes('tu y') ||
    normalized.includes('khoa van tay') ||
    normalized.includes('gio giac') ||
    normalized.includes('bat be') ||
    normalized.includes('thai do') ||
    normalized.includes('mat day') ||
    normalized.includes('chui')
  ) {
    tags.push('soi_cam');
  }

  if (
    normalized.includes('dot') ||
    normalized.includes('am') ||
    normalized.includes('moc') ||
    normalized.includes('hong') ||
    normalized.includes('mui') ||
    normalized.includes('yeu') ||
    normalized.includes('mat nuoc') ||
    normalized.includes('trom') ||
    normalized.includes('an ninh') ||
    normalized.includes('on') ||
    normalized.includes('on ao')
  ) {
    tags.push('ha_tang');
  }

  if (rating >= 4 || normalized.includes('nhiet tinh') || normalized.includes('tu te') || normalized.includes('sach se') || normalized.includes('thoai mai')) {
    tags.push('tro_tot');
  }

  return tags;
}

// Phân tích thành phố dựa trên địa chỉ và nội dung
function detectCity(review: ReviewItem): 'hanoi' | 'hcm' | 'other' {
  const text = `${review.extracted_data?.address_raw || ''} ${review.extracted_data?.secondary_address || ''} ${review.buildings?.address_text || ''} ${review.buildings?.street_text || ''} ${review.content}`.toLowerCase();
  const normalized = removeDiacritics(text);

  const hnKeywords = [
    'ha noi', 'hanoi', 'hn', 'cau giay', 'dong da', 'ba dinh', 'hai ba trung', 'hoan kiem',
    'thanh xuan', 'hoang mai', 'long bien', 'nam tu liem', 'bac tu liem', 'tay ho', 'ha dong',
    'lang', 'chua lang', 'nguyen trai', 'dinh cong', 'giai phong', 'bach khoa', 'kinh te quoc dan',
    'quoc gia', 'su pham', 'xuan thuy', 'ho tung mau', 'me tri', 'pham hung', 'nguyen chi thanh'
  ];

  const hcmKeywords = [
    'ho chi minh', 'hcm', 'sai gon', 'saigon', 'quan 1', 'quan 2', 'quan 3', 'quan 4', 'quan 5',
    'quan 6', 'quan 7', 'quan 8', 'quan 9', 'quan 10', 'quan 11', 'quan 12', 'tan binh',
    'binh thanh', 'go vap', 'phu nhuan', 'thu duc', 'tan phu', 'binh tan', 'nha be', 'hoc mon',
    'to hien thanh', 'cach mang thang 8', 'su van hanh', 'cong hoa', 'phan van tri', 'le van sy'
  ];

  for (const kw of hnKeywords) {
    if (normalized.includes(kw)) return 'hanoi';
  }

  for (const kw of hcmKeywords) {
    if (normalized.includes(kw)) return 'hcm';
  }

  if (review.buildings?.nmb_id?.startsWith('HN')) return 'hanoi';
  if (review.buildings?.nmb_id?.startsWith('SG') || review.buildings?.nmb_id?.startsWith('HCM')) return 'hcm';

  return 'hanoi'; // Đa phần dữ liệu xuất phát từ Hà Nội
}

// Lấy địa chỉ hiển thị gọn gàng
function getDisplayAddress(review: ReviewItem): string {
  if (review.buildings?.address_text) return review.buildings.address_text;
  if (review.extracted_data?.secondary_address) return review.extracted_data.secondary_address;
  if (review.extracted_data?.address_raw) return review.extracted_data.address_raw;
  if (review.buildings?.street_text) return review.buildings.street_text;
  return 'Khu vực nội thành';
}

// Nạp toàn bộ danh sách reviews từ dataset
export function getAllReviews(): ReviewItem[] {
  if (cachedReviews) {
    return cachedReviews;
  }

  try {
    const items = (rawReviewsData || []) as unknown as ReviewItem[];

    // Tính toán thêm tags và địa chỉ cho từng item
    cachedReviews = items.map((item) => {
      const categoryTags = detectCategoryTags(item.content, item.rating);
      const detectedCity = detectCity(item);
      const displayAddress = getDisplayAddress(item);

      return {
        ...item,
        categoryTags,
        detectedCity,
        displayAddress,
      };
    });

    return cachedReviews;
  } catch (err) {
    console.error('Lỗi khi nạp danh sách reviews:', err);
    return [];
  }
}

// Tính toán các chỉ số thống kê minh bạch thị trường
export function getReviewStats(): TransparencyStats {
  const reviews = getAllReviews();
  const totalReviews = reviews.length;

  if (totalReviews === 0) {
    return {
      totalReviews: 0,
      badReviewsCount: 0,
      badReviewsPercent: 0,
      goodReviewsCount: 0,
      goodReviewsPercent: 0,
      neutralReviewsCount: 0,
      avgRating: 0,
      categoriesBreakdown: {
        electricWater: { count: 0, percent: 0, label: 'Điện nước & phụ phí', description: 'Đội giá điện nước, thu phụ phí vô lý' },
        depositTrap: { count: 0, percent: 0, label: 'Quỵt tiền cọc', description: 'Làm khó không trả cọc, trừ tiền vô cớ' },
        catfishingMedia: { count: 0, percent: 0, label: 'Ảnh ảo & lừa dối', description: 'Góc rộng 0.5x, ảnh render khác xa phòng thật' },
        privacyViolation: { count: 0, percent: 0, label: 'Vi phạm riêng tư', description: 'Soi camera, tự ý vào phòng, thái độ hách dịch' },
        badInfrastructure: { count: 0, percent: 0, label: 'Hạ tầng xuống cấp', description: 'Ẩm mốc, mất nước, dột nát, mất an ninh' },
      },
      cityBreakdown: { hanoi: 0, hcm: 0, other: 0 },
    };
  }

  let badReviewsCount = 0;
  let goodReviewsCount = 0;
  let neutralReviewsCount = 0;
  let sumRating = 0;

  let electricWaterCount = 0;
  let depositTrapCount = 0;
  let catfishingMediaCount = 0;
  let privacyViolationCount = 0;
  let badInfrastructureCount = 0;

  let hanoiCount = 0;
  let hcmCount = 0;
  let otherCount = 0;

  for (const r of reviews) {
    sumRating += r.rating;
    if (r.rating <= 2) badReviewsCount++;
    else if (r.rating >= 4) goodReviewsCount++;
    else neutralReviewsCount++;

    const tags = r.categoryTags || [];
    if (tags.includes('dien_nuoc')) electricWaterCount++;
    if (tags.includes('coc_tien')) depositTrapCount++;
    if (tags.includes('anh_ao')) catfishingMediaCount++;
    if (tags.includes('soi_cam')) privacyViolationCount++;
    if (tags.includes('ha_tang')) badInfrastructureCount++;

    if (r.detectedCity === 'hanoi') hanoiCount++;
    else if (r.detectedCity === 'hcm') hcmCount++;
    else otherCount++;
  }

  const badReviewsPercent = Math.round((badReviewsCount / totalReviews) * 100);
  const goodReviewsPercent = Math.round((goodReviewsCount / totalReviews) * 100);
  const avgRating = Number((sumRating / totalReviews).toFixed(1));

  return {
    totalReviews,
    badReviewsCount,
    badReviewsPercent,
    goodReviewsCount,
    goodReviewsPercent,
    neutralReviewsCount,
    avgRating,
    categoriesBreakdown: {
      electricWater: {
        count: electricWaterCount,
        percent: Math.round((electricWaterCount / totalReviews) * 100),
        label: 'Điện nước & phụ phí phát sinh',
        description: 'Đội giá điện nước lên 4k - 5k/số, phụ phí dịch vụ chồng chéo',
      },
      depositTrap: {
        count: depositTrapCount,
        percent: Math.round((depositTrapCount / totalReviews) * 100),
        label: 'Chiếm đoạt & làm khó hoàn cọc',
        description: 'Bới vết ố trừ cọc hàng triệu đồng, khất lần chặn liên lạc',
      },
      catfishingMedia: {
        count: catfishingMediaCount,
        percent: Math.round((catfishingMediaCount / totalReviews) * 100),
        label: 'Ảnh ảo 0.5x & AI catfishing',
        description: 'Ảnh mạng lộng lẫy, phòng thực tế ngột ngạt và tối tăm',
      },
      privacyViolation: {
        count: privacyViolationCount,
        percent: Math.round((privacyViolationCount / totalReviews) * 100),
        label: 'Soi camera & vi phạm riêng tư',
        description: 'Tự ý mở phòng, kiểm soát giờ giấc vô lý và phạt tiền bừa bãi',
      },
      badInfrastructure: {
        count: badInfrastructureCount,
        percent: Math.round((badInfrastructureCount / totalReviews) * 100),
        label: 'Hạ tầng xuống cấp & mất an ninh',
        description: 'Tường ẩm mốc, nước yếu giờ cao điểm, an ninh lỏng lẻo',
      },
    },
    cityBreakdown: {
      hanoi: hanoiCount,
      hcm: hcmCount,
      other: otherCount,
    },
  };
}

// Bộ lọc & Tìm kiếm đánh giá

export function searchReviews(params: SearchReviewsParams = {}) {
  const {
    query = '',
    city = 'all',
    ratingFilter = 'all',
    categoryFilter = 'all',
    page = 1,
    limit = 12,
  } = params;

  let reviews = getAllReviews();

  // Lọc theo thành phố
  if (city !== 'all') {
    reviews = reviews.filter((r) => r.detectedCity === city);
  }

  // Lọc theo rating
  if (ratingFilter === 'bad') {
    reviews = reviews.filter((r) => r.rating <= 2);
  } else if (ratingFilter === 'good') {
    reviews = reviews.filter((r) => r.rating >= 4);
  } else if (ratingFilter !== 'all') {
    const rNum = parseInt(ratingFilter, 10);
    if (!isNaN(rNum)) {
      reviews = reviews.filter((r) => r.rating === rNum);
    }
  }

  // Lọc theo chuyên mục bẫy trọ
  if (categoryFilter !== 'all') {
    reviews = reviews.filter((r) => r.categoryTags?.includes(categoryFilter));
  }

  // Tìm kiếm từ khóa (Fuzzy diacritics-insensitive)
  if (query.trim()) {
    const normQuery = removeDiacritics(query);
    reviews = reviews.filter((r) => {
      const fullText = `${r.content} ${r.displayAddress || ''} ${r.extracted_data?.address_raw || ''} ${r.extracted_data?.secondary_address || ''} ${r.buildings?.address_text || ''} ${r.buildings?.street_text || ''} ${r.target_phone || ''} ${r.target_brand || ''}`;
      return removeDiacritics(fullText).includes(normQuery);
    });
  }

  const total = reviews.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * limit;
  const paginatedItems = reviews.slice(startIndex, startIndex + limit);

  return {
    items: paginatedItems,
    total,
    page: currentPage,
    totalPages,
    limit,
  };
}

// Kiểm tra Blacklist SĐT & Địa chỉ
export function checkBlacklist(keyword: string): BlacklistCheckResult {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return {
      keyword: '',
      status: 'CLEAN',
      matchedCount: 0,
      severityLabel: 'Chưa có thông tin tra cứu',
      summary: 'Vui lòng nhập số điện thoại hoặc địa chỉ cần kiểm tra',
      recommendation: 'Luôn kiểm tra kỹ hợp đồng trước khi thanh toán tiền cọc',
      matchedReviews: [],
    };
  }

  const reviews = getAllReviews();
  const normKeyword = removeDiacritics(trimmed);
  const isPhone = /^[0-9+\s.-]{8,15}$/.test(trimmed);

  let matched: ReviewItem[] = [];

  if (isPhone) {
    const cleanPhoneDigits = trimmed.replace(/[^0-9]/g, '');
    matched = reviews.filter((r) => {
      if (!r.target_phone) return false;
      const rPhoneDigits = r.target_phone.replace(/[^0-9]/g, '');
      return rPhoneDigits.includes(cleanPhoneDigits) || cleanPhoneDigits.includes(rPhoneDigits);
    });
  } else {
    matched = reviews.filter((r) => {
      const addressText = `${r.displayAddress || ''} ${r.extracted_data?.address_raw || ''} ${r.extracted_data?.secondary_address || ''} ${r.buildings?.address_text || ''} ${r.buildings?.street_text || ''} ${r.target_brand || ''}`;
      return removeDiacritics(addressText).includes(normKeyword);
    });
  }

  const matchedCount = matched.length;

  if (matchedCount === 0) {
    return {
      keyword: trimmed,
      status: 'CLEAN',
      matchedCount: 0,
      severityLabel: 'Chưa ghi nhận phản ánh xấu',
      summary: `Hệ thống chưa tìm thấy phản ánh tiêu cực nào gắn với "${trimmed}"`,
      recommendation: 'Vẫn nên tuân thủ quy trình 5 bước kiểm tra công tơ điện và rà soát hợp đồng trước khi cọc',
      matchedReviews: [],
    };
  }

  // Phân tích mức độ nghiêm trọng
  const badCount = matched.filter((r) => r.rating <= 2).length;
  const hasDepositTrap = matched.some((r) => r.categoryTags?.includes('coc_tien'));

  if (badCount >= 2 || hasDepositTrap) {
    return {
      keyword: trimmed,
      status: 'DANGER',
      matchedCount,
      severityLabel: 'Cảnh báo rủi ro cao',
      summary: `Phát hiện ${matchedCount} bài phản ánh, có tiền lệ tranh chấp cọc hoặc bẫy phụ phí`,
      recommendation: 'Cân nhắc kỹ lưỡng, tuyệt đối không chuyển cọc online trước khi thẩm định pháp lý',
      matchedReviews: matched,
    };
  }

  return {
    keyword: trimmed,
    status: 'WARNING',
    matchedCount,
    severityLabel: 'Cần lưu ý thận trọng',
    summary: `Ghi nhận ${matchedCount} đánh giá từ cựu người thuê có ý kiến trái chiều`,
    recommendation: 'Hỏi rõ biểu giá điện nước và cam kết điều khoản hoàn cọc bằng văn bản',
    matchedReviews: matched,
  };
}
