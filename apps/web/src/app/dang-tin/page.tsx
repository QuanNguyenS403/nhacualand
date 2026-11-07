'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, getAccessToken, setTokens, sendAuthRequest, getApiBaseUrl } from '@/lib/auth-client';
import { GoogleMapAddressPicker, type SelectedUniversityDistance } from '@/components/GoogleMapAddressPicker';
import { compressImage } from '@/lib/image-compressor';
import { AuthModal } from '@/components/AuthModal';
import { PROPERTY_TYPES, isValidVietnamCoordinate } from '@qns/shared';

interface LocationItem {
  id: number;
  name: string;
  level: string;
  slug: string;
  parentId: number | null;
}

const API_URL = getApiBaseUrl();

export default function DangTinPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [propertyType, setPropertyType] = useState('phong_tro');

  // Quản lý hình ảnh và xem trước
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Video & Floorplan
  const [videoUrl, setVideoUrl] = useState('');
  const [floorplanImageUrl, setFloorplanImageUrl] = useState('');

  // Tư cách người đăng
  const [posterRole, setPosterRole] = useState('chinh_chu');

  const [message, setMessage] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Quản lý định vị Google Maps & trường Đại học lân cận
  const [addressDetail, setAddressDetail] = useState('');
  const [mapCoords, setMapCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedUnis, setSelectedUnis] = useState<SelectedUniversityDistance[]>([]);

  const isApartment = propertyType === 'can_ho';
  const isCommercialSpace = propertyType === 'mat_bang';
  const isStudentRoomOrMini = propertyType === 'phong_tro' || propertyType === 'chung_cu_mini' || (!isApartment && !isCommercialSpace);

  const handleAddressChange = useCallback((val: string) => {
    setAddressDetail(val);
  }, []);

  const handleCoordinatesChange = useCallback((coords: { lat: number; lng: number } | null) => {
    setMapCoords(coords);
  }, []);

  const handleUniversitiesChange = useCallback((unis: SelectedUniversityDistance[]) => {
    setSelectedUnis(unis);
  }, []);

  useEffect(() => {
    function verifyAuth() {
      try {
        const token = getAccessToken();
        const userRaw = localStorage.getItem('user');
        if (token && userRaw) {
          setCurrentUser(JSON.parse(userRaw));
          setAuthModalOpen(false);
        } else {
          setCurrentUser(null);
          setAuthModalOpen(false);
        }
      } catch {
        setCurrentUser(null);
        setAuthModalOpen(false);
      } finally {
        setAuthChecked(true);
      }
    }

    verifyAuth();
    window.addEventListener('storage', verifyAuth);
    return () => window.removeEventListener('storage', verifyAuth);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/locations`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLocations(data))
      .catch(() => setLocations([]));
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setError(null);
    const files = Array.from(e.target.files);

    if (selectedFiles.length + files.length > 20) {
      setError(`Bạn chỉ được tải lên tối đa 20 ảnh (hiện đã chọn ${selectedFiles.length} ảnh)`);
      return;
    }

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`Ảnh "${file.name}" vượt quá dung lượng 10MB cho phép`);
        return;
      }
    }

    setSelectedFiles((prev) => [...prev, ...files]);
    try {
      const compressedUrls = await Promise.all(files.map((f) => compressImage(f)));
      setPreviewUrls((prev) => [...prev, ...compressedUrls]);
    } catch {
      const fallbackUrls = await Promise.all(
        files.map(
          (f) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = () => resolve('');
              reader.readAsDataURL(f);
            })
        )
      );
      setPreviewUrls((prev) => [...prev, ...fallbackUrls.filter(Boolean)]);
    }
  }

  function handleRemoveFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setUploadStatus(null);

    if (!currentUser || !getAccessToken()) {
      setError('Vui lòng đăng nhập tài khoản trước khi đăng tin');
      setAuthModalOpen(true);
      return;
    }

    const form = new FormData(e.currentTarget);
    const rawAddress = addressDetail.trim() || ((form.get('addressDetail') as string) || '').trim();

    let locationIdValue = 1;
    if (locations.length > 0) {
      const lowerAddr = rawAddress.toLowerCase();
      const matched = locations.find((l) => lowerAddr.includes(l.name.toLowerCase()));
      locationIdValue = matched ? matched.id : locations[0].id;
    }

    const depositRaw = ((form.get('depositInput') as string) || (form.get('depositAmount') as string) || '').trim();
    let parsedDepositAmount: number | undefined = undefined;
    let parsedDepositMethod: string | undefined = undefined;

    if (depositRaw) {
      const sanitized = depositRaw.replace(/[.,\s]/g, '');
      if (/^\d+$/.test(sanitized)) {
        parsedDepositAmount = Number(sanitized);
      } else {
        parsedDepositMethod = depositRaw;
      }
    }

    const amenities = {
      dieuHoa: form.get('amenity_dieuHoa') === 'on',
      nongLanh: form.get('amenity_nongLanh') === 'on',
      tuLanh: form.get('amenity_tuLanh') === 'on',
      mayGiat: form.get('amenity_mayGiat') === 'on',
      banCong: form.get('amenity_banCong') === 'on',
      thangMay: form.get('amenity_thangMay') === 'on',
      khoaVanTay: form.get('amenity_khoaVanTay') === 'on',
      gioTuDo: form.get('amenity_gioTuDo') === 'on',
      choDeXe: form.get('amenity_choDeXe') === 'on',
      bepRieng: form.get('amenity_bepRieng') === 'on',
      thuCung: form.get('amenity_thuCung') === 'on',
      xeDien: form.get('amenity_xeDien') === 'on',
      depositMethod: parsedDepositMethod,
    };

    const titleValue = form.get('title') as string;
    const priceValue = Number(form.get('price'));
    const areaM2Raw = form.get('areaM2');
    const areaM2Value = areaM2Raw ? Number(areaM2Raw) : 30;

    // Segment Attributes builder
    const segmentAttributes: Record<string, any> = {};

    if (isApartment) {
      const projName = (form.get('project_name') as string) || undefined;
      const bBlock = (form.get('building_block') as string) || undefined;
      const fNum = (form.get('floor_number') as string) || undefined;
      const nArea = form.get('net_area_m2') ? Number(form.get('net_area_m2')) : undefined;
      const gArea = form.get('gross_area_m2') ? Number(form.get('gross_area_m2')) : undefined;
      const bRooms = (form.get('bedrooms_choice') as string) || '2PN';
      const bWcs = (form.get('bathrooms_choice') as string) || '2WC';
      const furn = (form.get('furnishing_status') as string) || 'Full nội thất';
      const bDir = (form.get('balcony_direction') as string) || undefined;
      const dDir = (form.get('door_direction') as string) || undefined;
      const mgmt = form.get('management_fee') as string;
      const carPark = form.get('car_parking_available') === 'on';
      const carFee = form.get('car_parking_fee') ? Number(form.get('car_parking_fee')) : undefined;
      const forElig = form.get('foreigner_eligible') === 'on';

      segmentAttributes.projectName = projName;
      segmentAttributes.project_name = projName;
      segmentAttributes.buildingBlock = bBlock;
      segmentAttributes.building_block = bBlock;
      segmentAttributes.floorNumber = fNum;
      segmentAttributes.floor_number = fNum;
      segmentAttributes.netAreaM2 = nArea;
      segmentAttributes.net_area_m2 = nArea;
      segmentAttributes.grossAreaM2 = gArea;
      segmentAttributes.gross_area_m2 = gArea;
      segmentAttributes.bedrooms = bRooms;
      segmentAttributes.bathrooms = bWcs;
      segmentAttributes.furnishing = furn;
      segmentAttributes.furnishing_status = furn;
      segmentAttributes.balconyDirection = bDir;
      segmentAttributes.balcony_direction = bDir;
      segmentAttributes.doorDirection = dDir;
      segmentAttributes.door_direction = dDir;
      segmentAttributes.managementFeeIncluded = mgmt?.toLowerCase().includes('bao gồm') || false;
      segmentAttributes.managementFeePerMonth = Number(mgmt) || undefined;
      segmentAttributes.management_fee = mgmt;
      segmentAttributes.hasCarParking = carPark;
      segmentAttributes.car_parking_available = carPark;
      segmentAttributes.carParkingFee = carFee;
      segmentAttributes.car_parking_fee = carFee;
      segmentAttributes.foreignerEligible = forElig;
      segmentAttributes.foreigner_eligible = forElig;
    } else if (isCommercialSpace) {
      const frontW = form.get('frontage_width_m') ? Number(form.get('frontage_width_m')) : undefined;
      const depthM = form.get('depth_m') ? Number(form.get('depth_m')) : undefined;
      const totArea = form.get('total_usable_area_m2') ? Number(form.get('total_usable_area_m2')) : undefined;
      const fCount = form.get('floors_count') as string;
      const rWidth = form.get('road_width_m') ? Number(form.get('road_width_m')) : undefined;
      const sWidth = form.get('sidewalk_width_m') ? Number(form.get('sidewalk_width_m')) : undefined;
      const indEnt = form.get('independent_entrance') === 'on';
      const busTypes = form.getAll('allowed_business_types') as string[];
      const pccc = form.get('fire_safety_certificate') === 'on';
      const vat = form.get('vat_invoice_supported') === 'on';
      const rFree = form.get('rent_free_fitout_days') ? Number(form.get('rent_free_fitout_days')) : 0;
      const pCycle = form.get('payment_cycle') as string;
      const tPhase = form.get('three_phase_power') === 'on';

      segmentAttributes.frontageM = frontW;
      segmentAttributes.frontage_width_m = frontW;
      segmentAttributes.depthM = depthM;
      segmentAttributes.depth_m = depthM;
      segmentAttributes.totalUsableAreaM2 = totArea;
      segmentAttributes.floorsCount = fCount;
      segmentAttributes.floors_count = fCount;
      segmentAttributes.roadWidthM = rWidth;
      segmentAttributes.road_width_m = rWidth;
      segmentAttributes.sidewalkWidthM = sWidth;
      segmentAttributes.sidewalk_width_m = sWidth;
      segmentAttributes.wideSidewalk = (sWidth || 0) >= 3;
      segmentAttributes.independentEntrance = indEnt;
      segmentAttributes.independent_entrance = indEnt;
      segmentAttributes.allowedBusinessTypes = busTypes;
      segmentAttributes.allowed_business_types = busTypes;
      segmentAttributes.suitableBusinessTypes = busTypes.join(', ') || undefined;
      segmentAttributes.pcccCertified = pccc;
      segmentAttributes.fire_safety_certificate = pccc;
      segmentAttributes.vatInvoiceAvailable = vat;
      segmentAttributes.vat_invoice_supported = vat;
      segmentAttributes.rentFreeDays = rFree;
      segmentAttributes.rent_free_fitout_days = rFree;
      segmentAttributes.paymentCycle = pCycle;
      segmentAttributes.hasThreePhasePower = tPhase;
      segmentAttributes.three_phase_power = tPhase;
    } else {
      const hasMezz = form.get('has_mezzanine') === 'on';
      const isEv = form.get('amenity_xeDien') === 'on' || form.get('ev_charging') === 'on';
      const isPet = form.get('amenity_thuCung') === 'on' || form.get('pet_friendly') === 'on';
      const isElevator = form.get('amenity_thangMay') === 'on' || form.get('has_elevator') === 'on';
      const isBalcony = form.get('amenity_banCong') === 'on' || form.get('has_balcony_window') === 'on';
      const isSmartLock = form.get('amenity_khoaVanTay') === 'on' || form.get('fingerprint_lock') === 'on';
      const isFreeTime = form.get('amenity_gioTuDo') === 'on';

      segmentAttributes.hasMezzanine = hasMezz;
      segmentAttributes.has_mezzanine = hasMezz;
      segmentAttributes.hasElevator = isElevator;
      segmentAttributes.has_elevator = isElevator;
      segmentAttributes.hasBalconyWindow = isBalcony;
      segmentAttributes.has_balcony_window = isBalcony;
      segmentAttributes.freeTime = isFreeTime;
      segmentAttributes.smartLock = isSmartLock;
      segmentAttributes.fingerprint_lock = isSmartLock;
      segmentAttributes.hasEvCharging = isEv;
      segmentAttributes.ev_charging = isEv;
      segmentAttributes.petsAllowed = isPet;
      segmentAttributes.pet_friendly = isPet;
      segmentAttributes.maxOccupants = form.get('max_occupants') ? Number(form.get('max_occupants')) : undefined;
      segmentAttributes.curfewPolicy = form.get('curfew_policy') as string;
      segmentAttributes.serviceFeeMonthly = form.get('service_fee_monthly') ? Number(form.get('service_fee_monthly')) : undefined;
    }

    const payload = {
      transactionType: 'rent',
      propertyType,
      locationId: Number(locationIdValue),
      addressDetail: addressDetail.trim() || (form.get('addressDetail') as string) || undefined,
      lat: mapCoords?.lat ?? undefined,
      lng: mapCoords?.lng ?? undefined,
      ...(selectedUnis.length > 0 && isStudentRoomOrMini
        ? {
            universityDistances: selectedUnis.map((u) => ({
              universityId: u.universityId,
              distanceMeters: u.distanceMeters,
              travelTimeMinutes: u.travelTimeMinutes,
            })),
          }
        : {}),
      title: titleValue,
      description: (form.get('description') as string) || undefined,
      price: priceValue,
      depositAmount: parsedDepositAmount,
      minLeaseMonths: form.get('minLeaseMonths') ? Number(form.get('minLeaseMonths')) : undefined,
      electricityPricePerKwh: form.get('electricityPricePerKwh') ? Number(form.get('electricityPricePerKwh')) : undefined,
      waterPricePerM3: form.get('waterPricePerM3') ? Number(form.get('waterPricePerM3')) : undefined,
      waterPriceFlat: form.get('waterPriceFlat') ? Number(form.get('waterPriceFlat')) : undefined,
      utilitiesIncluded: form.get('utilitiesIncluded') === 'on',
      amenities,
      areaM2: areaM2Value,
      bedrooms: form.get('bedrooms') ? Number(form.get('bedrooms')) : (isApartment ? 2 : 1),
      bathrooms: form.get('bathrooms') ? Number(form.get('bathrooms')) : 1,
      videoUrl: videoUrl.trim() || undefined,
      floorplanImageUrl: floorplanImageUrl.trim() || undefined,
      segmentAttributes,
      posterRole,
    };

    if (!mapCoords?.lat || !mapCoords?.lng || !isValidVietnamCoordinate(mapCoords.lat, mapCoords.lng)) {
      setError('Vui lòng chọn vị trí toạ độ chính xác trên bản đồ trước khi gửi tin đăng');
      return;
    }

    // Kiểm tra quy tắc ảnh đối với Chung cư và Mặt bằng
    if ((isApartment || isCommercialSpace) && selectedFiles.length < 5) {
      setError(`Tin ${isApartment ? 'Chung cư' : 'Mặt bằng kinh doanh'} cần tối thiểu 5 ảnh thực tế để đảm bảo tính minh bạch và được cấp huy hiệu xác thực`);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await authFetch('/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Không thể gửi tin đăng lên hệ thống, vui lòng kiểm tra lại';
        throw new Error(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
      }

      const newListing = await res.json();
      const listingId = String(newListing?.id);

      if (selectedFiles.length > 0 && listingId) {
        setUploadStatus(`Đang tải lên ${selectedFiles.length} hình ảnh thực tế`);
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append('files', file));
        await authFetch(`/listings/${listingId}/images`, {
          method: 'POST',
          body: formData,
        }).catch((uploadErr) => {
          console.warn('Lỗi tải ảnh qua API:', uploadErr);
        });
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('qns_last_posted_id', listingId);
        window.dispatchEvent(new CustomEvent('qns_listing_posted', { detail: newListing }));
        window.dispatchEvent(new CustomEvent('qns_listings_updated', { detail: newListing }));
      }

      setCreatedSlug(newListing.slug);
      setMessage('success');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setVideoUrl('');
      setFloorplanImageUrl('');
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err?.message || 'Đăng tin gặp sự cố, vui lòng thử lại sau');
    } finally {
      setLoading(false);
      setUploadStatus(null);
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand border-t-transparent" />
          <p className="text-xs text-text-muted">Đang kiểm tra thông tin tài khoản</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="container-max flex min-h-[calc(100vh-140px)] items-center justify-center px-4 py-8 sm:py-14">
        <AuthModal
          isOpen={true}
          inline={true}
          onClose={() => router.push('/')}
          onSuccess={() => {
            try {
              const userRaw = localStorage.getItem('user');
              if (userRaw) setCurrentUser(JSON.parse(userRaw));
            } catch {}
          }}
          title="Đăng nhập để đăng tin"
          subtitle="Vui lòng đăng nhập hoặc đăng ký tài khoản bằng Google để tiếp tục đến mục đăng tin"
        />
      </div>
    );
  }

  return (
    <div className="container-max max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-7 rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-50/70 via-white to-brand-50/40 p-5 sm:p-6 shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Đăng tin cho thuê bất động sản
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 rounded-2xl border border-surface-border bg-white p-6 sm:p-8 md:p-9 shadow-elevated">
        {/* ── BƯỚC 1: CHỌN LOẠI HÌNH & VỊ TRÍ ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white font-bold text-xs">
              1
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Chọn Loại hình & Vị trí
            </h2>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-text-secondary">
              Phân khúc cho thuê * (Biểu mẫu sẽ tự động cấu hình theo lựa chọn của bạn)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { value: 'phong_tro', label: 'Phòng trọ SV', sub: 'Gần trường, gác lửng' },
                { value: 'chung_cu_mini', label: 'Chung cư mini', sub: 'Thang máy, khóa từ' },
                { value: 'can_ho', label: 'Chung cư', sub: 'Căn hộ thương mại' },
                { value: 'mat_bang', label: 'Mặt bằng KD', sub: 'Cửa hàng, thông sàn' },
              ].map((pt) => {
                const isSelected = propertyType === pt.value;
                return (
                  <button
                    key={pt.value}
                    type="button"
                    onClick={() => setPropertyType(pt.value)}
                    className={`flex flex-col items-center justify-center py-3 px-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand bg-brand text-white font-bold shadow-sm ring-2 ring-brand/20'
                        : 'border-surface-border bg-white text-text-secondary hover:border-brand/40 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold">{pt.label}</span>
                    <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {pt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trường đặc thù cho Chung cư: Tên Dự án & Tòa / Tầng */}
          {isApartment && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 animate-fade-in">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-indigo-950">
                  Tên Dự án / Khu căn hộ *
                </label>
                <input
                  name="project_name"
                  required
                  placeholder="VD: Masteri Thảo Điền, Vinhomes Central Park, The Matrix One..."
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-indigo-950">
                  Tòa / Tháp & Số tầng *
                </label>
                <input
                  name="building_block"
                  required
                  placeholder="VD: Tòa T5 - Tầng 18 (hoặc Park 6 - Tầng 26)"
                  className="input-field bg-white"
                />
              </div>
            </div>
          )}

          {/* Trường đặc thù cho Mặt bằng kinh doanh */}
          {isCommercialSpace && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-amber-50/50 border border-amber-100 animate-fade-in">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-amber-950">
                  Bề ngang mặt tiền (m) *
                </label>
                <input
                  name="frontage_width_m"
                  type="number"
                  step="0.1"
                  required
                  placeholder="VD: 6.5"
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-amber-950">
                  Chiều sâu mặt bằng (m)
                </label>
                <input
                  name="depth_m"
                  type="number"
                  step="0.1"
                  placeholder="VD: 15.0"
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-amber-950">
                  Lộ giới đường (m)
                </label>
                <input
                  name="road_width_m"
                  type="number"
                  placeholder="VD: 20"
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-amber-950">
                  Độ rộng vỉa hè (m)
                </label>
                <input
                  name="sidewalk_width_m"
                  type="number"
                  step="0.5"
                  placeholder="VD: 4.5"
                  className="input-field bg-white"
                />
              </div>
            </div>
          )}

          {/* Bản đồ GPS */}
          <GoogleMapAddressPicker
            initialAddress={addressDetail}
            initialLat={mapCoords?.lat}
            initialLng={mapCoords?.lng}
            onAddressChange={handleAddressChange}
            onCoordinatesChange={handleCoordinatesChange}
            onUniversitiesChange={handleUniversitiesChange}
          />
        </div>

        {/* ── BƯỚC 2: THÔNG SỐ KỸ THUẬT, CHI PHÍ & PHÁP LÝ ── */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white font-bold text-xs">
              2
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Thông số Kỹ thuật, Chi phí & Pháp lý
            </h2>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Tiêu đề tin đăng *</label>
            <input
              name="title"
              required
              minLength={10}
              placeholder={
                isCommercialSpace
                  ? 'VD: Cho thuê mặt bằng kinh doanh phố lớn Nguyễn Trãi, mặt tiền 6m có PCCC và VAT'
                  : isApartment
                    ? 'VD: Cho thuê căn hộ chung cư 2PN Masteri Thảo Điền, view Landmark 81 full nội thất'
                    : 'VD: Phòng trọ khép kín có gác lửng, máy lạnh gần ĐH Tôn Đức Thắng & RMIT'
              }
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-text-secondary">Mô tả chi tiết</label>
            <textarea
              name="description"
              placeholder="Mô tả kỹ về không gian, trang thiết bị, giấy tờ pháp lý, điều kiện thanh toán, tiện ích xung quanh"
              rows={4}
              className="input-field resize-y"
            />
          </div>

          {/* Diện tích & Giá thuê */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Diện tích sàn (m²) *
              </label>
              <input
                name="areaM2"
                required
                type="number"
                placeholder="VD: 35"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Giá thuê / tháng (VNĐ) *
              </label>
              <input
                name="price"
                required
                type="number"
                placeholder="VD: 3500000"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Tiền cọc yêu cầu
              </label>
              <input
                name="depositInput"
                type="text"
                placeholder="VD: 1 tháng hoặc 10.000.000"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Thời hạn thuê tối thiểu
              </label>
              <input
                name="minLeaseMonths"
                type="number"
                placeholder="VD: 6 hoặc 12 tháng"
                className="input-field"
              />
            </div>
          </div>

          {/* Phân khúc Chung cư: Bổ sung thông số chuyên sâu */}
          {isApartment && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">
                Thông số chuyên biệt Căn hộ / Chung cư
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Số phòng ngủ</label>
                  <select name="bedrooms_choice" className="input-field bg-white">
                    <option value="Studio">Studio</option>
                    <option value="1PN">1 PN</option>
                    <option value="1PN+">1 PN+</option>
                    <option value="2PN" selected>2 PN</option>
                    <option value="3PN">3 PN</option>
                    <option value="4PN+">4 PN+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Số phòng vệ sinh</label>
                  <select name="bathrooms_choice" className="input-field bg-white">
                    <option value="1WC">1 WC</option>
                    <option value="2WC" selected>2 WC</option>
                    <option value="3WC+">3 WC+</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tình trạng nội thất</label>
                  <select name="furnishing_status" className="input-field bg-white">
                    <option value="Full nội thất cao cấp">Full nội thất cao cấp</option>
                    <option value="Full nội thất">Full nội thất</option>
                    <option value="Nội thất cơ bản">Nội thất cơ bản</option>
                    <option value="Nhà trống">Nhà trống</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hướng ban công</label>
                  <select name="balcony_direction" className="input-field bg-white">
                    <option value="Đông Nam">Đông Nam</option>
                    <option value="Nam">Nam</option>
                    <option value="Đông">Đông</option>
                    <option value="Bắc">Bắc</option>
                    <option value="Tây">Tây</option>
                    <option value="Tây Bắc">Tây Bắc</option>
                    <option value="Tây Nam">Tây Nam</option>
                    <option value="Đông Bắc">Đông Bắc</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phí quản lý tòa nhà</label>
                  <input
                    name="management_fee"
                    placeholder="VD: 18.000 đ/m² hoặc Đã bao gồm"
                    className="input-field bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phí gửi ô tô (nếu có)</label>
                  <input
                    name="car_parking_fee"
                    type="number"
                    placeholder="VD: 1200000"
                    className="input-field bg-white"
                  />
                </div>
                <div className="flex flex-col justify-center space-y-1 pt-2 sm:pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input type="checkbox" name="car_parking_available" defaultChecked className="rounded text-brand" />
                    <span>Có suất đỗ ô tô hầm/nội khu</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input type="checkbox" name="foreigner_eligible" defaultChecked className="rounded text-brand" />
                    <span>Cho người nước ngoài thuê</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Phân khúc Mặt bằng KD: Bổ sung thông số chuyên sâu */}
          {isCommercialSpace && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-950 block">
                Thông số chuyên biệt Mặt bằng kinh doanh (B2B)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tổng diện tích sàn sử dụng (m²)</label>
                  <input
                    name="total_usable_area_m2"
                    type="number"
                    placeholder="VD: 140"
                    className="input-field bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Số tầng cho thuê</label>
                  <select name="floors_count" className="input-field bg-white">
                    <option value="Chỉ tầng trệt (Tầng 1)">Chỉ tầng trệt (Tầng 1)</option>
                    <option value="Thông sàn 1–2 tầng">Thông sàn 1–2 tầng</option>
                    <option value="Thông sàn 2 tầng">Thông sàn 2 tầng</option>
                    <option value="Nguyên căn 3–4 tầng">Nguyên căn 3–4 tầng</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Miễn phí ngày thi công setup (Rent-free)</label>
                  <select name="rent_free_fitout_days" className="input-field bg-white">
                    <option value="0">0 ngày</option>
                    <option value="15">15 ngày</option>
                    <option value="30" selected>30 ngày</option>
                    <option value="45">45 ngày</option>
                    <option value="60">60 ngày</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Ngành nghề phù hợp</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {['F&B / Nhà hàng có bếp nấu', 'Cafe / Trà sữa', 'Thời trang / Showroom', 'Văn phòng công ty', 'Spa / Thẩm mỹ', 'Siêu thị / Cửa hàng tiện lợi', 'Kho / Studio'].map((bt) => (
                    <label key={bt} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" name="allowed_business_types" value={bt} defaultChecked className="rounded text-brand" />
                      <span>{bt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs font-medium text-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="fire_safety_certificate" defaultChecked className="rounded text-brand" />
                  <span>Có nghiệm thu PCCC</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="vat_invoice_supported" defaultChecked className="rounded text-brand" />
                  <span>Xuất hóa đơn VAT & GPKD</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="three_phase_power" defaultChecked className="rounded text-brand" />
                  <span>Điện 3 pha kinh doanh</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name="independent_entrance" defaultChecked className="rounded text-brand" />
                  <span>Lối đi riêng biệt</span>
                </label>
              </div>
            </div>
          )}

          {/* Khối Nội Thất */}
          <div className="rounded-xl border border-surface-border bg-slate-50/60 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                NỘI THẤT
              </span>
              <span className="text-[11px] text-text-muted">
                Tích chọn các trang thiết bị và tiện nghi có sẵn
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_dieuHoa" defaultChecked className="rounded text-brand" />
                <span>Điều hòa</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_nongLanh" defaultChecked className="rounded text-brand" />
                <span>Bình nóng lạnh</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_tuLanh" className="rounded text-brand" />
                <span>Tủ lạnh</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_mayGiat" className="rounded text-brand" />
                <span>Máy giặt</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_banCong" className="rounded text-brand" />
                <span>Ban công</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_thangMay" className="rounded text-brand" />
                <span>Thang máy</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_khoaVanTay" className="rounded text-brand" />
                <span>Khóa vân tay</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_gioTuDo" defaultChecked className="rounded text-brand" />
                <span>Giờ giấc tự do</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_choDeXe" defaultChecked className="rounded text-brand" />
                <span>Chỗ để xe</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_bepRieng" className="rounded text-brand" />
                <span>Bếp</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_thuCung" className="rounded text-brand" />
                <span>Thú cưng</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="amenity_xeDien" className="rounded text-brand" />
                <span>Xe điện</span>
              </label>
            </div>
            {isStudentRoomOrMini && (
              <div className="pt-2 border-t border-slate-200/70 flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input type="checkbox" name="has_mezzanine" className="rounded text-brand" />
                  <span>Có gác lửng cao ráo (Phòng có gác)</span>
                </label>
              </div>
            )}
          </div>

          {/* Biểu phí điện nước minh bạch */}
          <div className="rounded-xl border border-surface-border bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                Biểu phí điện nước & Tiện ích
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand">
                <input type="checkbox" name="utilitiesIncluded" className="rounded text-brand" />
                <span>Đã bao gồm điện nước trong giá thuê</span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-secondary">Tiền điện (VNĐ/kWh)</label>
                <input
                  name="electricityPricePerKwh"
                  type="number"
                  placeholder="VD: 3500 hoặc 4000"
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-secondary">Tiền nước theo m³ (VNĐ/m³)</label>
                <input
                  name="waterPricePerM3"
                  type="number"
                  placeholder="VD: 25000"
                  className="input-field bg-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-text-secondary">Hoặc nước khoán (VNĐ/người/tháng)</label>
                <input
                  name="waterPriceFlat"
                  type="number"
                  placeholder="VD: 100000"
                  className="input-field bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── BƯỚC 3: HÌNH ẢNH, VIDEO THỰC TẾ & BẢN VẼ MẶT BẰNG ── */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white font-bold text-xs">
              3
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Hình ảnh, Video thực tế & Bản vẽ mặt bằng
            </h2>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <label className="text-xs font-semibold text-text-secondary">
                Hình ảnh thực tế (Tối đa 20 ảnh, JPG/PNG/WEBP) *
              </label>
              {(isApartment || isCommercialSpace) && (
                <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Yêu cầu tối thiểu 5 ảnh để được duyệt gắn nhãn ưu tiên
                </span>
              )}
            </div>
            <input
              name="images"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="w-full rounded-xl border border-dashed border-surface-border bg-slate-50/60 p-3 text-sm text-text-secondary file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-700 transition-colors"
            />

            {previewUrls.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-text-secondary mb-2">
                  Đã chọn {previewUrls.length} ảnh xem trước:
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative group rounded-xl overflow-hidden border border-surface-border aspect-square bg-slate-100 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Video URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Đường dẫn Video thực tế (MP4 / WebM / YouTube)
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://... dán link video thực tế quay từ sảnh vào phòng"
                className="input-field"
              />
              <p className="mt-1 text-[11px] text-text-muted">Tin có video sẽ được gắn huy hiệu ▶ Có Video trên trang tìm kiếm</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-text-secondary">
                Ảnh Bản vẽ mặt bằng / Sơ đồ bố trí (Floorplan URL)
              </label>
              <input
                type="url"
                value={floorplanImageUrl}
                onChange={(e) => setFloorplanImageUrl(e.target.value)}
                placeholder="https://... ảnh sơ đồ bố trí không gian (nếu có)"
                className="input-field"
              />
              <p className="mt-1 text-[11px] text-text-muted">Tùy chọn hiển thị sơ đồ phân chia phòng cho Chung cư và Mặt bằng</p>
            </div>
          </div>
        </div>

        {/* ── BƯỚC 4: PHÂN LOẠI TƯ CÁCH NGƯỜI ĐĂNG & XÁC THỰC ── */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white font-bold text-xs">
              4
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Phân loại Tư cách Người đăng & Cam kết Xác thực
            </h2>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-text-secondary">
              Bạn đang đăng tin với tư cách là ai *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'chinh_chu', title: 'Chính chủ cho thuê', desc: 'Có tên trên sổ hồng hoặc hợp đồng sở hữu' },
                { value: 'tham_dinh_nhacualand', title: 'Đội ngũ Thẩm định NHACUALAND', desc: 'Quản lý & Dẫn xem tập trung miễn phí' },
                { value: 'don_vi_van_hanh', title: 'Đơn vị vận hành ủy quyền', desc: 'Được chủ nhà ủy quyền quản lý trọn gói' },
              ].map((role) => {
                const isSelected = posterRole === role.value;
                return (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setPosterRole(role.value)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand bg-brand-50/50 ring-2 ring-brand/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-bold text-slate-900">{role.title}</span>
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-brand bg-brand' : 'border-slate-300'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{role.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {uploadStatus && (
          <div className="rounded-xl bg-brand-50 border border-brand-200 p-3 text-xs text-brand-900 flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin shrink-0" />
            <span>{uploadStatus}</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-600 font-medium">
            {error}
          </div>
        )}

        {message === 'success' && (
          <div className="rounded-2xl bg-brand-50 border border-brand-200 p-6 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-bold text-brand-900">Đăng tin thành công</p>
            <p className="mt-1 text-sm text-brand-800">
              Tin đăng đã được tiếp nhận và đang ở trạng thái Chờ duyệt — Chuyên viên NHACUALAND sẽ rà soát và kích hoạt hiển thị trong thời gian sớm nhất
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2.5 sm:gap-3">
              {createdSlug && (
                <Link
                  href={`/tin/${createdSlug}`}
                  className="rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-600 transition-colors"
                >
                  Xem chi tiết tin vừa đăng
                </Link>
              )}
              <Link href="/tai-khoan/quan-ly-tin" className="btn-secondary text-xs px-5 py-2.5">
                Xem trong Quản lý tin đăng
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setCreatedSlug(null);
                }}
                className="btn-secondary text-xs px-5 py-2.5 cursor-pointer"
              >
                Đăng thêm tin khác
              </button>
            </div>
          </div>
        )}

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3.5 text-base justify-center font-bold shadow-md cursor-pointer"
          >
            {loading ? 'Đang gửi tin...' : 'Đăng tin ngay'}
          </button>
        </div>
      </form>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          try {
            const userRaw = localStorage.getItem('user');
            if (userRaw) setCurrentUser(JSON.parse(userRaw));
          } catch {}
        }}
        title="Đăng nhập để đăng tin"
        subtitle="Vui lòng đăng nhập hoặc đăng ký tài khoản bằng Google để tiếp tục đến mục đăng tin"
      />
    </div>
  );
}
