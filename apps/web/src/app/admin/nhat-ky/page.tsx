'use client';

import { useEffect, useState, useCallback } from 'react';
import { authFetch } from '@/lib/auth-client';

interface AuditLogItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  actorId: string | null;
  actorPhone?: string | null;
  actorName?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'listing.approve': { label: 'Duyệt tin', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'listing.reject': { label: 'Từ chối tin', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  'listing.rented': { label: 'Đã cho thuê', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  'listing.available': { label: 'Mở lại tin', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'listing.remove': { label: 'Gỡ tin', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  'listing.create': { label: 'Đăng tin mới', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  'listing.update': { label: 'Cập nhật tin', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  'user.block': { label: 'Khóa tài khoản', color: 'bg-red-50 text-red-700 border-red-200' },
  'user.unblock': { label: 'Mở khóa tài khoản', color: 'bg-green-50 text-green-700 border-green-200' },
  'lead.assign': { label: 'Phân công lead', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Bộ lọc
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedResource, setSelectedResource] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadLogs = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        pageSize: '20',
      });
      if (selectedAction) params.set('action', selectedAction);
      if (selectedResource) params.set('resourceType', selectedResource);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await authFetch(`/admin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
        setTotal(data.pagination?.total ?? 0);
        setPage(data.pagination?.page ?? targetPage);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Lỗi khi tải nhật ký hệ thống:', err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedAction, selectedResource, startDate, endDate]);

  useEffect(() => {
    loadLogs(page);
  }, [loadLogs, page]);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadLogs(1);
  }

  function handleResetFilters() {
    setSelectedAction('');
    setSelectedResource('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Nhật ký hệ thống
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ghi nhận toàn diện các hành động kiểm duyệt, quản lý dữ liệu và bảo mật ({total} bản ghi)
          </p>
        </div>
      </div>

      {/* Bộ lọc nâng cao */}
      <form onSubmit={handleFilterSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Hành động</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Tất cả hành động</option>
              <option value="listing.approve">Duyệt tin đăng</option>
              <option value="listing.reject">Từ chối tin</option>
              <option value="listing.rented">Đã cho thuê</option>
              <option value="listing.available">Mở lại tin</option>
              <option value="listing.remove">Gỡ tin</option>
              <option value="user.block">Khóa tài khoản</option>
              <option value="user.unblock">Mở khóa tài khoản</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Đối tượng</label>
            <select
              value={selectedResource}
              onChange={(e) => setSelectedResource(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="">Tất cả đối tượng</option>
              <option value="listing">Tin đăng (Listing)</option>
              <option value="user">Người dùng (User)</option>
              <option value="lead">Lead khách thuê</option>
              <option value="auth">Xác thực hệ thống</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Đặt lại
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            Lọc kết quả
          </button>
        </div>
      </form>

      {/* Danh sách nhật ký */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Chưa có bản ghi nhật ký nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Không tìm thấy sự kiện nào phù hợp với điều kiện tìm kiếm đã chọn
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Thời gian</th>
                  <th className="py-3.5 px-4">Hành động</th>
                  <th className="py-3.5 px-4">Đối tượng</th>
                  <th className="py-3.5 px-4">Người thực hiện</th>
                  <th className="py-3.5 px-6">Chi tiết / Thông tin bổ sung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {logs.map((log) => {
                  const actionConfig = ACTION_LABELS[log.action] ?? {
                    label: log.action,
                    color: 'bg-slate-50 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${actionConfig.color}`}>
                          {actionConfig.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900">{log.resourceType}</span>
                        {log.resourceId && (
                          <span className="ml-1 text-[11px] font-mono text-slate-500">#{log.resourceId}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">
                            {log.actorName || log.actorPhone || 'Hệ thống'}
                          </span>
                          {log.actorRole && (
                            <span className="text-[10px] text-slate-400 capitalize">{log.actorRole}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-6">
                        {log.metadata ? (
                          <span className="font-mono text-[11px] text-slate-600 block max-w-md truncate" title={JSON.stringify(log.metadata)}>
                            {JSON.stringify(log.metadata)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <p className="text-xs text-slate-500">
                Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (tổng số {total} bản ghi)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Sau →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
