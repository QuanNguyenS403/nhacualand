'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  authFetch,
  isLoggedIn,
  getCurrentUser,
  getAccountCustomListings,
  updateAccountListingStatus,
} from '@/lib/auth-client';
import { formatPrice, Listing, ListingListResponse } from '@/lib/api';
import { healCustomListingsInLocalStorage, sanitizeListingImages, DEFAULT_ROOM_FALLBACK_IMAGES } from '@/lib/image-compressor';

/**
 * Trang "Quản lý tin đăng" — lưu trữ riêng biệt theo từng tài khoản,
 * không liên quan hay đồng bộ chéo giữa các tài khoản khác nhau
 */

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
  { value: 'expired', label: 'Hết hạn' },
  { value: 'removed', label: 'Đã gỡ' },
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

  const load = useCallback(async (status: string, targetPage = page) => {
    setLoading(true);
    setError(null);

    const currentUser = getCurrentUser();
    if (!currentUser) {
      setListings([]);
      setLoading(false);
      return;
    }

    let apiItems: Listing[] = [];

    // Nạp từ Backend API chính xác cho tài khoản này (nguồn sự thật duy nhất)
    try {
      const statusParam = status ? `status=${status}&` : '';
      const query = `?${statusParam}page=${targetPage}&pageSize=50`;
      const res = await authFetch(`/listings/mine${query}`);
      if (res.status === 401) {
        setError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        setListings([]);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data: ListingListResponse = await res.json();
        apiItems = data.items || [];
        setListings(apiItems);
        setTotal(data.pagination?.total ?? apiItems.length);
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
    }
  }, [checkedAuth, statusFilter]);

  // Tự động lắng nghe cập nhật tin đăng để làm mới giao diện tức thì
  useEffect(() => {
    const handleUpdate = () => {
      load(statusFilter, page);
    };
    window.addEventListener('qns_listings_updated', handleUpdate);
    return () => window.removeEventListener('qns_listings_updated', handleUpdate);
  }, [load, statusFilter, page]);

  async function handleMarkRented(listingId: string) {
    if (!confirm('Xác nhận phòng này đã cho thuê thành công? Bài đăng sẽ tự động được gỡ khỏi danh sách tìm phòng của khách hàng để tránh khách đặt lịch đi xem phòng')) {
      return;
    }
    try {
      const res = await authFetch(`/listings/${listingId}/rented`, { method: 'PATCH' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Cập nhật trạng thái thất bại';
        alert(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        return;
      }

      alert('Đã cập nhật trạng thái phòng đã cho thuê thành công và tự động gỡ phòng khỏi danh sách tìm phòng của khách hàng');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('qns_listings_updated'));
      }
      load(statusFilter, page);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  /** Xác nhận còn phòng trống — chu kỳ 7 ngày (§7, Gate E) */
  async function handleConfirmAvailability(listingId: string) {
    try {
      const res = await authFetch(`/listings/${listingId}/confirm-availability`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.message || 'Đã xác nhận phòng vẫn còn trống thành công');
      } else {
        alert('Đã xác nhận phòng vẫn còn trống thành công');
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('qns_listings_updated'));
      }
      load(statusFilter, page);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleRemove(listingId: string) {
    if (!confirm('Bạn có chắc chắn muốn gỡ tin đăng này? Tin sau khi gỡ sẽ không hiển thị công khai')) {
      return;
    }
    try {
      const res = await authFetch(`/listings/${listingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Gỡ bài đăng thất bại';
        alert(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        return;
      }

      alert('Đã gỡ bài đăng phòng thành công');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('qns_listings_updated'));
      }
      load(statusFilter, page);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  if (!checkedAuth) return null;

  return (
    <div className="min-h-screen bg-surface-muted">
      <div className="container-max py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Quản lý tin đăng</h1>
            <p className="mt-1 text-base text-text-muted">{total} tin trong tài khoản</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Đã xóa mục Khách thuê liên hệ đối với khách hàng theo yêu cầu — mục này được quản lý riêng tại trang Quản trị Admin */}
            <Link href="/dang-tin" className="btn-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Đăng tin mới</span>
            </Link>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-white text-text-secondary ring-1 ring-surface-border hover:ring-brand hover:text-brand'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
                  const daysSinceConfirm = lastConfirmed ? Math.floor((Date.now() - new Date(lastConfirmed).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  return (
                    <div key={listing.id} className="flex items-center gap-4 p-4 hover:bg-surface-muted/50 transition-colors">
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
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
                        <p className="truncate font-semibold text-text-primary">{listing.title}</p>
                        <p className="text-sm text-text-muted">{listing.addressDetail ?? listing.location.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-sm font-bold text-brand">{formatPrice(listing.price)}</p>
                          {listing.status === 'active' && (
                            <span className="text-xs text-text-muted">
                              • Còn phòng: {lastConfirmed ? new Date(lastConfirmed).toLocaleDateString('vi-VN') : 'Mới đăng'}
                              {daysSinceConfirm >= 7 && (
                                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
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
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        {listing.status === 'pending' && (
                          <Link
                            href={`/tin/${listing.slug}`}
                            className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
                          >
                            Xem trước
                          </Link>
                        )}
                        {listing.status === 'active' && (
                          <>
                            <Link
                              href={`/tin/${listing.slug}`}
                              className="text-sm font-medium text-brand hover:text-brand-700 transition-colors"
                            >
                              Xem
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleConfirmAvailability(listing.id)}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors border ${
                                daysSinceConfirm >= 7
                                  ? 'bg-amber-500 text-white hover:bg-amber-600 border-amber-600'
                                  : 'bg-brand-50 text-brand-800 hover:bg-brand-100 border-brand-200'
                              }`}
                              title="Xác nhận phòng vẫn còn trống trong chu kỳ 7 ngày (§7)"
                            >
                              Còn phòng
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMarkRented(listing.id)}
                              className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200"
                              title="Đánh dấu phòng đã cho thuê thành công và tự động gỡ bài đăng"
                            >
                              Đã cho thuê
                            </button>
                          </>
                        )}
                        {listing.status !== 'removed' && (
                          <button
                            type="button"
                            onClick={() => handleRemove(listing.id)}
                            className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
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
                        className="px-3 py-1 bg-white border border-surface-border text-text-primary text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-surface-muted"
                      >
                        ← Trang trước
                      </button>
                      <button
                        type="button"
                        disabled={page >= totalPages || loading}
                        onClick={() => load(statusFilter, page + 1)}
                        className="px-3 py-1 bg-white border border-surface-border text-text-primary text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-surface-muted"
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
      </div>
    </div>
  );
}
