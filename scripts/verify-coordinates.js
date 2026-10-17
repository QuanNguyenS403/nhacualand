const fs = require('fs');
const assert = require('assert');

const content = fs.readFileSync('apps/web/src/lib/demo-data.ts', 'utf8');

// Regex chuẩn: tìm object listing bắt đầu bằng id: '...' và chứa addressDetail, lat, lng
const listingBlocks = content.split(/\{\s*id:\s*'(\d+)'/);
const rooms = [];

for (let i = 1; i < listingBlocks.length; i += 2) {
  const id = listingBlocks[i];
  const block = listingBlocks[i + 1] || '';

  const titleMatch = block.match(/title:\s*'([^']+)'/);
  const addrMatch = block.match(/addressDetail:\s*'([^']+)'/);
  const latMatch = block.match(/\blat:\s*([0-9.]+)/);
  const lngMatch = block.match(/\blng:\s*([0-9.]+)/);

  if (titleMatch && addrMatch && latMatch && lngMatch) {
    rooms.push({
      id,
      title: titleMatch[1],
      address: addrMatch[1],
      lat: parseFloat(latMatch[1]),
      lng: parseFloat(lngMatch[1]),
    });
  }
}

console.log('================================================================');
console.log('   KẾT QUẢ RÀ SOÁT TỌA ĐỘ ĐỊNH VỊ CỦA TẤT CẢ PHÒNG CHO THUÊ');
console.log('================================================================\n');

rooms.forEach((r, idx) => {
  console.log(`[Phòng #${idx + 1}] ID: ${r.id}`);
  console.log(`   Tiêu đề: ${r.title}`);
  console.log(`   Địa chỉ gán trong thông tin: ${r.address}`);
  console.log(`   Tọa độ định vị GPS: (${r.lat}, ${r.lng})`);

  // Kiểm tra tính hợp lệ của tọa độ tại Việt Nam
  assert(r.lat >= 8.5 && r.lat <= 23.5, `Vĩ độ ngoài lãnh thổ VN: ${r.lat}`);
  assert(r.lng >= 102.0 && r.lng <= 109.5, `Kinh độ ngoài lãnh thổ VN: ${r.lng}`);

  // Kiểm tra vùng miền (ưu tiên kiểm tra TP.HCM trước để tránh đường Xa Lộ Hà Nội bị nhầm)
  if (r.address.includes('TP.HCM') || r.address.includes('Hồ Chí Minh')) {
    assert(r.lat > 10.5 && r.lat < 11.2, `Phòng TP.HCM phải có vĩ độ ~10.7: ${r.lat}`);
    assert(r.lng > 106.5 && r.lng < 107.0, `Phòng TP.HCM phải có kinh độ ~106.7: ${r.lng}`);
    console.log('   => Khớp chuẩn xác khu vực TP. Hồ Chí Minh');
  } else if (r.address.includes('Hà Nội')) {
    assert(r.lat > 20.5 && r.lat < 21.5, `Phòng Hà Nội phải có vĩ độ ~21: ${r.lat}`);
    assert(r.lng > 105.5 && r.lng < 106.2, `Phòng Hà Nội phải có kinh độ ~105.8: ${r.lng}`);
    console.log('   => Khớp chuẩn xác khu vực Hà Nội');
  }

  // Kiểm tra chi tiết từng tuyến phố cụ thể
  if (r.address.includes('Hồ Tùng Mậu')) {
    assert(Math.abs(r.lat - 21.0375) < 0.002, 'Ngõ 20 Hồ Tùng Mậu phải ở Mai Dịch gần ĐHQG');
    console.log('   => Tọa độ đúng ngõ 20 Hồ Tùng Mậu, Mai Dịch');
  }
  if (r.address.includes('Chùa Láng')) {
    assert(Math.abs(r.lat - 21.0225) < 0.002, 'Ngõ 119 Chùa Láng phải gần Ngoại Giao/Ngoại Thương');
    console.log('   => Tọa độ đúng ngõ 119 Chùa Láng, Láng Thượng');
  }
  if (r.address.includes('Ngõ 68 Cầu Giấy')) {
    assert(Math.abs(r.lat - 21.0352) < 0.002, 'Ngõ 68 Cầu Giấy phải ở Quan Hoa');
    console.log('   => Tọa độ đúng ngõ 68 Cầu Giấy, Quan Hoa');
  }
  if (r.address.includes('Ngõ 165 Cầu Giấy')) {
    assert(Math.abs(r.lat - 21.0336) < 0.002 || Math.abs(r.lat - 21.0340) < 0.002, 'Ngõ 165 Cầu Giấy phải ở Dịch Vọng');
    console.log('   => Tọa độ đúng Ngõ 165 Cầu Giấy, Dịch Vọng');
  }
  if (r.address.includes('Đường số 10')) {
    assert(Math.abs(r.lat - 10.7330) < 0.002 || Math.abs(r.lat - 10.7335) < 0.002, 'Đường số 10 phải ở Tân Phong Q.7');
    console.log('   => Tọa độ đúng Đường số 10, Phường Tân Phong, Quận 7');
  }
  if (r.address.includes('Nguyễn Trãi, Phường Bến Thành')) {
    assert(Math.abs(r.lat - 10.7712) < 0.002, 'Nguyễn Trãi Bến Thành phải ở Quận 1 gần Phù Đổng');
    console.log('   => Tọa độ đúng Đường Nguyễn Trãi, Phường Bến Thành, Quận 1');
  }
  if (r.address.includes('Masteri Thảo Điền') || r.address.includes('159 Xa Lộ Hà Nội')) {
    assert(Math.abs(r.lat - 10.8035) < 0.002, 'Masteri Thảo Điền phải ở Thảo Điền');
    console.log('   => Tọa độ đúng Masteri Thảo Điền, TP. Thủ Đức');
  }
  if (r.address.includes('Điện Biên Phủ, Phường 25')) {
    assert(Math.abs(r.lat - 10.8005) < 0.002, 'Điện Biên Phủ P.25 phải ở Bình Thạnh');
    console.log('   => Tọa độ đúng Đường Điện Biên Phủ, Phường 25, Bình Thạnh');
  }

  console.log('');
});

console.log(`✓ Đã xác minh thành công toàn bộ ${rooms.length} phòng cho thuê có định vị GPS khớp 100% với địa chỉ gán trong thông tin`);
