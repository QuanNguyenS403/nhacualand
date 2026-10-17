'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  filterMapRooms,
  pinToMapRoom,
  getCommunityReviewPins,
  getFallbackDemoPins,
  type MapRoom,
  type MapFilterParams,
  type CommunityReviewPin,
} from '@/lib/map-rooms-data';
import { fetchMapPins, fetchListingBySlug, resetApiCircuitBreaker, type ListingMapPin } from '@/lib/api';
import { geocodeAddressPipeline } from '@/lib/vietnam-geocoding';
import { MapRoomCanvas } from './MapRoomCanvas';
import { MapFloatingSearchBar } from './MapFloatingSearchBar';
import { MapRoomDetailDrawer } from './MapRoomDetailDrawer';

export function MapReviewsExplorer() {
  const [allPins, setAllPins] = useState<ListingMapPin[]>([]);
  const [myPendingPin, setMyPendingPin] = useState<ListingMapPin | null>(null);
  const [filterParams, setFilterParams] = useState<MapFilterParams>({});
  const [selectedRoom, setSelectedRoom] = useState<MapRoom | null>(null);
  const [selectedClusterRooms, setSelectedClusterRooms] = useState<MapRoom[]>([]);
  const [selectedReview, setSelectedReview] = useState<CommunityReviewPin | null>(null);
  const [showReviewsLayer, setShowReviewsLayer] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const communityReviews = useMemo(() => {
    return getCommunityReviewPins();
  }, []);

  // 1. Nạp danh sách tin từ GET /listings/map qua fetchMapPins() kèm Fallback an toàn
  const loadMapPins = useCallback(async (isInitial = false, isRetry = false) => {
    try {
      if (isInitial) setIsLoading(true);
      if (isRetry) {
        resetApiCircuitBreaker();
      }

      const pins = await fetchMapPins(undefined, { bypassCircuitBreaker: isRetry });
      if (Array.isArray(pins) && pins.length > 0) {
        setAllPins(pins);
        setFetchError(null);
      } else {
        // Nếu DB chưa có tin hoặc trả về mảng rỗng, nạp fallback demo pins để bản đồ không bị trống trơn
        const fallback = getFallbackDemoPins();
        setAllPins(fallback);
        setFetchError(null);
      }
    } catch (err: any) {
      // Khi API ngoại tuyến hoặc mất kết nối:
      // Tự động nạp bộ tin mẫu chuẩn vào allPins để đảm bảo người dùng luôn có dữ liệu tương tác
      const fallback = getFallbackDemoPins();
      setAllPins((prev) => (prev.length > 0 ? prev : fallback));

      // Không hiển thị banner lỗi gây hoang mang khi đã có dữ liệu phòng dự phòng đầy đủ
      if (fallback.length === 0) {
        setFetchError('Không thể kết nối đến máy chủ bản đồ, vui lòng thử lại sau');
      } else {
        setFetchError(null);
      }
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, []);

  // 2. Kiểm tra tin vừa đăng của chủ nhà (hiện ngay pin "Chờ duyệt" cho riêng họ)
  const checkOwnerPendingListing = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const lastPostedId = localStorage.getItem('qns_last_posted_id');
      if (!lastPostedId) return;

      const listing = await fetchListingBySlug(lastPostedId).catch(() => null);
      if (listing && listing.status === 'pending' && listing.lat != null && listing.lng != null) {
        const pendingPin: ListingMapPin = {
          id: String(listing.id),
          slug: listing.slug,
          title: listing.title,
          price: parseInt(String(listing.price), 10) || 0,
          depositAmount: listing.depositAmount ? parseInt(String(listing.depositAmount), 10) : undefined,
          areaM2: parseInt(String(listing.areaM2), 10) || 20,
          propertyType: (listing.propertyType as any) || 'phong_tro',
          lat: listing.lat,
          lng: listing.lng,
          thumbnailUrl: listing.images?.[0]?.imageUrl || null,
          locationName: listing.addressDetail || 'Hà Nội',
          district: listing.location?.name,
          status: 'pending',
          isOwnerPending: true,
        };

        setMyPendingPin(pendingPin);
        const mapRoom = pinToMapRoom(pendingPin);
        setSelectedRoom(mapRoom);
        setMapCenter({ lat: listing.lat, lng: listing.lng });
      } else if (listing && listing.status === 'active') {
        // Tin đã được admin duyệt sang active, xóa cờ tạm
        localStorage.removeItem('qns_last_posted_id');
        setMyPendingPin(null);
      }
    } catch {}
  }, []);

  // 3. Khởi tạo và thiết lập chu kỳ Polling đồng bộ thời gian thực (mỗi 8 giây)
  useEffect(() => {
    let isSubscribed = true;

    async function init() {
      await loadMapPins(true);
      if (isSubscribed) {
        await checkOwnerPendingListing();
      }
    }

    init();

    // Chu kỳ cập nhật ngầm: kiểm tra tin mới được admin duyệt trong vòng tối đa 8 giây
    const pollInterval = setInterval(() => {
      loadMapPins(false);
      checkOwnerPendingListing();
    }, 8000);

    // Lắng nghe sự kiện phát ra từ luồng đăng tin / admin duyệt tin / đánh dấu đã cho thuê
    const handleUpdateEvent = (e: any) => {
      if (e?.detail?.id && (e.detail.status === 'rented' || e.detail.status === 'removed')) {
        const targetId = String(e.detail.id);
        setAllPins((prev) => prev.filter((p) => p.id !== targetId));
      }
      loadMapPins(false);
      checkOwnerPendingListing();
    };

    window.addEventListener('qns_listings_updated', handleUpdateEvent);
    window.addEventListener('storage', handleUpdateEvent);
    window.addEventListener('focus', handleUpdateEvent);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      window.removeEventListener('qns_listings_updated', handleUpdateEvent);
      window.removeEventListener('storage', handleUpdateEvent);
      window.removeEventListener('focus', handleUpdateEvent);
    };
  }, [loadMapPins, checkOwnerPendingListing]);

  // 4. Tổng hợp danh sách MapRoom từ pins thật trong DB + pin chờ duyệt của chủ
  const allMapRooms = useMemo(() => {
    const list: MapRoom[] = [];
    const seenIds = new Set<string>();

    if (myPendingPin) {
      list.push(pinToMapRoom(myPendingPin));
      seenIds.add(myPendingPin.id);
    }

    for (const pin of allPins) {
      if (!seenIds.has(pin.id)) {
        seenIds.add(pin.id);
        list.push(pinToMapRoom(pin));
      }
    }

    return list;
  }, [allPins, myPendingPin]);

  // 5. Lọc phòng theo bộ lọc tìm kiếm
  const filteredRooms = useMemo(() => {
    return filterMapRooms(allMapRooms, filterParams);
  }, [allMapRooms, filterParams]);

  // 6. Xử lý khi người dùng tìm kiếm từ thanh MapFloatingSearchBar
  const handleSearch = useCallback(async (params: MapFilterParams) => {
    setFilterParams(params);

    const matched = filterMapRooms(allMapRooms, params);

    if (params.query && params.query.trim()) {
      try {
        const geoRes = await geocodeAddressPipeline(params.query.trim());
        if (geoRes && geoRes.lat && geoRes.lng) {
          setMapCenter({ lat: geoRes.lat, lng: geoRes.lng });
          return;
        }
      } catch {}
    }

    if (params.khuVuc && params.khuVuc !== 'all' && params.khuVuc !== 'Khu vực') {
      try {
        const geoRes = await geocodeAddressPipeline(params.khuVuc);
        if (geoRes && geoRes.lat && geoRes.lng) {
          setMapCenter({ lat: geoRes.lat, lng: geoRes.lng });
          return;
        }
      } catch {}
    }

    if (matched.length > 0) {
      setMapCenter({ lat: matched[0].lat, lng: matched[0].lng });
    }
  }, [allMapRooms]);

  return (
    <div className="relative w-full h-full min-h-[580px] sm:min-h-[640px] overflow-hidden bg-slate-900">
      {/* Thông báo lỗi nếu máy chủ API ngoại tuyến và hoàn toàn không có dữ liệu phòng */}
      {fetchError && allPins.length === 0 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2.5 rounded-2xl bg-amber-500/90 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-3 border border-amber-300">
          <span>{fetchError}</span>
          <button
            type="button"
            onClick={() => loadMapPins(false, true)}
            className="px-2.5 py-1 rounded-xl bg-slate-950 text-amber-300 text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Bản đồ Google Maps phủ toàn bộ khung nhìn */}
      <div className="absolute inset-0 w-full h-full z-10">
        <MapRoomCanvas
          rooms={filteredRooms}
          selectedRoom={selectedRoom}
          onSelectRoom={(room, cluster) => {
            setSelectedReview(null);
            setSelectedRoom(room);
            setSelectedClusterRooms(cluster || [room]);
          }}
          centerCoords={mapCenter}
          communityReviews={communityReviews}
          selectedReview={selectedReview}
          onSelectReview={(rv) => {
            setSelectedRoom(null);
            setSelectedClusterRooms([]);
            setSelectedReview(rv);
          }}
          showReviewsLayer={showReviewsLayer}
          onToggleReviewsLayer={() => setShowReviewsLayer((prev) => !prev)}
        />
      </div>

      {/* Thanh tìm kiếm nổi phía trên */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 md:left-6 z-30 pointer-events-none w-[calc(100%-24px)] sm:w-[440px] md:w-[450px]">
        <div className="pointer-events-auto">
          <MapFloatingSearchBar
            onSearch={handleSearch}
            totalFilteredCount={filteredRooms.length}
          />
        </div>
      </div>

      {/* Drawer chi tiết phòng hoặc chi tiết đánh giá cộng đồng */}
      <MapRoomDetailDrawer
        room={selectedRoom}
        clusterRooms={selectedClusterRooms}
        onSelectClusterRoom={(room) => setSelectedRoom(room)}
        selectedReview={selectedReview}
        onClose={() => {
          setSelectedRoom(null);
          setSelectedClusterRooms([]);
          setSelectedReview(null);
        }}
      />
    </div>
  );
}
