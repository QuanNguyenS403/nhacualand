'use client';

import { Listing } from '@/lib/api';
import { ListingCard } from './ListingCard';

interface Props {
  initialListings: Listing[];
}

export function ListingsGridWithCustom({ initialListings }: Props) {
  // Chỉ hiển thị các tin còn phòng (active), loại bỏ phòng đã cho thuê hoặc bị gỡ
  const validListings = (initialListings || []).filter((l) => {
    const st = (l.status || 'active').toLowerCase();
    return st !== 'rented' && st !== 'removed' && st !== 'rejected';
  });

  return (
    <div className="mt-6 sm:mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-6">
      {validListings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
