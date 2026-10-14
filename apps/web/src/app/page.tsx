import Link from 'next/link';
import type { Metadata } from 'next';
import { fetchListings } from '@/lib/api';
import { ListingCard } from '@/components/ListingCard';
import { HeroSearchForm } from '@/components/HeroSearchForm';
import {
  DEMO_ROOM_RENT_LISTINGS,
  DEMO_CAN_HO_RENT_LISTINGS,
  DEMO_STUDIO_RENT_LISTINGS,
  DEMO_SPACE_RENT_LISTINGS,
} from '@/lib/demo-data';

export const metadata: Metadata = {
  title: 'QNS BROKER — Minh bạch chi phí, đúng người cho thuê',
  description:
    'Nền tảng tìm chỗ thuê minh bạch chi phí: phòng trọ sinh viên, studio, căn hộ, mặt bằng kinh doanh. Xem bảng chi phí trọn gói trước khi liên hệ, kết nối đúng bên có quyền cho thuê',
};

const VALUE_PROPOSITIONS = [
  {
    title: 'Bài đăng xác thực & Minh bạch',
    desc: 'Hình ảnh thực tế, thông tin mô tả chi tiết, giá thuê và các chi phí dịch vụ được công khai minh bạch',
    color: 'from-amber-500/15 to-yellow-500/5',
    border: 'border-amber-200',
  },
  {
    title: 'Tìm kiếm nhanh chóng & Tiện lợi',
    desc: 'Bộ lọc thông minh theo khu vực, mức giá và loại hình phòng phù hợp với nhu cầu sử dụng',
    color: 'from-brand/15 to-amber-500/5',
    border: 'border-brand/20',
  },
  {
    title: 'Tư vấn & Trực tiếp dẫn xem',
    desc: 'Đội ngũ nhân viên chuyên nghiệp tiếp nhận nhu cầu, tư vấn chi tiết và trực tiếp dẫn xem phòng',
    color: 'from-yellow-500/15 to-amber-500/5',
    border: 'border-yellow-200',
  },
  {
    title: 'Miễn phí môi giới',
    desc: 'Cam kết không mất phí môi giới. Khách thuê ký hợp đồng và thanh toán trực tiếp với chủ nhà',
    color: 'from-amber-600/15 to-brand/5',
    border: 'border-amber-300/70',
  },
];

export default async function HomePage() {
  const isProduction = process.env.NODE_ENV === 'production';
  let roomListings: Awaited<ReturnType<typeof fetchListings>> | null = null;
  let apartmentListings: Awaited<ReturnType<typeof fetchListings>> | null = null;
  let studioListings: Awaited<ReturnType<typeof fetchListings>> | null = null;
  let spaceListings: Awaited<ReturnType<typeof fetchListings>> | null = null;

  try {
    const [roomRes, aptRes, studioRes, spaceRes] = await Promise.allSettled([
      fetchListings({ categoryGroup: 'thue_tro', pageSize: '4' }),
      fetchListings({ categoryGroup: 'thue_can_ho', pageSize: '4' }),
      fetchListings({ categoryGroup: 'thue_studio', pageSize: '4' }),
      fetchListings({ categoryGroup: 'thue_mat_bang', pageSize: '4' }),
    ]);

    roomListings = roomRes.status === 'fulfilled' ? roomRes.value : null;
    apartmentListings = aptRes.status === 'fulfilled' ? aptRes.value : null;
    studioListings = studioRes.status === 'fulfilled' ? studioRes.value : null;
    spaceListings = spaceRes.status === 'fulfilled' ? spaceRes.value : null;
  } catch {
    // Không bao giờ để lỗi fetch làm sập toàn trang
  }

  // Lọc bỏ triệt để tin rác/tin test nếu có từ dữ liệu chạy test cũ
  const isTestListing = (it: { slug: string; title: string }) => {
    const slug = (it.slug || '').toLowerCase();
    const title = (it.title || '').toLowerCase();
    return (
      slug.startsWith('listing-') ||
      slug.includes('-idtemp') ||
      slug.includes('test') ||
      title.includes('tin cũ') ||
      title.includes('test') ||
      title.includes('bảo toàn đầu mối') ||
      title.startsWith('listing')
    );
  };

  const cleanRoom = (roomListings?.items || []).filter((it) => !isTestListing(it));
  const cleanApt = (apartmentListings?.items || []).filter((it) => !isTestListing(it));
  const cleanStudio = (studioListings?.items || []).filter((it) => !isTestListing(it));
  const cleanSpace = (spaceListings?.items || []).filter((it) => !isTestListing(it));

  function mergeHomeListings<T extends { slug: string }>(apiItems: T[], demoItems: T[]): T[] {
    const map = new Map<string, T>();
    for (const it of apiItems) {
      if (it && it.slug) map.set(it.slug, it);
    }
    for (const it of demoItems) {
      if (it && it.slug && !map.has(it.slug)) map.set(it.slug, it);
    }
    return Array.from(map.values());
  }

  const roomItems = mergeHomeListings(cleanRoom, DEMO_ROOM_RENT_LISTINGS);
  const aptItems = mergeHomeListings(cleanApt, DEMO_CAN_HO_RENT_LISTINGS);
  const studioItems = mergeHomeListings(cleanStudio, DEMO_STUDIO_RENT_LISTINGS);
  const spaceItems = mergeHomeListings(cleanSpace, DEMO_SPACE_RENT_LISTINGS);

  return (
    <div>
      {/* ── Hero Section ── */}
      <section className="hero-pattern">
        <div className="container-max py-6 sm:py-8 lg:py-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-2.5 sm:mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3.5 py-1 text-xs font-semibold text-brand ring-1 ring-brand/20">
              QNS BROKER — Minh bạch chi phí, đúng người cho thuê
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl md:text-4xl lg:text-[2.65rem] leading-[1.15] md:leading-[1.18]">
              <span className="block">QNS BROKER -</span>
              <span className="mt-0.5 sm:mt-0.5 block bg-gradient-to-r from-brand to-brand-700 bg-clip-text pb-0.5 text-transparent">
                rõ chi phí ngay từ đầu
              </span>
            </h1>
            <p className="mt-2 sm:mt-2.5 text-xs sm:text-sm md:text-[0.925rem] text-text-secondary max-w-2xl mx-auto leading-relaxed">
              Minh bạch giá thuê, tiền cọc, điện nước và vai trò người đăng — từ phòng trọ sinh viên, studio, căn hộ đến mặt bằng kinh doanh
            </p>

            {/* Search bar & Tabs */}
            <div className="mt-4 sm:mt-5 mx-auto max-w-[44rem]">
              {/* Tabs chuyên mục thuê */}
              <div className="mb-0 flex justify-center">
                <div className="inline-flex rounded-t-xl overflow-hidden border-b-0 flex-wrap shadow-sm">
                  <Link
                    href="/"
                    className="bg-brand text-white px-3.5 sm:px-4.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold border-x border-t border-brand rounded-tl-xl hover:bg-brand-700 transition-colors"
                  >
                    Trang chủ
                  </Link>
                  <Link
                    href="/thue?categoryGroup=thue_can_ho"
                    className="bg-white px-3.5 sm:px-4.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-semibold text-brand border-r border-t border-surface-border hover:bg-slate-50 transition-colors"
                  >
                    Chung cư
                  </Link>
                  <Link
                    href="/thue?categoryGroup=thue_studio"
                    className="bg-slate-50 px-3.5 sm:px-4.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium text-text-secondary border-r border-t border-surface-border hover:bg-white hover:text-brand transition-colors"
                  >
                    Chung cư mini
                  </Link>
                  <Link
                    href="/cho-thue-tro"
                    className="bg-slate-50 px-3.5 sm:px-4.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium text-text-secondary border-r border-t border-surface-border hover:bg-white hover:text-brand transition-colors"
                  >
                    Phòng trọ SV
                  </Link>
                  <Link
                    href="/cho-thue-mat-bang"
                    className="bg-slate-50 px-3.5 sm:px-4.5 py-1.5 sm:py-2 text-xs sm:text-[13px] font-medium text-text-secondary border-r border-t border-surface-border rounded-tr-xl hover:bg-white hover:text-brand transition-colors"
                  >
                    Mặt bằng kinh doanh
                  </Link>
                </div>
              </div>

              <HeroSearchForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 Value Proposition Cards ── */}
      <section className="border-b border-surface-border bg-white">
        <div className="container-max py-6 sm:py-7 md:py-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {VALUE_PROPOSITIONS.map((card, idx) => (
              <div
                key={idx}
                className={`flex flex-col rounded-2xl border ${card.border} bg-gradient-to-br ${card.color} p-4 sm:p-5 transition-all hover:shadow-elevated hover:-translate-y-1`}
              >
                <div>
                  <p className="font-semibold text-text-primary text-base sm:text-lg">{card.title}</p>
                  <p className="mt-1.5 text-sm sm:text-base text-text-secondary leading-relaxed">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tin đăng nổi bật ── */}
      <section className="container-max py-7 sm:py-9 md:py-11 space-y-7 sm:space-y-8 md:space-y-9">
        {/* Section 1: Phòng trọ sinh viên */}
        <div>
          <div className="mb-3 sm:mb-3.5 flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Phòng trọ sinh viên</h2>
              <p className="mt-1 text-xs sm:text-sm text-text-muted">
                Giá tốt từ 1.5 - 4 triệu/tháng, gần các trường đại học, giờ giấc tự do
              </p>
            </div>
            <Link
              href="/cho-thue-tro"
              className="flex items-center gap-1.5 text-sm sm:text-base font-semibold text-brand hover:text-brand-700 transition-colors"
            >
              <span>Xem tất cả</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
          {roomItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {roomItems.slice(0, 4).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-sm text-slate-500">
              Hiện chưa có tin đăng nào trong chuyên mục này
            </div>
          )}
        </div>

        {/* Section 2: Chung cư */}
        <div>
          <div className="mb-3 sm:mb-3.5 flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Chung cư</h2>
              <p className="mt-1 text-xs sm:text-sm text-text-muted">
                Đầy đủ nội thất, view thoáng mát, an ninh cho người đi làm & gia đình
              </p>
            </div>
            <Link
              href="/thue?categoryGroup=thue_can_ho"
              className="flex items-center gap-1.5 text-sm sm:text-base font-semibold text-brand hover:text-brand-700 transition-colors"
            >
              <span>Xem tất cả</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
          {aptItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {aptItems.slice(0, 4).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-sm text-slate-500">
              Hiện chưa có tin đăng nào trong chuyên mục này
            </div>
          )}
        </div>

        {/* Section 3: Chung cư mini */}
        <div>
          <div className="mb-3 sm:mb-3.5 flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Chung cư mini</h2>
              <p className="mt-1 text-xs sm:text-sm text-text-muted">
                Studio ban công, duplex gác lửng, full nội thất hiện đại cho người đi làm & chuyên gia
              </p>
            </div>
            <Link
              href="/thue?categoryGroup=thue_studio"
              className="flex items-center gap-1.5 text-sm sm:text-base font-semibold text-brand hover:text-brand-700 transition-colors"
            >
              <span>Xem tất cả</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
          {studioItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {studioItems.slice(0, 4).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-sm text-slate-500">
              Hiện chưa có tin đăng nào trong chuyên mục này
            </div>
          )}
        </div>

        {/* Section 4: Mặt bằng kinh doanh */}
        <div>
          <div className="mb-3 sm:mb-3.5 flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Mặt bằng kinh doanh</h2>
              <p className="mt-1 text-xs sm:text-sm text-text-muted">
                Mặt phố kinh doanh, vỉa hè rộng, shophouse khối đế lưu lượng người qua lại cao
              </p>
            </div>
            <Link
              href="/cho-thue-mat-bang"
              className="flex items-center gap-1.5 text-sm sm:text-base font-semibold text-brand hover:text-brand-700 transition-colors"
            >
              <span>Xem tất cả</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
          {spaceItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              {spaceItems.slice(0, 4).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-sm text-slate-500">
              Hiện chưa có tin đăng nào trong chuyên mục này
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
