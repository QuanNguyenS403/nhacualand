'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth-client';
import { LandlordAvatar } from '@/components/QnsLogo';
import { healCustomListingsInLocalStorage, sanitizeListingImages, DEFAULT_ROOM_FALLBACK_IMAGES } from '@/lib/image-compressor';

interface ListingItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  transactionType: string;
  propertyType: string;
  price: string;
  depositAmount?: string | number | null;
  minLeaseMonths?: number | null;
  utilitiesIncluded?: boolean;
  electricityPricePerKwh?: number | null;
  waterPricePerM3?: number | null;
  waterPriceFlat?: number | null;
  amenities?: Record<string, any> | null;
  areaM2: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  legalStatus?: string | null;
  addressDetail?: string | null;
  status: string;
  verificationStatus?: string;
  verifiedAt?: string | null;
  createdAt: string;
  rejectionReason?: string | null;
  images: { imageUrl: string; sortOrder: number }[];
  location?: { name: string } | null;
  owner: { id: string; fullName: string | null; phone: string; avatarUrl?: string | null };
  nearbyUniversities?: {
    distanceMeters?: number | null;
    travelTimeMinutes?: number | null;
    university: {
      name: string;
      abbreviation?: string | null;
    };
  }[];
}

function formatPriceVND(priceStr?: string | number | null): string {
  if (!priceStr) return '—';
  try {
    const price = BigInt(priceStr);
    if (price >= 1_000_000_000n) {
      const billions = Number(price) / 1_000_000_000;
      return `${billions.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
    }
    if (price >= 1_000_000n) {
      const millions = Number(price) / 1_000_000;
      return `${millions.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} triệu`;
    }
    return `${price.toLocaleString('vi-VN')} đ`;
  } catch {
    return String(priceStr);
  }
}

const PROPERTY_TYPE_NAMES: Record<string, string> = {
  'phong-tro-sinh-vien': 'Phòng trọ sinh viên',
  phong_tro_sinh_vien: 'Phòng trọ sinh viên',
  'phong-tro-nguoi-di-lam': 'Phòng trọ người đi làm',
  phong_tro_nguoi_di_lam: 'Phòng trọ người đi làm',
  'ky-tuc-xa-tu-nhan': 'Ký túc xá tư nhân / Sleepbox',
  ky_tuc_xa: 'Ký túc xá tư nhân / Sleepbox',
  studio: 'Căn hộ Studio',
  'can-ho-chung-cu': 'Căn hộ chung cư',
  can_ho: 'Căn hộ chung cư',
  'nha-nguyen-can': 'Nhà nguyên căn',
  nha_rieng: 'Nhà nguyên căn',
  'mat-bang-kinh-doanh': 'Mặt bằng kinh doanh',
  mat_bang: 'Mặt bằng kinh doanh',
  cua_hang: 'Cửa hàng / Ki-ốt',
  shophouse: 'Shophouse khối đế',
  kho_xuong: 'Kho xưởng / Bãi đất',
  phong_tro: 'Phòng trọ',
  'phong-tro': 'Phòng trọ',
};

const AMENITY_LABELS: Record<string, string> = {
  wifi: 'Wifi tốc độ cao',
  air_conditioner: 'Máy lạnh',
  mezzanine: 'Gác lửng',
  parking: 'Nhà để xe',
  security_camera: 'Camera / An ninh 24/7',
  free_time: 'Giờ giấc tự do',
  private_bathroom: 'Vệ sinh khép kín',
  water_heater: 'Bình nóng lạnh',
  nongLanh: 'Bình nóng lạnh',
  washing_machine: 'Máy giặt',
  refrigerator: 'Tủ lạnh',
  kitchen: 'Bếp',
  bepRieng: 'Bếp',
  elevator: 'Thang máy',
  balcony: 'Ban công',
  fingerprint_lock: 'Khóa vân tay',
  thuCung: 'Thú cưng',
  xeDien: 'Xe điện',
};

const DEFAULT_REASONS = [
  'Hình ảnh mờ, chứa watermark hoặc không đúng thực tế',
  'Mức giá không hợp lý hoặc sai đơn vị định giá',
  'Nội dung có dấu hiệu lừa đảo / quảng cáo spam',
  'Tin đăng trùng lặp với tin đã tồn tại trên sàn',
  'Địa chỉ hoặc vị trí phòng không chính xác',
  'Thông tin điện nước/chi phí dịch vụ không minh bạch',
];

export default function AdminPendingListingsPage() {
  const [items, setItems] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [categoryFilter, setCategoryFilter] = useState(''); // '' | 'thue_tro' | 'thue_studio' | 'thue_bds' | 'thue_mat_bang'

  // Modal Chi tiết
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);

  // Modal Từ chối
  const [rejectingListing, setRejectingListing] = useState<ListingItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Thông báo toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadListings();
  }, [page, statusFilter, categoryFilter]);

  function showToast(text: string, type: 'success' | 'error' = 'success') {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  }

  async function loadListings(searchKeyword = keyword) {
    setLoading(true);
    let apiItems: any[] = [];
    let apiTotal = 0;
    let apiTotalPages = 1;

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        status: statusFilter,
      });
      if (categoryFilter) {
        params.set('categoryGroup', categoryFilter);
      }
      if (searchKeyword.trim()) {
        params.set('keyword', searchKeyword.trim());
      }

      const res = await authFetch(`/admin/listings/pending?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        apiItems = data.items ?? [];
        apiTotal = data.pagination?.total ?? 0;
        apiTotalPages = data.pagination?.totalPages ?? 1;
      }
      setItems(apiItems);
      setTotal(apiTotal);
      setTotalPages(apiTotalPages);
    } catch {
      showToast('Không thể tải danh sách tin chờ duyệt từ máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadListings(keyword);
  }

  async function handleApprove(id: string) {
    if (!confirm('Xác nhận phê duyệt tin đăng phòng này lên sàn?')) return;
    setSubmittingAction(true);
    try {
      const res = await authFetch(`/admin/listings/${id}/approve`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Phê duyệt tin thất bại';
        showToast(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg, 'error');
        return;
      }

      showToast('Đã phê duyệt tin thành công');
      setSelectedListing(null);
      loadListings();
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('qns_listings_updated_at', Date.now().toString());
          localStorage.setItem('qns_last_approved_id', String(id));
        } catch {}
        window.dispatchEvent(new CustomEvent('qns_listings_updated', {
          detail: { id: String(id), status: 'approved' }
        }));
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi kết nối máy chủ', 'error');
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleToggleVerify(listingId: string, currentStatus?: string) {
    const isCurrentlyVerified = currentStatus === 'da_xac_thuc';
    const endpoint = isCurrentlyVerified ? `/admin/listings/${listingId}/unverify` : `/admin/listings/${listingId}/verify`;
    setSubmittingAction(true);
    try {
      const res = await authFetch(endpoint, { method: 'POST' });
      if (res.ok) {
        showToast(isCurrentlyVerified ? 'Đã hủy nhãn Xác thực thực tế' : 'Đã gắn nhãn Đã kiểm tra thực tế thành công');
        setItems((prev) =>
          prev.map((item) =>
            item.id === listingId
              ? { ...item, verificationStatus: isCurrentlyVerified ? 'chua_xac_thuc' : 'da_xac_thuc' }
              : item,
          ),
        );
        if (selectedListing && selectedListing.id === listingId) {
          setSelectedListing((prev) =>
            prev ? { ...prev, verificationStatus: isCurrentlyVerified ? 'chua_xac_thuc' : 'da_xac_thuc' } : null,
          );
        }
      } else {
        showToast('Thao tác xác thực thất bại', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleConfirmReject() {
    if (!rejectingListing) return;
    const finalReason = customReason.trim() || rejectReason;
    if (!finalReason) {
      showToast('Vui lòng chọn hoặc nhập lý do từ chối', 'error');
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await authFetch(`/admin/listings/${rejectingListing.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason, rejectionReason: finalReason }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Từ chối tin thất bại';
        showToast(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg, 'error');
        return;
      }

      showToast('Đã từ chối tin đăng');
      setRejectingListing(null);
      setSelectedListing(null);
      setCustomReason('');
      loadListings();
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('qns_listings_updated_at', Date.now().toString());
          localStorage.setItem('qns_last_rejected_id', String(rejectingListing.id));
        } catch {}
        window.dispatchEvent(new CustomEvent('qns_listings_updated', {
          detail: { id: String(rejectingListing.id), status: 'rejected' }
        }));
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi kết nối máy chủ', 'error');
    } finally {
      setSubmittingAction(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in fade-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-brand-50 text-brand-900 border-brand-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toastMessage.text}
        </div>
      )}

      {/* Header & Tabs trạng thái */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Kiểm duyệt tin cho thuê phòng</h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng cộng <b>{total}</b> tin đăng theo bộ lọc hiện tại
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => {
              setStatusFilter('pending');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg transition-all ${
              statusFilter === 'pending'
                ? 'bg-white text-brand shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chờ duyệt
          </button>
          <button
            onClick={() => {
              setStatusFilter('active');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg transition-all ${
              statusFilter === 'active'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã duyệt
          </button>
          <button
            onClick={() => {
              setStatusFilter('rejected');
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg transition-all ${
              statusFilter === 'rejected'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã từ chối
          </button>
        </div>
      </div>

      {/* Thanh lọc theo chuyên mục cho thuê */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Chuyên mục:</span>
        {[
          { key: '', label: 'Tất cả' },
          { key: 'thue_can_ho', label: 'Chung cư' },
          { key: 'thue_studio', label: 'Chung cư mini' },
          { key: 'thue_tro', label: 'Phòng trọ SV / Người đi làm' },
          { key: 'thue_mat_bang', label: 'Mặt bằng kinh doanh' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setCategoryFilter(tab.key);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              categoryFilter === tab.key
                ? 'bg-brand text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Thanh tìm kiếm */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tiêu đề tin, số điện thoại hoặc họ tên người đăng..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
        >
          Tìm kiếm
        </button>
      </form>

      {/* Danh sách tin */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-slate-200 animate-pulse p-6" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {statusFilter === 'pending'
              ? 'Không có tin đăng nào cần duyệt'
              : 'Không tìm thấy tin đăng phù hợp'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {statusFilter === 'pending'
              ? 'Toàn bộ tin đăng đã được xử lý. Khi có người đăng tin mới, hệ thống sẽ tự động cập nhật vào đây.'
              : 'Thử điều chỉnh từ khóa tìm kiếm hoặc chuyển sang bộ lọc khác.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all p-5 sm:p-6 flex flex-col md:flex-row gap-5"
            >
              {/* Ảnh đại diện */}
              <div
                onClick={() => setSelectedListing(listing)}
                className="w-full md:w-56 h-40 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative cursor-pointer group"
              >
                {listing.images?.[0]?.imageUrl ? (
                  <img
                    src={listing.images[0].imageUrl}
                    alt={listing.title}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.includes('unsplash.com')) {
                        target.src = DEFAULT_ROOM_FALLBACK_IMAGES[0];
                      }
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    Chưa có ảnh
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[11px] font-bold bg-brand/90 text-white backdrop-blur-sm">
                  Cho thuê
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[11px] font-bold bg-black/60 text-white backdrop-blur-sm">
                  {listing.images?.length ?? 0} ảnh
                </div>
              </div>

              {/* Thông tin chính */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-800 border border-brand-200">
                      {PROPERTY_TYPE_NAMES[listing.propertyType] ?? listing.propertyType}
                    </span>
                    {listing.utilitiesIncluded && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        Bao điện nước
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      Mã: #{listing.id}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400">
                      {new Date(listing.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <h2
                    onClick={() => setSelectedListing(listing)}
                    className="text-base font-bold text-slate-900 hover:text-brand transition-colors cursor-pointer line-clamp-2"
                  >
                    {listing.title}
                  </h2>

                  <div className="mt-2 flex items-baseline gap-4 flex-wrap">
                    <span className="text-lg font-extrabold text-brand">
                      {formatPriceVND(listing.price)} / tháng
                    </span>
                    {listing.depositAmount && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Cọc: {formatPriceVND(listing.depositAmount)}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-slate-700">
                      {listing.areaM2} m²
                    </span>
                    {listing.bedrooms != null && (
                      <span className="text-xs text-slate-600">{listing.bedrooms} PN</span>
                    )}
                    {listing.bathrooms != null && (
                      <span className="text-xs text-slate-600">{listing.bathrooms} WC</span>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-slate-500 line-clamp-1">
                    {listing.addressDetail ? `${listing.addressDetail}, ` : ''}
                    {listing.location?.name ?? 'Chưa rõ khu vực'}
                  </p>
                </div>

                {/* Footer card */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <LandlordAvatar
                      avatarUrl={listing.owner.avatarUrl}
                      name={listing.owner.fullName ?? undefined}
                      size={28}
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-800">
                        {listing.owner.fullName ?? 'Chủ phòng'}
                      </span>
                      <span className="text-xs text-slate-400 ml-1.5 font-mono">
                        ({listing.owner.phone})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedListing(listing)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Chi tiết
                    </button>

                    {listing.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setRejectingListing(listing);
                            setRejectReason(DEFAULT_REASONS[0]);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => handleApprove(listing.id)}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-brand hover:bg-brand-dark rounded-lg shadow-sm transition-colors"
                        >
                          Phê duyệt
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-xs text-slate-500">
                Trang {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 disabled:opacity-40"
                >
                  ← Trang trước
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 disabled:opacity-40"
                >
                  Trang sau →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: XEM CHI TIẾT TIN ĐẦY ĐỦ */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-brand uppercase tracking-wider">
                  Chi tiết tin cho thuê #{selectedListing.id}
                </span>
                <h3 className="text-lg font-bold text-slate-900 line-clamp-1">
                  {selectedListing.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Hình ảnh */}
              {selectedListing.images && selectedListing.images.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Hình ảnh đính kèm ({selectedListing.images.length})
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedListing.images.map((img, idx) => (
                      <div key={idx} className="h-32 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden">
                        <img
                          src={img.imageUrl}
                          alt={`Ảnh ${idx + 1}`}
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.includes('unsplash.com')) {
                              target.src = DEFAULT_ROOM_FALLBACK_IMAGES[idx % DEFAULT_ROOM_FALLBACK_IMAGES.length];
                            }
                          }}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thông số cốt lõi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400">Giá thuê / tháng:</span>
                  <p className="text-base font-bold text-brand">
                    {formatPriceVND(selectedListing.price)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Tiền đặt cọc:</span>
                  <p className="text-base font-bold text-slate-800">
                    {formatPriceVND(selectedListing.depositAmount)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Hợp đồng tối thiểu:</span>
                  <p className="text-base font-bold text-slate-800">
                    {selectedListing.minLeaseMonths ? `${selectedListing.minLeaseMonths} tháng` : 'Linh hoạt'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Diện tích:</span>
                  <p className="text-base font-bold text-slate-800">
                    {selectedListing.areaM2} m²
                  </p>
                </div>
              </div>

              {/* Chi phí điện nước */}
              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                  Biểu phí điện nước
                </h4>
                {selectedListing.utilitiesIncluded ? (
                  <p className="text-sm font-semibold text-amber-800">
                    Miễn phí hoàn toàn / Đã bao trọn tiền điện nước trong giá thuê
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Giá điện:</span>
                      <p className="font-bold text-slate-800">
                        {selectedListing.electricityPricePerKwh ? `${selectedListing.electricityPricePerKwh.toLocaleString('vi-VN')} đ/kWh` : 'Chưa nhập'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Giá nước (m³):</span>
                      <p className="font-bold text-slate-800">
                        {selectedListing.waterPricePerM3 ? `${selectedListing.waterPricePerM3.toLocaleString('vi-VN')} đ/m³` : 'Chưa nhập'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Nước khoán / người:</span>
                      <p className="font-bold text-slate-800">
                        {selectedListing.waterPriceFlat ? `${selectedListing.waterPriceFlat.toLocaleString('vi-VN')} đ/tháng` : 'Không áp dụng'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Nội Thất */}
              {selectedListing.amenities && Object.keys(selectedListing.amenities).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Nội Thất
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedListing.amenities).map(([key, val]) => {
                      if (!val) return null;
                      return (
                        <span
                          key={key}
                          className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200"
                        >
                          {AMENITY_LABELS[key] ?? key}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trường đại học lân cận */}
              {selectedListing.nearbyUniversities && selectedListing.nearbyUniversities.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Trường đại học lân cận
                  </h4>
                  <div className="space-y-1.5">
                    {selectedListing.nearbyUniversities.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs border border-slate-100">
                        <span className="font-semibold text-slate-800">
                          {item.university.abbreviation ? `[${item.university.abbreviation}] ` : ''}
                          {item.university.name}
                        </span>
                        <span className="text-brand font-bold">
                          {item.distanceMeters ? `~${(item.distanceMeters / 1000).toFixed(1)} km` : 'Gần trường'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Địa chỉ */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Địa chỉ phòng
                </h4>
                <p className="text-sm text-slate-800">
                  {selectedListing.addressDetail ? `${selectedListing.addressDetail}, ` : ''}
                  {selectedListing.location?.name ?? 'Chưa gắn vị trí'}
                </p>
              </div>

              {/* Mô tả chi tiết */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Nội dung mô tả của người đăng
                </h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                  {selectedListing.description}
                </div>
              </div>

              {/* Người đăng */}
              <div className="p-4 bg-brand-50/60 border border-brand-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-brand-900 font-semibold">Chủ tin đăng:</span>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedListing.owner.fullName ?? 'Chưa cập nhật tên'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-brand-900 font-semibold">Số điện thoại liên hệ:</span>
                  <p className="text-sm font-mono font-extrabold text-brand">
                    {selectedListing.owner.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <div>
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() => handleToggleVerify(selectedListing.id, selectedListing.verificationStatus)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${
                    selectedListing.verificationStatus === 'da_xac_thuc'
                      ? 'bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100'
                      : 'bg-brand-50 text-brand-900 border border-brand-300 hover:bg-brand-100'
                  }`}
                >
                  {selectedListing.verificationStatus === 'da_xac_thuc' ? (
                    <>
                      <span>Hủy mác Xác thực thực tế</span>
                    </>
                  ) : (
                    <>
                      <span>Xác thực thực tế (Trust-as-a-Service)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedListing(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl transition-colors"
                >
                  Đóng lại
                </button>

                {selectedListing.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      setRejectingListing(selectedListing);
                      setRejectReason(DEFAULT_REASONS[0]);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                  >
                    Từ chối tin này
                  </button>
                  <button
                    onClick={() => handleApprove(selectedListing.id)}
                    className="px-5 py-2 text-xs font-bold text-white bg-brand hover:bg-brand-dark rounded-xl shadow-sm transition-colors"
                  >
                    Phê duyệt ngay
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* MODAL 2: TỪ CHỐI DUYỆT TIN */}
      {rejectingListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Từ chối duyệt tin: "#{rejectingListing.id}"
              </h3>
              <button
                onClick={() => setRejectingListing(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Vui lòng chọn hoặc nhập lý do từ chối. Lý do này sẽ được ghi nhận và gửi thông báo qua email tới chủ phòng:
            </p>

            <div className="space-y-2">
              {DEFAULT_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    rejectReason === reason && !customReason
                      ? 'bg-rose-50 border-rose-300 text-rose-900 font-medium'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    checked={rejectReason === reason && !customReason}
                    onChange={() => {
                      setRejectReason(reason);
                      setCustomReason('');
                    }}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hoặc nhập lý do khác:
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Nhập lý do cụ thể gửi tới người đăng tin..."
                rows={3}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingListing(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                disabled={submittingAction}
                onClick={handleConfirmReject}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
