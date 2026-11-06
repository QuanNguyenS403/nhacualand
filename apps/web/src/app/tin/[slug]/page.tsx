export const runtime = 'edge';
import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { fetchListingBySlug, fetchListings } from '@/lib/api';
import { findDemoListing, ALL_DEMO_LISTINGS } from '@/lib/demo-data';
import legacyRedirects from '@/lib/legacy-slug-redirects.json';
import { ListingDetailClientView } from './ListingDetailClientView';
// MobileStickyContactBar is rendered inside ListingDetailClientView for responsive sticky booking bar

interface Props {
  params: { slug: string };
}

const getListingOrNull = cache(async (slug: string) => {
  try {
    const listing = await fetchListingBySlug(slug);
    if (listing && listing.id) return listing;
  } catch {}
  return findDemoListing(slug, false);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListingOrNull(params.slug);
  if (listing) {
    const cleanTitle = (listing.title ?? 'Phòng cho thuê')
      .replace(/^\[MẪU\]\s*/i, '')
      .replace(/\[MẪU\]/gi, '')
      .trim();
    const rawDesc = listing.description?.slice(0, 160) ?? `${cleanTitle} tại ${listing.location?.name ?? 'Việt Nam'}`;
    const desc = rawDesc.replace(/\.+$/, '');
    return {
      title: `${cleanTitle} | NHACUALAND`,
      description: desc,
      openGraph: {
        title: cleanTitle,
        description: desc,
        images: listing.images?.[0] ? [listing.images[0].imageUrl] : [],
      },
    };
  }

  return {
    title: 'Phòng không tồn tại | NHACUALAND',
    description: 'Thông tin phòng cho thuê không tìm thấy hoặc đã ngừng hiển thị',
  };
}

export default async function ListingDetailPage({ params }: Props) {
  // 1. Kiểm tra ánh xạ slug cũ sang slug mới (301 redirect)
  const redirectedSlug = (legacyRedirects as Record<string, string>)[params.slug];
  if (redirectedSlug) {
    redirect(`/tin/${redirectedSlug}`);
  }

  // 2. Lấy dữ liệu thật từ API hoặc tin mẫu chuẩn đồng bộ
  const listing = await getListingOrNull(params.slug);
  if (!listing) {
    notFound();
  }

  // 3. Lấy tin tương tự từ API hoặc danh sách phòng cùng phân khúc
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

  if (similarListings.length === 0 && listing.propertyType) {
    similarListings = ALL_DEMO_LISTINGS.filter(
      (it) => it.propertyType === listing.propertyType && it.id !== listing.id,
    ).slice(0, 4);
  }

  const cleanTitle = (listing.title ?? 'Phòng cho thuê')
    .replace(/^\[MẪU\]\s*/i, '')
    .replace(/\[MẪU\]/gi, '')
    .trim();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':
      listing.propertyType === 'can_ho'
        ? 'Apartment'
        : listing.propertyType === 'mat_bang'
          ? 'Store'
          : 'RealEstateListing',
    name: cleanTitle,
    description: (listing.description?.slice(0, 200) || cleanTitle).replace(/\.+$/, ''),
    url: `https://nhacualand.com/tin/${params.slug}`,
    image: listing.images?.map((img) => img.imageUrl) || [],
    offers: {
      '@type': 'Offer',
      price: Number(listing.price),
      priceCurrency: 'VND',
      availability:
        (listing.status || '').toLowerCase() === 'rented'
          ? 'https://schema.org/Discontinued'
          : 'https://schema.org/InStock',
      priceValidUntil: '2027-12-31',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: listing.location?.name || 'Hà Nội',
      addressCountry: 'VN',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ListingDetailClientView
        initialListing={listing}
        slug={params.slug}
        similarListings={similarListings}
      />
    </>
  );
}
