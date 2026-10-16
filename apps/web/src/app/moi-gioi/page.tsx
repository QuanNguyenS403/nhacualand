import type { Metadata } from 'next';
import { ComingSoonNotice } from '@/components/ComingSoonNotice';

export const metadata: Metadata = {
  title: 'Hồ sơ Đối tác cho thuê & Bên vận hành | NHACUALAND',
  description: 'Hồ sơ đối tác cho thuê phòng và đơn vị quản lý vận hành hợp tác dịch vụ môi giới với NHACUALAND',
  robots: { index: false, follow: true },
};

export default function MoiGioiPage() {
  return (
    <ComingSoonNotice
      title="Hồ sơ Đối tác cho thuê & Bên vận hành"
      description="Trang hồ sơ đối tác cho thuê và đơn vị quản lý vận hành căn hộ dịch vụ hợp tác dịch vụ môi giới với NHACUALAND kèm thông tin xác thực thẩm quyền cho thuê"
    />
  );
}
