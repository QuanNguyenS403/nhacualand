/**
 * Seed dữ liệu khởi tạo.
 *
 * LƯU Ý QUAN TRỌNG: Script này CHỈ seed dữ liệu nền (địa danh hành chính, tài khoản demo)
 * và 2 tin đăng MẪU để kiểm tra giao diện. KHÔNG chứa dữ liệu bất động sản thật.
 * Khi khách hàng cung cấp dữ liệu BĐS hàng loạt (CSV/JSON/Excel), dùng script
 * `pnpm db:import-listings -- --file=<đường-dẫn>` (packages/database/scripts/import-listings.ts)
 * để nạp vào — KHÔNG sửa tay file seed này để nhét dữ liệu thật vào.
 */
import { PrismaClient, TransactionType, ListingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ---------- 1. Địa danh hành chính (dữ liệu nền, không phải "dữ liệu BĐS") ----------
  const hcm = await prisma.location.upsert({
    where: { slug: 'ho-chi-minh' },
    update: {},
    create: { level: 'province', name: 'TP. Hồ Chí Minh', slug: 'ho-chi-minh' },
  });

  const quan7 = await prisma.location.upsert({
    where: { slug: 'ho-chi-minh-quan-7' },
    update: {},
    create: { level: 'district', name: 'Quận 7', slug: 'ho-chi-minh-quan-7', parentId: hcm.id },
  });

  const quan1 = await prisma.location.upsert({
    where: { slug: 'ho-chi-minh-quan-1' },
    update: {},
    create: { level: 'district', name: 'Quận 1', slug: 'ho-chi-minh-quan-1', parentId: hcm.id },
  });

  const binhthanh = await prisma.location.upsert({
    where: { slug: 'ho-chi-minh-binh-thanh' },
    update: {},
    create: { level: 'district', name: 'Bình Thạnh', slug: 'ho-chi-minh-binh-thanh', parentId: hcm.id },
  });

  const phuongTanPhong = await prisma.location.upsert({
    where: { slug: 'ho-chi-minh-quan-7-phuong-tan-phong' },
    update: {},
    create: {
      level: 'ward',
      name: 'Phường Tân Phong',
      slug: 'ho-chi-minh-quan-7-phuong-tan-phong',
      parentId: quan7.id,
    },
  });

  const hanoi = await prisma.location.upsert({
    where: { slug: 'ha-noi' },
    update: {},
    create: { level: 'province', name: 'Hà Nội', slug: 'ha-noi' },
  });

  const cauGiay = await prisma.location.upsert({
    where: { slug: 'ha-noi-cau-giay' },
    update: {},
    create: { level: 'district', name: 'Cầu Giấy', slug: 'ha-noi-cau-giay', parentId: hanoi.id },
  });

  const dongDa = await prisma.location.upsert({
    where: { slug: 'ha-noi-dong-da' },
    update: {},
    create: { level: 'district', name: 'Đống Đa', slug: 'ha-noi-dong-da', parentId: hanoi.id },
  });

  const haiBaTrung = await prisma.location.upsert({
    where: { slug: 'ha-noi-hai-ba-trung' },
    update: {},
    create: { level: 'district', name: 'Hai Bà Trưng', slug: 'ha-noi-hai-ba-trung', parentId: hanoi.id },
  });

  const danang = await prisma.location.upsert({
    where: { slug: 'da-nang' },
    update: {},
    create: { level: 'province', name: 'Đà Nẵng', slug: 'da-nang' },
  });

  // ---------- 2. Tài khoản demo ----------
  const defaultPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || 'Demo@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const adminPhone = process.env.ADMIN_BOOTSTRAP_PHONE || '0900000001';
  const admin = await prisma.user.upsert({
    where: { phone: adminPhone },
    update: {
      fullName: 'Chủ nhà',
      role: 'admin',
      passwordHash,
      email: 'ducquan16102006@gmail.com',
    },
    create: {
      phone: adminPhone,
      fullName: 'Chủ nhà',
      passwordHash,
      role: 'admin',
      isPhoneVerified: true,
      email: 'ducquan16102006@gmail.com',
    },
  });

  const adminProfile = await prisma.ownerProfile.upsert({
    where: { userId: admin.id },
    update: { isVerified: true },
    create: {
      userId: admin.id,
      legalFullName: 'Chủ sàn QNS',
      authorityType: 'owner',
      isVerified: true,
    },
  });

  await prisma.ownerServiceAgreement.upsert({
    where: { agreementCode: 'HD01-ADMIN-QNS' },
    update: { status: 'active' },
    create: {
      agreementCode: 'HD01-ADMIN-QNS',
      ownerId: admin.id,
      ownerProfileId: adminProfile.id,
      status: 'active',
      commissionRateBps: 4000,
      termsVersion: '1.0',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000),
    },
  });

  const broker = await prisma.user.upsert({
    where: { phone: '0900000002' },
    update: {
      email: 'broker@qns.com',
    },
    create: {
      phone: '0900000002',
      fullName: 'Chủ nhà',
      passwordHash,
      role: 'broker',
      isPhoneVerified: true,
      email: 'broker@qns.com',
    },
  });

  console.log('✅ Seed địa danh + tài khoản demo xong.');
  console.log(`   Đăng nhập quản trị: SĐT ${adminPhone} / mật khẩu: ${defaultPassword}`);

  // ---------- 3. Danh mục các Trường Đại học trọng điểm toàn quốc ----------
  const ALL_UNIVERSITIES_DATA = [
    // TP. Hồ Chí Minh
    { slug: 'dhqg-tphcm', name: 'Đại học Quốc gia TP. Hồ Chí Minh (Khu Đô thị ĐHQG)', abbreviation: 'ĐHQG TP.HCM', address: 'Khu phố 6, P. Linh Trung, TP. Thủ Đức, TP.HCM', lat: 10.8753, lng: 106.8007, locationId: quan1.id },
    { slug: 'dh-bach-khoa-tphcm', name: 'Trường Đại học Bách Khoa - ĐHQG TP.HCM', abbreviation: 'Bách Khoa HCM', address: '268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM', lat: 10.7726, lng: 106.6578, locationId: quan1.id },
    { slug: 'dh-khoa-hoc-tu-nhien-tphcm', name: 'Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM', abbreviation: 'KHTN TP.HCM', address: '227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM', lat: 10.7628, lng: 106.6825, locationId: quan1.id },
    { slug: 'dh-khxh-nv-tphcm', name: 'Trường ĐH Khoa học Xã hội & Nhân văn - ĐHQG TP.HCM', abbreviation: 'KHXH&NV HCM', address: '10-12 Đinh Tiên Hoàng, Bến Nghé, Quận 1, TP.HCM', lat: 10.7865, lng: 106.7018, locationId: quan1.id },
    { slug: 'dh-kinh-te-luat-tphcm', name: 'Trường Đại học Kinh tế - Luật - ĐHQG TP.HCM', abbreviation: 'UEL', address: '669 QL1K, Linh Xuân, TP. Thủ Đức, TP.HCM', lat: 10.8756, lng: 106.7774, locationId: quan1.id },
    { slug: 'dh-cong-nghe-thong-tin-tphcm', name: 'Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM', abbreviation: 'UIT', address: 'Khu phố 6, Linh Trung, TP. Thủ Đức, TP.HCM', lat: 10.8702, lng: 106.8032, locationId: quan1.id },
    { slug: 'dh-quoc-te-tphcm', name: 'Trường Đại học Quốc tế - ĐHQG TP.HCM', abbreviation: 'IU HCM', address: 'Khu phố 6, Linh Trung, TP. Thủ Đức, TP.HCM', lat: 10.8778, lng: 106.8016, locationId: quan1.id },
    { slug: 'dh-kinh-te-tphcm', name: 'Đại học Kinh tế TP. Hồ Chí Minh', abbreviation: 'UEH', address: '59C Nguyễn Đình Chiểu, Phường 6, Quận 3, TP.HCM', lat: 10.7828, lng: 106.6958, locationId: quan1.id },
    { slug: 'dh-ton-duc-thang', name: 'Trường Đại học Tôn Đức Thắng', abbreviation: 'TDTU', address: '19 Nguyễn Hữu Thọ, P. Tân Phong, Quận 7, TP.HCM', lat: 10.7326, lng: 106.6992, locationId: quan7.id },
    { slug: 'dh-su-pham-ky-thuat-tphcm', name: 'Trường Đại học Sư phạm Kỹ thuật TP.HCM', abbreviation: 'HCMUTE', address: '1 Võ Văn Ngân, Linh Chiểu, TP. Thủ Đức, TP.HCM', lat: 10.8507, lng: 106.7719, locationId: quan1.id },
    { slug: 'dh-y-duoc-tphcm', name: 'Đại học Y Dược TP. Hồ Chí Minh', abbreviation: 'UMP HCM', address: '217 Hồng Bàng, Phường 11, Quận 5, TP.HCM', lat: 10.7551, lng: 106.6599, locationId: quan1.id },
    { slug: 'dh-y-khoa-pham-ngoc-thach', name: 'Trường Đại học Y khoa Phạm Ngọc Thạch', abbreviation: 'PNTU', address: '2 Dương Quang Trung, Phường 12, Quận 10, TP.HCM', lat: 10.7733, lng: 106.6669, locationId: quan1.id },
    { slug: 'dh-su-pham-tphcm', name: 'Trường Đại học Sư phạm TP. Hồ Chí Minh', abbreviation: 'HCMUE', address: '280 An Dương Vương, Phường 4, Quận 5, TP.HCM', lat: 10.7601, lng: 106.6823, locationId: quan1.id },
    { slug: 'dh-sai-gon', name: 'Trường Đại học Sài Gòn', abbreviation: 'SGU', address: '273 An Dương Vương, Phường 3, Quận 5, TP.HCM', lat: 10.7597, lng: 106.6811, locationId: quan1.id },
    { slug: 'dh-luat-tphcm', name: 'Trường Đại học Luật TP. Hồ Chí Minh', abbreviation: 'ULAW', address: '2 Nguyễn Tất Thành, Phường 12, Quận 4, TP.HCM', lat: 10.7671, lng: 106.7077, locationId: quan1.id },
    { slug: 'dh-ngoai-thuong-cs2', name: 'Trường Đại học Ngoại thương - Cơ sở 2', abbreviation: 'FTU2', address: '15 Đường D5, Phường 25, Bình Thạnh, TP.HCM', lat: 10.8037, lng: 106.7144, locationId: binhthanh.id },
    { slug: 'dh-ngan-hang-tphcm', name: 'Trường Đại học Ngân hàng TP. Hồ Chí Minh', abbreviation: 'HUB', address: '56 Hoàng Diệu 2, TP. Thủ Đức, TP.HCM', lat: 10.8561, lng: 106.7645, locationId: quan1.id },
    { slug: 'dh-tai-chinh-marketing', name: 'Trường Đại học Tài chính - Marketing', abbreviation: 'UFM', address: '778 Nguyễn Kiệm, Phường 4, Phú Nhuận, TP.HCM', lat: 10.8144, lng: 106.6778, locationId: quan1.id },
    { slug: 'dh-mo-tphcm', name: 'Trường Đại học Mở TP. Hồ Chí Minh', abbreviation: 'OU HCM', address: '97 Võ Văn Tần, Phường 6, Quận 3, TP.HCM', lat: 10.7766, lng: 106.6912, locationId: quan1.id },
    { slug: 'dh-nong-lam-tphcm', name: 'Trường Đại học Nông Lâm TP. Hồ Chí Minh', abbreviation: 'NLU', address: 'Khu phố 6, Linh Trung, TP. Thủ Đức, TP.HCM', lat: 10.8711, lng: 106.7915, locationId: quan1.id },
    { slug: 'dh-cong-nghiep-tphcm', name: 'Trường Đại học Công nghiệp TP. Hồ Chí Minh', abbreviation: 'IUH', address: '12 Nguyễn Văn Bảo, Phường 4, Gò Vấp, TP.HCM', lat: 10.8222, lng: 106.6875, locationId: quan1.id },
    { slug: 'dh-cong-thuong-tphcm', name: 'Trường Đại học Công Thương TP. Hồ Chí Minh', abbreviation: 'HUIT', address: '140 Lê Trọng Tấn, Tây Thạnh, Tân Phú, TP.HCM', lat: 10.8063, lng: 106.6287, locationId: quan1.id },
    { slug: 'dh-kien-truc-tphcm', name: 'Trường Đại học Kiến trúc TP. Hồ Chí Minh', abbreviation: 'UAH', address: '196 Pasteur, Phường 6, Quận 3, TP.HCM', lat: 10.7825, lng: 106.6942, locationId: quan1.id },
    { slug: 'dh-van-lang', name: 'Trường Đại học Văn Lang', abbreviation: 'VLU', address: '69/68 Đặng Thùy Trâm, Phường 13, Bình Thạnh, TP.HCM', lat: 10.8285, lng: 106.7028, locationId: binhthanh.id },
    { slug: 'dh-hoa-sen', name: 'Trường Đại học Hoa Sen', abbreviation: 'HSU', address: '8 Nguyễn Văn Tráng, Bến Thành, Quận 1, TP.HCM', lat: 10.7712, lng: 106.6922, locationId: quan1.id },
    { slug: 'dh-cong-nghe-tphcm-hutech', name: 'Trường Đại học Công nghệ TP.HCM', abbreviation: 'HUTECH', address: '475A Điện Biên Phủ, Phường 25, Bình Thạnh, TP.HCM', lat: 10.8016, lng: 106.7145, locationId: binhthanh.id },
    { slug: 'dh-kinh-te-tai-chinh-tphcm', name: 'Trường Đại học Kinh tế - Tài chính TP.HCM', abbreviation: 'UEF', address: '141-145 Điện Biên Phủ, Phường 15, Bình Thạnh, TP.HCM', lat: 10.7963, lng: 106.7042, locationId: binhthanh.id },
    { slug: 'dh-quoc-te-hong-bang', name: 'Trường Đại học Quốc tế Hồng Bàng', abbreviation: 'HIU', address: '215 Điện Biên Phủ, Phường 15, Bình Thạnh, TP.HCM', lat: 10.7981, lng: 106.7088, locationId: binhthanh.id },
    { slug: 'dh-fpt-tphcm', name: 'Trường Đại học FPT TP. Hồ Chí Minh', abbreviation: 'FPT HCM', address: 'Đường D1, Khu CNC, Long Thạnh Mỹ, TP. Thủ Đức, TP.HCM', lat: 10.8557, lng: 106.8087, locationId: quan1.id },

    // Hà Nội
    { slug: 'dhqg-ha-noi', name: 'Đại học Quốc gia Hà Nội', abbreviation: 'VNU HN', address: '144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', lat: 21.0373, lng: 105.7828, locationId: hanoi.id },
    { slug: 'dh-bach-khoa-ha-noi', name: 'Đại học Bách Khoa Hà Nội', abbreviation: 'HUST', address: 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội', lat: 21.0056, lng: 105.8433, locationId: hanoi.id },
    { slug: 'dh-kinh-te-quoc-dan', name: 'Trường Đại học Kinh tế Quốc dân', abbreviation: 'NEU', address: '207 Giải Phóng, Đồng Tâm, Hai Bà Trưng, Hà Nội', lat: 20.9996, lng: 105.8427, locationId: hanoi.id },
    { slug: 'dh-ngoai-thuong-hn', name: 'Trường Đại học Ngoại thương', abbreviation: 'FTU', address: '91 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội', lat: 21.0232, lng: 105.8049, locationId: hanoi.id },
    { slug: 'hoc-vien-tai-chinh', name: 'Học viện Tài chính', abbreviation: 'AOF', address: '58 Lê Văn Hiến, Đức Thắng, Bắc Từ Liêm, Hà Nội', lat: 21.0772, lng: 105.7744, locationId: hanoi.id },
    { slug: 'hoc-vien-ngan-hang', name: 'Học viện Ngân hàng', abbreviation: 'BA', address: '12 Chùa Bộc, Quang Trung, Đống Đa, Hà Nội', lat: 21.0084, lng: 105.8285, locationId: hanoi.id },
    { slug: 'dh-thuong-mai', name: 'Trường Đại học Thương mại', abbreviation: 'TMU', address: '79 Hồ Tùng Mậu, Mai Dịch, Cầu Giấy, Hà Nội', lat: 21.0366, lng: 105.7742, locationId: hanoi.id },
    { slug: 'dh-xay-dung-ha-noi', name: 'Trường Đại học Xây dựng Hà Nội', abbreviation: 'HUCE', address: '55 Giải Phóng, Đồng Tâm, Hai Bà Trưng, Hà Nội', lat: 21.0039, lng: 105.8419, locationId: hanoi.id },
    { slug: 'dh-giao-thong-van-tai', name: 'Trường Đại học Giao thông Vận tải', abbreviation: 'UTC', address: 'Số 3 Cầu Giấy, Láng Thượng, Đống Đa, Hà Nội', lat: 21.0289, lng: 105.8037, locationId: hanoi.id },
    { slug: 'dh-y-ha-noi', name: 'Trường Đại học Y Hà Nội', abbreviation: 'HMU', address: 'Số 1 Tôn Thất Tùng, Trung Tự, Đống Đa, Hà Nội', lat: 21.0028, lng: 105.8317, locationId: hanoi.id },
    { slug: 'dh-duoc-ha-noi', name: 'Trường Đại học Dược Hà Nội', abbreviation: 'HUP', address: '13-15 Lê Thánh Tông, Phan Chu Trinh, Hoàn Kiếm, Hà Nội', lat: 21.0219, lng: 105.8569, locationId: hanoi.id },
    { slug: 'hoc-vien-cong-nghe-buu-chinh-vien-thong', name: 'Học viện Công nghệ Bưu chính Viễn thông', abbreviation: 'PTIT', address: 'Km10 Đường Nguyễn Trãi, Hà Đông, Hà Nội', lat: 20.9808, lng: 105.7876, locationId: hanoi.id },
    { slug: 'dh-su-pham-ha-noi', name: 'Trường Đại học Sư phạm Hà Nội', abbreviation: 'HNUE', address: '136 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', lat: 21.0368, lng: 105.7842, locationId: hanoi.id },
    { slug: 'dh-ha-noi', name: 'Trường Đại học Hà Nội', abbreviation: 'HANU', address: 'Km 9 Đường Nguyễn Trãi, Trung Văn, Nam Từ Liêm, Hà Nội', lat: 20.9912, lng: 105.7958, locationId: hanoi.id },
    { slug: 'dh-cong-nghiep-ha-noi', name: 'Trường Đại học Công nghiệp Hà Nội', abbreviation: 'HaUI', address: '298 Cầu Diễn, Minh Khai, Bắc Từ Liêm, Hà Nội', lat: 21.0537, lng: 105.7351, locationId: hanoi.id },
    { slug: 'hoc-vien-bao-chi-tuyen-truyen', name: 'Học viện Báo chí và Tuyên truyền', abbreviation: 'AJC', address: '36 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', lat: 21.0363, lng: 105.7892, locationId: hanoi.id },
    { slug: 'hoc-vien-ngoai-giao', name: 'Học viện Ngoại giao', abbreviation: 'DAV', address: '69 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội', lat: 21.0227, lng: 105.8071, locationId: hanoi.id },
    { slug: 'dh-luat-ha-noi', name: 'Trường Đại học Luật Hà Nội', abbreviation: 'HLU', address: '87 Nguyễn Chí Thanh, Láng Hạ, Đống Đa, Hà Nội', lat: 21.0189, lng: 105.8119, locationId: hanoi.id },
    { slug: 'dh-kien-truc-ha-noi', name: 'Trường Đại học Kiến trúc Hà Nội', abbreviation: 'HAU', address: 'Km 10 Đường Nguyễn Trãi, Văn Quán, Hà Đông, Hà Nội', lat: 20.9822, lng: 105.7891, locationId: hanoi.id },
    { slug: 'dh-thuy-loi', name: 'Trường Đại học Thủy lợi', abbreviation: 'TLU', address: '175 Tây Sơn, Trung Liệt, Đống Đa, Hà Nội', lat: 21.0076, lng: 105.8242, locationId: hanoi.id },
    { slug: 'dh-mo-dia-chat', name: 'Trường Đại học Mỏ - Địa chất', abbreviation: 'HUMG', address: 'Số 18 Phố Viên, Đức Thắng, Bắc Từ Liêm, Hà Nội', lat: 21.0725, lng: 105.7738, locationId: hanoi.id },
    { slug: 'dh-thang-long', name: 'Trường Đại học Thăng Long', abbreviation: 'TLU HN', address: 'Đường Nghiêm Xuân Yêm, Đại Kim, Hoàng Mai, Hà Nội', lat: 20.9765, lng: 105.8157, locationId: hanoi.id },
    { slug: 'dh-phenikaa', name: 'Trường Đại học Phenikaa', abbreviation: 'Phenikaa', address: 'Đường Tố Hữu, Yên Nghĩa, Hà Đông, Hà Nội', lat: 20.9635, lng: 105.7483, locationId: hanoi.id },
    { slug: 'dh-fpt-ha-noi', name: 'Trường Đại học FPT Hà Nội', abbreviation: 'FPT HN', address: 'Khu CNC Hòa Lạc, Km 29 Đại lộ Thăng Long, Thạch Thất, Hà Nội', lat: 21.0131, lng: 105.5262, locationId: hanoi.id },
    { slug: 'hoc-vien-nong-nghiep-vn', name: 'Học viện Nông nghiệp Việt Nam', abbreviation: 'VNUA', address: 'Thị trấn Trâu Quỳ, Gia Lâm, Hà Nội', lat: 21.0051, lng: 105.9328, locationId: hanoi.id },
    { slug: 'dh-kinh-doanh-cong-nghe-ha-noi', name: 'Trường Đại học Kinh doanh và Công nghệ Hà Nội', abbreviation: 'HUBT', address: '29A Ngõ 124 Vĩnh Tuy, Phường Vĩnh Tuy, Hai Bà Trưng, Hà Nội', lat: 20.9982, lng: 105.8778, locationId: hanoi.id },
    { slug: 'dh-kinh-te-ky-thuat-cong-nghiep', name: 'Trường Đại học Kinh tế - Kỹ thuật Công nghiệp', abbreviation: 'UNETI', address: '456 Minh Khai, Phường Vĩnh Tuy, Hai Bà Trưng, Hà Nội', lat: 20.9975, lng: 105.8672, locationId: hanoi.id },
    { slug: 'dh-mo-ha-noi', name: 'Trường Đại học Mở Hà Nội', abbreviation: 'HOU', address: 'Phố Nguyễn Hiền, Phường Bách Khoa, Hai Bà Trưng, Hà Nội', lat: 21.0041, lng: 105.8475, locationId: hanoi.id },
    { slug: 'dh-khoa-hoc-xa-hoi-nhan-van-hn', name: 'Trường ĐH Khoa học Xã hội và Nhân văn - ĐHQG Hà Nội', abbreviation: 'USSH HN', address: '336 Nguyễn Trãi, Thanh Xuân Trung, Thanh Xuân, Hà Nội', lat: 20.9947, lng: 105.8078, locationId: hanoi.id },
    { slug: 'dh-khoa-hoc-tu-nhien-hn', name: 'Trường Đại học Khoa học Tự nhiên - ĐHQG Hà Nội', abbreviation: 'HUS HN', address: '334 Nguyễn Trãi, Thanh Xuân Trung, Thanh Xuân, Hà Nội', lat: 20.9953, lng: 105.8085, locationId: hanoi.id },
    { slug: 'dh-cong-nghe-dhqghn', name: 'Trường Đại học Công nghệ - ĐHQG Hà Nội', abbreviation: 'UET', address: 'Nhà E3, 144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', lat: 21.0378, lng: 105.7818, locationId: hanoi.id },
    { slug: 'dh-ngoai-ngu-dhqghn', name: 'Trường Đại học Ngoại ngữ - ĐHQG Hà Nội', abbreviation: 'ULIS', address: 'Số 2 Phạm Văn Đồng, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', lat: 21.0398, lng: 105.7825, locationId: hanoi.id },
    { slug: 'dh-kinh-te-dhqghn', name: 'Trường Đại học Kinh tế - ĐHQG Hà Nội', abbreviation: 'UEB', address: '144 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội', lat: 21.0373, lng: 105.7828, locationId: hanoi.id },
    { slug: 'dh-cong-nghe-giao-thong-van-tai', name: 'Trường Đại học Công nghệ Giao thông Vận tải', abbreviation: 'UTT', address: '54 Triều Khúc, Thanh Xuân Nam, Thanh Xuân, Hà Nội', lat: 20.9856, lng: 105.7978, locationId: hanoi.id },
    { slug: 'dh-lao-dong-xa-hoi', name: 'Trường Đại học Lao động - Xã hội', abbreviation: 'ULSA', address: '43 Trần Duy Hưng, Trung Hòa, Cầu Giấy, Hà Nội', lat: 21.0089, lng: 105.7995, locationId: hanoi.id },
    { slug: 'dh-dien-luc', name: 'Trường Đại học Điện lực', abbreviation: 'EPU', address: '235 Hoàng Quốc Việt, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội', lat: 21.0478, lng: 105.7885, locationId: hanoi.id },
    { slug: 'hoc-vien-ky-thuat-quan-su', name: 'Học viện Kỹ thuật Quân sự', abbreviation: 'MTA', address: '236 Hoàng Quốc Việt, Cổ Nhuế 1, Bắc Từ Liêm, Hà Nội', lat: 21.0475, lng: 105.7877, locationId: hanoi.id },
    { slug: 'hoc-vien-ky-thuat-mat-ma', name: 'Học viện Kỹ thuật Mật mã', abbreviation: 'ACT', address: '141 Chiến Thắng, Tân Triều, Thanh Trì, Hà Nội', lat: 20.9768, lng: 105.7925, locationId: hanoi.id },
    { slug: 'hoc-vien-y-duoc-hoc-co-truyen', name: 'Học viện Y Dược học Cổ truyền Việt Nam', abbreviation: 'VATM', address: 'Số 2 Trần Phú, Mộ Lao, Hà Đông, Hà Nội', lat: 20.9842, lng: 105.7872, locationId: hanoi.id },
    { slug: 'dh-cong-doan', name: 'Trường Đại học Công đoàn', abbreviation: 'VUU', address: '169 Tây Sơn, Quang Trung, Đống Đa, Hà Nội', lat: 21.0081, lng: 105.8248, locationId: hanoi.id },
    { slug: 'dh-my-thuat-cong-nghiep', name: 'Trường Đại học Mỹ thuật Công nghiệp', abbreviation: 'MTCN', address: '360 Đê La Thành, Chợ Dừa, Đống Đa, Hà Nội', lat: 21.0182, lng: 105.8236, locationId: hanoi.id },
    { slug: 'dh-van-hoa-ha-noi', name: 'Trường Đại học Văn hóa Hà Nội', abbreviation: 'HUC', address: '418 Đê La Thành, Chợ Dừa, Đống Đa, Hà Nội', lat: 21.0213, lng: 105.8228, locationId: hanoi.id },
    { slug: 'hoc-vien-phu-nu-viet-nam', name: 'Học viện Phụ nữ Việt Nam', abbreviation: 'VWA', address: '68 Nguyễn Chí Thanh, Láng Thượng, Đống Đa, Hà Nội', lat: 21.0215, lng: 105.8115, locationId: hanoi.id },
    { slug: 'hoc-vien-chinh-sach-phat-trien', name: 'Học viện Chính sách và Phát triển', abbreviation: 'APD', address: 'Khu đô thị Nam An Khánh, An Khánh, Hoài Đức, Hà Nội', lat: 20.9987, lng: 105.7289, locationId: hanoi.id },
    { slug: 'dh-tai-nguyen-moi-truong-hn', name: 'Trường Đại học Tài nguyên và Môi trường Hà Nội', abbreviation: 'HUNRE', address: '41A Phú Diễn, Phú Diễn, Bắc Từ Liêm, Hà Nội', lat: 21.0482, lng: 105.7602, locationId: hanoi.id },
    { slug: 'dh-san-khau-dien-anh-hn', name: 'Trường Đại học Sân khấu - Điện ảnh Hà Nội', abbreviation: 'SKDA HN', address: 'Khu Văn hóa nghệ thuật, Mai Dịch, Cầu Giấy, Hà Nội', lat: 21.0375, lng: 105.7725, locationId: hanoi.id },
    { slug: 'dh-dai-nam', name: 'Trường Đại học Đại Nam', abbreviation: 'DNU', address: 'Số 1 Phố Xốm, Phú Lãm, Hà Đông, Hà Nội', lat: 20.9525, lng: 105.7592, locationId: hanoi.id },
    { slug: 'dh-phuong-dong', name: 'Trường Đại học Phương Đông', abbreviation: 'PDU', address: '171 Trung Kính, Yên Hòa, Cầu Giấy, Hà Nội', lat: 21.0185, lng: 105.7962, locationId: hanoi.id },
    { slug: 'dh-rmit-ha-noi', name: 'Trường Đại học RMIT Việt Nam (Cơ sở Hà Nội)', abbreviation: 'RMIT HN', address: 'Tòa Handi Resco, 521 Kim Mã, Ba Đình, Hà Nội', lat: 21.0315, lng: 105.8152, locationId: hanoi.id },
    { slug: 'dh-vinuni', name: 'Trường Đại học VinUni', abbreviation: 'VinUni', address: 'Vinhomes Ocean Park, Gia Lâm, Hà Nội', lat: 20.9898, lng: 105.9422, locationId: hanoi.id },

    // Đà Nẵng & Miền Trung
    { slug: 'dh-bach-khoa-da-nang', name: 'Trường Đại học Bách Khoa - ĐH Đà Nẵng', abbreviation: 'DUT Đà Nẵng', address: '54 Nguyễn Lương Bằng, Hòa Khánh Bắc, Liên Chiểu, Đà Nẵng', lat: 16.0738, lng: 108.1499, locationId: danang.id },
    { slug: 'dh-kinh-te-da-nang', name: 'Trường Đại học Kinh tế - ĐH Đà Nẵng', abbreviation: 'DUE Đà Nẵng', address: '71 Ngũ Hành Sơn, Bắc Mỹ An, Ngũ Hành Sơn, Đà Nẵng', lat: 16.0506, lng: 108.2415, locationId: danang.id },
    { slug: 'dh-su-pham-da-nang', name: 'Trường Đại học Sư phạm - ĐH Đà Nẵng', abbreviation: 'UED Đà Nẵng', address: '459 Tôn Đức Thắng, Hòa Khánh Nam, Liên Chiểu, Đà Nẵng', lat: 16.0612, lng: 108.1584, locationId: danang.id },
    { slug: 'dh-ngoai-ngu-da-nang', name: 'Trường Đại học Ngoại ngữ - ĐH Đà Nẵng', abbreviation: 'UFL Đà Nẵng', address: '131 Lương Nhữ Hộc, Khuê Trung, Cẩm Lệ, Đà Nẵng', lat: 16.0354, lng: 108.2107, locationId: danang.id },
    { slug: 'dh-duy-tan', name: 'Trường Đại học Duy Tân', abbreviation: 'DTU', address: '254 Nguyễn Văn Linh, Thạc Gián, Thanh Khê, Đà Nẵng', lat: 16.0617, lng: 108.2081, locationId: danang.id },
    { slug: 'dh-fpt-da-nang', name: 'Trường Đại học FPT Đà Nẵng', abbreviation: 'FPT ĐN', address: 'Khu Đô thị FPT City, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng', lat: 15.9863, lng: 108.2612, locationId: danang.id },
    { slug: 'dh-y-duoc-hue', name: 'Trường Đại học Y - Dược, Đại học Huế', abbreviation: 'UMP Huế', address: '06 Ngô Quyền, Vĩnh Ninh, TP. Huế, Thừa Thiên Huế', lat: 16.4632, lng: 107.5855, locationId: danang.id },
    { slug: 'dh-nha-trang', name: 'Trường Đại học Nha Trang', abbreviation: 'NTU', address: '02 Nguyễn Đình Chiểu, Vĩnh Thọ, TP. Nha Trang, Khánh Hòa', lat: 12.2685, lng: 109.2023, locationId: danang.id },
    { slug: 'dh-quy-nhon', name: 'Trường Đại học Quy Nhơn', abbreviation: 'QNU', address: '170 An Dương Vương, Nguyễn Văn Cừ, TP. Quy Nhơn, Bình Định', lat: 13.7589, lng: 109.2173, locationId: danang.id },
    { slug: 'dh-da-lat', name: 'Trường Đại học Đà Lạt', abbreviation: 'DLU', address: '01 Phù Đổng Thiên Vương, Phường 8, TP. Đà Lạt, Lâm Đồng', lat: 11.9546, lng: 108.4448, locationId: danang.id },
    { slug: 'dh-tay-nguyen', name: 'Trường Đại học Tây Nguyên', abbreviation: 'TNU Tây Nguyên', address: '567 Lê Duẩn, Ea Tam, TP. Buôn Ma Thuột, Đắk Lắk', lat: 12.6568, lng: 108.0526, locationId: danang.id },

    // Cần Thơ & Miền Tây
    { slug: 'dh-can-tho', name: 'Trường Đại học Cần Thơ', abbreviation: 'CTU Cần Thơ', address: 'Khu II, Đường 3/2, Xuân Khánh, Ninh Kiều, Cần Thơ', lat: 10.0312, lng: 105.7691, locationId: quan1.id },
    { slug: 'dh-y-duoc-can-tho', name: 'Trường Đại học Y Dược Cần Thơ', abbreviation: 'CTUMP', address: '179 Nguyễn Văn Cừ, An Khánh, Ninh Kiều, Cần Thơ', lat: 10.0347, lng: 105.7538, locationId: quan1.id },
    { slug: 'dh-nam-can-tho', name: 'Trường Đại học Nam Cần Thơ', abbreviation: 'DNC', address: '168 Nguyễn Văn Cừ nối dài, An Bình, Ninh Kiều, Cần Thơ', lat: 10.0076, lng: 105.7332, locationId: quan1.id },
    { slug: 'dh-an-giang', name: 'Trường Đại học An Giang - ĐHQG TP.HCM', abbreviation: 'AGU', address: '18 Ung Văn Khiêm, Đông Xuyên, TP. Long Xuyên, An Giang', lat: 10.3734, lng: 105.4346, locationId: quan1.id },
    { slug: 'dh-tra-vinh', name: 'Trường Đại học Trà Vinh', abbreviation: 'TVU', address: '126 Nguyễn Thiện Thành, Khóm 4, Phường 5, TP. Trà Vinh', lat: 9.9234, lng: 106.3456, locationId: quan1.id },

    // Miền Bắc khác
    { slug: 'dh-thai-nguyen', name: 'Đại học Thái Nguyên', abbreviation: 'TNU Thái Nguyên', address: 'Phường Tân Thịnh, TP. Thái Nguyên, Thái Nguyên', lat: 21.5849, lng: 105.8118, locationId: hanoi.id },
    { slug: 'dh-hang-hai-viet-nam', name: 'Trường Đại học Hàng hải Việt Nam', abbreviation: 'VMU Hải Phòng', address: '484 Lạch Tray, Kênh Dương, Lê Chân, Hải Phòng', lat: 20.8351, lng: 106.6946, locationId: hanoi.id },
    { slug: 'dh-y-duoc-hai-phong', name: 'Trường Đại học Y Dược Hải Phòng', abbreviation: 'HPMU', address: '722 Ngô Gia Tự, Đằng Lâm, Hải An, Hải Phòng', lat: 20.8389, lng: 106.7112, locationId: hanoi.id },
    { slug: 'dh-hai-phong', name: 'Trường Đại học Hải Phòng', abbreviation: 'DHHP', address: '171 Phan Đăng Lưu, Kiến An, Hải Phòng', lat: 20.8035, lng: 106.6348, locationId: hanoi.id },
    { slug: 'dh-ha-long', name: 'Trường Đại học Hạ Long', abbreviation: 'UHL Quảng Ninh', address: '258 Bạch Đằng, Nam Khê, TP. Uông Bí, Quảng Ninh', lat: 21.0336, lng: 106.7912, locationId: hanoi.id },
  ];

  for (const uni of ALL_UNIVERSITIES_DATA) {
    await prisma.university.upsert({
      where: { slug: uni.slug },
      update: {
        name: uni.name,
        abbreviation: uni.abbreviation,
        address: uni.address,
        lat: uni.lat,
        lng: uni.lng,
      },
      create: {
        slug: uni.slug,
        name: uni.name,
        abbreviation: uni.abbreviation,
        address: uni.address,
        lat: uni.lat,
        lng: uni.lng,
        locationId: uni.locationId,
      },
    });
  }

  console.log(`✅ Seed danh sách ${ALL_UNIVERSITIES_DATA.length} trường Đại học toàn quốc xong.`);

  const uniTonDucThang = await prisma.university.findUniqueOrThrow({ where: { slug: 'dh-ton-duc-thang' } });
  const uniUeh = await prisma.university.findUniqueOrThrow({ where: { slug: 'dh-kinh-te-tphcm' } });
  const uniBachKhoaHcm = await prisma.university.findUniqueOrThrow({ where: { slug: 'dh-bach-khoa-tphcm' } });
  const uniVnuHn = await prisma.university.findUniqueOrThrow({ where: { slug: 'dhqg-ha-noi' } });
  const uniFtuHn = await prisma.university.findUniqueOrThrow({ where: { slug: 'dh-ngoai-thuong-hn' } });
  const uniHust = await prisma.university.findUniqueOrThrow({ where: { slug: 'dh-bach-khoa-ha-noi' } });

  // ---------- 4. Tin đăng MẪU Cho Thuê (chỉ để kiểm tra giao diện) ----------
  // Xoá tin demo cũ nếu có (kèm toàn bộ bản ghi phụ thuộc)
  const demoListings = await prisma.listing.findMany({
    where: {
      OR: [
        { title: { startsWith: '[MẪU]' } },
        { slug: { startsWith: 'mau-' } },
      ],
    },
    select: { id: true },
  });
  const demoIds = demoListings.map((l) => l.id);
  if (demoIds.length > 0) {
    await prisma.listingReport.deleteMany({ where: { listingId: { in: demoIds } } });
    await prisma.phoneRevealLog.deleteMany({ where: { listingId: { in: demoIds } } });
    await prisma.savedListing.deleteMany({ where: { listingId: { in: demoIds } } });
    await prisma.listingImage.deleteMany({ where: { listingId: { in: demoIds } } });
    await prisma.listingUniversity.deleteMany({ where: { listingId: { in: demoIds } } });
    await prisma.listing.deleteMany({ where: { id: { in: demoIds } } });
  }

  await prisma.listing.create({
    data: {
      ownerId: broker.id,
      locationId: phuongTanPhong.id,
      transactionType: TransactionType.rent,
      propertyType: 'phong_tro',
      title: 'Phòng trọ khép kín có gác lửng, máy lạnh gần ĐH Tôn Đức Thắng & RMIT',
      slug: 'mau-phong-tro-gac-lung-gan-tdtu-id1',
      description:
        'Phòng trọ sinh viên mới xây sạch sẽ, giờ giấc tự do không chung chủ. Đầy đủ tiện nghi: máy lạnh, gác lửng đúc kiên cố, kệ bếp nấu ăn, wifi cáp quang tốc độ cao. Ra ĐH Tôn Đức Thắng chỉ 5 phút đi bộ.',
      price: 3_500_000,
      depositAmount: 3_500_000,
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
      },
      areaM2: 24,
      bedrooms: 1,
      bathrooms: 1,
      legalStatus: 'hop_dong_6_thang',
      addressDetail: 'Đường số 10, Phường Tân Phong, Quận 7, TP.HCM',
      lat: 10.7335,
      lng: 106.7032,
      status: ListingStatus.active,
      verificationStatus: 'da_xac_thuc' as any,
      verifiedAt: new Date(),
      verifiedByUserId: admin.id,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80', sortOrder: 0 },
          { imageUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80', sortOrder: 1 },
        ],
      },
      nearbyUniversities: {
        create: [
          {
            universityId: uniTonDucThang.id,
            distanceMeters: 450,
            travelTimeMinutes: 5,
          },
        ],
      },
    },
  });

  await prisma.listing.create({
    data: {
      ownerId: broker.id,
      locationId: quan1.id,
      transactionType: TransactionType.rent,
      propertyType: 'chung_cu_mini',
      title: 'Căn hộ Studio Quận 1 full nội thất cao cấp gần ĐH Kinh Tế UEH',
      slug: 'mau-can-ho-studio-quan-1-full-noi-that-id2',
      description:
        'Căn hộ mini studio trung tâm Quận 1, ban công thoáng mát, cửa sổ lớn đón nắng. Tòa nhà có thang máy, bảo vệ 24/7, hầm để xe rộng rãi. Nội thất gỗ sồi cao cấp: giường đệm, tủ quần áo âm tường, bàn làm việc, máy giặt riêng, bếp từ âm.',
      price: BigInt(6500000),
      depositAmount: BigInt(6500000),
      minLeaseMonths: 12,
      utilitiesIncluded: false,
      electricityPricePerKwh: 4000,
      waterPricePerM3: 25000,
      waterPriceFlat: null,
      amenities: {
        wifi: true,
        airConditioner: true,
        refrigerator: true,
        washingMachine: true,
        elevator: true,
        balcony: true,
        securityCamera: true,
        fingerprintLock: true,
      },
      areaM2: 32,
      bedrooms: 1,
      bathrooms: 1,
      legalStatus: 'hop_dong_1_nam',
      addressDetail: 'Đường Nguyễn Thị Minh Khai, Phường Bến Nghé, Quận 1, TP.HCM',
      lat: 10.7828,
      lng: 106.6958,
      status: ListingStatus.active,
      verificationStatus: 'chua_xac_thuc' as any,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', sortOrder: 0 },
          { imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80', sortOrder: 1 },
        ],
      },
      nearbyUniversities: {
        create: [
          {
            universityId: uniUeh.id,
            distanceMeters: 1200,
            travelTimeMinutes: 8,
          },
          {
            universityId: uniBachKhoaHcm.id,
            distanceMeters: 3000,
            travelTimeMinutes: 15,
          },
        ],
      },
    },
  });

  console.log('✅ Đã tạo 2 tin đăng MẪU TP.HCM (phòng trọ SV + studio) kèm liên kết trường ĐH.');

  // ---------- 4.2 Tin đăng MẪU tại Hà Nội (Cầu Giấy, Đống Đa, Hai Bà Trưng) ----------
  await prisma.listing.create({
    data: {
      ownerId: broker.id,
      locationId: cauGiay.id,
      transactionType: TransactionType.rent,
      propertyType: 'phong_tro',
      title: 'Phòng trọ khép kín mới xây Cầu Giấy gần ĐH Quốc Gia & ĐH Sư Phạm Hà Nội',
      slug: 'mau-phong-tro-khep-kin-cau-giay-gan-dhqg-id3',
      description: 'Phòng trọ khép kín cao cấp ngõ Xuân Thủy, Cầu Giấy. Giờ giấc tự do, khóa vân tay, có ban công thoáng mát, điều hòa Inverter, nóng lạnh, giường tủ gỗ.',
      price: 3_800_000,
      depositAmount: 3_800_000,
      minLeaseMonths: 6,
      utilitiesIncluded: false,
      electricityPricePerKwh: 3800,
      waterPricePerM3: 30000,
      waterPriceFlat: 100000,
      amenities: { wifi: true, airConditioner: true, waterHeater: true, balcony: true, freeTime: true, parkingSpace: true, securityCamera: true },
      areaM2: 25,
      bedrooms: 1,
      bathrooms: 1,
      legalStatus: 'hop_dong_6_thang',
      addressDetail: 'Ngõ 175 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
      lat: 21.0368,
      lng: 105.7862,
      status: ListingStatus.active,
      verificationStatus: 'da_xac_thuc' as any,
      verifiedAt: new Date(),
      verifiedByUserId: admin.id,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80', sortOrder: 0 },
          { imageUrl: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80', sortOrder: 1 },
        ],
      },
      nearbyUniversities: {
        create: [{ universityId: uniVnuHn.id, distanceMeters: 350, travelTimeMinutes: 4 }],
      },
    },
  });

  await prisma.listing.create({
    data: {
      ownerId: broker.id,
      locationId: dongDa.id,
      transactionType: TransactionType.rent,
      propertyType: 'chung_cu_mini',
      title: 'Chung cư mini full đồ Chùa Láng gần ĐH Ngoại Thương & HV Ngoại Giao',
      slug: 'mau-chung-cu-mini-chua-lang-gan-ftu-id4',
      description: 'Căn hộ mini 1 phòng ngủ tách bếp ngõ Chùa Láng. Tòa nhà thang máy, máy giặt riêng từng phòng, sofa bàn trà, tủ lạnh 2 cánh, ban công cực thoáng.',
      price: 5_500_000,
      depositAmount: 5_500_000,
      minLeaseMonths: 12,
      utilitiesIncluded: false,
      electricityPricePerKwh: 3800,
      waterPricePerM3: 30000,
      waterPriceFlat: 120000,
      amenities: { wifi: true, airConditioner: true, elevator: true, washingMachine: true, kitchen: true, balcony: true, refrigerator: true },
      areaM2: 35,
      bedrooms: 1,
      bathrooms: 1,
      legalStatus: 'hop_dong_1_nam',
      addressDetail: 'Ngõ 84 Chùa Láng, Láng Thượng, Đống Đa, Hà Nội',
      lat: 21.0242,
      lng: 105.8038,
      status: ListingStatus.active,
      verificationStatus: 'da_xac_thuc' as any,
      verifiedAt: new Date(),
      verifiedByUserId: admin.id,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80', sortOrder: 0 },
          { imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80', sortOrder: 1 },
        ],
      },
      nearbyUniversities: {
        create: [{ universityId: uniFtuHn.id, distanceMeters: 400, travelTimeMinutes: 5 }],
      },
    },
  });

  await prisma.listing.create({
    data: {
      ownerId: broker.id,
      locationId: haiBaTrung.id,
      transactionType: TransactionType.rent,
      propertyType: 'studio',
      title: 'Studio khép kín máy giặt riêng gần ĐH Bách Khoa & Kinh Tế Quốc Dân',
      slug: 'mau-studio-khep-kin-gan-bach-khoa-id5',
      description: 'Studio khép kín hiện đại phố Đại Cồ Việt, đi bộ sang Bách Khoa và Xây Dựng 3 phút. Đầy đủ tiện nghi, an ninh tuyệt đối camera 24/7.',
      price: 4_600_000,
      depositAmount: 4_600_000,
      minLeaseMonths: 12,
      utilitiesIncluded: false,
      electricityPricePerKwh: 3800,
      waterPricePerM3: 30000,
      waterPriceFlat: 100000,
      amenities: { wifi: true, airConditioner: true, waterHeater: true, mezzanine: true, privateBathroom: true, securityCamera: true },
      areaM2: 28,
      bedrooms: 1,
      bathrooms: 1,
      legalStatus: 'hop_dong_1_nam',
      addressDetail: 'Đại Cồ Việt, Lê Đại Hành, Hai Bà Trưng, Hà Nội',
      lat: 21.0062,
      lng: 105.8445,
      status: ListingStatus.active,
      verificationStatus: 'da_xac_thuc' as any,
      verifiedAt: new Date(),
      verifiedByUserId: admin.id,
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      images: {
        create: [
          { imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', sortOrder: 0 },
        ],
      },
      nearbyUniversities: {
        create: [{ universityId: uniHust.id, distanceMeters: 300, travelTimeMinutes: 3 }],
      },
    },
  });

  console.log('✅ Đã tạo 5 tin đăng MẪU Cho Thuê (Hà Nội + TP.HCM) kèm liên kết trường ĐH.');

  // ---------- 5. Gói thành viên & Mùa cao điểm (Surge Pricing) ----------
  const plans = [
    {
      name: 'Gói Dùng Thử',
      code: 'trial',
      description: 'Trải nghiệm miễn phí nền tảng, phù hợp với chủ phòng cá nhân có ít phòng',
      price: BigInt(0),
      durationDays: 30,
      maxActiveListings: 3,
      regionScope: 'Toàn quốc',
      isFeatured: false,
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Gói Chủ Trọ Khởi Đầu',
      code: 'basic',
      description: 'Dành cho chủ nhà có từ 5 - 10 phòng trọ, tối ưu chi phí lấp đầy phòng nhanh chóng',
      price: BigInt(199000),
      durationDays: 30,
      maxActiveListings: 10,
      regionScope: 'Toàn quốc',
      isFeatured: false,
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Gói Chủ Trọ Chuyên Nghiệp',
      code: 'pro',
      description: 'Dành cho chủ chuỗi nhà trọ, chung cư mini, căn hộ dịch vụ quy mô vừa',
      price: BigInt(499000),
      durationDays: 30,
      maxActiveListings: 30,
      regionScope: 'Toàn quốc',
      isFeatured: true,
      isActive: true,
      sortOrder: 3,
    },
    {
      name: 'Gói Môi Giới VIP',
      code: 'vip',
      description: 'Dành cho môi giới chuyên nghiệp và chuỗi căn hộ cho thuê quy mô lớn toàn khu vực',
      price: BigInt(999000),
      durationDays: 30,
      maxActiveListings: 100,
      regionScope: 'Toàn quốc',
      isFeatured: false,
      isActive: true,
      sortOrder: 4,
    },
  ];

  for (const plan of plans) {
    await prisma.membershipPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        durationDays: plan.durationDays,
        maxActiveListings: plan.maxActiveListings,
        isFeatured: plan.isFeatured,
        sortOrder: plan.sortOrder,
      },
      create: plan,
    });
  }

  // Mùa tựu trường mẫu (mặc định tắt để admin bật/tắt thử nghiệm)
  const existingSeason = await prisma.pricingSeason.findFirst({
    where: { name: 'Mùa tựu trường (Tháng 8 - Tháng 9)' },
  });
  if (!existingSeason) {
    await prisma.pricingSeason.create({
      data: {
        name: 'Mùa tựu trường (Tháng 8 - Tháng 9)',
        startDate: new Date('2026-08-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        priceMultiplier: 1.25,
        isActive: false,
        description: 'Mùa sinh viên nhập học cao điểm, nhu cầu tìm phòng trọ tăng vọt gấp 3 lần',
      },
    });
  }

  console.log('✅ Đã seed 4 gói Membership chuẩn và cấu hình Mùa cao điểm (Surge Pricing).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
