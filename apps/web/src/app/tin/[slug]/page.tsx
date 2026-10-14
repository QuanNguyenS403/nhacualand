import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { fetchListingBySlug, fetchListings } from '@/lib/api';
import legacyRedirects from '@/lib/legacy-slug-redirects.json';
import { ListingDetailClientView } from './ListingDetailClientView';

interface Props {
  params: { slug: string };
}

const getListingOrNull = cache(async (slug: string) => {
  try {
    const listing = await fetchListingBySlug(slug);
    if (listing && listing.id) return listing;
  } catch {}
  return null;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListingOrNull(params.slug);
  if (listing) {
    const cleanTitle = (listing.title ?? 'Phòng cho thuê')
      .replace(/^\[MẪU\]\s*/i, '')
      .replace(/\[MẪU\]/gi, '')
      .trim();
    const desc = listing.description?.slice(0, 160) ?? `${cleanTitle} tại ${listing.location?.name ?? 'Việt Nam'}`;
    return {
      title: `${cleanTitle} | QNS BROKER`,
      description: desc,
      openGraph: {
        title: cleanTitle,
        description: desc,
        images: listing.images?.[0] ? [listing.images[0].imageUrl] : [],
      },
    };
  }

  return {
    title: 'Phòng không tồn tại | QNS BROKER',
    description: 'Thông tin phòng cho thuê không tìm thấy hoặc đã ngừng hiển thị',
  };
}

export default async function ListingDetailPage({ params }: Props) {
  // 1. Kiểm tra ánh xạ slug cũ sang slug mới (301 redirect)
  const redirectedSlug = (legacyRedirects as Record<string, string>)[params.slug];
  if (redirectedSlug) {
    redirect(`/tin/${redirectedSlug}`);
  }

  // 2. Lấy dữ liệu thật duy nhất từ PostgreSQL qua API
  const listing = await getListingOrNull(params.slug);
  if (!listing) {
    notFound();
  }

  // 3. Lấy tin tương tự từ API
  let similarListings: any[] = [];
  try {
    if (listing.propertyType) {
      const res = await fetchListings({
        propertyType: listing.propertyType,
        pageSize: '4',
      });
      similarListings = (res.items || []).filter((it) => it.id !== listing.id).slice(0, 4);
    }
  } catch {}

  return (
    <ListingDetailClientView
      initialListing={listing}
      slug={params.slug}
      similarListings={similarListings}
    />
  );
}
