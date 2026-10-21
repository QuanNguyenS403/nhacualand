'use client';

import { useState, useEffect, useMemo, useTransition, useRef, useCallback } from 'react';
import {
  VIETNAM_UNIVERSITIES,
  getNearbyUniversities,
  getGoogleMapsViewUrl,
  type UniversityData,
  type NearbyUniversityResult,
} from '@/lib/vietnam-universities';
import { geocodeAddressPipeline, reverseGeocodePipeline } from '@/lib/vietnam-geocoding';

export interface SelectedUniversityDistance {
  universityId?: number;
  universitySlug: string;
  name: string;
  abbreviation: string;
  distanceKm: number;
  distanceMeters: number;
  travelTimeMinutes: number;
}

interface GoogleMapAddressPickerProps {
  initialAddress?: string;
  initialLat?: number;
  initialLng?: number;
  onAddressChange?: (address: string) => void;
  onCoordinatesChange?: (coords: { lat: number; lng: number } | null) => void;
  onUniversitiesChange?: (universities: SelectedUniversityDistance[]) => void;
}

export function GoogleMapAddressPicker({
  initialAddress = '',
  initialLat,
  initialLng,
  onAddressChange,
  onCoordinatesChange,
  onUniversitiesChange,
}: GoogleMapAddressPickerProps) {
  // Tự động nhận diện khu vực Hà Nội hay TP.HCM từ địa chỉ ban đầu để mở bản đồ chuẩn xác
  const isHcmInitial = useMemo(() => {
    const raw = (initialAddress || '').toLowerCase();
    return (
      raw.includes('hồ chí minh') ||
      raw.includes('tp.hcm') ||
      raw.includes('tphcm') ||
      raw.includes('quận 7') ||
      raw.includes('quận 1') ||
      raw.includes('bình thạnh') ||
      raw.includes('thủ đức')
    );
  }, [initialAddress]);

  const DEFAULT_LAT = isHcmInitial ? 10.7769 : 20.9982;
  const DEFAULT_LNG = isHcmInitial ? 106.7009 : 105.8778;

  const [address, setAddress] = useState(initialAddress);
  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLng ?? null);
  const [mapType, setMapType] = useState<'hybrid' | 'roadmap'>('hybrid');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [geoNotice, setGeoNotice] = useState<string | null>(null);
  const [showCoordinateInputs, setShowCoordinateInputs] = useState(false);
  const [customSearchUni, setCustomSearchUni] = useState('');
  const [selectedUnis, setSelectedUnis] = useState<Record<string, SelectedUniversityDistance>>({});
  const [, startTransition] = useTransition();

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Tọa độ hiển thị trên bản đồ (fallback về tọa độ mặc định nếu chưa có)
  const activeLat = lat ?? DEFAULT_LAT;
  const activeLng = lng ?? DEFAULT_LNG;

  // Refs lưu trữ các callback để giữ tính ổn định (không gây re-create map)
  const onAddressChangeRef = useRef(onAddressChange);
  onAddressChangeRef.current = onAddressChange;

  const onCoordinatesChangeRef = useRef(onCoordinatesChange);
  onCoordinatesChangeRef.current = onCoordinatesChange;

  const onUniversitiesChangeRef = useRef(onUniversitiesChange);
  onUniversitiesChangeRef.current = onUniversitiesChange;

  // Vá lỗi (monkey-patch) phòng ngừa Leaflet 1.9.4 đọc _leaflet_pos khi phần tử đang unmount hoặc _mapPane bị null
  const patchLeafletSafeguards = useCallback((L: any) => {
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
  }, []);

  // 1. Tải Leaflet CDN an toàn với cơ chế phát hiện tự động
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ((window as any).L) {
      patchLeafletSafeguards((window as any).L);
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
      script.onload = () => {
        patchLeafletSafeguards((window as any).L);
        setIsLeafletReady(true);
      };
      document.body.appendChild(script);
    } else {
      script.addEventListener('load', () => {
        patchLeafletSafeguards((window as any).L);
        setIsLeafletReady(true);
      });
    }

    const timer = setInterval(() => {
      if ((window as any).L) {
        patchLeafletSafeguards((window as any).L);
        setIsLeafletReady(true);
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, [patchLeafletSafeguards]);

  // 2. Tự động tính toán các trường Đại học lân cận theo tọa độ hiện tại
  const nearbyUnis = useMemo<NearbyUniversityResult[]>(() => {
    if (lat == null || lng == null) return [];
    return getNearbyUniversities(lat, lng, 12, 8);
  }, [lat, lng]);

  // Cập nhật lên parent component khi tọa độ thay đổi
  useEffect(() => {
    if (lat != null && lng != null) {
      onCoordinatesChangeRef.current?.({ lat, lng });
    } else {
      onCoordinatesChangeRef.current?.(null);
    }
  }, [lat, lng]);

  // Tự động ghim các trường ĐH gần nhất (< 3.5km) vào danh sách đề xuất
  useEffect(() => {
    if (nearbyUnis.length > 0) {
      const topClosest = nearbyUnis.filter((u) => u.distanceKm <= 3.5);
      if (topClosest.length > 0) {
        setSelectedUnis((prev) => {
          const next = { ...prev };
          topClosest.forEach((u) => {
            if (!next[u.slug]) {
              next[u.slug] = {
                universitySlug: u.slug,
                name: u.name,
                abbreviation: u.abbreviation,
                distanceKm: u.distanceKm,
                distanceMeters: u.distanceMeters,
                travelTimeMinutes: u.travelTimeMinutes,
              };
            }
          });
          return next;
        });
      }
    }
  }, [nearbyUnis]);

  // Đồng bộ danh sách trường ĐH đã chọn ra ngoài
  useEffect(() => {
    const list = Object.values(selectedUnis);
    onUniversitiesChangeRef.current?.(list);
  }, [selectedUnis]);

  // Hàm tạo Icon ghim vị trí phòng màu đỏ/cam nổi bật
  const createPinIcon = useCallback(() => {
    const L = (window as any).L;
    if (!L) return null;

    const iconHtml = `
      <div class="relative flex items-center justify-center cursor-grab active:cursor-grabbing group">
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-2.5 rounded-full bg-rose-500/30 animate-ping pointer-events-none"></div>
          <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 text-white flex items-center justify-center shadow-xl border-2 border-white ring-2 ring-rose-500/40 transform transition-transform group-hover:scale-110">
            <svg class="w-5 h-5 drop-shadow-xs" viewBox="0 0 24 24" fill="currentColor">
              <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-pin-div-icon',
      html: iconHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 38],
    });
  }, []);

  // Xử lý đồng bộ địa chỉ khi click vào bản đồ hoặc kéo ghim
  const handleMapPinUpdate = useCallback(
    async (newLat: number, newLng: number, actionName: string) => {
      setLat(newLat);
      setLng(newLng);
      setIsGeocoding(true);
      setGeoNotice(`Đang đồng bộ địa chỉ của phòng theo ${actionName}`);

      try {
        const resolvedAddress = await reverseGeocodePipeline(newLat, newLng);
        if (resolvedAddress) {
          setAddress(resolvedAddress);
          onAddressChangeRef.current?.(resolvedAddress);
          setGeoNotice(`Đã đồng bộ địa chỉ phòng: ${resolvedAddress}`);
        } else {
          setGeoNotice(`Đã ghim vị trí tại tọa độ: ${newLat}, ${newLng}`);
        }
      } catch {
        setGeoNotice(`Đã ghim vị trí tại tọa độ: ${newLat}, ${newLng}`);
      } finally {
        setIsGeocoding(false);
      }
    },
    [],
  );

  // 3. Khởi tạo Leaflet Map tương tác (Chỉ chạy 1 lần khi Leaflet sẵn sàng)
  useEffect(() => {
    if (!isLeafletReady || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    patchLeafletSafeguards(L);

    // Nếu map đã tồn tại thì không tạo lại
    if (mapInstanceRef.current) {
      return;
    }

    const startLat = lat ?? DEFAULT_LAT;
    const startLng = lng ?? DEFAULT_LNG;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 17,
      zoomControl: false,
      scrollWheelZoom: false, // Tắt cuộn chuột trên trang dài để không kẹt trang và không lỗi _performZoom
    });

    // Thêm zoom control góc trên bên phải
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Lớp Google Maps Tiles
    const tileUrl =
      mapType === 'hybrid'
        ? 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps',
    });

    // Lớp fallback CartoDB nếu Google tile bị gián đoạn mạng
    const fallbackTileLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '© CartoDB © OpenStreetMap',
      },
    );

    tileLayer.on('tileerror', () => {
      if (!map.hasLayer(fallbackTileLayer)) {
        fallbackTileLayer.addTo(map);
      }
    });

    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Tạo Marker ghim vị trí phòng có thể kéo thả
    const pinIcon = createPinIcon();
    const marker = L.marker([startLat, startLng], {
      icon: pinIcon,
      draggable: true,
      title: 'Kéo thả hoặc click bản đồ để đổi vị trí phòng',
    }).addTo(map);

    // Bắt sự kiện kéo ghim kết thúc
    marker.on('dragend', (e: any) => {
      const pos = e.target.getLatLng();
      const dragLat = Number(pos.lat.toFixed(6));
      const dragLng = Number(pos.lng.toFixed(6));
      handleMapPinUpdate(dragLat, dragLng, 'vị trí vừa kéo ghim');
    });

    // Bắt sự kiện click trực tiếp lên bản đồ để chấm vị trí phòng trọ
    map.on('click', (e: any) => {
      const clickLat = Number(e.latlng.lat.toFixed(6));
      const clickLng = Number(e.latlng.lng.toFixed(6));
      marker.setLatLng([clickLat, clickLng]);
      map.panTo([clickLat, clickLng]);
      handleMapPinUpdate(clickLat, clickLng, 'điểm vừa chấm trên bản đồ');
    });

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // Fix kích thước khung nhìn Leaflet khi render
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.stop?.();
          mapInstanceRef.current.scrollWheelZoom?.disable();
          mapInstanceRef.current.remove();
        } catch (err) {
          console.warn('Leaflet cleanup warning:', err);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletReady, createPinIcon, handleMapPinUpdate, patchLeafletSafeguards]);

  // Cập nhật lớp Tile khi mapType thay đổi (Vệ tinh vs Bản đồ số)
  useEffect(() => {
    if (!mapInstanceRef.current || !isLeafletReady) return;
    const L = (window as any).L;
    if (!L) return;

    const tileUrl =
      mapType === 'hybrid'
        ? 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
        : 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newLayer = L.tileLayer(tileUrl, {
      maxZoom: 20,
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      attribution: '© Google Maps',
    });

    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [mapType, isLeafletReady]);

  // Cập nhật vị trí Marker khi lat, lng thay đổi từ ngoài
  useEffect(() => {
    if (!markerRef.current || !mapInstanceRef.current) return;
    if (lat != null && lng != null) {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [lat, lng]);

  // Hàm xử lý định vị địa chỉ khi người dùng nhập chuỗi và bấm "Định vị Google Maps"
  async function handleGeocodeAddress(queryAddress?: string) {
    const targetQuery = (queryAddress ?? address).trim();
    if (!targetQuery) {
      setGeoNotice('Vui lòng nhập địa chỉ cụ thể để định vị trên Google Maps');
      return;
    }

    setIsGeocoding(true);
    setGeoNotice('Đang kết nối Google Maps để định vị vệ tinh');

    try {
      const geocodeResult = await geocodeAddressPipeline(targetQuery);

      if (geocodeResult) {
        const newLat = geocodeResult.lat;
        const newLng = geocodeResult.lng;
        setLat(newLat);
        setLng(newLng);

        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([newLat, newLng], 17, { duration: 0.8 });
        }

        const labelText = geocodeResult.label ? ` (${geocodeResult.label})` : '';
        setGeoNotice(`Đã xác định vị trí chính xác trên bản đồ Google Maps${labelText}`);
      } else {
        setGeoNotice('Chưa tìm thấy tọa độ cụ thể, bạn có thể click trực tiếp lên bản đồ để chấm vị trí');
      }
    } catch {
      setGeoNotice('Đã hiển thị bản đồ theo địa chỉ, bạn có thể click để điều chỉnh chấm vị trí');
    } finally {
      setIsGeocoding(false);
    }
  }

  // Tự động định vị vị trí phòng chính xác theo địa chỉ được gán khi khởi tạo (nếu chưa có tọa độ)
  useEffect(() => {
    if (initialAddress && initialAddress.trim() && initialLat == null && initialLng == null) {
      handleGeocodeAddress(initialAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddress, initialLat, initialLng]);

  // Hàm lấy vị trí GPS hiện tại của thiết bị và tự động Reverse Geocode địa chỉ
  function handleGetDeviceGps() {
    if (!navigator.geolocation) {
      setGeoNotice('Trình duyệt của bạn không hỗ trợ định vị GPS trực tiếp');
      return;
    }

    setIsLocatingGps(true);
    setGeoNotice('Đang yêu cầu tọa độ GPS vệ tinh');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(6));
        const newLng = Number(pos.coords.longitude.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        setIsLocatingGps(false);

        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        }
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([newLat, newLng], 17, { duration: 0.8 });
        }

        // Tự động dịch ngược tọa độ GPS thành địa chỉ phòng
        try {
          const resolvedAddress = await reverseGeocodePipeline(newLat, newLng);
          if (resolvedAddress) {
            setAddress(resolvedAddress);
            onAddressChange?.(resolvedAddress);
            setGeoNotice(`Đã lấy vị trí GPS và đồng bộ địa chỉ phòng: ${resolvedAddress}`);
          } else {
            setGeoNotice(`Đã lấy vị trí GPS chính xác: ${newLat}, ${newLng}`);
          }
        } catch {
          setGeoNotice(`Đã lấy vị trí GPS chính xác: ${newLat}, ${newLng}`);
        }
      },
      (err) => {
        setIsLocatingGps(false);
        if (err.code === 1) {
          setGeoNotice('Quyền truy cập vị trí bị từ chối, bạn có thể gõ địa chỉ vào ô bên trên');
        } else {
          setGeoNotice('Không thể lấy tín hiệu GPS, vui lòng nhập địa chỉ cụ thể');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  // Chuyển đổi trạng thái tích chọn trường ĐH lân cận
  function toggleUniversitySelection(uni: UniversityData, distKm?: number, distMeters?: number, timeMins?: number) {
    setSelectedUnis((prev) => {
      const next = { ...prev };
      if (next[uni.slug]) {
        delete next[uni.slug];
      } else {
        const km =
          distKm ??
          (lat && lng ? getNearbyUniversities(lat, lng, 100, 100).find((u) => u.slug === uni.slug)?.distanceKm ?? 0 : 0);
        const meters = distMeters ?? Math.round(km * 1000);
        const mins = timeMins ?? Math.max(1, Math.round((km / 22) * 60));
        next[uni.slug] = {
          universitySlug: uni.slug,
          name: uni.name,
          abbreviation: uni.abbreviation,
          distanceKm: km,
          distanceMeters: meters,
          travelTimeMinutes: mins,
        };
      }
      return next;
    });
  }

  // Lọc tìm kiếm trường ĐH thủ công
  const filteredSearchUnis = useMemo(() => {
    if (!customSearchUni.trim()) return [];
    const q = customSearchUni.toLowerCase().trim();
    return VIETNAM_UNIVERSITIES.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.abbreviation.toLowerCase().includes(q) ||
        u.address.toLowerCase().includes(q),
    ).slice(0, 5);
  }, [customSearchUni]);

  // Link mở Google Maps trong tab mới
  const mapLargeViewUrl = useMemo(() => {
    if (lat != null && lng != null) {
      return getGoogleMapsViewUrl({ lat, lng }, { satellite: mapType === 'hybrid' });
    }
    const targetQuery = address.trim();
    if (targetQuery) {
      return getGoogleMapsViewUrl(
        { address: targetQuery },
        { satellite: mapType === 'hybrid', preferAddress: true },
      );
    }
    return getGoogleMapsViewUrl(
      { lat: activeLat, lng: activeLng },
      { satellite: mapType === 'hybrid' },
    );
  }, [lat, lng, address, activeLat, activeLng, mapType]);

  return (
    <div className="relative z-0 isolate space-y-4 rounded-2xl border border-surface-border bg-slate-50/70 p-4 sm:p-5 shadow-sm">
      {/* Header khu vực nhập địa chỉ & Google Maps */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/70 pb-3">
        <div>
          <h3 className="text-sm font-bold text-text-primary">
            <span>Định vị Google Maps & Trường Đại học lân cận</span>
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Liên kết Google Maps để khách thuê dễ dàng tìm đường và xem khoảng cách tới trường học
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGetDeviceGps}
            disabled={isLocatingGps}
            className="inline-flex items-center rounded-lg border border-brand/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-brand/5 shadow-xs transition-colors disabled:opacity-50"
            title="Định vị ngay tại vị trí căn phòng hiện tại"
          >
            <span>{isLocatingGps ? 'Đang lấy GPS...' : 'Lấy vị trí GPS hiện tại'}</span>
          </button>
        </div>
      </div>

      {/* Ô nhập địa chỉ bất kỳ */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
          Địa chỉ chi tiết bất kỳ (Số nhà, tên ngõ, đường, phường/xã) *
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              name="addressDetail"
              value={address}
              onChange={(e) => {
                const val = e.target.value;
                setAddress(val);
                onAddressChangeRef.current?.(val);
              }}
              onBlur={() => {
                if (address.trim() && (lat == null || lng == null)) {
                  handleGeocodeAddress(address);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGeocodeAddress();
                }
              }}
              placeholder="VD: Số 25 Phố Huế, Phường Hàng Bài, Quận Hoàn Kiếm, Hà Nội"
              className="input-field pr-8 text-sm"
              required
            />
            {address && (
              <button
                type="button"
                onClick={() => {
                  setAddress('');
                  onAddressChangeRef.current?.('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleGeocodeAddress()}
            disabled={isGeocoding || !address.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-hover transition-all disabled:opacity-50 whitespace-nowrap"
          >
            <span>{isGeocoding ? 'Đang định vị...' : 'Định vị Google Maps'}</span>
          </button>
        </div>
        {geoNotice && (
          <p className="mt-1.5 text-[11px] font-medium text-brand-800">
            <span>{geoNotice}</span>
          </p>
        )}
      </div>

      {/* Bản đồ Google Maps tương tác trực tiếp */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-text-primary">Bản đồ định vị</span>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => setMapType('hybrid')}
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                  mapType === 'hybrid' ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:text-brand'
                }`}
              >
                Vệ tinh
              </button>
              <button
                type="button"
                onClick={() => setMapType('roadmap')}
                className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md transition-all ${
                  mapType === 'roadmap' ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:text-brand'
                }`}
              >
                Bản đồ số
              </button>
            </div>
            {lat != null && lng != null && (
              <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-900">
                Tọa độ: {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCoordinateInputs(!showCoordinateInputs)}
              className="text-[11px] text-text-muted hover:text-brand underline"
            >
              {showCoordinateInputs ? 'Ẩn tọa độ số' : 'Nhập tọa độ thủ công'}
            </button>
            <a
              href={mapLargeViewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
            >
              <span>Mở Google Maps lớn</span>
            </a>
          </div>
        </div>

        {/* Khung bản đồ Leaflet Google Maps tương tác to rõ ràng */}
        <div className="relative z-0 isolate h-[440px] sm:h-[520px] md:h-[580px] w-full overflow-hidden rounded-2xl border border-surface-border bg-slate-200 shadow-md">
          {/* Huy hiệu hướng dẫn chấm vị trí nổi trên đầu bản đồ */}
          <div className="absolute top-2.5 left-2.5 right-2.5 sm:right-auto z-20 pointer-events-none">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-medium shadow-lg border border-white/20">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              <span>Chạm hoặc click lên bản đồ để chấm vị trí phòng — Địa chỉ sẽ tự động đồng bộ ngay lập tức</span>
            </div>
          </div>

          {/* Container Leaflet Map */}
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Màn hình chờ khi Leaflet đang khởi tạo */}
          {!isLeafletReady && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-100/90 gap-2">
              <div className="w-8 h-8 rounded-full border-3 border-brand border-t-transparent animate-spin" />
              <span className="text-xs font-semibold text-slate-600">Đang khởi tạo bản đồ định vị Google Maps</span>
            </div>
          )}
        </div>

        {/* Input tọa độ thủ công nếu người dùng muốn tinh chỉnh */}
        {showCoordinateInputs && (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1">Vĩ độ (Latitude)</label>
              <input
                type="number"
                step="0.000001"
                value={lat ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null;
                  setLat(val);
                  if (val != null && lng != null) {
                    markerRef.current?.setLatLng([val, lng]);
                    mapInstanceRef.current?.panTo([val, lng]);
                    handleMapPinUpdate(val, lng, 'tọa độ thủ công');
                  }
                }}
                placeholder="VD: 20.9982"
                className="input-field text-xs py-1.5"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-muted mb-1">Kinh độ (Longitude)</label>
              <input
                type="number"
                step="0.000001"
                value={lng ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? parseFloat(e.target.value) : null;
                  setLng(val);
                  if (lat != null && val != null) {
                    markerRef.current?.setLatLng([lat, val]);
                    mapInstanceRef.current?.panTo([lat, val]);
                    handleMapPinUpdate(lat, val, 'tọa độ thủ công');
                  }
                }}
                placeholder="VD: 105.8778"
                className="input-field text-xs py-1.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* Mục Trường Đại học lân cận (Định vị tự động theo Google Maps) */}
      <div className="space-y-3 pt-2 border-t border-surface-border/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h4 className="text-xs font-bold text-text-primary">
              <span>Trường Đại học lân cận (Tự động đo theo Google Maps)</span>
            </h4>
            <p className="text-[11px] text-text-muted">
              Chọn các trường lân cận để sinh viên tìm trọ thấy ngay cự ly và thời gian di chuyển
            </p>
          </div>
          {Object.keys(selectedUnis).length > 0 && (
            <span className="text-[11px] font-bold text-brand">
              Đã ghim {Object.keys(selectedUnis).length} trường
            </span>
          )}
        </div>

        {/* Danh sách trường gần nhất được gợi ý theo tọa độ */}
        {nearbyUnis.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {nearbyUnis.map((uni) => {
              const isSelected = !!selectedUnis[uni.slug];
              return (
                <div
                  key={uni.slug}
                  onClick={() =>
                    toggleUniversitySelection(uni, uni.distanceKm, uni.distanceMeters, uni.travelTimeMinutes)
                  }
                  className={`flex cursor-pointer items-start justify-between gap-2 rounded-xl border p-2.5 transition-all select-none ${
                    isSelected
                      ? 'border-brand bg-brand/5 shadow-xs'
                      : 'border-surface-border bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-brand focus:ring-brand"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {uni.abbreviation ? `[${uni.abbreviation}] ` : ''}
                        {uni.name}
                      </p>
                      <p className="text-[11px] text-text-muted truncate mt-0.5">{uni.address}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-800 border border-brand-200">
                      {uni.distanceKm < 1 ? `~${uni.distanceMeters}m` : `~${uni.distanceKm} km`}
                    </span>
                    <p className="text-[10px] text-text-muted mt-0.5">~{uni.travelTimeMinutes} phút xe máy</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-3 text-center text-xs text-text-muted">
            Nhập địa chỉ ở trên và bấm "Định vị Google Maps" để hệ thống tự động đo khoảng cách tới các trường Đại học lân cận
          </div>
        )}

        {/* Tìm kiếm và thêm trường ĐH thủ công */}
        <div className="pt-2">
          <label className="block text-[11px] font-medium text-text-muted mb-1">
            Gắn thêm trường Đại học khác (Tìm kiếm theo tên trường hoặc mã viết tắt)
          </label>
          <div className="relative">
            <input
              type="text"
              value={customSearchUni}
              onChange={(e) => {
                const val = e.target.value;
                startTransition(() => {
                  setCustomSearchUni(val);
                });
              }}
              placeholder="VD: Kinh tế Quốc Dân, Bách Khoa, HUBT, UNETI, USSH, HOU..."
              className="input-field text-xs py-2"
            />
            {filteredSearchUnis.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-surface-border bg-white p-1.5 shadow-lg space-y-1">
                {filteredSearchUnis.map((uni) => {
                  const isSelected = !!selectedUnis[uni.slug];
                  return (
                    <div
                      key={uni.slug}
                      onClick={() => {
                        toggleUniversitySelection(uni);
                        setCustomSearchUni('');
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg p-2 text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="truncate">
                        <span className="font-bold text-text-primary">
                          {uni.abbreviation ? `[${uni.abbreviation}] ` : ''}
                          {uni.name}
                        </span>
                        <p className="text-[10px] text-text-muted truncate">{uni.address}</p>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-brand">
                        {isSelected ? 'Đã chọn' : '+ Chọn'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
