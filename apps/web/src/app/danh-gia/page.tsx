import { Metadata } from 'next';
import { MapReviewsExplorer } from '@/components/reviews/MapReviewsExplorer';

export const metadata: Metadata = {
  title: 'Bản đồ phòng trọ & Đánh giá minh bạch — NHACUALAND',
  description: 'Bản đồ Google Maps tra cứu vị trí phòng trọ theo ngõ phường quận, tích hợp lịch sử tìm kiếm và đánh giá thực tế từ cựu người thuê',
  alternates: {
    canonical: '/danh-gia',
  },
  openGraph: {
    title: 'Bản đồ phòng trọ & Đánh giá minh bạch — NHACUALAND',
    description: 'Bản đồ Google Maps tra cứu vị trí phòng trọ theo ngõ phường quận, tích hợp lịch sử tìm kiếm và đánh giá thực tế từ cựu người thuê',
    type: 'website',
  },
};

export default function DanhGiaPage() {
  return (
    <div className="w-full h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] min-h-[600px] bg-slate-900 overflow-hidden">
      {/* Main container tràn viền 100% chiều rộng màn hình */}
      <main className="w-full h-full relative z-20">
        <h1 className="sr-only">Bản đồ phòng trọ & Đánh giá minh bạch</h1>

        {/* Khối Trọng tâm: Bản đồ Google Maps toàn màn hình tràn viền */}
        <section className="w-full h-full">
          <MapReviewsExplorer />
        </section>
      </main>
    </div>
  );
}
