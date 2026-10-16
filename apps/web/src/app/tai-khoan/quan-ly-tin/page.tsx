'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  authFetch,
  isLoggedIn,
  getCurrentUser,
} from '@/lib/auth-client';
import { formatPrice, Listing, ListingListResponse } from '@/lib/api';
import { DEFAULT_ROOM_FALLBACK_IMAGES } from '@/lib/image-compressor';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-800' },
  active: { label: 'Đang hiển thị', className: 'bg-brand-100 text-brand-900' },
  rented: { label: 'Đã cho thuê', className: 'bg-amber-100 text-amber-900' },
  rejected: { label: 'Bị từ chối', className: 'bg-red-100 text-red-700' },
  expired: { label: 'Hết hạn', className: 'bg-gray-200 text-gray-600' },
  removed: { label: 'Đã gỡ', className: 'bg-gray-200 text-gray-500' },
};

const FILTER_TABS = [
  { value: '', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'active', label: 'Đang hiển thị' },
  { value: 'rented', label: 'Đã cho thuê' },
  { value: 'rejected', label: 'Bị từ chối' },
];

export default function QuanLyTinPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);

  // Thống kê số lượng theo tab từ DB
  const [tabCounts, setTabCounts] = useState<{ [key: string]: number }>({
    all: 0,
    pending: 0,
    active: 0,
    rented: 0,
    rejected: 0,
  });

  // Toast & Confirm Modal nội bộ
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message: message.replace(/\.+$/, ''), type });
    setTimeout(() => setToast(null), 3500);
  }

  // Tải số đếm các tab từ /listings/mine/counts
  const loadCounts = useCallback(async () => {
    try {
      const res = await authFetch('/listings/mine/counts');
      if (res.ok) {
        const data = await res.json();
        setTabCounts({
          all: data.total ?? data.all ?? 0,
          pending: data.pending ?? 0,
          active: data.active ?? 0,
          rented: data.rented ?? 0,
          rejected: data.rejected ?? 0,
        });
      }
    } catch {
      // Bỏ qua lỗi đếm số lượng
    }
  }, []);

  const load = useCallback(async (status: string, targetPage = page) => {
    setLoading(true);
    setError(null);

    const currentUser = getCurrentUser();
    if (!currentUser) {
      setListings([]);
      setLoading(false);
      return;
    }

    try {
      const statusParam = status ? `status=${status}&` : '';
      const query = `?${statusParam}page=${targetPage}&pageSize=20`;
      const res = await authFetch(`/listings/mine${query}`);
      if (res.status === 401) {
        setError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        setListings([]);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data: ListingListResponse = await res.json();
        const items = data.items || [];
        setListings(items);
        setTotal(data.pagination?.total ?? items.length);
        setPage(targetPage);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } else {
        setError('Không thể tải danh sách tin từ máy chủ');
      }
    } catch {
      setError('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/dang-nhap');
      return;
    }
    setCheckedAuth(true);
  }, [router]);

  useEffect(() => {
    if (checkedAuth) {
      setPage(1);
      load(statusFilter, 1);
      loadCounts();
    }
  }, [checkedAuth, statusFilter, loadCounts]);

  useEffect(() => {
    const handleUpdate = () => {
      load(statusFilter, page);
      loadCounts();
    };
    window.addEventListener('qns_listings_updated', handleUpdate);
    return () => window.removeEventListener('qns_listings_updated', handleUpdate);
  }, [load, statusFilter, page, loadCounts]);

  // Đánh dấu đã cho thuê
  function handleMarkRented(listingId: string) {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận đã cho thuê',
      message: 'Bài đăng sẽ được chuyển sang trạng thái Đã cho thuê và tạm ẩn khỏi danh sách tìm kiếm công khai',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/listings/${listingId}/rented`, { method: 'PATCH' });
          if (!res.ok) {
            const errJson = await res.json().catch(() => null);
            showToast(errJson?.message || 'Cập nhật trạng thái thất bại', 'error');
            return;
          }
          showToast('Đã cập nhật phòng sang trạng thái đã cho thuê thành công');
          window.dispatchEvent(new Event('qns_listings_updated'));
        } catch {
          showToast('Lỗi kết nối máy chủ', 'error');
        }
      },
    });
  }

  // Mở lại còn phòng khi đang ở trạng thái rented
  function handleMarkAvailable(listingId: string) {
    setConfirmModal({
      isOpen: true,
      title: 'Mở lại tin còn phòng',
      message: 'Tin đăng sẽ được hiển thị công khai trở lại trên sàn để khách thuê liên hệ',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/listings/${listingId}/available`, { method: 'PATCH' });
          if (!res.ok) {
            const errJson = await res.json().catch(() => null);
            showToast(errJson?.message || 'Mở lại tin thất bại', 'error');
            return;
          }
          showToast('Đã mở lại tin phòng còn trống thành công');
          window.dispatchEvent(new Event('qns_listings_updated'));
        } catch {
          showToast('Lỗi kết nối máy chủ', 'error');
        }
      },
    });
  }

  // Xác nhận còn phòng chu kỳ 7 ngày khi đang active
  async function handleConfirmAvailability(listingId: string) {
    try {
      const res = await authFetch(`/listings/${listingId}/confirm-availability`, { method: 'POST' });
      if (res.ok) {
        showToast('Đã xác nhận phòng vẫn còn trống thành công');
      } else {
        showToast('Không thể cập nhật lúc này, vui lòng thử lại', 'error');
      }
      window.dispatchEvent(new Event('qns_listings_updated'));
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  }

  // Gửi duyệt lại tin bị từ chối
  function handleResubmit(listingId: string) {
    setConfirmModal({
      isOpen: true,
      title: 'Gửi duyệt lại tin',
      message: 'Tin đăng sẽ được gửi tới Ban quản trị để kiểm tra và phê duyệt lại',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/listings/${listingId}/resubmit`, { method: 'POST' });
          if (!res.ok) {
            const errJson = await res.json().catch(() => null);
            showToast(errJson?.message || 'Gửi duyệt lại thất bại', 'error');
            return;
          }
          showToast('Đã gửi tin vào hàng đợi chờ duyệt lại thành công');
          window.dispatchEvent(new Event('qns_listings_updated'));
        } catch {
          showToast('Lỗi kết nối máy chủ', 'error');
        }
      },
    });
  }

  // Gỡ tin đăng
  function handleRemove(listingId: string) {
    setConfirmModal({
      isOpen: true,
      title: 'Gỡ tin đăng',
      message: 'Bạn có chắc chắn muốn gỡ tin đăng này? Tin sau khi gỡ sẽ không hiển thị công khai',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          const res = await authFetch(`/listings/${listingId}`, { method: 'DELETE' });
          if (!res.ok) {
            const errJson = await res.json().catch(() => null);
            showToast(errJson?.message || 'Gỡ tin thất bại', 'error');
            return;
          }
          showToast('Đã gỡ bài đăng phòng thành công');
          window.dispatchEvent(new Event('qns_listings_updated'));
        } catch {
          showToast('Lỗi kết nối máy chủ', 'error');
        }
      },
    });
  }

  if (!checkedAuth) return null;

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="container-max py-8">
        {/* Toast thông báo */}
        {toast && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition-all animate-fade-in ${
              toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Quản lý tin đăng</h1>
            <p className="mt-1 text-base text-text-muted">{total} tin trong danh sách</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dang-tin" className="btn-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Đăng tin mới</span>
            </Link>
          </div>
        </div>

        {/* Filter tabs có số lượng lấy trực tiếp từ DB */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => {
            const countKey = tab.value === '' ? 'all' : tab.value;
            const count = tabCounts[countKey] ?? 0;
            const isSelected = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-all ${
                  isSelected
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-white text-text-secondary ring-1 ring-surface-border hover:ring-brand hover:text-brand'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {loading && (
          <div className="mt-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl skeleton" />
            ))}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {listings.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-surface-border bg-white p-12 text-center">
                <p className="font-semibold text-text-primary">Chưa có tin nào ở trạng thái này</p>
                <Link href="/dang-tin" className="btn-primary mt-4 inline-flex">
                  Đăng tin đầu tiên
                </Link>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-surface-border rounded-2xl border border-surface-border bg-white shadow-card overflow-hidden">
                {listings.map((listing) => {
                  const status = STATUS_LABEL[listing.status] ?? { label: listing.status, className: 'bg-gray-100 text-gray-600' };
                  const lastConfirmed = (listing as any).refreshedAt || listing.publishedAt || listing.createdAt;
                  const daysSinceConfirm = lastConfirmed
                    ? Math.floor((Date.now() - new Date(lastConfirmed).getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                  return (
                    <div key={listing.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-surface-muted/50 transition-colors">
                      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {listing.images[0]?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={listing.images[0].imageUrl}
                            alt={listing.title}
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (!target.src.includes('unsplash.com')) {
                                target.src = DEFAULT_ROOM_FALLBACK_IMAGES[0];
                              }
                            }}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-text-muted">
                            Chưa có ảnh
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-bold text-text-primary text-base">{listing.title}</p>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">{listing.addressDetail ?? listing.location.name}</p>

                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm font-extrabold text-brand">{formatPrice(listing.price)}</p>
                          {listing.status === 'active' && (
                            <span className="text-xs text-text-muted">
                              • Còn phòng: {lastConfirmed ? new Date(lastConfirmed).toLocaleDateString('vi-VN') : 'Mới đăng'}
                              {daysSinceConfirm >= 7 && (
                                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                  Quá 7 ngày
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        {listing.status === 'pending' && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 font-medium">
                            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            <span>Đang chờ Quản trị viên duyệt để hiển thị lên sàn</span>
                          </div>
                        )}

                        {listing.status === 'rejected' && listing.rejectionReason && (
                          <p className="mt-1 text-xs text-rose-600 font-medium">
                            Lý do từ chối: {listing.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Các nút thao tác */}
                      <div className="flex shrink-0 items-center gap-2 pt-2 sm:pt-0">
                        {/* Xem trước cho tin Pending */}
                        {listing.status === 'pending' && (
                          <Link
                            href={`/tin/${listing.slug}`}
                            className="text-xs font-semibold px-3 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
                          >
                            Xem trước
                          </Link>
                        )}

                        {/* Thao tác cho tin Active */}
                        {listing.status === 'active' && (
                          <>
                            <Link
                              href={`/tin/${listing.slug}`}
                              className="text-xs font-semibold px-3 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                            >
                              Xem
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleConfirmAvailability(listing.id)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors border cursor-pointer ${
                                daysSinceConfirm >= 7
                                  ? 'bg-amber-500 text-white hover:bg-amber-600 border-amber-600'
                                  : 'bg-brand-50 text-brand-800 hover:bg-brand-100 border-brand-200'
                              }`}
                            >
                              Còn phòng
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkRented(listing.id)}
                              className="text-xs font-semibold px-3 py-1.5 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 cursor-pointer"
                            >
                              Đã cho thuê
                            </button>
                          </>
                        )}

                        {/* Thao tác cho tin Rented */}
                        {listing.status === 'rented' && (
                          <button
                            type="button"
                            onClick={() => handleMarkAvailable(listing.id)}
                            className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200 cursor-pointer"
                          >
                            Mở lại còn phòng
                          </button>
                        )}

                        {/* Thao tác gửi duyệt lại cho tin Bị từ chối */}
                        {listing.status === 'rejected' && (
                          <button
                            type="button"
                            onClick={() => handleResubmit(listing.id)}
                            className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer"
                          >
                            Gửi duyệt lại
                          </button>
                        )}

                        {/* Nút gỡ tin cho các tin chưa gỡ */}
                        {listing.status !== 'removed' && (
                          <button
                            type="button"
                            onClick={() => handleRemove(listing.id)}
                            className="text-xs font-semibold px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200 cursor-pointer"
                          >
                            Gỡ tin
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Phân trang */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-surface-border flex items-center justify-between bg-surface-muted/30">
                    <p className="text-xs text-text-muted">
                      Hiển thị trang <strong>{page}</strong> / <strong>{totalPages}</strong> (tổng số {total} tin)
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() => load(statusFilter, page - 1)}
                        className="px-3 py-1 bg-white border border-surface-border text-text-primary text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-surface-muted cursor-pointer"
                      >
                        ← Trang trước
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages || loading}
                        onClick={() => load(statusFilter, page + 1)}
                        className="px-3 py-1 bg-white border border-surface-border text-text-primary text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-surface-muted cursor-pointer"
                      >
                        Trang sau →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Modal Xác nhận */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900">{confirmModal.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{confirmModal.message}</p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className="rounded-xl bg-brand hover:bg-brand-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
