import { Listing } from './api';

export const DEMO_ROOM_RENT_LISTINGS: Listing[] = [
  {
    id: '3',
    title: 'Phòng trọ có gác lửng, máy lạnh mới 100% gần ĐH Tôn Đức Thắng & RMIT',
    slug: 'mau-phong-tro-gac-lung-gan-tdtu-id3',
    description:
      'Phòng trọ sinh viên mới xây sạch sẽ, giờ giấc tự do không chung chủ. Đầy đủ tiện nghi: máy lạnh inverter tiết kiệm điện, gác lửng đúc cao 2m đứng thẳng, kệ bếp nấu ăn, wifi cáp quang riêng từng tầng. Đi bộ 5 phút sang ĐH Tôn Đức Thắng, 7 phút sang ĐH Cảnh Sát Nhân Dân',
    transactionType: 'rent',
    propertyType: 'phong_tro',
    price: '3500000',
    depositAmount: '3500000',
    minLeaseMonths: 6,
    utilitiesIncluded: false,
    electricityPricePerKwh: 3500,
    waterPricePerM3: 18000,
    waterPriceFlat: 100000,
    amenities: {
      wifi: true,
      airConditioner: true,
      mezzanine: true,
      freeTime: true,
      securityCamera: true,
      parkingSpace: true,
      privateBathroom: true,
      thuCung: true,
      xeDien: true,
    },
    areaM2: '24',
    bedrooms: 1,
    bathrooms: 1,
    legalStatus: 'hop_dong_6_thang',
    addressDetail: 'Đường số 10, Phường Tân Phong, Quận 7, TP.HCM',
    lat: 10.7330,
    lng: 106.7028,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 420,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
      { imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=70', sortOrder: 2 },
    ],
    location: { id: 7, name: 'Quận 7, TP.HCM', slug: 'quan-7', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
    nearbyUniversities: [
      {
        distanceMeters: 450,
        travelTimeMinutes: 5,
        university: { id: 4, name: 'Trường Đại học Tôn Đức Thắng', abbreviation: 'TDTU', slug: 'dh-ton-duc-thang', address: '19 Nguyễn Hữu Thọ, Q.7' },
      },
      {
        distanceMeters: 1200,
        travelTimeMinutes: 10,
        university: { id: 10, name: 'Đại học RMIT Nam Sài Gòn', abbreviation: 'RMIT', slug: 'rmit-vietnam', address: '702 Nguyễn Văn Linh, Q.7' },
      },
    ],
  },
  {
    id: '1',
    title: 'Phòng trọ khép kín có gác lửng, máy lạnh gần ĐH Tôn Đức Thắng & RMIT',
    slug: 'mau-phong-tro-gac-lung-gan-tdtu-id1',
    description:
      'Phòng trọ sinh viên mới xây sạch sẽ, giờ giấc tự do không chung chủ. Đầy đủ tiện nghi: máy lạnh, gác lửng đúc kiên cố, kệ bếp nấu ăn, wifi cáp quang tốc độ cao. Ra ĐH Tôn Đức Thắng chỉ 5 phút đi bộ',
    transactionType: 'rent',
    propertyType: 'phong_tro',
    price: '3500000',
    depositAmount: '3500000',
    minLeaseMonths: 6,
    utilitiesIncluded: false,
    electricityPricePerKwh: 3500,
    waterPricePerM3: 18000,
    waterPriceFlat: 100000,
    amenities: {
      wifi: true,
      airConditioner: true,
      mezzanine: true,
      freeTime: true,
      securityCamera: true,
      parkingSpace: true,
      privateBathroom: true,
      thuCung: true,
      xeDien: true,
    },
    areaM2: '24',
    bedrooms: 1,
    bathrooms: 1,
    legalStatus: 'hop_dong_6_thang',
    addressDetail: 'Đường số 10, Phường Tân Phong, Quận 7, TP.HCM',
    lat: 10.7335,
    lng: 106.7032,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 450,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
    ],
    location: { id: 7, name: 'Quận 7, TP.HCM', slug: 'quan-7', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
    nearbyUniversities: [
      {
        distanceMeters: 450,
        travelTimeMinutes: 5,
        university: { id: 4, name: 'Trường Đại học Tôn Đức Thắng', abbreviation: 'TDTU', slug: 'dh-ton-duc-thang', address: '19 Nguyễn Hữu Thọ, Q.7' },
      },
    ],
  },
  {
    id: '5',
    title: 'Ký túc xá cao cấp Sleepbox riêng tư Cầu Giấy — Bao trọn gói điện nước wifi',
    slug: 'mau-sleepbox-cau-giay-bao-tron-goi-id5',
    description:
      'Mô hình phòng ktx sleepbox cao cấp trang bị cửa kéo riêng tư, đệm êm, bàn học, đèn đọc sách, ổ cắm điện. Khu vực bếp nấu, tủ lạnh, máy giặt dùng chung thoải mái. Giá thuê đã BAO TRỌN GÓI điện, nước, điều hòa, wifi, dọn vệ sinh hàng tuần',
    transactionType: 'rent',
    propertyType: 'ky_tuc_xa',
    price: '1800000',
    depositAmount: '1800000',
    minLeaseMonths: 3,
    utilitiesIncluded: true,
    electricityPricePerKwh: 0,
    waterPricePerM3: 0,
    amenities: {
      wifi: true,
      airConditioner: true,
      washingMachine: true,
      refrigerator: true,
      freeTime: true,
      securityCamera: true,
      smartLock: true,
    },
    areaM2: '15',
    bedrooms: 1,
    bathrooms: 1,
    legalStatus: 'hop_dong_linh_hoat',
    addressDetail: 'Ngõ 165 Cầu Giấy, Phường Dịch Vọng, Cầu Giấy, Hà Nội',
    lat: 21.0336,
    lng: 105.7978,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 380,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
    ],
    location: { id: 1, name: 'Cầu Giấy, Hà Nội', slug: 'cau-giay', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
    nearbyUniversities: [
      {
        distanceMeters: 600,
        travelTimeMinutes: 7,
        university: { id: 7, name: 'Đại học Quốc gia Hà Nội', abbreviation: 'VNU HN', slug: 'dhqg-ha-noi', address: '144 Xuân Thủy, Cầu Giấy' },
      },
      {
        distanceMeters: 800,
        travelTimeMinutes: 9,
        university: { id: 8, name: 'Đại học Sư phạm Hà Nội', abbreviation: 'HNUE', slug: 'dh-su-pham-ha-noi', address: '136 Xuân Thủy, Cầu Giấy' },
      },
    ],
  },
  {
    id: '31',
    title: 'Phòng cao cấp gác lửng mới 100%, full nội thất Cầu Giấy',
    slug: 'phong-cao-cap-gac-lung-moi-cau-giay-id31',
    description:
      'Phòng trọ cao cấp gác lửng đúc kiên cố cao 2m, không chung chủ, giờ giấc tự do 100% bằng khóa vân tay. Tiện nghi trong phòng: máy lạnh Inverter, bình nóng lạnh, tủ lạnh 2 cánh, gác lửng gỗ sồi, kệ bếp chậu rửa inox cao cấp, bàn học làm việc, tủ quần áo 3 cánh. Tòa nhà thang máy tốc độ cao, máy giặt chung miễn phí tầng thượng',
    transactionType: 'rent',
    propertyType: 'phong_tro',
    price: '4500000',
    depositAmount: '4500000',
    minLeaseMonths: 6,
    utilitiesIncluded: false,
    electricityPricePerKwh: 3800,
    waterPricePerM3: 25000,
    amenities: {
      wifi: true,
      airConditioner: true,
      mezzanine: true,
      freeTime: true,
      securityCamera: true,
      parkingSpace: true,
      elevator: true,
      washingMachine: true,
      smartLock: true,
      privateBathroom: true,
    },
    areaM2: '28',
    bedrooms: 1,
    bathrooms: 1,
    legalStatus: 'hop_dong_6_thang',
    addressDetail: 'Số 18 Ngõ 165 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
    lat: 21.0340,
    lng: 105.7982,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 310,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
      { imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=70', sortOrder: 2 },
    ],
    location: { id: 1, name: 'Cầu Giấy, Hà Nội', slug: 'cau-giay', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
    nearbyUniversities: [
      {
        distanceMeters: 500,
        travelTimeMinutes: 6,
        university: { id: 7, name: 'Đại học Quốc gia Hà Nội', abbreviation: 'VNU HN', slug: 'dhqg-ha-noi', address: '144 Xuân Thủy, Cầu Giấy' },
      },
    ],
  },
];

export const DEMO_STUDIO_RENT_LISTINGS: Listing[] = [
  {
    id: '2',
    title: 'Căn hộ Studio ban công thoáng gió full nội thất trung tâm Quận 1',
    slug: 'mau-can-ho-studio-quan-1-id2',
    description:
      'Studio thiết kế phong cách Bắc Âu hiện đại, ngập tràn ánh sáng tự nhiên. Đầy đủ trang thiết bị: smart TV 50 inch, tủ lạnh 2 cánh, máy giặt riêng trong phòng, sofa thư giãn, khóa cửa vân tay. Khu dân cư an ninh, phù hợp chuyên gia trẻ hoặc người đi làm',
    transactionType: 'rent',
    propertyType: 'studio',
    price: '8500000',
    depositAmount: '8500000',
    minLeaseMonths: 12,
    utilitiesIncluded: false,
    electricityPricePerKwh: 4000,
    waterPricePerM3: 25000,
    amenities: {
      wifi: true,
      airConditioner: true,
      washingMachine: true,
      refrigerator: true,
      smartLock: true,
      elevator: true,
      balcony: true,
      freeTime: true,
      thuCung: true,
      xeDien: true,
    },
    areaM2: '35',
    bedrooms: 1,
    bathrooms: 1,
    legalStatus: 'hop_dong_1_nam',
    addressDetail: 'Đường Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM',
    lat: 10.7712,
    lng: 106.6925,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 295,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
    ],
    location: { id: 2, name: 'Quận 1, TP.HCM', slug: 'quan-1', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
    nearbyUniversities: [
      {
        distanceMeters: 1200,
        travelTimeMinutes: 8,
        university: { id: 3, name: 'Đại học Kinh tế TP. Hồ Chí Minh', abbreviation: 'UEH', slug: 'dh-kinh-te-tphcm', address: '59C Nguyễn Đình Chiểu, Q.3' },
      },
    ],
  },
  {
    id: '13',
    title: 'Studio duplex gác lửng trần cao có ban công riêng Quận Cầu Giấy',
    slug: 'mau-studio-duplex-gac-lung-cau-giay-id13',
    description:
      'Studio thiết kế gác lửng trần cao 3m thoáng mát, không gian tiếp khách và giường ngủ tách biệt. Ban công đón nắng sớm, đầy đủ máy giặt, điều hòa, tủ lạnh, bếp từ âm. Khóa cửa vân tay từng phòng, an ninh tuyệt đối',
    transactionType: 'rent',
    propertyType: 'studio_gac_lung',
    price: '6500000',
    depositAmount: '6500000',
    minLeaseMonths: 12,
    utilitiesIncluded: false,
    electricityPricePerKwh: 3800,
    waterPricePerM3: 30000,
    amenities: {
      wifi: true,
      airConditioner: true,
      washingMachine: true,
      refrigerator: true,
      smartLock: true,
      elevator: true,
      balcony: true,
      freeTime: true,
    },
    areaM2: '32',
    bedrooms: 1,
    bathrooms: 1,
    legalStatus: 'hop_dong_1_nam',
    addressDetail: 'Ngõ 20 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội',
    lat: 21.0375,
    lng: 105.7765,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 310,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
    ],
    location: { id: 1, name: 'Cầu Giấy, Hà Nội', slug: 'cau-giay', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
    nearbyUniversities: [
      {
        distanceMeters: 400,
        travelTimeMinutes: 5,
        university: { id: 1, name: 'Đại học Quốc gia Hà Nội', abbreviation: 'VNU HN', slug: 'dhqg-ha-noi', address: '144 Xuân Thủy, Cầu Giấy' },
      },
      {
        distanceMeters: 650,
        travelTimeMinutes: 8,
        university: { id: 8, name: 'Trường Đại học Thương mại', abbreviation: 'TMU', slug: 'dh-thuong-mai', address: '79 Hồ Tùng Mậu, Cầu Giấy' },
      },
    ],
  },
  {
    id: '38',
    title: 'Studio duplex gác lửng cao cấp ban công riêng gần ĐH Tôn Đức Thắng',
    slug: 'studio-duplex-gac-lung-ban-cong-rieng-tdtu-id38',
    description:
      'Studio Duplex gác lửng đúc cao, ban công cửa kính lớn thoáng mát ngập tràn ánh nắng, view thoáng đãng không bị che khuất. Nội thất cao cấp: máy lạnh Inverter, tủ lạnh 2 cánh đời mới, gác lửng nệm cao su êm ái, tủ đồ âm tường, kệ bếp nấu ăn có máy hút mùi, bàn làm việc và ghế xoay êm ái. Chỉ 400m sang ĐH Tôn Đức Thắng, 1km sang RMIT',
    transactionType: 'rent',
    propertyType: 'studio_gac_lung',
    price: '4800000',
    depositAmount: '4800000',
    minLeaseMonths: 6,
    utilitiesIncluded: false,
    electricityPricePerKwh: 3800,
    waterPricePerM3: 20000,
    amenities: {
      wifi: true,
      airConditioner: true,
      washingMachine: true,
      refrigerator: true,
      smartLock: true,
      elevator: true,
      balcony: true,
      mezzanine: true,
      freeTime: true,
    },
    areaM2: '30',
    bedrooms: 1,
    bathrooms: 1,
    legalStatus: 'hop_dong_6_thang',
    addressDetail: 'Đường Lê Văn Lương, Phường Tân Phong, Quận 7, TP.HCM',
    lat: 10.7350,
    lng: 106.7040,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 285,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
      { imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=70', sortOrder: 2 },
    ],
    location: { id: 7, name: 'Quận 7, TP.HCM', slug: 'quan-7', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
    nearbyUniversities: [
      {
        distanceMeters: 400,
        travelTimeMinutes: 5,
        university: { id: 4, name: 'Trường Đại học Tôn Đức Thắng', abbreviation: 'TDTU', slug: 'dh-ton-duc-thang', address: '19 Nguyễn Hữu Thọ, Q.7' },
      },
    ],
  },
];

export const DEMO_CAN_HO_RENT_LISTINGS: Listing[] = [
  {
    id: '10',
    title: 'Cho thuê căn hộ chung cư 2PN Masteri Thảo Điền, view Landmark 81',
    slug: 'cho-thue-can-ho-masteri-thao-dien-2pn-id10',
    description:
      'Căn hộ tầng 18 view thoáng mát nhìn sang Landmark 81. Nội thất trang bị đầy đủ không thiếu thứ gì: sofa da, TV 65 inch, tủ lạnh 2 cánh, máy giặt sấy. Phù hợp gia đình trẻ hoặc chuyên gia nước ngoài thuê dài hạn',
    transactionType: 'rent',
    propertyType: 'can_ho_chung_cu',
    price: '18000000',
    depositAmount: '36000000',
    minLeaseMonths: 12,
    utilitiesIncluded: false,
    electricityPricePerKwh: 2800,
    waterPricePerM3: 16000,
    amenities: {
      wifi: true,
      airConditioner: true,
      washingMachine: true,
      refrigerator: true,
      smartLock: true,
      elevator: true,
      balcony: true,
      parkingSpace: true,
      thuCung: true,
      xeDien: true,
    },
    areaM2: '74',
    bedrooms: 2,
    bathrooms: 2,
    legalStatus: 'hop_dong_chinh_chu',
    addressDetail: '159 Xa Lộ Hà Nội, Thảo Điền, TP. Thủ Đức, TP.HCM',
    lat: 10.8035,
    lng: 106.7378,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 220,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
    ],
    location: { id: 2, name: 'TP. Thủ Đức, TP.HCM', slug: 'tp-thu-duc', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
  },
  {
    id: '12',
    title: 'Cho thuê căn hộ dịch vụ 1PN tách bếp cao cấp Quận Bình Thạnh',
    slug: 'cho-thue-can-ho-dich-vu-1pn-binh-thanh-id12',
    description:
      'Căn hộ dịch vụ cao cấp, phòng ngủ riêng biệt tách bếp, có ban công thoáng sáng. Đã bao gồm dọn phòng tuần 2 lần, nước sinh hoạt, wifi tốc độ cao. Giờ giấc tự do, bảo vệ 24/7',
    transactionType: 'rent',
    propertyType: 'can_ho_dich_vu',
    price: '11000000',
    depositAmount: '11000000',
    minLeaseMonths: 6,
    utilitiesIncluded: false,
    electricityPricePerKwh: 4000,
    waterPriceFlat: 100000,
    amenities: {
      wifi: true,
      airConditioner: true,
      washingMachine: true,
      refrigerator: true,
      smartLock: true,
      elevator: true,
      balcony: true,
      freeTime: true,
    },
    areaM2: '45',
    bedrooms: 1,
    bathrooms: 1,
    legalStatus: 'hop_dong_1_nam',
    addressDetail: 'Đường Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM',
    lat: 10.8005,
    lng: 106.7165,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 180,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
    ],
    location: { id: 2, name: 'Bình Thạnh, TP.HCM', slug: 'binh-thanh', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
  },
  {
    id: '14',
    title: 'Căn hộ mini mới xây full đồ thang máy khép kín Quận Đống Đa',
    slug: 'can-ho-mini-moi-xay-thang-may-dong-da-id14',
    description:
      'Căn hộ mini tầng 4 toà nhà 7 tầng có thang máy thẻ từ, bảo vệ trực 24/24. Phòng trang bị đầy đủ: điều hòa Inverter, nóng lạnh, giường tủ, máy giặt chung sân thượng rộng rãi',
    transactionType: 'rent',
    propertyType: 'can_ho_mini',
    price: '5500000',
    depositAmount: '5500000',
    minLeaseMonths: 12,
    utilitiesIncluded: false,
    electricityPricePerKwh: 3800,
    waterPricePerM3: 30000,
    amenities: {
      wifi: true,
      airConditioner: true,
      elevator: true,
      smartLock: true,
      freeTime: true,
    },
    areaM2: '28',
    bedrooms: 1,
    bathrooms: 1,
    legalStatus: 'hop_dong_1_nam',
    addressDetail: 'Ngõ 119 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội',
    lat: 21.0225,
    lng: 105.8032,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 240,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
    ],
    location: { id: 1, name: 'Đống Đa, Hà Nội', slug: 'dong-da', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
    nearbyUniversities: [
      {
        distanceMeters: 150,
        travelTimeMinutes: 2,
        university: { id: 11, name: 'Trường Đại học Ngoại thương', abbreviation: 'FTU', slug: 'dh-ngoai-thuong-hn', address: '91 Chùa Láng, Đống Đa' },
      },
      {
        distanceMeters: 350,
        travelTimeMinutes: 4,
        university: { id: 12, name: 'Học viện Ngoại giao', abbreviation: 'DAV', slug: 'hoc-vien-ngoai-giao', address: '69 Chùa Láng, Đống Đa' },
      },
    ],
  },
];

export const DEMO_HOUSE_RENT_LISTING: Listing = {
  id: '11',
  title: 'Cho thuê nhà nguyên căn 3 tầng ngõ ô tô Quận Cầu Giấy',
  slug: 'cho-thue-nha-nguyen-can-cau-giay-id11',
  description:
    'Nhà 3 tầng sạch sẽ kiên cố, diện tích mỗi sàn 55m2, gồm 3 phòng ngủ thoáng mát, sân phơi, bếp riêng. Phù hợp vừa ở vừa làm văn phòng công ty nhỏ hoặc nhóm sinh viên ở ghép',
  transactionType: 'rent',
  propertyType: 'nha_rieng',
  price: '14000000',
  depositAmount: '14000000',
  minLeaseMonths: 12,
  utilitiesIncluded: false,
  amenities: {
    airConditioner: true,
    parkingSpace: true,
    balcony: true,
    freeTime: true,
  },
  areaM2: '55',
  bedrooms: 3,
  bathrooms: 3,
  legalStatus: 'hop_dong_1_nam',
  addressDetail: 'Ngõ 68 Cầu Giấy, Phường Quan Hoa, Cầu Giấy, Hà Nội',
  lat: 21.0352,
  lng: 105.8022,
  status: 'active',
  publishedAt: new Date().toISOString(),
  viewCount: 175,
  images: [
    { imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
    { imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
  ],
  location: { id: 1, name: 'Cầu Giấy, Hà Nội', slug: 'cau-giay', level: 'district' },
  project: null,
  owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
  nearbyUniversities: [
    {
      distanceMeters: 800,
      travelTimeMinutes: 9,
      university: { id: 5, name: 'Trường Đại học Giao thông Vận tải', abbreviation: 'UTC', slug: 'dh-giao-thong-van-tai', address: '3 Cầu Giấy, Đống Đa' },
    },
  ],
};

export const DEMO_SPACE_RENT_LISTINGS: Listing[] = [
  {
    id: '4',
    title: 'Cho thuê mặt bằng kinh doanh phố lớn Nguyễn Trãi, mặt tiền 6m',
    slug: 'cho-thue-mat-bang-kinh-doanh-pho-lon-id4',
    description:
      'Vị trí đắc địa ngay tuyến phố sầm uất, mặt tiền rộng 6m thông thoáng, vỉa hè rộng để xe thoải mái. Thích hợp kinh doanh cafe, showroom, văn phòng, nha khoa. Hợp đồng dài hạn trực tiếp bên cho thuê',
    transactionType: 'rent',
    propertyType: 'mat_bang',
    price: '25000000',
    depositAmount: '50000000',
    minLeaseMonths: 24,
    utilitiesIncluded: false,
    areaM2: '70',
    bedrooms: null,
    bathrooms: 1,
    legalStatus: 'hop_dong_dai_han',
    addressDetail: 'Mặt phố Nguyễn Trãi, Thanh Xuân, Hà Nội',
    lat: 20.9988,
    lng: 105.8083,
    status: 'active',
    publishedAt: new Date().toISOString(),
    viewCount: 195,
    images: [
      { imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=75', sortOrder: 0 },
      { imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&auto=format&fit=crop&q=70', sortOrder: 1 },
    ],
    location: { id: 3, name: 'Thanh Xuân, Hà Nội', slug: 'thanh-xuan', level: 'district' },
    project: null,
    owner: { id: '1', fullName: 'Chủ nhà', avatarUrl: null, createdAt: '2026-01-01T00:00:00.000Z' },
  },
];

export const DEMO_RENT_LISTINGS: Listing[] = [
  ...DEMO_CAN_HO_RENT_LISTINGS,
  ...DEMO_STUDIO_RENT_LISTINGS,
  ...DEMO_ROOM_RENT_LISTINGS,
  DEMO_HOUSE_RENT_LISTING,
];

export const ALL_DEMO_LISTINGS: Listing[] = [
  ...DEMO_CAN_HO_RENT_LISTINGS,
  ...DEMO_STUDIO_RENT_LISTINGS,
  ...DEMO_ROOM_RENT_LISTINGS,
  DEMO_HOUSE_RENT_LISTING,
  ...DEMO_SPACE_RENT_LISTINGS,
];

/**
 * Bản đồ ánh xạ toàn bộ các slug cũ, slug test và slug seed
 * đảm bảo dù người dùng bấm vào bất kỳ đường dẫn nào cũng xem được phòng, KHÔNG BAO GIỜ bị 404
 */
export const DEMO_SLUG_ALIASES: Record<string, string> = {
  // Alias studio & chung cư mini
  'mau-can-ho-studio-quan-1-full-noi-that-id2': 'mau-can-ho-studio-quan-1-id2',
  'listing-bao-toan-dau-moi-852676': 'studio-duplex-gac-lung-ban-cong-rieng-tdtu-id38',
  'listing-b-168008': 'mau-can-ho-studio-quan-1-id2',

  // Alias phòng trọ & ký túc xá
  'mau-phong-tro-gac-lung-gan-tdtu-id1': 'mau-phong-tro-gac-lung-gan-tdtu-id1',
  'listing-bao-toan-dau-moi-834414': 'mau-sleepbox-cau-giay-bao-tron-goi-id5',
  'listing-bao-toan-dau-moi-393720': 'phong-cao-cap-gac-lung-moi-cau-giay-id31',
  'phong-cao-cap-168008': 'phong-cao-cap-gac-lung-moi-cau-giay-id31',
  'cho-thue-phong-tro-khep-kin-full-noi-that-id1788448297378': 'mau-phong-tro-gac-lung-gan-tdtu-id3',

  // Alias căn hộ dịch vụ & chung cư
  'listing-other-168008': 'cho-thue-can-ho-dich-vu-1pn-binh-thanh-id12',
  'tin-cu-goi-cu-1790238004477-idtemp': 'can-ho-mini-moi-xay-thang-may-dong-da-id14',
  'tin-cu-goi-cu-1790238029653-idtemp': 'cho-thue-can-ho-masteri-thao-dien-2pn-id10',
  'tin-test-outbox-1790238393770-idtemp': 'mau-studio-duplex-gac-lung-cau-giay-id13',

  // Alias mặt bằng kinh doanh
  'cho-thue-mat-bang-kinh-doanh-pho-lon-id1788448297419': 'cho-thue-mat-bang-kinh-doanh-pho-lon-id4',
};

/**
 * Tìm kiếm tin demo theo slug hoặc ID
 * Khi fallbackToFirst = true mới trả về tin đầu tiên, mặc định trả về null khi không khớp
 */
export function findDemoListing(slugOrId: string, fallbackToFirst = false): Listing | null {
  if (!slugOrId) return fallbackToFirst ? ALL_DEMO_LISTINGS[0] : null;

  // 1. Tìm chính xác theo slug
  const directMatch = ALL_DEMO_LISTINGS.find((item) => item.slug === slugOrId);
  if (directMatch) return directMatch;

  // 2. Tìm qua bảng alias
  const aliasSlug = DEMO_SLUG_ALIASES[slugOrId];
  if (aliasSlug) {
    const aliasMatch = ALL_DEMO_LISTINGS.find((item) => item.slug === aliasSlug);
    if (aliasMatch) return aliasMatch;
  }

  // 3. Tìm theo ID trích xuất từ slug dạng -id123 hoặc số nguyên
  const idMatch = slugOrId.match(/-id([a-zA-Z0-9]+)$/) ?? slugOrId.match(/^(\d+)$/);
  if (idMatch) {
    const extractedId = idMatch[1];
    const matchById = ALL_DEMO_LISTINGS.find((item) => item.id === extractedId);
    if (matchById) return matchById;
  }

  // 4. Tìm theo các chữ số ở cuối slug
  const trailingDigitsMatch = slugOrId.match(/-(\d+)$/);
  if (trailingDigitsMatch) {
    const trailingDigits = trailingDigitsMatch[1];
    const matchByTrailing = ALL_DEMO_LISTINGS.find(
      (item) => item.id === trailingDigits || item.slug.endsWith(`-id${trailingDigits}`)
    );
    if (matchByTrailing) return matchByTrailing;
  }

  // 5. Tìm theo từ khóa trong slug
  const normalized = slugOrId.toLowerCase();
  const partialMatch = ALL_DEMO_LISTINGS.find(
    (item) => item.slug.includes(normalized) || normalized.includes(item.slug.replace(/-id\d+$/, ''))
  );
  if (partialMatch) return partialMatch;

  // 6. Nếu không khớp bất kỳ tiêu chí nào
  return fallbackToFirst ? ALL_DEMO_LISTINGS[0] : null;
}

