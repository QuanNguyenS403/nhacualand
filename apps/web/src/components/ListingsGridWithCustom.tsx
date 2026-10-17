'use client';

import { useState, useEffect } from 'react';
import { Listing } from '@/lib/api';
import { ListingCard } from './ListingCard';

interface Props {
  initialListings: Listing[];
}

export function ListingsGridWithCustom({ initialListings }: Props) {
  const [items, setItems] = useState<Listing[]>(initialListings);

  useEffect(() => {
    setItems(initialListings);
  }, [initialListings]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      if (e?.detail?.id && e?.detail?.status === 'rented') {
        const rentedId = String(e.detail.id);
        setItems((prev) => prev.filter((it) => String(it.id) !== rentedId && it.slug !== e.detail.slug));
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'qns_last_rented_id' && e.newValue) {
        const rentedId = String(e.newValue);
        setItems((prev) => prev.filter((it) => String(it.id) !== rentedId));
      }
    };

    const handleFocus = () => {
      try {
        const lastRentedId = localStorage.getItem('qns_last_rented_id');
        if (lastRentedId) {
          setItems((prev) => prev.filter((it) => String(it.id) !== lastRentedId));
        }
      } catch {}
    };

    window.addEventListener('qns_listings_updated', handleUpdate);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('qns_listings_updated', handleUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Chỉ hiển thị các tin còn phòng (active), loại bỏ phòng đã cho thuê hoặc bị gỡ
  const validListings = (items || []).filter((l) => {
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
