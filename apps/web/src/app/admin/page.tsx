'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth-client';
import { formatExactPrice } from '@/lib/api';

interface ServiceDrivers {
  email: { isMock: boolean; driver: string };
  googleSheets: { isMock: boolean; driver: string };
}

interface Stats {
  pendingListingsCount: number;
  newReportsCount: number;
  activeListingsCount: number;
  totalUsersCount: number;
}

interface MoneyStats {
  confirmedCashIn: string;
  confirmedCashInFormatted: string;
  refundsPaid: string;
  refundsPaidFormatted: string;
  netCashFlow: string;
  netCashFlowFormatted: string;
  pendingQuotedTotal: string;
  pendingQuotedTotalFormatted: string;
  pendingRefundObligations: string;
  unverifiedTransactionsCount: number;
  operationalCosts: string;
  disclaimer: string;
}

interface GrowthStats {
  totalActiveListings: number;
  verifiedActiveListings: number;
  newListingsLast7Days: number;
  activeLandlordsCount: number;
  totalLeadsCount: number;
  leadsLast7Days: number;
  contactedLeadsCount: number;
  paidMembershipsCount: number;
  conversionFunnel: {
    activeListings: number;
    phoneReveals: number;
    leadsCreated: number;
    leadsContacted: number;
  };
  disclaimer: string;
}

interface RiskStats {
  pendingReportsCount: number;
  expiredListingsCount: number;
  rejectedListingsCount: number;
  rejectionRate: string;
  outboxDlqCount: number;
  blockedUsersCount: number;
  recentAuditEvents: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    actorPhone?: string;
    reason?: string;
    createdAt: string;
  }>;
  disclaimer: string;
}

interface PilotStats {
  verifiedSupplyCount: number;
  verifiedSupplyRatio: string;
  targetVerifiedSupplyRatio: string;
  isVerifiedSupplyMet: boolean;
  leadResponseRate: string;
  targetLeadResponseRate: string;
  isLeadResponseMet: boolean;
  violationRate: string;
  targetViolationRate: string;
  isViolationRateMet: boolean;
  disclaimer: string;
}

interface DashboardData {
  stats?: Stats;
  money?: MoneyStats;
  financeSummary?: MoneyStats;
  growth?: GrowthStats;
  risk?: RiskStats;
  pilot?: PilotStats;
  serviceDrivers?: ServiceDrivers;
  recentPendingListings?: any[];
  recentReports?: any[];
}

function formatPriceVND(priceStr: string): string {
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
    return priceStr;
  }
}

const REASON_LABELS: Record<string, string> = {
  tin_gia: 'Tin giả mạo',
  lua_dao: 'Lừa đảo',
  sai_thong_tin: 'Sai thông tin',
  da_ban_cho_thue: 'Đã cho thuê',
  khac: 'Khác',
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'money' | 'growth' | 'risk'>('all');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await authFetch('/admin/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickApprove(id: string) {
    if (!confirm('Bạn có chắc muốn duyệt ngay tin đăng này?')) return;
    try {
      const res = await authFetch(`/admin/listings/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        setActionMessage('Đã duyệt tin đăng thành công');
        setTimeout(() => setActionMessage(null), 3000);
        loadDashboard();
      }
    } catch {
      alert('Có lỗi xảy ra khi duyệt tin');
    }
  }

  async function handleRunSweep() {
    setSweeping(true);
    try {
      const res = await authFetch('/admin/tasks/run-sweep', { method: 'POST' });
      if (res.ok) {
        const sweepRes = await res.json();
        setActionMessage(sweepRes.message ?? 'Đã hoàn tất quét dọn hệ thống');
        setTimeout(() => setActionMessage(null), 6000);
        loadDashboard();
      } else {
        alert('Không thể thực hiện quét dọn');
      }
    } catch {
      alert('Lỗi kết nối máy chủ khi quét dọn');
    } finally {
      setSweeping(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 animate-pulse p-6" />
          ))}
        </div>
      </div>
    );
  }

  const money = data?.money;
  const growth = data?.growth;
  const risk = data?.risk;
  const stats = data?.stats;
  const serviceDrivers = data?.serviceDrivers;
  const recentListings = data?.recentPendingListings ?? [];
  const recentReports = data?.recentReports ?? [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Tiêu đề trang & Các nút hành động */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Bảng Điều Khiển Quản Trị</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-900 font-semibold">
              Chuẩn §8.1
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Vận hành theo 3 bảng độc lập: <strong>TIỀN TỆ (MONEY)</strong>, <strong>TĂNG TRƯỞNG (GROWTH)</strong>, <strong>RỦI RO (RISK)</strong>
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleRunSweep}
            disabled={sweeping}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-brand-800 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-colors disabled:opacity-50"
            title="Quét dọn các tin quá hạn 30 ngày và thu hồi bộ nhớ OTP"
          >
            <span>{sweeping ? 'Đang quét...' : 'Quét dọn tin quá hạn & OTP'}</span>
          </button>
          <button
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Làm mới số liệu
          </button>
        </div>
      </div>

      {/* Tabs chuyển đổi góc nhìn */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tất cả 3 Bảng
        </button>
        <button
          onClick={() => setActiveTab('money')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'money'
              ? 'bg-brand text-white shadow-xs'
              : 'text-brand-800 bg-brand-50 hover:bg-brand-100'
          }`}
        >
          1. BẢNG TIỀN TỆ (MONEY)
        </button>
        <button
          onClick={() => setActiveTab('growth')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'growth'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
          }`}
        >
          2. BẢNG TĂNG TRƯỞNG (GROWTH)
        </button>
        <button
          onClick={() => setActiveTab('risk')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'risk'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-rose-700 bg-rose-50 hover:bg-rose-100'
          }`}
        >
          3. BẢNG RỦI RO & BẢO VỆ (RISK)
        </button>
      </div>

      {/* Cảnh báo chế độ tích hợp (MOCK / LIVE) */}
      {(serviceDrivers?.email?.isMock || serviceDrivers?.googleSheets?.isMock) && (
        <div className="p-4 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <div>
              <p className="font-bold text-amber-950 text-sm">
                Thông báo Vận hành: Dịch vụ thông báo & đồng bộ đang chạy ở chế độ MOCK (Thử nghiệm)
              </p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                {serviceDrivers?.email?.isMock && '• Email SMTP đang MOCK. '}
                {serviceDrivers?.googleSheets?.isMock && '• Google Sheets API đang MOCK. '}
                Để kích hoạt thật, cấu hình <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">SMTP_HOST/USER/PASS</code> và <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">GOOGLE_SHEETS_CREDENTIALS_JSON</code> trong <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">.env</code>.
              </p>
            </div>
          </div>
          <span className="shrink-0 font-bold px-2.5 py-1 bg-amber-200/70 text-amber-900 rounded-lg text-[11px] uppercase tracking-wider">
            Mock Driver
          </span>
        </div>
      )}

      {actionMessage && (
        <div className="p-4 bg-brand-50 border border-brand-200 text-brand-900 rounded-xl text-sm font-medium flex items-center gap-2">
          <span>{actionMessage}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. BẢNG TIỀN TỆ (MONEY) — Thu/chi thực ở đâu, lệch gì? */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'money') && money && (
        <div className="bg-white rounded-2xl border border-brand-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>1. BẢNG TIỀN TỆ (MONEY)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Câu hỏi: Thu/chi thực ở đâu, lệch gì?
                </span>
              </h2>
            </div>
            <Link
              href="/admin/duyet-goi"
              className="text-xs font-semibold text-brand-800 hover:text-brand-900 flex items-center gap-1"
            >
              Đối soát sổ cái & Duyệt gói →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tiền thực thu */}
            <div className="bg-brand-50/70 border border-brand-200 rounded-xl p-4">
              <span className="text-xs font-bold text-brand-900 uppercase tracking-wider">
                Thu đã đối soát
              </span>
              <p className="text-2xl font-extrabold text-brand font-mono mt-1">
                {money.confirmedCashInFormatted}
              </p>
              <p className="text-[11px] text-brand-800 mt-1">
                Ghi nhận vào Sổ cái Dòng tiền thực thu (Finance Ledger / FinanceLedger)
              </p>
            </div>

            {/* Tiền vào ròng */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Tiền vào ròng (Net Cash Flow)
              </span>
              <p className="text-2xl font-extrabold text-amber-800 font-mono mt-1">
                {money.netCashFlowFormatted}
              </p>
              <p className="text-[11px] text-amber-700 mt-1">
                Đã trừ {money.refundsPaidFormatted} tiền hoàn
              </p>
            </div>

            {/* Tiền chờ xác nhận */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Tiền chờ xác nhận (Pending)
              </span>
              <p className="text-2xl font-extrabold text-amber-700 font-mono mt-1">
                {money.pendingQuotedTotalFormatted}
              </p>
              <p className="text-[11px] text-amber-600 mt-1">
                Gói pending chưa phải doanh thu
              </p>
            </div>

            {/* Chi phí vận hành & Giao dịch lệch */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Chi phí & Giao dịch lệch
              </span>
              <p className="text-xs font-bold text-slate-700 mt-1.5">
                {money.operationalCosts}
              </p>
              <p className="text-[11px] text-rose-600 mt-1 font-medium">
                {money.unverifiedTransactionsCount > 0
                  ? `${money.unverifiedTransactionsCount} giao dịch thiếu bằng chứng`
                  : '0 giao dịch lệch'}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <span><strong>Kiểm soát tài chính (§8.1):</strong> {money.disclaimer}</span>
            <span className="text-[11px] text-slate-400">Snapshot bất biến (F04)</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. BẢNG TĂNG TRƯỞNG (GROWTH) — Nguồn cung tốt & kết nối */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'growth') && growth && (
        <div className="bg-white rounded-2xl border border-amber-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>2. BẢNG TĂNG TRƯỞNG (GROWTH)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Câu hỏi: Nguồn cung tốt và kết nối có tăng không?
                </span>
              </h2>
            </div>
            <span className="text-xs font-semibold text-amber-800">
              Đo lường nguồn cung thực tế
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase">Tin còn phòng công khai</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{growth.totalActiveListings}</p>
              <p className="text-[11px] text-amber-700 mt-1">
                {growth.verifiedActiveListings} tin đã xác thực thực tế
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase">Chủ cho thuê hoạt động</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{growth.activeLandlordsCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Có ít nhất 1 tin active trên sàn
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase">Khách thuê để lại liên hệ</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{growth.totalLeadsCount}</p>
              <p className="text-[11px] text-brand mt-1">
                +{growth.leadsLast7Days} lead trong 7 ngày qua
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase">Gói công cụ trả phí</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{growth.paidMembershipsCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Thuê bao công cụ người cho thuê
              </p>
            </div>
          </div>

          {/* Phễu kết nối & chuyển đổi (Conversion Funnel) */}
          <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100">
            <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider mb-2">
              Phễu Kết Nối Người Thuê (Funnel)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                <span className="text-[11px] text-slate-500">1. Tin công khai</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{growth.conversionFunnel.activeListings}</p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                <span className="text-[11px] text-slate-500">2. Lượt xem SĐT</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{growth.conversionFunnel.phoneReveals}</p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                <span className="text-[11px] text-slate-500">3. Lead liên hệ</span>
                <p className="text-lg font-bold text-slate-900 mt-0.5">{growth.conversionFunnel.leadsCreated}</p>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-amber-100">
                <span className="text-[11px] text-slate-500">4. Đã trao đổi</span>
                <p className="text-lg font-bold text-brand mt-0.5">{growth.conversionFunnel.leadsContacted}</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              {growth.disclaimer}
            </p>
          </div>

          {/* Chỉ số KPI Pilot Nguồn cung thực tế (§4.5 & §7) */}
          {data?.pilot && (
            <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span>CHỈ SỐ VẬN HÀNH THỬ NGHIỆM PILOT (§4.5 & §7)</span>
                </h3>
                <span className="text-[11px] text-slate-500 italic">
                  Địa bàn tập trung • Chu kỳ xác nhận 7 ngày
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* KPI 1: Xác nhận còn phòng */}
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500">Xác nhận còn phòng (7 ngày)</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      data.pilot.isVerifiedSupplyMet ? 'bg-brand-100 text-brand-900' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {data.pilot.isVerifiedSupplyMet ? 'ĐẠT' : 'CẦN TĂNG'}
                    </span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">{data.pilot.verifiedSupplyRatio}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Mục tiêu: {data.pilot.targetVerifiedSupplyRatio} ({data.pilot.verifiedSupplyCount} tin)
                  </p>
                </div>

                {/* KPI 2: Phản hồi lead */}
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500">Tỷ lệ phản hồi lead</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      data.pilot.isLeadResponseMet ? 'bg-brand-100 text-brand-900' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {data.pilot.isLeadResponseMet ? 'ĐẠT' : 'CẦN TĂNG'}
                    </span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">{data.pilot.leadResponseRate}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Mục tiêu phản hồi trong 24h: {data.pilot.targetLeadResponseRate}
                  </p>
                </div>

                {/* KPI 3: Tỷ lệ vi phạm */}
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500">Tỷ lệ tin vi phạm</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      data.pilot.isViolationRateMet ? 'bg-brand-100 text-brand-900' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {data.pilot.isViolationRateMet ? 'ĐẠT' : 'CẦN XỬ LÝ'}
                    </span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">{data.pilot.violationRate}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Ngưỡng vi phạm nghiêm trọng: {data.pilot.targetViolationRate}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 text-center italic">
                {data.pilot.disclaimer}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. BẢNG RỦI RO & BẢO VỆ (RISK) — Có vấn đề gì cần xử lý ngay? */}
      {/* ========================================================= */}
      {(activeTab === 'all' || activeTab === 'risk') && risk && (
        <div className="bg-white rounded-2xl border border-rose-200/80 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>3. BẢNG RỦI RO & BẢO VỆ (RISK)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Câu hỏi: Có vấn đề gì cần xử lý ngay?
                </span>
              </h2>
            </div>
            <Link
              href="/admin/bao-cao-vi-pham"
              className="text-xs font-semibold text-rose-700 hover:text-rose-800"
            >
              Xem báo cáo vi phạm ({risk.pendingReportsCount}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Báo cáo vi phạm</span>
              <p className="text-2xl font-extrabold text-rose-700 mt-1">{risk.pendingReportsCount}</p>
              <p className="text-[11px] text-rose-600 mt-1">Cần xem xét và gỡ tin nếu sai</p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Tỷ lệ từ chối tin</span>
              <p className="text-2xl font-extrabold text-amber-800 mt-1">{risk.rejectionRate}</p>
              <p className="text-[11px] text-amber-600 mt-1">{risk.rejectedListingsCount} tin bị từ chối</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tài khoản bị khóa</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{risk.blockedUsersCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">Vi phạm quy chế hoặc gian lận</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lỗi Outbox DLQ</span>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{risk.outboxDlqCount}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {risk.outboxDlqCount > 0 ? (
                  <span className="text-rose-600 font-bold">Có sự kiện Outbox thất bại</span>
                ) : (
                  'Hàng đợi an toàn'
                )}
              </p>
            </div>
          </div>

          {/* Thao tác quyền cao gần nhất (Audit Events) */}
          {risk.recentAuditEvents && risk.recentAuditEvents.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nhật Ký Kiểm Toán Gần Nhất (Audit Events)
                </span>
                <span className="text-[11px] text-slate-500">Bất biến, có dấu vết actor</span>
              </div>
              <div className="divide-y divide-slate-200 text-xs">
                {risk.recentAuditEvents.map((evt) => (
                  <div key={evt.id} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                        {evt.action}
                      </span>
                      <span className="text-slate-600 ml-2">
                        [{evt.entityType}:{evt.entityId}] {evt.reason ? `— ${evt.reason}` : ''}
                      </span>
                    </div>
                    <span className="text-slate-400 shrink-0 text-[11px]">
                      {new Date(evt.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500">
            {risk.disclaimer}
          </p>
        </div>
      )}

      {/* 2 Cột: Tin chờ duyệt gần nhất & Báo cáo mới nhất */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cột trái: Tin chờ duyệt mới nhất */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">Tin đăng chờ duyệt gần đây</span>
              {recentListings.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
                  {recentListings.length}
                </span>
              )}
            </div>
            <Link
              href="/admin/tin-cho-duyet"
              className="text-xs font-semibold text-brand hover:text-brand-dark"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentListings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">Không có tin nào chờ duyệt</p>
                <p className="text-xs text-slate-400 mt-1">Toàn bộ tin đăng mới đều đã được xử lý</p>
              </div>
            ) : (
              recentListings.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50/60 transition-colors">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    {item.images?.[0]?.imageUrl ? (
                      <img
                        src={item.images[0].imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-xs text-brand font-bold">
                        {formatPriceVND(item.price)} • {item.areaM2} m²
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Người đăng: {item.owner.fullName ?? item.owner.phone} ({item.owner.phone})
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleQuickApprove(item.id)}
                      className="px-2.5 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg text-xs font-semibold transition-colors"
                      title="Duyệt nhanh"
                    >
                      Duyệt
                    </button>
                    <Link
                      href={`/admin/tin-cho-duyet`}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cột phải: Báo cáo vi phạm mới nhất */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">Báo cáo vi phạm mới</span>
              {recentReports.length > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded-full">
                  {recentReports.length}
                </span>
              )}
            </div>
            <Link
              href="/admin/bao-cao-vi-pham"
              className="text-xs font-semibold text-brand hover:text-brand-dark"
            >
              Xem tất cả
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {recentReports.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-slate-700">Không có báo cáo vi phạm mới</p>
                <p className="text-xs text-slate-400 mt-1">Hệ thống đang hoạt động an toàn và minh bạch</p>
              </div>
            ) : (
              recentReports.map((rep) => (
                <div key={rep.id} className="p-4 sm:p-5 flex items-start gap-3 hover:bg-slate-50/60 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 text-xs font-bold">
                    !
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[11px] font-bold rounded">
                        {REASON_LABELS[rep.reason] ?? rep.reason}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(rep.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-800 mt-1 truncate">
                      Tin: {rep.listing.title}
                    </p>
                    {rep.note && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 italic">
                        "{rep.note}"
                      </p>
                    )}
                  </div>
                  <Link
                    href="/admin/bao-cao-vi-pham"
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold shrink-0 transition-colors"
                  >
                    Xử lý
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
