'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, isLoggedIn } from '@/lib/auth-client';
import { formatPrice, Listing, ListingListResponse } from '@/lib/api';
import { DEFAULT_ROOM_FALLBACK_IMAGES } from '@/lib/image-compressor';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: 'Chờ duyệt', className: 'bg-amber-100 text-amber-800' },
  active: { label: 'Đang hiển thị', className: 'bg-emerald-100 text-emerald-800' },
  rented: { label: 'Đã cho thuê', className: 'bg-amber-100 text-amber-900' },
  rejected: { label: 'Bị từ chối', className: 'bg-red-100 text-red-700' },
  expired: { label: 'Hết hạn', className: 'bg-gray-200 text-gray-600' },
  removed: { label: 'Đã gỡ', className: 'bg-gray-200 text-gray-500' },
};

export default function TinDaLuuPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message: message.replace(/\.+$/, ''), type });
    setTimeout(() => setToast(null), 3500);
  }

  const loadSaved = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/listings/saved/mine?page=${targetPage}&pageSize=20`);
      if (res.status === 401) {
        setError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
        setListings([]);
        return;
      }
      if (!res.ok) throw new Error('Không tải được danh sách tin đã lưu');
      const data: ListingListResponse = await res.json();
      setListings(data.items || []);
      setTotal(data.pagination?.total ?? 0);
      setPage(data.pagination?.page ?? targetPage);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/dang-nhap');
      return;
    }
    setCheckedAuth(true);
  }, [router]);

  useEffect(() => {
    if (checkedAuth) loadSaved(page);
  }, [checkedAuth, loadSaved, page]);

  async function handleUnsave(listingId: string) {
    try {
      const res = await authFetch(`/listings/${listingId}/save`, { method: 'DELETE' });
      if (res.ok) {
        setListings((prev) => prev.filter((item) => item.id !== listingId));
        setTotal((prev) => Math.max(0, prev - 1));
        showToast('Đã bỏ lưu phòng thành công');
      } else {
        showToast('Không thể bỏ lưu lúc này, vui lòng thử lại', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  }

  if (!checkedAuth) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
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

      <div className="flex items-center justify-between border-b border-surface-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Phòng đã lưu</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Danh sách những phòng bạn đang theo dõi và quan tâm
          </p>
        </div>
        <span className="rounded-full bg-rose-50 border border-rose-200 px-3.5 py-1.5 text-xs font-bold text-rose-600">
          {total} tin đã lưu
        </span>
      </div>

      {loading && <p className="mt-6 text-sm text-text-muted">Đang tải danh sách phòng đã lưu</p>}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          {listings.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-surface-border bg-white p-12 text-center">
              <h3 className="mt-3 text-base font-bold text-text-primary">Bạn chưa lưu phòng nào</h3>
              <p className="mt-1 text-sm text-text-secondary max-w-md mx-auto">
                Khi tìm phòng, hãy bấm vào nút &quot;Lưu tin&quot; trên trang chi tiết để lưu lại và theo dõi bất cứ lúc nào
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/thue"
                  className="btn-primary"
                >
                  Khám phá phòng trọ & căn hộ cho thuê
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-6 divide-y divide-surface-border rounded-2xl border border-surface-border bg-white shadow-card overflow-hidden">
                {listings.map((listing) => {
                  const status = STATUS_LABEL[listing.status] ?? { label: listing.status, className: 'bg-gray-100 text-gray-600' };
                  const isInactive = listing.status !== 'active';

                  return (
                    <div key={listing.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 relative">
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
                            className={`h-full w-full object-cover ${isInactive ? 'grayscale-40' : ''}`}
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[10px] text-text-muted">Chưa có ảnh</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/tin/${listing.slug}`}
                            className="line-clamp-1 font-bold text-text-primary hover:text-brand transition-colors text-base"
                          >
                            {listing.title}
                          </Link>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center gap-3 text-xs text-text-secondary">
                          <span className="font-extrabold text-brand text-sm">{formatPrice(listing.price)}</span>
                          {listing.transactionType === 'rent' && <span className="text-[11px] text-text-muted">/tháng</span>}
                          <span>•</span>
                          <span>{listing.areaM2} m²</span>
                          {listing.bedrooms != null && (
                            <>
                              <span>•</span>
                              <span>{listing.bedrooms} PN</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="truncate">{listing.addressDetail ?? listing.location.name}</span>
                        </div>

                        {listing.status === 'rented' && (
                          <p className="mt-1 text-[11px] text-amber-700 font-medium">
                            Phòng này đã có người thuê — bạn có thể bỏ lưu để dọn dẹp danh sách
                          </p>
                        )}
                        {(listing.status === 'removed' || listing.status === 'expired') && (
                          <p className="mt-1 text-[11px] text-slate-500 font-medium">
                            Phòng này hiện đã tạm ngừng hiển thị trên sàn
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-3 pt-2 sm:pt-0">
                        <Link
                          href={`/tin/${listing.slug}`}
                          className="rounded-xl border border-surface-border bg-white px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:border-brand hover:text-brand transition-colors"
                        >
                          Xem chi tiết
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleUnsave(listing.id)}
                          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors border border-rose-200 cursor-pointer"
                        >
                          Bỏ lưu
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between rounded-2xl border border-surface-border bg-white px-6 py-4 shadow-sm">
                  <p className="text-xs text-text-muted">
                    Hiển thị trang <strong>{page}</strong> / <strong>{totalPages}</strong> (tổng số {total} tin đã lưu)
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3.5 py-1.5 bg-white border border-surface-border text-text-primary text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-surface-muted transition-colors cursor-pointer"
                    >
                      ← Trang trước
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages || loading}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3.5 py-1.5 bg-white border border-surface-border text-text-primary text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-surface-muted transition-colors cursor-pointer"
                    >
                      Trang sau →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
