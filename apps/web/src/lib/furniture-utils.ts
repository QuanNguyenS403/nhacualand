/**
 * Tiện ích trích xuất danh sách nội thất & tiện nghi đồng bộ cho toàn bộ website
 * Nguồn sự thật duy nhất giữa trang chi tiết phòng (/tin/[slug]) và khung xem nhanh trên bản đồ
 */

export const FURNITURE_NAMES: Record<string, string> = {
  dieuHoa: 'Điều hòa',
  airConditioner: 'Điều hòa',
  air_conditioner: 'Điều hòa',
  nongLanh: 'Bình nóng lạnh',
  waterHeater: 'Bình nóng lạnh',
  water_heater: 'Bình nóng lạnh',
  tuLanh: 'Tủ lạnh',
  refrigerator: 'Tủ lạnh',
  mayGiat: 'Máy giặt',
  washingMachine: 'Máy giặt',
  washing_machine: 'Máy giặt',
  giuongDem: 'Giường nệm',
  bed: 'Giường nệm',
  tuQuanAo: 'Tủ quần áo',
  wardrobe: 'Tủ quần áo',
  banGhe: 'Bàn ghế làm việc',
  sofa: 'Ghế sofa',
  smartTv: 'Tivi',
  bepRieng: 'Bếp',
  kitchen: 'Bếp',
  gacLung: 'Gác lửng',
  mezzanine: 'Gác lửng',
  banCong: 'Ban công',
  balcony: 'Ban công',
  khoaVanTay: 'Khóa vân tay',
  smartLock: 'Khóa vân tay',
  fingerprint_lock: 'Khóa vân tay',
  thangMay: 'Thang máy',
  elevator: 'Thang máy',
  wifi: 'Wifi tốc độ cao',
  gioTuDo: 'Giờ giấc tự do',
  freeTime: 'Giờ giấc tự do',
  choDeXe: 'Chỗ để xe',
  parking: 'Nhà để xe',
  thuCung: 'Thú cưng',
  petsAllowed: 'Thú cưng',
  xeDien: 'Xe điện',
  electricVehicle: 'Xe điện',
  bunkBed: 'Giường tầng',
  dryingBalcony: 'Ban công phơi',
  security247: 'Bảo vệ 24/7',
  window: 'Cửa sổ',
  privateBathroom: 'Vệ sinh riêng',
  dryer: 'Máy sấy',
  foreigner: 'Người nước ngoài',
};

export function extractListingFurnitureList(listing: any): string[] {
  if (!listing) return [];
  const list: string[] = [];
  const am = listing.amenities || {};

  Object.entries(FURNITURE_NAMES).forEach(([k, label]) => {
    if (am[k] && !list.includes(label)) {
      list.push(label);
    }
  });

  const desc = (listing.description || '').toLowerCase();
  if (desc.includes('điều hòa') || desc.includes('máy lạnh')) {
    if (!list.includes('Điều hòa')) list.push('Điều hòa');
  }
  if (desc.includes('nóng lạnh') || desc.includes('bình nóng')) {
    if (!list.includes('Bình nóng lạnh')) list.push('Bình nóng lạnh');
  }
  if (desc.includes('tủ lạnh')) {
    if (!list.includes('Tủ lạnh')) list.push('Tủ lạnh');
  }
  if (desc.includes('máy giặt')) {
    if (!list.includes('Máy giặt')) list.push('Máy giặt');
  }
  if (desc.includes('giường') || desc.includes('đệm') || desc.includes('nệm')) {
    if (!list.includes('Giường nệm')) list.push('Giường nệm');
  }
  if (desc.includes('tủ quần áo') || desc.includes('tủ đồ')) {
    if (!list.includes('Tủ quần áo')) list.push('Tủ quần áo');
  }
  if (desc.includes('bếp') || desc.includes('kệ bếp') || desc.includes('nấu ăn')) {
    if (!list.includes('Bếp')) list.push('Bếp');
  }
  if (desc.includes('sofa')) {
    if (!list.includes('Ghế sofa')) list.push('Ghế sofa');
  }
  if (desc.includes('ban công')) {
    if (!list.includes('Ban công')) list.push('Ban công');
  }
  if (desc.includes('khóa vân tay') || desc.includes('vân tay')) {
    if (!list.includes('Khóa vân tay')) list.push('Khóa vân tay');
  }
  if (desc.includes('thang máy')) {
    if (!list.includes('Thang máy')) list.push('Thang máy');
  }
  if (desc.includes('wifi')) {
    if (!list.includes('Wifi tốc độ cao')) list.push('Wifi tốc độ cao');
  }
  if (desc.includes('để xe') || desc.includes('nhà xe')) {
    if (!list.includes('Chỗ để xe')) list.push('Chỗ để xe');
  }
  if (desc.includes('giờ giấc tự do')) {
    if (!list.includes('Giờ giấc tự do')) list.push('Giờ giấc tự do');
  }

  if (list.length === 0) {
    return ['Điều hòa', 'Bình nóng lạnh', 'Giường nệm', 'Tủ quần áo', 'Bếp', 'Chỗ để xe', 'Wifi tốc độ cao', 'Giờ giấc tự do'];
  }

  return list;
}
