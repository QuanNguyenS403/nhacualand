import type { Metadata } from 'next';
import { ComingSoonNotice } from '@/components/ComingSoonNotice';

export const metadata: Metadata = {
  title: 'Bảng giá thuê phòng & căn hộ theo khu vực | NHACUALAND',
  description: 'Thống kê mức giá thuê trung bình phòng trọ, studio, căn hộ theo từng quận huyện và cụm trường Đại học — sắp ra mắt',
  robots: { index: false, follow: true },
};

export default function GiaNhaDatPage() {
  return (
    <ComingSoonNotice
      title="Bảng giá thuê phòng & căn hộ theo khu vực"
      description="Biểu đồ và bảng thống kê giá thuê trung bình theo từng quận/huyện, bán kính gần các cụm trường Đại học trọng điểm và xu hướng biến động giá thuê thực tế trên sàn"
    />
  );
}
