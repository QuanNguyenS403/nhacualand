'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { MapRoom, CommunityReviewPin } from '@/lib/map-rooms-data';

interface MapRoomCanvasProps {
  rooms: MapRoom[];
  selectedRoom: MapRoom | null;
  onSelectRoom: (room: MapRoom, clusterRooms?: MapRoom[]) => void;
  centerCoords?: { lat: number; lng: number } | null;
  communityReviews?: CommunityReviewPin[];
  selectedReview?: CommunityReviewPin | null;
  onSelectReview?: (review: CommunityReviewPin) => void;
  showReviewsLayer?: boolean;
  onToggleReviewsLayer?: () => void;
}

export function MapRoomCanvas({
  rooms,
  selectedRoom,
  onSelectRoom,
  centerCoords,
  communityReviews = [],
  selectedReview,
  onSelectReview,
  showReviewsLayer = false,
  onToggleReviewsLayer,
}: MapRoomCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const roomMarkersLayerRef = useRef<any>(null);
  const reviewMarkersLayerRef = useRef<any>(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(13);

  // Mặc định trung tâm Hà Nội
  const DEFAULT_LAT = 21.015;
  const DEFAULT_LNG = 105.835;

  // 1. Tải Leaflet CSS & JS từ CDN với kiểm tra an toàn
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).L) {
      setIsLeafletReady(true);
      return;
    }

    const cssId = 'leaflet-cdn-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-cdn-js';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.crossOrigin = '';
      script.async = true;
      script.onload = () => setIsLeafletReady(true);
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', () => setIsLeafletReady(true));
    }

    const timer = setInterval(() => {
      if ((window as any).L) {
        setIsLeafletReady(true);
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, []);

  // 2. Khởi tạo bản đồ Google Maps qua Leaflet TileLayer
  useEffect(() => {
    if (!isLeafletReady || !containerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    if (L.DomUtil && !L.DomUtil._safePositionPatched) {
      const origGetPosition = L.DomUtil.getPosition;
      L.DomUtil.getPosition = function (el: any) {
        if (!el) {
          return (L.Point ? new L.Point(0, 0) : { x: 0, y: 0 }) as any;
        }
        return origGetPosition.call(this, el);
      };
      L.DomUtil._safePositionPatched = true;
    }

    if (L.Map && L.Map.prototype && !(L.Map.prototype as any)._safePanePosPatched) {
      const origGetMapPanePos = L.Map.prototype._getMapPanePos;
      L.Map.prototype._getMapPanePos = function () {
        if (!this._mapPane) {
          return (L.Point ? new L.Point(0, 0) : { x: 0, y: 0 }) as any;
        }
        return origGetMapPanePos ? origGetMapPanePos.call(this) : ((L.Point ? new L.Point(0, 0) : { x: 0, y: 0 }) as any);
      };
      (L.Map.prototype as any)._safePanePosPatched = true;
    }

    if (mapInstanceRef.current) return;

    const startLat = centerCoords?.lat ?? DEFAULT_LAT;
    const startLng = centerCoords?.lng ?? DEFAULT_LNG;

    const map = L.map(containerRef.current, {
      center: [startLat, startLng],
      zoom: 13,
      zoomControl: false,
    });
    map.attributionControl?.setPrefix(false);

    // Lớp Google Maps Road Tiles
    const googleTileLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps',
    });

    // Lớp fallback CartoDB
    const fallbackTileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '© CartoDB © OpenStreetMap',
      }
    );

    googleTileLayer.on('tileerror', () => {
      if (!map.hasLayer(fallbackTileLayer)) {
        fallbackTileLayer.addTo(map);
      }
    });

    googleTileLayer.addTo(map);

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    const roomMarkersLayer = L.layerGroup().addTo(map);
    const reviewMarkersLayer = L.layerGroup().addTo(map);
    roomMarkersLayerRef.current = roomMarkersLayer;
    reviewMarkersLayerRef.current = reviewMarkersLayer;
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop?.();
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletReady]);

  // 3. Gom cụm phòng theo khoảng cách hình học thực tế
  const clusteredRooms = useMemo(() => {
    const grid = new Map<string, MapRoom[]>();

    rooms.forEach((r) => {
      let key: string;
      if (currentZoom < 14) {
        // Thu phóng xa (< 14): gom ô ~1.5km
        key = `${(Math.round(r.lat * 50) / 50).toFixed(3)}_${(Math.round(r.lng * 50) / 50).toFixed(3)}`;
      } else if (currentZoom < 16) {
        // Thu phóng vừa (14 - 15): gom ô ~300m
        key = `${(Math.round(r.lat * 200) / 200).toFixed(4)}_${(Math.round(r.lng * 200) / 200).toFixed(4)}`;
      } else {
        // Thu phóng gần (>= 16): chỉ gom nếu tọa độ trùng nhau
        key = `${r.lat.toFixed(5)}_${r.lng.toFixed(5)}`;
      }

      if (!grid.has(key)) {
        grid.set(key, []);
      }
      grid.get(key)!.push(r);
    });

    return Array.from(grid.values());
  }, [rooms, currentZoom]);

  // 4. Vẽ Marker phòng lên bản đồ
  useEffect(() => {
    if (!mapInstanceRef.current || !roomMarkersLayerRef.current || !isLeafletReady) return;
    const L = (window as any).L;
    if (!L) return;

    const layer = roomMarkersLayerRef.current;
    layer.clearLayers();

    clusteredRooms.forEach((cluster) => {
      const count = cluster.length;
      // Tâm hình học thực sự của cụm phòng
      const avgLat = cluster.reduce((sum, it) => sum + it.lat, 0) / count;
      const avgLng = cluster.reduce((sum, it) => sum + it.lng, 0) / count;

      const isSelected = selectedRoom ? cluster.some((r) => r.id === selectedRoom.id) : false;
      const hasPending = cluster.some((r) => r.status === 'pending' || (r as any).isOwnerListing || (r as any).isOwnerPending);

      const isCluster = count > 1;

      let iconHtml = '';
      if (hasPending) {
        // Pin của chính chủ nhà ở trạng thái "Chờ duyệt"
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transform transition-transform hover:scale-110 ${isSelected ? 'scale-125 z-50' : 'z-30'}">
            <div class="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[11px] shadow-xl border-2 border-white flex items-center gap-1.5 whitespace-nowrap">
              <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span>Chờ duyệt</span>
            </div>
            <div class="absolute -inset-1 rounded-full bg-amber-400 animate-ping opacity-35 pointer-events-none"></div>
          </div>
        `;
      } else if (isCluster) {
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transform transition-transform hover:scale-110 ${isSelected ? 'scale-125 z-50' : 'z-20'}">
            <div class="w-8 h-8 rounded-full bg-[#52296b] text-white flex items-center justify-center text-xs font-black shadow-lg border-2 ${isSelected ? 'border-amber-400 ring-4 ring-amber-400/40 bg-brand-800' : 'border-white'}">
              <span>${count}</span>
            </div>
            ${isSelected ? '<div class="absolute -inset-1 rounded-full bg-amber-400 animate-ping opacity-30 pointer-events-none"></div>' : ''}
          </div>
        `;
      } else {
        iconHtml = `
          <div class="relative flex items-center justify-center cursor-pointer transform transition-transform hover:scale-110 ${isSelected ? 'scale-125 z-50' : 'z-20'}">
            <div class="w-7 h-7 rounded-full bg-[#52296b] text-white flex items-center justify-center shadow-lg border-2 ${isSelected ? 'border-amber-400 ring-4 ring-amber-400/40 bg-brand-800' : 'border-white'}">
              <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </div>
            ${isSelected ? '<div class="absolute -inset-1 rounded-full bg-amber-400 animate-ping opacity-30 pointer-events-none"></div>' : ''}
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: 'custom-map-div-icon',
        html: iconHtml,
        iconSize: hasPending ? [80, 28] : [32, 32],
        iconAnchor: hasPending ? [40, 14] : [16, 16],
      });

      const marker = L.marker([avgLat, avgLng], { icon: customIcon });

      marker.on('click', () => {
        onSelectRoom(cluster[0], cluster);
        if (isCluster && currentZoom < 16) {
          const nextZoom = Math.min(17, currentZoom + 2);
          mapInstanceRef.current?.flyTo([avgLat, avgLng], nextZoom, { duration: 0.6 });
        } else {
          mapInstanceRef.current?.flyTo([avgLat, avgLng], 16, { duration: 0.6 });
        }
      });

      layer.addLayer(marker);
    });
  }, [clusteredRooms, selectedRoom, isLeafletReady, onSelectRoom, currentZoom]);

  // 5. Vẽ Marker Đánh giá cộng đồng (Lớp riêng biệt)
  useEffect(() => {
    if (!mapInstanceRef.current || !reviewMarkersLayerRef.current || !isLeafletReady) return;
    const L = (window as any).L;
    if (!L) return;

    const layer = reviewMarkersLayerRef.current;
    layer.clearLayers();

    if (!showReviewsLayer || communityReviews.length === 0) return;

    // Giới hạn hiển thị 200 đánh giá gần nhất để giữ hiệu năng mượt mà
    const visibleReviews = communityReviews.slice(0, 200);

    visibleReviews.forEach((rv) => {
      const isSelected = selectedReview?.id === rv.id;
      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transform transition-transform hover:scale-110 ${isSelected ? 'scale-125 z-50' : 'z-10'}">
          <div class="px-2 py-0.5 rounded-full bg-amber-600 text-white font-bold text-[10px] shadow-md border border-white flex items-center gap-1">
            <span class="text-amber-200">★</span>
            <span>${rv.rating.toFixed(1)}</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-review-div-icon',
        html: iconHtml,
        iconSize: [46, 22],
        iconAnchor: [23, 11],
      });

      const marker = L.marker([rv.lat, rv.lng], { icon: customIcon });
      marker.on('click', () => {
        onSelectReview?.(rv);
        mapInstanceRef.current?.flyTo([rv.lat, rv.lng], 16, { duration: 0.6 });
      });

      layer.addLayer(marker);
    });
  }, [communityReviews, selectedReview, showReviewsLayer, isLeafletReady, onSelectReview]);

  // 6. Cập nhật tâm bản đồ khi centerCoords hoặc selectedRoom thay đổi
  const prevRoomIdRef = useRef<string | null>(null);
  const prevCenterKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const currentCenterKey = centerCoords ? `${centerCoords.lat}_${centerCoords.lng}` : null;
    const currentRoomId = selectedRoom?.id ?? null;

    if (currentRoomId && currentRoomId !== prevRoomIdRef.current && selectedRoom?.lat && selectedRoom?.lng) {
      prevRoomIdRef.current = currentRoomId;
      mapInstanceRef.current.flyTo([selectedRoom.lat, selectedRoom.lng], 16, { duration: 0.8 });
      return;
    }

    if (currentCenterKey && currentCenterKey !== prevCenterKeyRef.current && centerCoords?.lat && centerCoords?.lng) {
      prevCenterKeyRef.current = currentCenterKey;
      mapInstanceRef.current.flyTo([centerCoords.lat, centerCoords.lng], 15, { duration: 0.8 });
      return;
    }

    if (selectedRoom?.lat && selectedRoom?.lng) {
      mapInstanceRef.current.flyTo([selectedRoom.lat, selectedRoom.lng], 16, { duration: 0.8 });
    }
  }, [centerCoords, selectedRoom]);

  // 7. Định vị GPS người dùng
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1 });
        }
      },
      () => {
        setIsLocatingUser(false);
        alert('Không thể xác định vị trí GPS hiện tại');
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="relative z-0 isolate w-full h-full bg-slate-100 overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 z-0 w-full h-full" />

      {/* Huy hiệu tổng số phòng */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/95 backdrop-blur-md text-white text-xs sm:text-sm font-bold shadow-lg shadow-brand/20 border border-white/30">
          <span className="flex h-2 w-2 rounded-full bg-yellow-300 animate-pulse" />
          <span>{rooms.length} phòng đang hiển thị</span>
        </div>
      </div>

      {/* Điều khiển bản đồ góc dưới bên phải */}
      <div className="absolute bottom-6 right-4 sm:right-6 z-20 flex flex-col items-end gap-2.5">
        {onToggleReviewsLayer && (
          <button
            type="button"
            onClick={onToggleReviewsLayer}
            className={`h-11 px-3.5 rounded-full flex items-center gap-1.5 shadow-xl border text-xs font-bold transition-all active:scale-95 ${
              showReviewsLayer
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/20'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Bật hoặc tắt lớp hiển thị đánh giá cộng đồng"
          >
            <span className="text-sm">★</span>
            <span className="hidden sm:inline">Lớp đánh giá ({communityReviews.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocatingUser}
          className="w-12 h-12 rounded-full bg-white text-slate-700 hover:text-brand hover:bg-slate-50 flex items-center justify-center shadow-xl border border-slate-200 transition-all active:scale-95 disabled:opacity-50"
          title="Định vị vị trí GPS hiện tại của tôi"
        >
          {isLocatingUser ? (
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-6 h-6 text-slate-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" strokeWidth={1.75} />
              <path
                d="m15.5 8.5-2.25 4.75L8.5 15.5l2.25-4.75L15.5 8.5Z"
                fill="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
              <path d="M12 2v2m0 16v2m10-10h-2M4 12H2" strokeLinecap="round" strokeWidth={1.5} />
            </svg>
          )}
        </button>
      </div>

      {!isLeafletReady && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-100/90 backdrop-blur-xs">
          <div className="w-9 h-9 border-3 border-brand border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs sm:text-sm font-bold text-slate-700">
            Đang tải bản đồ phòng trọ Google Maps...
          </p>
        </div>
      )}
    </div>
  );
}
