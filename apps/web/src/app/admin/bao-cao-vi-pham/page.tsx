'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth-client';

interface ReportItem {
  id: string;
  reason: string;
  note: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
  listing: {
    id: string;
    title: string;
    slug: string;
    price: string;
    areaM2: number;
    status: string;
    images: { imageUrl: string }[];
    owner: { id: string; fullName: string | null; phone: string };
  };
  reporter?: { id: string; fullName: string | null; phone: string } | null;
}

const REASON_MAP: Record<string, { label: string; color: string }> = {
  tin_gia: { label: 'Tin giả mạo', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  lua_dao: { label: 'Lừa đảo / Chiếm đoạt', color: 'bg-red-50 text-red-700 border-red-200' },
  sai_thong_tin: { label: 'Sai lệch thông tin / Giá', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  da_ban_cho_thue: { label: 'Đã cho thuê', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  khac: { label: 'Vi phạm khác', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [resolvingReport, setResolvingReport] = useState<{ id: string; action: 'remove_listing' | 'dismiss'; listingTitle: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, [page, statusFilter]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function loadReports() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
        status: statusFilter,
      });

      const res = await authFetch(`/admin/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.items ?? []);
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách báo cáo:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmResolve() {
    if (!resolvingReport) return;
    setSubmitting(true);
    try {
      const res = await authFetch(`/admin/reports/${resolvingReport.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: resolvingReport.action }),
      });

      if (res.ok) {
        showToast(
          resolvingReport.action === 'remove_listing'
            ? 'Đã gỡ bỏ tin đăng vi phạm thành công'
            : 'Đã bỏ qua báo cáo vi phạm',
        );
        setResolvingReport(null);
        loadReports();
      } else {
        alert('Có lỗi xảy ra khi xử lý báo cáo');
      }
    } catch {
      alert('Không thể kết nối tới máy chủ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-brand text-white font-semibold text-sm shadow-xl flex items-center gap-2">
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Xử lý Báo cáo Vi phạm</h1>
          <p className="text-sm text-slate-500 mt-1">
            Xem xét các phản hồi tiêu cực từ người dùng và gỡ bỏ kịp thời các nội dung gian lận
          </p>
        </div>

        {/* Tab Lọc */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold self-start">
          <button
            onClick={() => {
              setStatusFilter('pending');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              statusFilter === 'pending'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Chờ xử lý ({statusFilter === 'pending' ? total : '...'})
          </button>
          <button
            onClick={() => {
              setStatusFilter('resolved');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              statusFilter === 'resolved'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã gỡ tin
          </button>
          <button
            onClick={() => {
              setStatusFilter('dismissed');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              statusFilter === 'dismissed'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã bỏ qua
          </button>
          <button
            onClick={() => {
              setStatusFilter('all');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>

      {/* Danh sách Báo cáo */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-white rounded-2xl border border-slate-200 animate-pulse p-6" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Không có báo cáo vi phạm nào
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {statusFilter === 'pending'
              ? 'Tất cả báo cáo vi phạm đã được giải quyết. Sàn giao dịch đang được duy trì sạch sẽ'
              : 'Không có dữ liệu cho trạng thái đã chọn'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => {
            const reasonInfo = REASON_MAP[rep.reason] ?? {
              label: rep.reason,
              color: 'bg-slate-50 text-slate-700 border-slate-200',
            };

            return (
              <div
                key={rep.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 flex flex-col md:flex-row gap-5"
              >
                {/* Cột trái: Thông tin vi phạm */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${reasonInfo.color}`}>
                      {reasonInfo.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      Mã báo cáo: #{rep.id}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-400">
                      Gửi lúc: {new Date(rep.createdAt).toLocaleString('vi-VN')}
                    </span>
                    {rep.status === 'resolved' && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">
                        Đã gỡ tin
                      </span>
                    )}
                    {rep.status === 'dismissed' && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600">
                        Đã bỏ qua
                      </span>
                    )}
                  </div>

                  {rep.note && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">Chi tiết phản ánh từ người dùng:</span>
                      <p className="mt-1 italic">"{rep.note}"</p>
                    </div>
                  )}

                  {/* Thông tin tin đăng bị báo cáo */}
                  <div className="flex items-start gap-3 p-3.5 bg-amber-50/40 border border-amber-200/60 rounded-xl">
                    <div className="w-14 h-14 rounded-lg bg-slate-200 border border-slate-300 overflow-hidden shrink-0">
                      {rep.listing.images?.[0]?.imageUrl ? (
                        <img
                          src={rep.listing.images[0].imageUrl}
                          alt={rep.listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                          No img
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Tin bị phản ánh: #{rep.listing.id}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">
                        {rep.listing.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Chủ tin: <strong>{rep.listing.owner.fullName ?? 'Chưa đặt tên'}</strong> ({rep.listing.owner.phone})
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Trạng thái tin hiện tại: <span className="font-semibold text-slate-700 uppercase">{rep.listing.status}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cột phải: Thao tác xử lý */}
                <div className="md:w-56 flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5">
                  <div className="w-full text-right text-xs text-slate-400 mb-4">
                    {rep.reporter ? (
                      <p>Người báo: {rep.reporter.fullName ?? rep.reporter.phone}</p>
                    ) : (
                      <p>Khách vãng lai gửi</p>
                    )}
                  </div>

                  {rep.status === 'pending' ? (
                    <div className="w-full space-y-2">
                      <button
                        onClick={() =>
                          setResolvingReport({
                            id: rep.id,
                            action: 'remove_listing',
                            listingTitle: rep.listing.title,
                          })
                        }
                        className="w-full px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <span>Gỡ bỏ tin vi phạm</span>
                      </button>
                      <button
                        onClick={() =>
                          setResolvingReport({
                            id: rep.id,
                            action: 'dismiss',
                            listingTitle: rep.listing.title,
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                      >
                        Bỏ qua báo cáo này
                      </button>
                    </div>
                  ) : (
                    <div className="text-right text-xs text-slate-400">
                      Đã xử lý lúc {rep.resolvedAt ? new Date(rep.resolvedAt).toLocaleDateString('vi-VN') : '—'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-slate-500">
                Trang {page} / {totalPages} (tổng số {total} báo cáo)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  ← Trước
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Xác nhận Xử lý Báo cáo */}
      {resolvingReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                {resolvingReport.action === 'remove_listing'
                  ? 'Gỡ bỏ tin đăng vi phạm?'
                  : 'Bỏ qua báo cáo vi phạm?'}
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {resolvingReport.action === 'remove_listing' ? (
                  <>
                    Hành động này sẽ <strong>chuyển tin đăng sang trạng thái ĐÃ GỠ</strong> và ẩn khỏi toàn bộ trang tìm kiếm/danh mục của người dùng
                  </>
                ) : (
                  <>
                    Báo cáo này sẽ được đánh dấu là đã xem xét và đóng lại. Tin đăng vẫn tiếp tục hoạt động bình thường trên sàn
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResolvingReport(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmResolve}
                className={`flex-1 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-colors disabled:opacity-50 ${
                  resolvingReport.action === 'remove_listing'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-slate-700 hover:bg-slate-800'
                }`}
              >
                {resolvingReport.action === 'remove_listing' ? 'Xác nhận gỡ tin' : 'Xác nhận bỏ qua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
