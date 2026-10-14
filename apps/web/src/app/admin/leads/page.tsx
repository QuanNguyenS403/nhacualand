'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authFetch } from '@/lib/auth-client';

interface LeadItem {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  message: string | null;
  channel: string;
  status: string;
  createdAt: string;
  notes: string | null;
  listing?: {
    id: string;
    title: string;
    slug: string;
    price: string | null;
    owner?: {
      id: string;
      fullName: string | null;
      phone: string;
    };
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: 'Mới gửi', color: 'bg-brand-100 text-brand-900 border-brand-300' },
  contacted: { label: 'Đã liên hệ', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  qualified: { label: 'Tiềm năng', color: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
  completed: { label: 'Thành công', color: 'bg-brand-50 text-brand-900 border-brand-300' },
  spam: { label: 'Spam / Hủy', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  cancelled: { label: 'Đã hủy', color: 'bg-gray-100 text-gray-800 border-gray-300' },
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchLeads() {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', String(page));
      query.set('pageSize', '20');
      if (filterStatus) query.set('status', filterStatus);

      const res = await authFetch(`/leads/admin?${query.toString()}`);
      if (!res.ok) throw new Error('Không thể tải danh sách leads');
      const data = await res.json();
      setLeads(data.items || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeads();
  }, [page, filterStatus]);

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingId(id);
    try {
      const res = await authFetch(`/leads/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setLeads((prev) =>
          prev.map((lead) => (lead.id === id ? { ...lead, status: newStatus } : lead)),
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý Lead khách thuê</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tổng cộng: <span className="font-semibold text-gray-900">{total}</span> yêu cầu liên hệ từ khách thuê
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchLeads()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
        >
          <span>Làm mới</span>
        </button>
      </div>

      {/* Tabs lọc trạng thái */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
        <button
          type="button"
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            filterStatus === '' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tất cả
        </button>
        {Object.entries(STATUS_LABELS).map(([statusKey, { label }]) => (
          <button
            key={statusKey}
            type="button"
            onClick={() => { setFilterStatus(statusKey); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filterStatus === statusKey ? 'bg-brand text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bảng danh sách Leads */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-gray-500">Đang tải danh sách leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Không có lead nào trong trạng thái này
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3">Khách thuê</th>
                  <th className="px-5 py-3">Tin đăng quan tâm</th>
                  <th className="px-5 py-3">Lời nhắn</th>
                  <th className="px-5 py-3">Thời gian</th>
                  <th className="px-5 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => {
                  const statusInfo = STATUS_LABELS[lead.status] || {
                    label: lead.status,
                    color: 'bg-gray-100 text-gray-800',
                  };
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{lead.fullName}</div>
                        <div className="text-xs text-brand font-mono mt-0.5">{lead.phone}</div>
                        {lead.email && <div className="text-xs text-gray-400 mt-0.5">{lead.email}</div>}
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        {lead.listing ? (
                          <>
                            <Link
                              href={`/tin/${lead.listing.slug}`}
                              target="_blank"
                              className="font-medium text-gray-800 hover:text-brand line-clamp-2 transition-colors"
                            >
                              {lead.listing.title}
                            </Link>
                            {lead.listing.owner && (
                              <div className="text-xs text-gray-400 mt-1">
                                Chủ tin: {lead.listing.owner.fullName || 'Ẩn danh'} ({lead.listing.owner.phone})
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">Tin đã gỡ bỏ</span>
                        )}
                      </td>
                      <td className="px-5 py-4 max-w-sm">
                        <p className="text-xs text-gray-600 italic line-clamp-3">
                          "{lead.message || 'Không có lời nhắn'}"
                        </p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                        {new Date(lead.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <select
                          value={lead.status}
                          disabled={updatingId === lead.id}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-colors cursor-pointer ${statusInfo.color}`}
                        >
                          <option value="new">Mới gửi</option>
                          <option value="contacted">Đã liên hệ</option>
                          <option value="qualified">Tiềm năng</option>
                          <option value="completed">Thành công</option>
                          <option value="spam">Spam / Hủy</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Trang {page} / {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
