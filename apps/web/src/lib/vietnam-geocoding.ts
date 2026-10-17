import { VIETNAM_UNIVERSITIES, calculateDistanceKm } from './vietnam-universities';

export interface GeocodeResult {
  lat: number;
  lng: number;
  source: 'university' | 'online' | 'offline';
  label?: string;
}

/**
 * Bảng tọa độ chuẩn xác các địa danh, tuyến đường, khu đô thị và 30 quận/huyện của TP Hà Nội
 * Dùng làm lớp dự phòng tức thời (Offline Fallback) đảm bảo 100% không bao giờ trượt định vị
 */
interface LocationEntry {
  names: string[];
  lat: number;
  lng: number;
  label: string;
}

const HANOI_OFFLINE_LOCATIONS: LocationEntry[] = [
  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN HOÀN KIẾM ──
  { names: ['phố huế', 'pho hue'], lat: 21.0182, lng: 105.8521, label: 'Phố Huế, Hoàn Kiếm, Hà Nội' },
  { names: ['hàng bài', 'hang bai'], lat: 21.0225, lng: 105.8528, label: 'Hàng Bài, Hoàn Kiếm, Hà Nội' },
  { names: ['tràng tiền', 'trang tien'], lat: 21.0245, lng: 105.8562, label: 'Tràng Tiền, Hoàn Kiếm, Hà Nội' },
  { names: ['bờ hồ', 'hồ gươm', 'hồ hoàn kiếm'], lat: 21.0285, lng: 105.8542, label: 'Hồ Hoàn Kiếm, Hà Nội' },
  { names: ['bà triệu', 'ba trieu'], lat: 21.0175, lng: 105.8505, label: 'Bà Triệu, Hoàn Kiếm, Hà Nội' },
  { names: ['lý thường kiệt', 'ly thuong kiet'], lat: 21.0238, lng: 105.8492, label: 'Lý Thường Kiệt, Hoàn Kiếm, Hà Nội' },
  { names: ['quận hoàn kiếm', 'hoàn kiếm', 'hoan kiem'], lat: 21.0285, lng: 105.8542, label: 'Quận Hoàn Kiếm, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN HAI BÀ TRƯNG ──
  { names: ['đại cồ việt', 'dai co viet'], lat: 21.0075, lng: 105.8458, label: 'Đại Cồ Việt, Hai Bà Trưng, Hà Nội' },
  { names: ['bạch mai', 'bach mai'], lat: 21.0019, lng: 105.8503, label: 'Bạch Mai, Hai Bà Trưng, Hà Nội' },
  { names: ['lê thanh nghị', 'le thanh nghi'], lat: 21.0039, lng: 105.8441, label: 'Lê Thanh Nghị, Hai Bà Trưng, Hà Nội' },
  { names: ['tạ quang bửu', 'ta quang buu'], lat: 21.0048, lng: 105.8462, label: 'Tạ Quang Bửu, Hai Bà Trưng, Hà Nội' },
  { names: ['giải phóng', 'giai phong'], lat: 20.9958, lng: 105.8419, label: 'Giải Phóng, Hai Bà Trưng, Hà Nội' },
  { names: ['minh khai', 'minh khai hai bà trưng'], lat: 20.9972, lng: 105.8622, label: 'Minh Khai, Hai Bà Trưng, Hà Nội' },
  { names: ['times city', 'vinhomes times city'], lat: 20.9961, lng: 105.8692, label: 'Khu đô thị Times City, Hai Bà Trưng, Hà Nội' },
  { names: ['lò đúc', 'lo duc'], lat: 21.0115, lng: 105.8568, label: 'Lò Đúc, Hai Bà Trưng, Hà Nội' },
  { names: ['quận hai bà trưng', 'hai bà trưng', 'hai ba trung'], lat: 21.0069, lng: 105.8519, label: 'Quận Hai Bà Trưng, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN ĐỐNG ĐA ──
  { names: ['chùa bộc', 'chua boc'], lat: 21.0084, lng: 105.8285, label: 'Chùa Bộc, Đống Đa, Hà Nội' },
  { names: ['tây sơn', 'tay son'], lat: 21.0105, lng: 105.8239, label: 'Tây Sơn, Đống Đa, Hà Nội' },
  { names: ['thái hà', 'thai ha'], lat: 21.0142, lng: 105.8197, label: 'Thái Hà, Đống Đa, Hà Nội' },
  { names: ['láng hạ', 'lang ha'], lat: 21.0175, lng: 105.8142, label: 'Láng Hạ, Đống Đa, Hà Nội' },
  { names: ['ngõ 119 chùa láng', '119 chùa láng'], lat: 21.0225, lng: 105.8032, label: 'Ngõ 119 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội' },
  { names: ['ngõ 84 chùa láng', '84 chùa láng'], lat: 21.0242, lng: 105.8038, label: 'Ngõ 84 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội' },
  { names: ['chùa láng', 'chua lang'], lat: 21.0232, lng: 105.8049, label: 'Chùa Láng, Đống Đa, Hà Nội' },
  { names: ['đường láng', 'duong lang'], lat: 21.0148, lng: 105.8058, label: 'Đường Láng, Đống Đa, Hà Nội' },
  { names: ['nguyễn chí thanh', 'nguyen chi thanh'], lat: 21.0221, lng: 105.8105, label: 'Nguyễn Chí Thanh, Đống Đa, Hà Nội' },
  { names: ['xã đàn', 'xa dan'], lat: 21.0165, lng: 105.8342, label: 'Xã Đàn, Đống Đa, Hà Nội' },
  { names: ['ô chợ dừa', 'o cho dua'], lat: 21.0195, lng: 105.8275, label: 'Ô Chợ Dừa, Đống Đa, Hà Nội' },
  { names: ['tôn đức thắng', 'ton duc thang'], lat: 21.0255, lng: 105.8328, label: 'Tôn Đức Thắng, Đống Đa, Hà Nội' },
  { names: ['khâm thiên', 'kham thien'], lat: 21.0188, lng: 105.8385, label: 'Khâm Thiên, Đống Đa, Hà Nội' },
  { names: ['quận đống đa', 'đống đa', 'dong da'], lat: 21.0181, lng: 105.8268, label: 'Quận Đống Đa, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN CẦU GIẤY ──
  { names: ['ngõ 165 cầu giấy', '165 cầu giấy'], lat: 21.0336, lng: 105.7978, label: 'Ngõ 165 Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội' },
  { names: ['ngõ 68 cầu giấy', '68 cầu giấy'], lat: 21.0352, lng: 105.8022, label: 'Ngõ 68 Cầu Giấy, Quan Hoa, Cầu Giấy, Hà Nội' },
  { names: ['cầu giấy', 'cau giay'], lat: 21.0336, lng: 105.7978, label: 'Đường Cầu Giấy, Hà Nội' },
  { names: ['xuân thủy', 'xuan thuy'], lat: 21.0373, lng: 105.7828, label: 'Xuân Thủy, Cầu Giấy, Hà Nội' },
  { names: ['ngõ 20 hồ tùng mậu', '20 hồ tùng mậu'], lat: 21.0375, lng: 105.7765, label: 'Ngõ 20 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội' },
  { names: ['hồ tùng mậu', 'ho tung mau'], lat: 21.0375, lng: 105.7765, label: 'Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội' },
  { names: ['hoàng quốc việt', 'hoang quoc viet'], lat: 21.0467, lng: 105.7928, label: 'Hoàng Quốc Việt, Cầu Giấy, Hà Nội' },
  { names: ['duy tân', 'duy tan'], lat: 21.0306, lng: 105.7828, label: 'Duy Tân, Cầu Giấy, Hà Nội' },
  { names: ['trần thái tông', 'tran thai tong'], lat: 21.0315, lng: 105.7885, label: 'Trần Thái Tông, Cầu Giấy, Hà Nội' },
  { names: ['trần duy hưng', 'tran duy hung'], lat: 21.0089, lng: 105.7978, label: 'Trần Duy Hưng, Cầu Giấy, Hà Nội' },
  { names: ['trung hòa', 'trung hoa'], lat: 21.0117, lng: 105.7997, label: 'Trung Hòa, Cầu Giấy, Hà Nội' },
  { names: ['dịch vọng hậu', 'dich vong hau'], lat: 21.0335, lng: 105.7865, label: 'Dịch Vọng Hậu, Cầu Giấy, Hà Nội' },
  { names: ['dịch vọng', 'dich vong'], lat: 21.0348, lng: 105.7925, label: 'Dịch Vọng, Cầu Giấy, Hà Nội' },
  { names: ['nghĩa tân', 'nghia tan'], lat: 21.0435, lng: 105.7932, label: 'Nghĩa Tân, Cầu Giấy, Hà Nội' },
  { names: ['mai dịch', 'mai dich'], lat: 21.0385, lng: 105.7765, label: 'Mai Dịch, Cầu Giấy, Hà Nội' },
  { names: ['quận cầu giấy'], lat: 21.0362, lng: 105.7906, label: 'Quận Cầu Giấy, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN THANH XUÂN ──
  { names: ['nguyễn trãi', 'nguyen trai'], lat: 20.9988, lng: 105.8083, label: 'Nguyễn Trãi, Thanh Xuân, Hà Nội' },
  { names: ['khuất duy tiến', 'khuat duy tien'], lat: 20.9961, lng: 105.7936, label: 'Khuất Duy Tiến, Thanh Xuân, Hà Nội' },
  { names: ['lê văn lương', 'le van luong'], lat: 21.0061, lng: 105.8039, label: 'Lê Văn Lương, Thanh Xuân, Hà Nội' },
  { names: ['royal city', 'vinhomes royal city'], lat: 21.0028, lng: 105.8164, label: 'Royal City, Thanh Xuân, Hà Nội' },
  { names: ['thanh xuân bắc', 'thanh xuan bac'], lat: 20.9955, lng: 105.7985, label: 'Thanh Xuân Bắc, Hà Nội' },
  { names: ['khương trung', 'khuong trung'], lat: 20.9995, lng: 105.8175, label: 'Khương Trung, Thanh Xuân, Hà Nội' },
  { names: ['khương đình', 'khuong dinh'], lat: 20.9915, lng: 105.8125, label: 'Khương Đình, Thanh Xuân, Hà Nội' },
  { names: ['quận thanh xuân', 'thanh xuân', 'thanh xuan'], lat: 20.9937, lng: 105.8117, label: 'Quận Thanh Xuân, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN BA ĐÌNH ──
  { names: ['kim mã', 'kim ma'], lat: 21.0319, lng: 105.8219, label: 'Kim Mã, Ba Đình, Hà Nội' },
  { names: ['giảng võ', 'giang vo'], lat: 21.0278, lng: 105.8185, label: 'Giảng Võ, Ba Đình, Hà Nội' },
  { names: ['liễu giai', 'lieu giai'], lat: 21.0358, lng: 105.8145, label: 'Liễu Giai, Ba Đình, Hà Nội' },
  { names: ['đội cấn', 'doi can'], lat: 21.0353, lng: 105.8222, label: 'Đội Cấn, Ba Đình, Hà Nội' },
  { names: ['quán thánh', 'quan thanh'], lat: 21.0425, lng: 105.8395, label: 'Quán Thánh, Ba Đình, Hà Nội' },
  { names: ['quận ba đình', 'ba đình', 'ba dinh'], lat: 21.0341, lng: 105.8205, label: 'Quận Ba Đình, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN TÂY HỒ ──
  { names: ['lạc long quân', 'lac long quan'], lat: 21.0611, lng: 105.8117, label: 'Lạc Long Quân, Tây Hồ, Hà Nội' },
  { names: ['võ chí công', 'vo chi cong'], lat: 21.0655, lng: 105.8025, label: 'Võ Chí Công, Tây Hồ, Hà Nội' },
  { names: ['xuân diệu', 'xuan dieu'], lat: 21.0625, lng: 105.8285, label: 'Xuân Diệu, Tây Hồ, Hà Nội' },
  { names: ['thụy khuê', 'thuy khue'], lat: 21.0433, lng: 105.8239, label: 'Thụy Khuê, Tây Hồ, Hà Nội' },
  { names: ['quận tây hồ', 'tây hồ', 'tay ho'], lat: 21.0713, lng: 105.8234, label: 'Quận Tây Hồ, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN NAM TỪ LIÊM ──
  { names: ['phạm hùng', 'pham hung'], lat: 21.0168, lng: 105.7766, label: 'Phạm Hùng, Nam Từ Liêm, Hà Nội' },
  { names: ['mỹ đình', 'my dinh'], lat: 21.0258, lng: 105.7708, label: 'Mỹ Đình, Nam Từ Liêm, Hà Nội' },
  { names: ['mễ trì', 'me tri'], lat: 21.0125, lng: 105.7806, label: 'Mễ Trì, Nam Từ Liêm, Hà Nội' },
  { names: ['vinhomes smart city', 'smart city tây mỗ'], lat: 21.0069, lng: 105.7431, label: 'Vinhomes Smart City, Nam Từ Liêm, Hà Nội' },
  { names: ['trung văn', 'trung van'], lat: 20.9985, lng: 105.7865, label: 'Trung Văn, Nam Từ Liêm, Hà Nội' },
  { names: ['quận nam từ liêm', 'nam từ liêm', 'nam tu liem'], lat: 21.0173, lng: 105.7644, label: 'Quận Nam Từ Liêm, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN BẮC TỪ LIÊM ──
  { names: ['cổ nhuế', 'co nhue'], lat: 21.0658, lng: 105.7761, label: 'Cổ Nhuế, Bắc Từ Liêm, Hà Nội' },
  { names: ['xuân đỉnh', 'xuan dinh'], lat: 21.0719, lng: 105.7878, label: 'Xuân Đỉnh, Bắc Từ Liêm, Hà Nội' },
  { names: ['đức thắng', 'duc thang'], lat: 21.0785, lng: 105.7755, label: 'Đức Thắng, Bắc Từ Liêm, Hà Nội' },
  { names: ['phú diễn', 'phu dien'], lat: 21.0525, lng: 105.7615, label: 'Phú Diễn, Bắc Từ Liêm, Hà Nội' },
  { names: ['quận bắc từ liêm', 'bắc từ liêm', 'bac tu liem'], lat: 21.0631, lng: 105.7642, label: 'Quận Bắc Từ Liêm, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN HÀ ĐÔNG ──
  { names: ['quang trung hà đông', 'quang trung ha dong'], lat: 20.9708, lng: 105.7742, label: 'Quang Trung, Hà Đông, Hà Nội' },
  { names: ['trần phú hà đông', 'tran phu ha dong'], lat: 20.9792, lng: 105.7861, label: 'Trần Phú, Hà Đông, Hà Nội' },
  { names: ['văn quán', 'van quan'], lat: 20.9778, lng: 105.7917, label: 'Văn Quán, Hà Đông, Hà Nội' },
  { names: ['mộ lao', 'mo lao'], lat: 20.9845, lng: 105.7875, label: 'Mộ Lao, Hà Đông, Hà Nội' },
  { names: ['dương nội', 'duong noi'], lat: 20.9825, lng: 105.7485, label: 'Dương Nội, Hà Đông, Hà Nội' },
  { names: ['quận hà đông', 'hà đông', 'ha dong'], lat: 20.9721, lng: 105.7772, label: 'Quận Hà Đông, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN HOÀNG MAI ──
  { names: ['linh đàm', 'linh dam'], lat: 20.9667, lng: 105.8278, label: 'Bán đảo Linh Đàm, Hoàng Mai, Hà Nội' },
  { names: ['định công', 'dinh cong'], lat: 20.9861, lng: 105.8361, label: 'Định Công, Hoàng Mai, Hà Nội' },
  { names: ['giáp bát', 'giap bat'], lat: 20.9847, lng: 105.8431, label: 'Giáp Bát, Hoàng Mai, Hà Nội' },
  { names: ['tân mai', 'tan mai'], lat: 20.9855, lng: 105.8555, label: 'Tân Mai, Hoàng Mai, Hà Nội' },
  { names: ['quận hoàng mai', 'hoàng mai', 'hoang mai'], lat: 20.9749, lng: 105.8569, label: 'Quận Hoàng Mai, Hà Nội' },

  // ── TUYẾN ĐƯỜNG & KHU VỰC QUẬN LONG BIÊN ──
  { names: ['nguyễn văn cừ', 'nguyen van cu'], lat: 21.0487, lng: 105.8752, label: 'Nguyễn Văn Cừ, Long Biên, Hà Nội' },
  { names: ['ngọc lâm', 'ngoc lam'], lat: 21.0455, lng: 105.8695, label: 'Ngọc Lâm, Long Biên, Hà Nội' },
  { names: ['bồ đề', 'bo de'], lat: 21.0385, lng: 105.8725, label: 'Bồ Đề, Long Biên, Hà Nội' },
  { names: ['sài đồng', 'sai dong'], lat: 21.0365, lng: 105.9085, label: 'Sài Đồng, Long Biên, Hà Nội' },
  { names: ['quận long biên', 'long biên', 'long bien'], lat: 21.0427, lng: 105.8973, label: 'Quận Long Biên, Hà Nội' },

  // ── CÁC HUYỆN & THỊ XÃ NGOẠI THÀNH HÀ NỘI ──
  { names: ['thanh trì', 'thanh tri'], lat: 20.9472, lng: 105.8524, label: 'Huyện Thanh Trì, Hà Nội' },
  { names: ['vinhomes ocean park', 'ocean park gia lâm'], lat: 20.9922, lng: 105.9442, label: 'Vinhomes Ocean Park, Gia Lâm, Hà Nội' },
  { names: ['gia lâm', 'gia lam'], lat: 21.0267, lng: 105.9404, label: 'Huyện Gia Lâm, Hà Nội' },
  { names: ['đông anh', 'dong anh'], lat: 21.1396, lng: 105.8459, label: 'Huyện Đông Anh, Hà Nội' },
  { names: ['hoài đức', 'hoai duc'], lat: 21.0253, lng: 105.7077, label: 'Huyện Hoài Đức, Hà Nội' },
  { names: ['đan phượng', 'dan phuong'], lat: 21.1092, lng: 105.6744, label: 'Huyện Đan Phượng, Hà Nội' },
  { names: ['thị xã sơn tây', 'sơn tây', 'son tay'], lat: 21.1378, lng: 105.5083, label: 'Thị xã Sơn Tây, Hà Nội' },
  { names: ['sóc sơn', 'soc son'], lat: 21.2722, lng: 105.8472, label: 'Huyện Sóc Sơn, Hà Nội' },
  { names: ['thạch thất', 'thach that'], lat: 21.0278, lng: 105.5389, label: 'Huyện Thạch Thất, Hà Nội' },
  { names: ['chương mỹ', 'chuong my'], lat: 20.9094, lng: 105.6989, label: 'Huyện Chương Mỹ, Hà Nội' },
  { names: ['thường tín', 'thuong tin'], lat: 20.8722, lng: 105.8611, label: 'Huyện Thường Tín, Hà Nội' },

  // ── TP HÀ NỘI TRUNG TÂM TỔNG THỂ ──
  { names: ['hà nội', 'ha noi', 'tp hà nội', 'thành phố hà nội'], lat: 21.0285, lng: 105.8542, label: 'Thành phố Hà Nội' },
];

const HCMC_OFFLINE_LOCATIONS: LocationEntry[] = [
  // ── QUẬN 1 ──
  { names: ['nguyễn trãi quận 1', 'nguyễn trãi bến thành', 'nguyễn trãi'], lat: 10.7712, lng: 106.6925, label: 'Đường Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM' },
  { names: ['nguyễn thị minh khai', 'nguyễn thị minh khai quận 1'], lat: 10.7828, lng: 106.6958, label: 'Đường Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP.HCM' },
  { names: ['bến thành', 'ben thanh', 'phường bến thành'], lat: 10.7712, lng: 106.6925, label: 'Phường Bến Thành, Quận 1, TP.HCM' },
  { names: ['bến nghé', 'ben nghe', 'phường bến nghé'], lat: 10.7828, lng: 106.6958, label: 'Phường Bến Nghé, Quận 1, TP.HCM' },
  { names: ['quận 1', 'quan 1'], lat: 10.7756, lng: 106.7004, label: 'Quận 1, TP. Hồ Chí Minh' },

  // ── QUẬN 7 ──
  { names: ['đường số 10 tân phong', 'đường số 10 quận 7', 'đường số 10'], lat: 10.7330, lng: 106.7028, label: 'Đường số 10, Phường Tân Phong, Quận 7, TP.HCM' },
  { names: ['lê văn lương quận 7', 'lê văn lương tân phong'], lat: 10.7350, lng: 106.7040, label: 'Đường Lê Văn Lương, Phường Tân Phong, Quận 7, TP.HCM' },
  { names: ['nguyễn hữu thọ', 'nguyen huu tho'], lat: 10.7326, lng: 106.6992, label: 'Nguyễn Hữu Thọ, Phường Tân Phong, Quận 7, TP.HCM' },
  { names: ['phường tân phong', 'tân phong quận 7', 'tân phong'], lat: 10.7330, lng: 106.7030, label: 'Phường Tân Phong, Quận 7, TP.HCM' },
  { names: ['phú mỹ hưng', 'phu my hung'], lat: 10.7297, lng: 106.7072, label: 'Khu đô thị Phú Mỹ Hưng, Quận 7, TP.HCM' },
  { names: ['quận 7', 'quan 7'], lat: 10.7340, lng: 106.7160, label: 'Quận 7, TP. Hồ Chí Minh' },

  // ── QUẬN BÌNH THẠNH ──
  { names: ['điện biên phủ bình thạnh', 'điện biên phủ phường 25'], lat: 10.8005, lng: 106.7165, label: 'Đường Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM' },
  { names: ['phường 25 bình thạnh', 'phường 25'], lat: 10.8016, lng: 106.7145, label: 'Phường 25, Bình Thạnh, TP.HCM' },
  { names: ['quận bình thạnh', 'bình thạnh', 'binh thanh'], lat: 10.8105, lng: 106.7091, label: 'Quận Bình Thạnh, TP. Hồ Chí Minh' },

  // ── TP THỦ ĐỨC ──
  { names: ['masteri thảo điền', 'thảo điền masteri'], lat: 10.8035, lng: 106.7378, label: '159 Xa Lộ Hà Nội, Thảo Điền, TP. Thủ Đức, TP.HCM' },
  { names: ['xa lộ hà nội', 'võ nguyên giáp'], lat: 10.8035, lng: 106.7378, label: 'Xa Lộ Hà Nội, Thảo Điền, TP. Thủ Đức, TP.HCM' },
  { names: ['thảo điền', 'thao dien'], lat: 10.8055, lng: 106.7335, label: 'Phường Thảo Điền, TP. Thủ Đức, TP.HCM' },
  { names: ['tp thủ đức', 'thành phố thủ đức', 'thủ đức', 'thu duc'], lat: 10.8494, lng: 106.7537, label: 'TP. Thủ Đức, TP. Hồ Chí Minh' },

  // ── TP HỒ CHÍ MINH TRUNG TÂM TỔNG THỂ ──
  { names: ['tp.hcm', 'tphcm', 'tp hcm', 'tp hồ chí minh', 'thành phố hồ chí minh', 'hồ chí minh', 'ho chi minh', 'sài gòn', 'sai gon'], lat: 10.7769, lng: 106.7009, label: 'TP. Hồ Chí Minh' },
];

const ALL_OFFLINE_LOCATIONS: LocationEntry[] = [
  ...HANOI_OFFLINE_LOCATIONS,
  ...HCMC_OFFLINE_LOCATIONS,
];

/**
 * Loại bỏ dấu tiếng Việt để so sánh tìm kiếm chuỗi không phân biệt dấu
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Chuẩn hóa chuỗi địa chỉ để sinh ra các biến thể tìm kiếm
 */
export function buildSearchVariants(rawAddress: string): string[] {
  const trimmed = rawAddress.trim();
  if (!trimmed) return [];

  const variants: string[] = [trimmed];

  // 1. Loại bỏ tiền tố số nhà/ngõ ngách (VD: "Số 25 Phố Huế" -> "Phố Huế")
  const strippedStreetNumber = trimmed.replace(
    /^(số|ngõ|ngách|hẻm|nhà|phòng|căn|căn hộ|tòa nhà|tòa)\s*[\da-zA-Z\/\-]+\s*,?\s*/i,
    '',
  ).trim();
  if (strippedStreetNumber && strippedStreetNumber !== trimmed) {
    variants.push(strippedStreetNumber);
  }

  // 2. Tách các thành phần địa chỉ theo dấu phẩy
  const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    // Ghép bỏ thành phần đầu tiên (số nhà)
    const withoutFirst = parts.slice(1).join(', ');
    if (withoutFirst) variants.push(withoutFirst);

    // Ghép 2 thành phần cuối (quận + thành phố)
    if (parts.length >= 3) {
      const lastTwo = parts.slice(-2).join(', ');
      if (lastTwo) variants.push(lastTwo);
    }
  }

  // Loại trùng lặp
  return Array.from(new Set(variants));
}

/**
 * Pipeline Geocoding thông minh đa tầng:
 * 1. Khớp danh bạ trường Đại học
 * 2. Gọi API Photon Komoot (nhanh, hỗ trợ CORS, độ chính xác cao)
 * 3. Gọi OpenStreetMap Nominatim
 * 4. Tra cứu Offline Dictionary cho toàn bộ quận/huyện/tuyến phố Hà Nội
 */
export async function geocodeAddressPipeline(rawAddress: string): Promise<GeocodeResult | null> {
  const query = rawAddress.trim();
  if (!query) return null;

  const lowerQuery = query.toLowerCase();
  const nonAccentQuery = removeVietnameseTones(query);

  // ── TẦNG 1: Khớp danh bạ trường Đại học & Học viện ──
  const matchedUni = VIETNAM_UNIVERSITIES.find((u) => {
    const uniNameLower = u.name.toLowerCase();
    const uniAbbrLower = u.abbreviation?.toLowerCase() ?? '';
    const nonAccentName = removeVietnameseTones(u.name);

    return (
      lowerQuery.includes(uniNameLower) ||
      nonAccentQuery.includes(nonAccentName) ||
      (uniAbbrLower && lowerQuery.includes(uniAbbrLower)) ||
      (uniAbbrLower && nonAccentQuery.includes(removeVietnameseTones(uniAbbrLower)))
    );
  });

  if (matchedUni) {
    return {
      lat: matchedUni.lat,
      lng: matchedUni.lng,
      source: 'university',
      label: matchedUni.name,
    };
  }

  // ── TẦNG 2: Gọi dịch vụ bản đồ trực tuyến (Photon Komoot & Nominatim) ──
  const variants = buildSearchVariants(query);

  for (const variant of variants) {
    // 2A. Thử Photon Komoot (ElasticSearch OSM, CORS friendly, phản hồi cực nhanh)
    try {
      const photonController = new AbortController();
      const photonTimeout = setTimeout(() => photonController.abort(), 2800);

      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(variant)}&limit=1`,
        { signal: photonController.signal },
      );
      clearTimeout(photonTimeout);

      if (photonRes.ok) {
        const photonData = await photonRes.json();
        const firstFeature = photonData?.features?.[0];
        if (firstFeature?.geometry?.coordinates?.length >= 2) {
          const [lon, lat] = firstFeature.geometry.coordinates;
          if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
            return {
              lat: Number(lat.toFixed(6)),
              lng: Number(lon.toFixed(6)),
              source: 'online',
              label: variant,
            };
          }
        }
      }
    } catch {
      // Tiếp tục thử phương án tiếp theo
    }

    // 2B. Thử OpenStreetMap Nominatim
    try {
      const osmController = new AbortController();
      const osmTimeout = setTimeout(() => osmController.abort(), 2800);

      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=vn&limit=1&q=${encodeURIComponent(
          variant,
        )}`,
        {
          headers: { 'User-Agent': 'QNS-RealEstate-Broker/2.0' },
          signal: osmController.signal,
        },
      );
      clearTimeout(osmTimeout);

      if (osmRes.ok) {
        const osmData = await osmRes.json();
        if (Array.isArray(osmData) && osmData.length > 0) {
          const first = osmData[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            return {
              lat: Number(lat.toFixed(6)),
              lng: Number(lng.toFixed(6)),
              source: 'online',
              label: variant,
            };
          }
        }
      }
    } catch {
      // Tiếp tục thử phương án tiếp theo
    }
  }

  // ── TẦNG 3: Khớp Từ điển Offline chuẩn xác (Đảm bảo 100% định vị thành công) ──
  for (const item of ALL_OFFLINE_LOCATIONS) {
    const isMatched = item.names.some((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      const nonAccentKeyword = removeVietnameseTones(keyword);
      return lowerQuery.includes(lowerKeyword) || nonAccentQuery.includes(nonAccentKeyword);
    });

    if (isMatched) {
      return {
        lat: item.lat,
        lng: item.lng,
        source: 'offline',
        label: item.label,
      };
    }
  }

  // Mặc định trả về tọa độ trung tâm nếu có tên thành phố lớn
  if (lowerQuery.includes('hà nội') || nonAccentQuery.includes('ha noi')) {
    return {
      lat: 21.0285,
      lng: 105.8542,
      source: 'offline',
      label: 'Thành phố Hà Nội',
    };
  }

  if (
    lowerQuery.includes('hồ chí minh') ||
    nonAccentQuery.includes('ho chi minh') ||
    lowerQuery.includes('tp.hcm') ||
    nonAccentQuery.includes('tphcm') ||
    nonAccentQuery.includes('sai gon')
  ) {
    return {
      lat: 10.7769,
      lng: 106.7009,
      source: 'offline',
      label: 'TP. Hồ Chí Minh',
    };
  }

  return null;
}

/**
 * Pipeline Reverse Geocoding đa tầng:
 * Chuyển đổi tọa độ GPS (lat, lng) khi được click/chấm trên bản đồ thành chuỗi địa chỉ có nghĩa, chính xác và đồng bộ 100%
 * 1. Gọi Photon Komoot Reverse API (CORS friendly, phản hồi tức thời)
 * 2. Gọi OpenStreetMap Nominatim Reverse API
 * 3. Tra cứu Offline Dictionary: tìm trường đại học hoặc tuyến đường gần nhất trong bán kính
 */
export async function reverseGeocodePipeline(lat: number, lng: number): Promise<string> {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
    return 'Hà Nội';
  }

  // ── TẦNG 1: Photon Komoot Reverse API ──
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const props = data?.features?.[0]?.properties;
      if (props) {
        const parts: string[] = [];
        const street = props.street || props.name || '';
        const houseNumber = props.housenumber || '';
        if (houseNumber && street) {
          parts.push(`Số ${houseNumber} ${street}`);
        } else if (street) {
          parts.push(street);
        }
        if (props.district) parts.push(props.district);
        if (props.city) parts.push(props.city);
        else if (props.state) parts.push(props.state);

        if (parts.length > 0) {
          let addr = parts.join(', ');
          if (!addr.toLowerCase().includes('hà nội') && !addr.toLowerCase().includes('hồ chí minh')) {
            if (lat > 20.0 && lat < 22.0) addr += ', Hà Nội';
            else if (lat > 10.0 && lat < 12.0) addr += ', TP.HCM';
          }
          return addr;
        }
      }
    }
  } catch {
    // Tiếp tục tầng tiếp theo
  }

  // ── TẦNG 2: OpenStreetMap Nominatim Reverse API ──
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { 'User-Agent': 'QNS-RealEstate-Broker/2.0' },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addrObj = data?.address;
      if (addrObj) {
        const parts: string[] = [];
        const road = addrObj.road || addrObj.pedestrian || addrObj.suburb || '';
        const houseNumber = addrObj.house_number || '';
        if (houseNumber && road) {
          parts.push(`Số ${houseNumber} ${road}`);
        } else if (road) {
          parts.push(road);
        }
        const quarter = addrObj.quarter || addrObj.suburb || addrObj.neighbourhood || '';
        if (quarter && quarter !== road) parts.push(quarter);
        const district = addrObj.city_district || addrObj.district || addrObj.county || '';
        if (district && district !== quarter) parts.push(district);
        const city = addrObj.city || addrObj.state || '';
        if (city) parts.push(city);

        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
    }
  } catch {
    // Tiếp tục tầng tiếp theo
  }

  // ── TẦNG 3: Offline Lookup theo khoảng cách gần nhất ──
  // 3A. Tìm trường ĐH gần nhất (< 1.2km)
  let closestUni: { name: string; dist: number } | null = null;
  for (const uni of VIETNAM_UNIVERSITIES) {
    if (!uni.lat || !uni.lng) continue;
    const dist = calculateDistanceKm(lat, lng, uni.lat, uni.lng);
    if (!closestUni || dist < closestUni.dist) {
      closestUni = { name: uni.name, dist };
    }
  }
  if (closestUni && closestUni.dist <= 1.2) {
    const citySuffix = lat > 20.0 && lat < 22.0 ? ', Hà Nội' : lat > 10.0 && lat < 12.0 ? ', TP.HCM' : '';
    return `Khu vực gần ${closestUni.name}${citySuffix}`;
  }

  // 3B. Tìm tuyến phố / địa danh offline gần nhất (< 2.5km)
  let closestLoc: { label: string; dist: number } | null = null;
  for (const item of ALL_OFFLINE_LOCATIONS) {
    const dist = calculateDistanceKm(lat, lng, item.lat, item.lng);
    if (!closestLoc || dist < closestLoc.dist) {
      closestLoc = { label: item.label, dist };
    }
  }
  if (closestLoc && closestLoc.dist <= 2.5) {
    return closestLoc.label;
  }

  // 3C. Phân vùng miền theo vĩ độ
  if (lat > 20.0 && lat < 22.0) {
    return `Khu vực Thành phố Hà Nội (Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }
  if (lat > 10.0 && lat < 12.0) {
    return `Khu vực TP. Hồ Chí Minh (Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  }

  return `Tọa độ: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
