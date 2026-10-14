'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth-client';
import { formatExactPrice } from '@/lib/api';

interface MembershipRequest {
  id: string;
  userId: string;
  planId: number;
  status: 'pending' | 'active' | 'rejected' | 'expired';
  quotedAmount: string;
  pricePaid: string;
  confirmedPaymentAmount: string;
  externalTransactionId: string | null;
  rejectionReason: string | null;
  startDate: string | null;
  endDate: string | null;
  paymentNote: string | null;
  createdAt: string;
  user: {
    id: string;
    phone: string;
    fullName: string | null;
    role: string;
  };
  plan: {
    id: number;
    name: string;
    code: string;
    durationDays: number;
    maxActiveListings: number;
  };
}

interface FinanceSummary {
  confirmedCashIn: number;
  refundsPaid: number;
  netCashIn: number;
  cashInCount: number;
  refundCount: number;
  pendingOrdersCount: number;
  pendingQuotedTotal: number;
  operationalCosts: string;
  notes: string;
}

export default function AdminDuyetGoiPage() {
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [searchPhone, setSearchPhone] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function loadFinanceSummary() {
    try {
      const res = await authFetch('/admin/finance/summary');
      if (res.ok) {
        const data = await res.json();
        setFinanceSummary(data);
      }
    } catch {
      // safe-fail
    }
  }

  async function loadRequests(targetPage = page) {
    setLoading(true);
    try {
      const statusParam = activeTab === 'pending' ? 'status=pending&' : '';
      const phoneParam = searchPhone.trim() ? `phone=${encodeURIComponent(searchPhone.trim())}&` : '';
      const res = await authFetch(`/admin/membership-requests?${statusParam}${phoneParam}page=${targetPage}&pageSize=20`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.items || []);
        if (data.pagination) {
          setPage(data.pagination.page);
          setTotalPages(data.pagination.totalPages || 1);
          setTotal(data.pagination.total || 0);
        }
      }
    } catch {
      // safe-fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinanceSummary();
  }, []);

  useEffect(() => {
    setPage(1);
    loadRequests(1);
  }, [activeTab]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadRequests(1);
  }

  async function handleApprove(requestId: string, planName: string, userPhone: string, defaultAmount: string) {
    const extTx = prompt(
      `Nhập mã giao dịch ngân hàng / Bank Ref (chứng từ thực tế bắt buộc):`,
      `VCB_${Date.now().toString().slice(-6)}`,
    );
    if (!extTx || !extTx.trim()) {
      alert('Mã giao dịch ngân hàng là bắt buộc để đối soát sao kê kế toán (F02)');
      return;
    }

    const defaultAmtNum = parseInt(defaultAmount ? String(defaultAmount) : '199000', 10);
    const amountStr = prompt(
      `Xác nhận số tiền thực nhận vào tài khoản ngân hàng (VNĐ, số nguyên dương):`,
      String(isNaN(defaultAmtNum) || defaultAmtNum <= 0 ? 199000 : defaultAmtNum),
    );
    if (!amountStr) return;
    const confirmedAmount = parseInt(amountStr.replace(/\D/g, ''), 10);
    if (isNaN(confirmedAmount) || confirmedAmount <= 0) {
      alert('Số tiền thực nhận không hợp lệ, vui lòng nhập số nguyên dương > 0');
      return;
    }

    const note = prompt('Ghi chú kế toán (tùy chọn):', 'Đã khớp sao kê tài khoản ngân hàng') || undefined;

    setActionLoading(requestId);
    setFeedback(null);
    try {
      let mfaCode: string | null = null;
      let res = await authFetch(`/admin/membership-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalTransactionId: extTx.trim(),
          confirmedAmount,
          ...(note ? { adminNote: note.trim() } : {}),
        }),
      });

      // Nếu hệ thống yêu cầu xác thực hai bước (MFA)
      if (res.status === 403) {
        const err = await res.json();
        if (err.message && (err.message.includes('MFA') || err.message.includes('x-admin-mfa-code'))) {
          const inputMfa = prompt('Thao tác nhạy cảm yêu cầu mã xác thực hai bước (MFA).\nVui lòng nhập mã x-admin-mfa-code:');
          if (inputMfa && inputMfa.trim()) {
            mfaCode = inputMfa.trim();
            res = await authFetch(`/admin/membership-requests/${requestId}/approve`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-admin-mfa-code': mfaCode,
              },
              body: JSON.stringify({
                externalTransactionId: extTx.trim(),
                confirmedAmount,
                ...(note ? { adminNote: note.trim() } : {}),
              }),
            });
          } else {
            throw new Error('Thao tác bị hủy do không cung cấp mã MFA.');
          }
        }
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Không thể phê duyệt yêu cầu.');
      }

      setFeedback({
        type: 'success',
        message: `Đã kích hoạt thành công gói "${planName}" cho SĐT ${userPhone}! Đã ghi nhận dòng tiền ${confirmedAmount.toLocaleString('vi-VN')} đ vào Sổ cái.`,
      });
      loadRequests();
      loadFinanceSummary();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Đã có lỗi xảy ra.' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRefund(requestId: string, userPhone: string, currentAmount?: string) {
    const extTx = prompt(
      `Nhập mã chứng từ ngân hàng chuyển hoàn (Bank Ref hoàn tiền bắt buộc):`,
      `REF_${Date.now().toString().slice(-6)}`,
    );
    if (!extTx || !extTx.trim()) {
      alert('Mã chứng từ chi hoàn tiền là bắt buộc để đối soát sổ cái (F03)');
      return;
    }

    const reason = prompt(`Nhập lý do hoàn tiền cho SĐT ${userPhone} (bắt buộc):`);
    if (!reason || !reason.trim()) {
      alert('Lý do hoàn tiền là bắt buộc');
      return;
    }

    let refundAmount: number | undefined;
    if (currentAmount) {
      const parsedAmt = parseInt(currentAmount, 10);
      if (!isNaN(parsedAmt) && parsedAmt > 0) {
        const refundStr = prompt(
          `Số tiền hoàn lại (VNĐ, để trống sẽ hoàn đủ ${parsedAmt.toLocaleString('vi-VN')} đ):`,
          String(parsedAmt),
        );
        if (refundStr && refundStr.trim()) {
          const parsed = parseInt(refundStr.replace(/\D/g, ''), 10);
          if (!isNaN(parsed) && parsed > 0) {
            refundAmount = parsed;
          }
        }
      }
    }

    setActionLoading(requestId);
    setFeedback(null);
    try {
      let mfaCode: string | null = null;
      let res = await authFetch(`/admin/membership-requests/${requestId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason.trim(),
          externalTransactionId: extTx.trim(),
          ...(refundAmount ? { refundAmount } : {}),
        }),
      });

      // Nếu hệ thống yêu cầu xác thực hai bước (MFA)
      if (res.status === 403) {
        const err = await res.json();
        if (err.message && (err.message.includes('MFA') || err.message.includes('x-admin-mfa-code'))) {
          const inputMfa = prompt('Thao tác nhạy cảm yêu cầu mã xác thực hai bước (MFA).\nVui lòng nhập mã x-admin-mfa-code:');
          if (inputMfa && inputMfa.trim()) {
            mfaCode = inputMfa.trim();
            res = await authFetch(`/admin/membership-requests/${requestId}/refund`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-admin-mfa-code': mfaCode,
              },
              body: JSON.stringify({
                reason: reason.trim(),
                externalTransactionId: extTx.trim(),
                ...(refundAmount ? { refundAmount } : {}),
              }),
            });
          } else {
            throw new Error('Thao tác bị hủy do không cung cấp mã MFA.');
          }
        }
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Không thể thực hiện hoàn tiền.');
      }

      setFeedback({
        type: 'success',
        message: `Đã xử lý hoàn tiền cho SĐT ${userPhone} và hủy kích hoạt gói`,
      });
      loadRequests();
      loadFinanceSummary();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Đã có lỗi xảy ra.' });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(requestId: string, userPhone: string) {
    const reason = prompt(`Nhập lý do từ chối yêu cầu của SĐT ${userPhone}:`);
    if (reason === null) return;

    setActionLoading(requestId);
    setFeedback(null);
    try {
      const res = await authFetch(`/admin/membership-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || 'Chưa nhận được thanh toán' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Không thể từ chối yêu cầu.');
      }

      setFeedback({
        type: 'success',
        message: `Đã từ chối yêu cầu của SĐT ${userPhone}`,
      });
      loadRequests();
      loadFinanceSummary();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Đã có lỗi xảy ra.' });
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Duyệt Yêu Cầu Gói Thành Viên & Sổ Cái Tài Chính
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Đối soát sao kê ngân hàng và kích hoạt gói đăng tin cho chủ trọ / môi giới. Dòng tiền thực thu được ghi nhận độc lập vào Sổ cái tài chính (FinanceLedger)
        </p>
      </div>

      {/* Finance Ledger Summary (AF-10: Truth từ FinanceLedger) */}
      {financeSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 shadow-xs">
            <p className="text-xs font-medium text-brand-900">Tiền thực thu (Confirmed Cash-in)</p>
            <p className="text-xl font-extrabold text-brand font-mono mt-1">
              {formatExactPrice(financeSummary.confirmedCashIn)}
            </p>
            <p className="text-[11px] text-brand-800 mt-1">{financeSummary.cashInCount} giao dịch xác nhận</p>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs">
            <p className="text-xs font-medium text-rose-800">Đã hoàn tiền (Refunds)</p>
            <p className="text-xl font-extrabold text-rose-700 font-mono mt-1">
              {formatExactPrice(financeSummary.refundsPaid)}
            </p>
            <p className="text-[11px] text-rose-600 mt-1">{financeSummary.refundCount} giao dịch hoàn</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
            <p className="text-xs font-medium text-amber-900">Doanh thu thuần (Net Cash-in)</p>
            <p className="text-xl font-extrabold text-amber-800 font-mono mt-1">
              {formatExactPrice(financeSummary.netCashIn)}
            </p>
            <p className="text-[11px] text-amber-700 mt-1">Nguồn sự thật: Sổ cái bất biến</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
            <p className="text-xs font-medium text-amber-800">Chờ thu (Pending Quoted)</p>
            <p className="text-xl font-extrabold text-amber-700 font-mono mt-1">
              {formatExactPrice(financeSummary.pendingQuotedTotal)}
            </p>
            <p className="text-[11px] text-amber-600 mt-1">Chưa phải doanh thu ({financeSummary.pendingOrdersCount} đơn)</p>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-2xl p-4 text-sm flex items-center justify-between shadow-sm animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-brand-50 text-brand-900 border border-brand-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 text-sm font-bold border-b-2 -mb-3 transition-all ${
              activeTab === 'pending'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Chờ duyệt thanh toán
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 text-sm font-bold border-b-2 -mb-3 transition-all ${
              activeTab === 'all'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Tất cả lịch sử yêu cầu
          </button>
        </div>

        {/* Tìm kiếm theo số điện thoại (AF-09) */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Tìm theo số điện thoại..."
            value={searchPhone}
            onChange={(e) => setSearchPhone(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-brand w-full sm:w-56"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-brand text-white font-semibold text-xs rounded-xl hover:bg-brand-dark"
          >
            Tìm
          </button>
        </form>
      </div>

      {/* Bảng dữ liệu */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Đang tải danh sách yêu cầu...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            {activeTab === 'pending'
              ? 'Hiện không có yêu cầu nâng cấp gói nào đang chờ duyệt'
              : 'Chưa có lịch sử yêu cầu nào khớp điều kiện tìm kiếm'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Khách hàng</th>
                  <th className="px-6 py-3.5">Gói đăng ký</th>
                  <th className="px-6 py-3.5">Số tiền</th>
                  <th className="px-6 py-3.5">Ghi chú & Mã GD</th>
                  <th className="px-6 py-3.5">Thời gian</th>
                  <th className="px-6 py-3.5">Trạng thái</th>
                  <th className="px-6 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((item) => {
                  const isPending = item.status === 'pending';
                  const isActive = item.status === 'active';
                  const isRejected = item.status === 'rejected';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Khách hàng */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-xs">
                          {item.user.fullName || 'Chưa cập nhật tên'}
                        </p>
                        <a
                          href={`tel:${item.user.phone}`}
                          className="text-[11px] text-brand font-mono font-bold hover:underline"
                        >
                          {item.user.phone}
                        </a>
                      </td>

                      {/* Gói đăng ký */}
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{item.plan.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tối đa <strong>{item.plan.maxActiveListings} tin</strong> • {item.plan.durationDays} ngày
                        </p>
                      </td>

                      {/* Số tiền (AF-01 / P0-07 / P0-08) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPending ? (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block">Báo giá:</span>
                            <strong className="text-amber-600 font-extrabold text-sm font-mono">
                              {formatExactPrice(item.quotedAmount || item.pricePaid)}
                            </strong>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] font-bold text-brand-800 block">Thực thu:</span>
                            <strong className="text-brand font-extrabold text-sm font-mono">
                              {formatExactPrice(item.confirmedPaymentAmount || item.pricePaid)}
                            </strong>
                          </div>
                        )}
                      </td>

                      {/* Ghi chú & Mã GD */}
                      <td className="px-6 py-4">
                        {item.externalTransactionId && (
                          <p className="text-[10px] font-mono text-slate-500 mb-1">
                            Ref: <strong className="text-slate-800">{item.externalTransactionId}</strong>
                          </p>
                        )}
                        {item.paymentNote ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] text-slate-700 font-mono max-w-xs">
                            {item.paymentNote}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Không có ghi chú</span>
                        )}
                        {item.rejectionReason && (
                          <p className="text-[11px] text-rose-600 mt-1">Lý do từ chối: {item.rejectionReason}</p>
                        )}
                      </td>

                      {/* Thời gian */}
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-[11px]">
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Chờ xác nhận
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-brand-100 text-brand-900">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                            Đã kích hoạt
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Đã từ chối
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={actionLoading === item.id}
                              onClick={() => handleApprove(item.id, item.plan.name, item.user.phone, item.quotedAmount || item.pricePaid)}
                              className="px-3 py-1.5 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
                            >
                              {actionLoading === item.id ? 'Đang duyệt...' : 'Xác nhận & Kích hoạt'}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === item.id}
                              onClick={() => handleReject(item.id, item.user.phone)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-semibold text-xs rounded-xl transition-colors"
                            >
                              Từ chối
                            </button>
                          </div>
                        ) : isActive ? (
                          <button
                            type="button"
                            disabled={actionLoading === item.id}
                            onClick={() => handleRefund(item.id, item.user.phone, item.confirmedPaymentAmount || item.pricePaid)}
                            className="px-2.5 py-1 text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg transition-colors border border-rose-200"
                          >
                            Hoàn tiền (Refund)
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Đã kết thúc</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Phân trang */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                <p className="text-xs text-slate-500">
                  Hiển thị trang <strong>{page}</strong> / <strong>{totalPages}</strong> (tổng số {total} yêu cầu)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => loadRequests(page - 1)}
                    className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-slate-100"
                  >
                    ← Trước
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => loadRequests(page + 1)}
                    className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg disabled:opacity-40 hover:bg-slate-100"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
