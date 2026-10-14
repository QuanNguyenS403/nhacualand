'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authFetch, isLoggedIn } from '@/lib/auth-client';
import { SITE_CONFIG } from '@/lib/constants';

interface SellerLead {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  message: string | null;
  channel: string;
  status: string;
  createdAt: string;
  notes: string | null;
  isPhoneMasked?: boolean;
  assignedAgent?: {
    id?: string;
    fullName?: string;
    phone?: string;
    role?: string;
  };
  listing?: {
    id: string;
    title: string;
    slug: string;
    price: string | null;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  new: {
    label: 'Khách mới',
    color: 'bg-brand-100 text-brand-900 border-brand-200',
    desc: 'Chủ nhà đang tiếp nhận nhu cầu',
  },
  contacted: {
    label: 'Đang tư vấn',
    color: 'bg-amber-100 text-amber-900 border-amber-200',
    desc: 'Chủ nhà đã liên hệ và sàng lọc nhu cầu',
  },
  qualified: {
    label: 'Đang xếp lịch xem',
    color: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    desc: 'Đang sắp xếp lịch hẹn dẫn khách xem phòng',
  },
  completed: {
    label: 'Đã thuê thành công',
    color: 'bg-brand-50 text-brand-900 border-brand-300',
    desc: 'Giao dịch thuê đã hoàn tất và bàn giao phòng',
  },
  spam: {
    label: 'Hủy / Spam',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    desc: 'Nhu cầu không phù hợp hoặc khách hủy lịch',
  },
};

export default function MyLeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<SellerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/dang-nhap');
      return;
    }

    async function loadMyLeads() {
      setLoading(true);
      try {
        const res = await authFetch(`/leads/mine?page=${page}&pageSize=20`);
        if (!res.ok) throw new Error('Không thể tải danh sách liên hệ');
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

    loadMyLeads();
  }, [page, router]);

  return (
    <div className="min-h-screen bg-surface-muted py-8">
      <div className="container-max">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-xs text-text-muted">
          <Link href="/" className="hover:text-brand transition-colors">Trang chủ</Link>
          <span>›</span>
          <span className="text-text-secondary font-medium">Khách thuê quan tâm phòng</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-text-primary">Tiến độ khách thuê quan tâm phòng</h1>
            <p className="text-base text-text-muted mt-1.5">
              Có <span className="font-semibold text-brand">{total}</span> yêu cầu đang được {SITE_CONFIG.agentName} ({SITE_CONFIG.agentRole}) trực tiếp điều phối và dẫn xem
            </p>
          </div>
          <Link
            href="/tai-khoan/quan-ly-tin"
            className="inline-flex items-center gap-2 rounded-xl border border-surface-border bg-white px-4 py-2 text-sm font-semibold text-text-secondary hover:border-brand hover:text-brand transition-colors shadow-sm"
          >
            ← Về Quản lý tin
          </Link>
        </div>

        {/* Danh sách leads */}
        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-surface-border bg-white p-12 text-center text-sm text-text-muted">
              Đang tải danh sách khách liên hệ...
            </div>
          ) : leads.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-white p-12 text-center">
              <p className="font-semibold text-text-primary">Chưa có khách thuê nào gửi yêu cầu</p>
              <p className="mt-1 text-xs text-text-secondary">
                Khi có khách để lại nhu cầu xem phòng, chuyên viên tư vấn sẽ tiếp nhận và cập nhật tiến độ tại đây
              </p>
            </div>
          ) : (
            leads.map((lead) => {
              const statusInfo = STATUS_LABELS[lead.status] || {
                label: lead.status,
                color: 'bg-gray-100 text-gray-800 border-gray-200',
                desc: 'Đang xử lý',
              };
              const agentName = lead.assignedAgent?.fullName?.replace(/Nguyễn Đức Quân|Đức Quân/g, 'Chủ nhà') || SITE_CONFIG.agentName;

              return (
                <div
                  key={lead.id}
                  className="rounded-2xl border border-surface-border bg-white p-5 shadow-card space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-text-primary">{lead.fullName}</span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-600">
                          {lead.phone}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        Gửi lúc: {new Date(lead.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {lead.listing && (
                    <div className="text-xs text-text-secondary">
                      <span className="text-text-muted">Phòng quan tâm: </span>
                      <Link
                        href={`/tin/${lead.listing.slug}`}
                        target="_blank"
                        className="font-semibold text-brand hover:underline"
                      >
                        {lead.listing.title}
                      </Link>
                    </div>
                  )}

                  {lead.message && (
                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-700 italic border border-slate-200/60">
                      "{lead.message}"
                    </div>
                  )}

                  {/* Thông tin điều phối bởi người môi giới (Chủ nhà) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <span className="font-semibold text-brand">Người phụ trách dẫn khách:</span>
                      <span>{agentName}</span>
                    </div>

                    <div className="text-[11px] text-text-muted italic">
                      {statusInfo.desc}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between rounded-2xl border border-surface-border bg-white px-6 py-4 shadow-sm">
              <p className="text-xs text-text-muted">
                Hiển thị trang <strong>{page}</strong> / <strong>{totalPages}</strong> (tổng số {total} yêu cầu)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3.5 py-1.5 bg-white border border-surface-border text-text-primary text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-surface-muted transition-colors"
                >
                  ← Trang trước
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3.5 py-1.5 bg-white border border-surface-border text-text-primary text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-surface-muted transition-colors"
                >
                  Trang sau →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
