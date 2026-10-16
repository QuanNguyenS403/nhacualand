import type { Metadata } from 'next';
import { ComingSoonNotice } from '@/components/ComingSoonNotice';

export const metadata: Metadata = {
  title: 'Khu trọ & Dự án Căn hộ cho thuê | NHACUALAND',
  description: 'Danh sách tổ hợp khu trọ quy mô lớn, chung cư mini và căn hộ dịch vụ cho thuê sắp ra mắt',
  robots: { index: false, follow: true },
};

export default function DuAnPage() {
  return (
    <ComingSoonNotice
      title="Khu trọ & Dự án Căn hộ cho thuê"
      description="Trang tổng hợp các tổ hợp khu trọ sinh viên, toà nhà chung cư mini, toà nhà studio và căn hộ dịch vụ cho thuê kèm tiện ích toà nhà, số lượng phòng trống và ban quản lý vận hành"
    />
  );
}
