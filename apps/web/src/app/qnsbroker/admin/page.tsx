'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  authFetch,
  getCurrentUser,
  setTokens,
  clearTokens,
  getAccessToken,
  updateAccountListingStatus,
} from '@/lib/auth-client';
import { formatExactPrice, formatPrice, Listing } from '@/lib/api';
import { sanitizeListingImages, DEFAULT_ROOM_FALLBACK_IMAGES } from '@/lib/image-compressor';

/**
 * Trang Quản trị Admin chuyên biệt: qnsbroker/admin
 * Yêu cầu đăng nhập tài khoản: ducquan16102006@gmail.com
 * Mật khẩu: Quannguyenkay6@
 * Quản lý và thao tác toàn bộ dữ liệu, thông tin của khách hàng tìm thuê phòng và chủ nhà đăng tin
 */

interface LeadItem {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  preferredDate?: string | null;
  preferredTime?: string | null;
  message?: string | null;
  note?: string | null;
  channel?: string;
  status: string; // 'new' | 'contacted' | 'qualified' | 'completed' | 'cancelled'
  createdAt: string;
  internalNotes?: string | null;
  listingId?: string | null;
  listingTitle?: string | null;
  listing?: {
    id: string;
    title: string;
    slug?: string;
    price?: string | null;
    owner?: {
      id: string;
      fullName: string | null;
      phone: string;
      email?: string | null;
    };
  };
}

interface UserAccountItem {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string; // 'admin' | 'broker' | 'user'
  isBlocked: boolean;
  createdAt: string;
  listingsCount?: number;
}

const LEAD_STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  new: { label: 'Mới gửi', badgeClass: 'bg-brand-100 text-brand-900 border-brand-300' },
  contacted: { label: 'Đã liên hệ', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  qualified: { label: 'Đã hẹn xem', badgeClass: 'bg-yellow-100 text-yellow-900 border-yellow-300' },
  completed: { label: 'Đã chốt thuê', badgeClass: 'bg-brand-50 text-brand-900 border-brand-300' },
  cancelled: { label: 'Đã hủy', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
};

const LISTING_STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  pending: { label: 'Chờ duyệt', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  active: { label: 'Đang hiển thị', badgeClass: 'bg-brand-100 text-brand-900 border-brand-300' },
  rented: { label: 'Đã cho thuê', badgeClass: 'bg-amber-50 text-amber-900 border-amber-300' },
  rejected: { label: 'Bị từ chối', badgeClass: 'bg-red-100 text-red-800 border-red-300' },
  removed: { label: 'Đã gỡ', badgeClass: 'bg-gray-100 text-gray-700 border-gray-300' },
  expired: { label: 'Hết hạn', badgeClass: 'bg-gray-100 text-gray-600 border-gray-300' },
};

export default function QnsBrokerAdminPage() {
  const router = useRouter();

  // ── Authentication States ──
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [loginEmail, setLoginEmail] = useState('ducquan16102006@gmail.com');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // ── Active Tab State ──
  const [activeTab, setActiveTab] = useState<'leads' | 'listings' | 'users'>('leads');

  // ── Data States ──
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<UserAccountItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Search & Filter States ──
  const [leadSearch, setLeadSearch] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');

  const [listingSearch, setListingSearch] = useState('');
  const [listingStatusFilter, setListingStatusFilter] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // ── Modal States ──
  const [rejectModalListing, setRejectModalListing] = useState<Listing | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  const [noteModalLead, setNoteModalLead] = useState<LeadItem | null>(null);
  const [internalNoteInput, setInternalNoteInput] = useState('');

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // 1. Kiểm tra quyền đăng nhập quản trị viên khi vào trang
  useEffect(() => {
    const isLocalAdmin = localStorage.getItem('qns_admin_logged_in') === 'true';
    const currentUser = getCurrentUser();
    const isEmailMatched = currentUser?.email?.toLowerCase() === 'ducquan16102006@gmail.com';

    if (isLocalAdmin && (isEmailMatched || currentUser?.role === 'admin')) {
      setIsAdminAuth(true);
    } else {
      setIsAdminAuth(false);
    }
    setAuthChecking(false);
  }, []);

  // 2. Nạp toàn bộ dữ liệu khi đã đăng nhập Admin thành công
  const loadAllAdminData = useCallback(async () => {
    setLoadingData(true);

    // ── A. Nạp dữ liệu khách hàng tìm thuê phòng (Leads & Đặt lịch) ──
    const combinedLeads: LeadItem[] = [];
    const seenLeadIds = new Set<string>();

    try {
      const res = await authFetch('/leads/admin?pageSize=100');
      if (res.ok) {
        const data = await res.json();
        const apiLeads: LeadItem[] = data.items || [];
        for (const item of apiLeads) {
          if (!seenLeadIds.has(String(item.id))) {
            seenLeadIds.add(String(item.id));
            combinedLeads.push(item);
          }
        }
      }
    } catch {}

    // Nạp thêm từ danh sách lịch hẹn đặt phòng đã lưu trữ tại bộ nhớ cục bộ
    try {
      const rawApts = localStorage.getItem('qns_booked_appointments');
      if (rawApts) {
        const parsedApts = JSON.parse(rawApts);
        if (Array.isArray(parsedApts)) {
          for (const apt of parsedApts) {
            const aptId = String(apt.id || `apt_${apt.createdAt}`);
            if (!seenLeadIds.has(aptId)) {
              seenLeadIds.add(aptId);
              combinedLeads.push({
                id: aptId,
                fullName: apt.fullName || 'Khách thuê',
                phone: apt.phone || '',
                email: apt.email || null,
                preferredDate: apt.preferredDate || null,
                preferredTime: apt.preferredTime || null,
                message: apt.note || apt.message || null,
                channel: 'web_form',
                status: apt.status || 'new',
                createdAt: apt.createdAt || new Date().toISOString(),
                internalNotes: apt.internalNotes || null,
                listingId: apt.listingId || null,
                listingTitle: apt.listingTitle || null,
                listing: {
                  id: apt.listingId || '1',
                  title: apt.listingTitle || 'Phòng cho thuê',
                },
              });
            }
          }
        }
      }
    } catch {}

    // ── B. Nạp dữ liệu bài đăng phòng của chủ nhà trực tiếp từ API chính thức ──
    const combinedListings: any[] = [];
    const seenListingIds = new Set<string>();

    try {
      const [pendingRes, allRes] = await Promise.all([
        authFetch('/admin/listings/pending?pageSize=100').catch(() => null),
        authFetch('/listings?pageSize=100').catch(() => null),
      ]);

      if (pendingRes && pendingRes.ok) {
        const pData = await pendingRes.json();
        if (Array.isArray(pData.items)) {
          for (const item of pData.items) {
            const strId = String(item.id);
            if (!seenListingIds.has(strId)) {
              seenListingIds.add(strId);
              combinedListings.push({
                ...item,
                images: sanitizeListingImages(item.images),
              });
            }
          }
        }
      }

      if (allRes && allRes.ok) {
        const aData = await allRes.json();
        if (Array.isArray(aData.items)) {
          for (const item of aData.items) {
            const strId = String(item.id);
            if (!seenListingIds.has(strId)) {
              seenListingIds.add(strId);
              combinedListings.push({
                ...item,
                images: sanitizeListingImages(item.images),
              });
            }
          }
        }
      }
    } catch {}

    // ── C. Nạp dữ liệu tài khoản người dùng & chủ nhà ──
    const combinedUsers: UserAccountItem[] = [];
    const seenUserIds = new Set<string>();

    // Nạp từ Backend API users
    try {
      const uRes = await authFetch('/admin/users?pageSize=100');
      if (uRes.ok) {
        const uData = await uRes.json();
        if (Array.isArray(uData.items)) {
          for (const u of uData.items) {
            const uId = String(u.id);
            if (!seenUserIds.has(uId)) {
              seenUserIds.add(uId);
              combinedUsers.push({
                id: uId,
                fullName: u.fullName || 'Người dùng',
                email: u.email || 'user@qns.com',
                phone: u.phone || '0981 753 082',
                role: u.role || 'user',
                isBlocked: Boolean(u.isBlocked),
                createdAt: u.createdAt || new Date().toISOString(),
                listingsCount: u.listingsCount || 0,
              });
            }
          }
        }
      }
    } catch {}

    // Nạp từ danh sách người dùng đã đăng ký tại bộ nhớ cục bộ
    try {
      const regUsersRaw = localStorage.getItem('qns_registered_users');
      if (regUsersRaw) {
        const parsedUsers = JSON.parse(regUsersRaw);
        if (Array.isArray(parsedUsers)) {
          for (const u of parsedUsers) {
            const uId = String(u.id || u.email);
            if (!seenUserIds.has(uId)) {
              seenUserIds.add(uId);
              combinedUsers.push({
                id: uId,
                fullName: u.fullName || 'Người dùng',
                email: u.email || '',
                phone: u.phone || '0981 753 082',
                role: u.role || 'user',
                isBlocked: Boolean(u.isBlocked),
                createdAt: u.createdAt || new Date().toISOString(),
                listingsCount: u.listingsCount || 0,
              });
            }
          }
        }
      }
    } catch {}

    // Tự động bổ sung tài khoản Chủ nhà từ danh sách bài đăng nếu chưa có
    for (const item of combinedListings) {
      const owner = item.owner;
      if (owner && (owner.id || owner.email)) {
        const ownerIdStr = String(owner.id || owner.email);
        if (!seenUserIds.has(ownerIdStr)) {
          seenUserIds.add(ownerIdStr);
          combinedUsers.push({
            id: ownerIdStr,
            fullName: owner.fullName || 'Chủ nhà',
            email: owner.email || 'chunha@qns.com',
            phone: owner.phone || '0981 753 082',
            role: 'broker',
            isBlocked: false,
            createdAt: owner.createdAt || item.createdAt || new Date().toISOString(),
            listingsCount: 1,
          });
        }
      }
    }

    setLeads(combinedLeads);
    setListings(combinedListings);
    setUsers(combinedUsers);
    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (isAdminAuth) {
      loadAllAdminData();
    }
  }, [isAdminAuth, loadAllAdminData]);

  // 3. Xử lý Đăng nhập Quản trị viên
  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    // Xác thực tài khoản Admin theo đúng yêu cầu
    if (cleanEmail === 'ducquan16102006@gmail.com' && cleanPass === 'Quannguyenkay6@') {
      const adminUser = {
        id: '1',
        fullName: 'Đức Quân',
        email: 'ducquan16102006@gmail.com',
        phone: '0981 753 082',
        role: 'admin',
        createdAt: new Date().toISOString(),
        isPhoneVerified: true,
        isIdVerified: true,
      };

      const mockAdminToken = `admin_auth_token_${Date.now()}`;
      setTokens(mockAdminToken, mockAdminToken, adminUser);
      localStorage.setItem('qns_admin_logged_in', 'true');
      localStorage.setItem('qns_admin_email', 'ducquan16102006@gmail.com');

      setIsAdminAuth(true);
      setLoginLoading(false);
      triggerToast('Đăng nhập Quản trị viên thành công');
      return;
    }

    setLoginLoading(false);
    setLoginError('Tài khoản hoặc mật khẩu quản trị viên không chính xác');
  }

  // 4. Xử lý Đăng xuất Quản trị viên
  function handleAdminLogout() {
    clearTokens();
    localStorage.removeItem('qns_admin_logged_in');
    localStorage.removeItem('qns_admin_email');
    setIsAdminAuth(false);
    setLoginPassword('');
    triggerToast('Đã đăng xuất khỏi tài khoản Quản trị viên');
  }

  // ── Thao tác Quản trị viên trên Khách hàng tìm phòng (Leads) ──
  async function handleUpdateLeadStatus(leadId: string, newStatus: string) {
    try {
      await authFetch(`/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).catch(() => undefined);

      // Đồng bộ vào localStorage
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('qns_booked_appointments');
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map((it: any) =>
            String(it.id) === String(leadId) ? { ...it, status: newStatus } : it
          );
          localStorage.setItem('qns_booked_appointments', JSON.stringify(updated));
        }
      }

      setLeads((prev) =>
        prev.map((it) => (it.id === leadId ? { ...it, status: newStatus } : it))
      );
      triggerToast(`Đã chuyển trạng thái lead sang: ${LEAD_STATUS_CONFIG[newStatus]?.label || newStatus}`);
    } catch {
      triggerToast('Lỗi cập nhật trạng thái lead');
    }
  }

  async function handleDeleteLead(leadId: string) {
    if (!confirm('Xác nhận xóa thông tin yêu cầu của khách hàng này?')) return;
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('qns_booked_appointments');
        if (raw) {
          const list = JSON.parse(raw);
          const filtered = list.filter((it: any) => String(it.id) !== String(leadId));
          localStorage.setItem('qns_booked_appointments', JSON.stringify(filtered));
        }
      }
      setLeads((prev) => prev.filter((it) => it.id !== leadId));
      triggerToast('Đã xóa thông tin khách hàng thành công');
    } catch {
      triggerToast('Lỗi khi xóa thông tin khách hàng');
    }
  }

  async function handleSaveLeadNote() {
    if (!noteModalLead) return;
    const leadId = noteModalLead.id;
    const noteText = internalNoteInput.trim();

    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('qns_booked_appointments');
      if (raw) {
        const list = JSON.parse(raw);
        const updated = list.map((it: any) =>
          String(it.id) === String(leadId) ? { ...it, internalNotes: noteText } : it
        );
        localStorage.setItem('qns_booked_appointments', JSON.stringify(updated));
      }
    }

    setLeads((prev) =>
      prev.map((it) => (it.id === leadId ? { ...it, internalNotes: noteText } : it))
    );
    setNoteModalLead(null);
    setInternalNoteInput('');
    triggerToast('Đã lưu ghi chú xử lý nội bộ thành công');
  }

  // ── Thao tác Quản trị viên trên Bài đăng phòng của Chủ nhà ──
  async function handleApproveListing(listingId: string) {
    if (!confirm('Xác nhận phê duyệt bài đăng này lên sàn công khai?')) return;
    try {
      const res = await authFetch(`/admin/listings/${listingId}/approve`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Phê duyệt bài đăng thất bại';
        triggerToast(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        return;
      }

      setListings((prev) =>
        prev.map((it) => (String(it.id) === String(listingId) ? { ...it, status: 'active' } : it))
      );
      triggerToast('Đã phê duyệt bài đăng phòng thành công');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('qns_listings_updated'));
      }
    } catch (err: any) {
      triggerToast(err?.message || 'Lỗi khi duyệt bài đăng');
    }
  }

  async function handleRejectListingConfirm() {
    if (!rejectModalListing) return;
    const listingId = String(rejectModalListing.id);
    const reason = rejectionReasonInput.trim() || 'Thông tin phòng chưa đầy đủ hoặc không hợp lệ';

    try {
      const res = await authFetch(`/admin/listings/${listingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Từ chối bài đăng thất bại';
        triggerToast(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        return;
      }

      setListings((prev) =>
        prev.map((it) =>
          String(it.id) === String(listingId)
            ? { ...it, status: 'rejected', rejectionReason: reason }
            : it
        )
      );
      setRejectModalListing(null);
      setRejectionReasonInput('');
      triggerToast('Đã từ chối bài đăng phòng thành công');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('qns_listings_updated'));
      }
    } catch (err: any) {
      triggerToast(err?.message || 'Lỗi khi từ chối bài đăng');
    }
  }

  async function handleMarkListingRented(listingId: string) {
    if (!confirm('Xác nhận phòng này đã cho thuê thành công? Bài đăng sẽ tự động gỡ khỏi khách tìm phòng')) return;
    try {
      const res = await authFetch(`/listings/${listingId}/rented`, { method: 'PATCH' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Cập nhật trạng thái thất bại';
        triggerToast(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        return;
      }

      setListings((prev) =>
        prev.map((it) => (String(it.id) === String(listingId) ? { ...it, status: 'rented' } : it))
      );
      triggerToast('Đã chuyển bài đăng sang Đã cho thuê và tự động gỡ khỏi khách tìm phòng');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('qns_listings_updated'));
      }
    } catch (err: any) {
      triggerToast(err?.message || 'Lỗi khi cập nhật trạng thái');
    }
  }

  async function handleReactivateListing(listingId: string) {
    if (!confirm('Xác nhận mở lại bài đăng phòng này cho khách tìm phòng thuê?')) return;
    try {
      const res = await authFetch(`/admin/listings/${listingId}/approve`, { method: 'POST' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Mở lại bài đăng thất bại';
        triggerToast(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        return;
      }

      setListings((prev) =>
        prev.map((it) => (String(it.id) === String(listingId) ? { ...it, status: 'active' } : it))
      );
      triggerToast('Đã mở lại bài đăng phòng thành công');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('qns_listings_updated'));
      }
    } catch (err: any) {
      triggerToast(err?.message || 'Lỗi khi mở lại bài đăng');
    }
  }

  async function handleDeleteListingPermanent(listingId: string) {
    if (!confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa bài đăng phòng này vĩnh viễn khỏi toàn bộ hệ thống?')) return;
    try {
      const res = await authFetch(`/listings/${listingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.message || 'Xóa bài đăng thất bại';
        triggerToast(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        return;
      }

      setListings((prev) => prev.filter((it) => String(it.id) !== String(listingId)));
      triggerToast('Đã xóa vĩnh viễn bài đăng phòng');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('qns_listings_updated'));
      }
    } catch (err: any) {
      triggerToast(err?.message || 'Lỗi khi xóa bài đăng');
    }
  }


  // ── Thao tác Quản trị viên trên Tài khoản người dùng ──
  async function handleToggleBlockUser(userId: string, currentBlocked: boolean) {
    const actionText = currentBlocked ? 'Mở khóa' : 'Khóa';
    if (!confirm(`Xác nhận ${actionText} tài khoản người dùng này?`)) return;

    try {
      await authFetch(`/admin/users/${userId}/toggle-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: `${actionText} bởi Quản trị viên` }),
      }).catch(() => undefined);

      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('qns_registered_users');
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map((it: any) =>
            String(it.id) === String(userId) ? { ...it, isBlocked: !currentBlocked } : it
          );
          localStorage.setItem('qns_registered_users', JSON.stringify(updated));
        }
      }

      setUsers((prev) =>
        prev.map((it) => (it.id === userId ? { ...it, isBlocked: !currentBlocked } : it))
      );
      triggerToast(`Đã ${actionText.toLowerCase()} tài khoản người dùng thành công`);
    } catch {
      triggerToast(`Lỗi khi ${actionText.toLowerCase()} tài khoản`);
    }
  }

  // ── Xuất danh sách khách hàng ra file CSV ──
  function exportLeadsCSV() {
    if (leads.length === 0) {
      alert('Chưa có dữ liệu khách hàng để xuất');
      return;
    }

    const headers = ['Mã yêu cầu', 'Họ tên', 'Số điện thoại', 'Email', 'Phòng quan tâm', 'Ngày xem phòng', 'Khung giờ', 'Ghi chú', 'Trạng thái', 'Thời gian gửi'];
    const rows = filteredLeads.map((it) => [
      `"${it.id}"`,
      `"${it.fullName}"`,
      `"${it.phone}"`,
      `"${it.email || ''}"`,
      `"${it.listingTitle || it.listing?.title || ''}"`,
      `"${it.preferredDate || ''}"`,
      `"${it.preferredTime || ''}"`,
      `"${(it.message || it.note || '').replace(/"/g, '""')}"`,
      `"${LEAD_STATUS_CONFIG[it.status]?.label || it.status}"`,
      `"${new Date(it.createdAt).toLocaleString('vi-VN')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Danh_sach_khach_thue_QNS_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Đã tải xuống danh sách khách hàng thành công');
  }

  // ── Filter Data Logic ──
  const filteredLeads = useMemo(() => {
    return leads.filter((it) => {
      if (leadStatusFilter && it.status !== leadStatusFilter) return false;
      if (leadSearch.trim()) {
        const kw = leadSearch.trim().toLowerCase();
        const name = (it.fullName || '').toLowerCase();
        const phone = (it.phone || '').toLowerCase();
        const email = (it.email || '').toLowerCase();
        const title = (it.listingTitle || it.listing?.title || '').toLowerCase();
        return name.includes(kw) || phone.includes(kw) || email.includes(kw) || title.includes(kw);
      }
      return true;
    });
  }, [leads, leadStatusFilter, leadSearch]);

  const filteredListings = useMemo(() => {
    return listings.filter((it) => {
      const st = (it.status || 'pending').toLowerCase();
      if (listingStatusFilter && st !== listingStatusFilter.toLowerCase()) return false;
      if (listingSearch.trim()) {
        const kw = listingSearch.trim().toLowerCase();
        const title = (it.title || '').toLowerCase();
        const address = (it.addressDetail || '').toLowerCase();
        const id = String(it.id).toLowerCase();
        const ownerName = (it.owner?.fullName || '').toLowerCase();
        const ownerPhone = (((it.owner as any)?.phone) || '').toLowerCase();
        return (
          title.includes(kw) ||
          address.includes(kw) ||
          id.includes(kw) ||
          ownerName.includes(kw) ||
          ownerPhone.includes(kw)
        );
      }
      return true;
    });
  }, [listings, listingStatusFilter, listingSearch]);

  const filteredUsers = useMemo(() => {
    return users.filter((it) => {
      if (userRoleFilter && it.role !== userRoleFilter) return false;
      if (userSearch.trim()) {
        const kw = userSearch.trim().toLowerCase();
        const name = (it.fullName || '').toLowerCase();
        const email = (it.email || '').toLowerCase();
        const phone = (it.phone || '').toLowerCase();
        return name.includes(kw) || email.includes(kw) || phone.includes(kw);
      }
      return true;
    });
  }, [users, userRoleFilter, userSearch]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const totalLeadsCount = leads.length;
    const newLeadsCount = leads.filter((it) => it.status === 'new').length;

    const activeListingsCount = listings.filter((it) => (it.status || '').toLowerCase() === 'active').length;
    const pendingListingsCount = listings.filter((it) => (it.status || '').toLowerCase() === 'pending').length;
    const rentedListingsCount = listings.filter((it) => (it.status || '').toLowerCase() === 'rented').length;

    const totalUsersCount = users.length;

    return {
      totalLeadsCount,
      newLeadsCount,
      activeListingsCount,
      pendingListingsCount,
      rentedListingsCount,
      totalUsersCount,
    };
  }, [leads, listings, users]);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="h-9 w-9 animate-spin rounded-full border-3 border-brand border-t-transparent" />
          <p className="text-sm font-medium text-slate-300">Đang kiểm tra quyền Quản trị viên</p>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // MÀN HÌNH ĐĂNG NHẬP BẢO MẬT DÀNH CHO ADMIN (NẾU CHƯA ĐĂNG NHẬP)
  // ════════════════════════════════════════════════════════════════
  if (!isAdminAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Background Decorative Rings */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 sm:p-10 shadow-2xl">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand to-amber-400 text-slate-950 font-black text-2xl shadow-lg shadow-brand/20">
              Q
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Đăng nhập Quản trị viên</h1>
              <p className="text-xs text-slate-400 mt-1">
                Hệ thống quản lý dữ liệu khách thuê và bài đăng chủ nhà QNS BROKER
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/30 text-amber-400 text-xs font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Đường dẫn bảo mật: qnsbroker/admin</span>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="mt-8 space-y-5">
            {loginError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 font-medium">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tài khoản Email Quản trị viên
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="ducquan16102006@gmail.com"
                className="w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mật khẩu Quản trị viên
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu quản trị viên"
                  className="w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-gradient-to-r from-brand to-amber-400 hover:from-brand-dark hover:to-amber-500 text-slate-950 font-bold py-3.5 text-sm transition-all shadow-lg shadow-brand/20 active:scale-[0.99] disabled:opacity-50"
            >
              {loginLoading ? 'Đang xác thực thông tin' : 'Đăng nhập Quản trị'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-slate-400 hover:text-amber-400 transition-colors">
              ‹ Quay lại Trang chủ website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════
  // BẢNG ĐIỀU KHIỂN QUẢN TRỊ VIÊN TOÀN DIỆN (ADMIN DASHBOARD)
  // ════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 rounded-xl bg-brand text-slate-950 px-4 py-3 font-semibold text-xs shadow-xl animate-fade-in flex items-center gap-2">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <Link href="/qnsbroker/admin" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand to-amber-400 flex items-center justify-center font-black text-slate-950 text-base shadow-sm">
              Q
            </div>
            <div>
              <p className="font-bold text-white text-base leading-tight">QNS BROKER ADMIN</p>
              <p className="text-[11px] text-amber-400 font-mono">qnsbroker/admin</p>
            </div>
          </Link>
          <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand/10 text-amber-300 border border-brand/30">
            Quản trị viên toàn quyền
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAllAdminData}
            disabled={loadingData}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700"
          >
            <span className={loadingData ? 'animate-spin' : ''}>↻</span>
            <span>Làm mới dữ liệu</span>
          </button>
          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700"
          >
            <span>Website chính</span>
            <span>↗</span>
          </Link>
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-white leading-tight">Đức Quân</p>
              <p className="text-[10px] text-slate-400 font-mono">ducquan16102006@gmail.com</p>
            </div>
            <button
              onClick={handleAdminLogout}
              className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
        {/* KPI Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4 space-y-1">
            <p className="text-xs text-slate-400 font-medium">Khách tìm phòng</p>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-white">{stats.totalLeadsCount}</p>
              {stats.newLeadsCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand/20 text-amber-400 border border-brand/30">
                  {stats.newLeadsCount} mới
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Yêu cầu & Lịch hẹn xem</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4 space-y-1">
            <p className="text-xs text-slate-400 font-medium">Phòng đang hiển thị</p>
            <p className="text-2xl font-bold text-brand">{stats.activeListingsCount}</p>
            <p className="text-[11px] text-slate-400">Đang công khai cho khách</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4 space-y-1">
            <p className="text-xs text-slate-400 font-medium">Phòng chờ duyệt</p>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-amber-400">{stats.pendingListingsCount}</p>
              {stats.pendingListingsCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Cần duyệt
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">Chủ nhà vừa đăng lên</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4 space-y-1">
            <p className="text-xs text-slate-400 font-medium">Phòng đã cho thuê</p>
            <p className="text-2xl font-bold text-amber-400">{stats.rentedListingsCount}</p>
            <p className="text-[11px] text-slate-400">Đã thuê, ẩn khỏi khách</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/60 p-4 space-y-1 col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-400 font-medium">Chủ nhà & Người dùng</p>
            <p className="text-2xl font-bold text-purple-400">{stats.totalUsersCount}</p>
            <p className="text-[11px] text-slate-400">Tài khoản trong hệ thống</p>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <div className="flex border-b border-slate-800 gap-2">
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'leads'
                ? 'border-brand text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Khách hàng tìm thuê phòng (Lịch hẹn & Leads)</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
              {leads.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('listings')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'listings'
                ? 'border-brand text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Chủ nhà & Quản lý bài đăng phòng</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
              {listings.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-brand text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Tài khoản người dùng & Chủ nhà</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
              {users.length}
            </span>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1: KHÁCH HÀNG TÌM THUÊ PHÒNG & ĐẶT LỊCH XEM PHÒNG */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'leads' && (
          <div className="space-y-4">
            {/* Search, Filter Bar and Export */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2.5 flex-wrap">
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Tìm theo tên khách, SĐT, email hoặc tên phòng..."
                  className="rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand w-full sm:w-80"
                />
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand"
                >
                  <option value="">Tất cả trạng thái lead</option>
                  <option value="new">Mới gửi</option>
                  <option value="contacted">Đã liên hệ</option>
                  <option value="qualified">Đã hẹn xem</option>
                  <option value="completed">Đã chốt thuê</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>

              <button
                onClick={exportLeadsCSV}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand/20 hover:bg-brand/30 text-amber-300 border border-brand/40 text-xs font-semibold transition-colors"
              >
                <span>↓</span>
                <span>Xuất dữ liệu CSV</span>
              </button>
            </div>

            {/* Leads Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-800/40 overflow-hidden shadow-lg">
              {filteredLeads.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Không tìm thấy yêu cầu đặt phòng nào phù hợp
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/80 bg-slate-800/80 text-slate-300 font-semibold">
                        <th className="p-3.5">Khách hàng</th>
                        <th className="p-3.5">Liên hệ nhanh</th>
                        <th className="p-3.5">Phòng quan tâm</th>
                        <th className="p-3.5">Lịch xem phòng (GMT+7)</th>
                        <th className="p-3.5">Ghi chú của khách</th>
                        <th className="p-3.5">Trạng thái xử lý</th>
                        <th className="p-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filteredLeads.map((item) => {
                        const cleanPhone = item.phone.replace(/\D/g, '');
                        const statusConfig = LEAD_STATUS_CONFIG[item.status] || {
                          label: item.status,
                          badgeClass: 'bg-slate-700 text-slate-300',
                        };
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-3.5">
                              <p className="font-bold text-white text-sm">{item.fullName}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Gửi lúc: {new Date(item.createdAt).toLocaleString('vi-VN')}
                              </p>
                              {item.internalNotes && (
                                <p className="text-[11px] text-amber-300 mt-1 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                  Ghi chú nội bộ: {item.internalNotes}
                                </p>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <p className="font-mono text-amber-300 font-bold">{item.phone}</p>
                              <p className="text-slate-400 text-[11px]">{item.email || 'Không có email'}</p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <a
                                  href={`tel:${cleanPhone}`}
                                  className="px-2 py-0.5 rounded bg-brand/20 text-amber-300 border border-brand/30 text-[10px] font-semibold hover:bg-brand/30"
                                >
                                  Gọi ngay
                                </a>
                                <a
                                  href={`https://zalo.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold hover:bg-amber-500/30"
                                >
                                  Zalo
                                </a>
                              </div>
                            </td>
                            <td className="p-3.5 max-w-[220px]">
                              <p className="font-medium text-white line-clamp-2">
                                {item.listingTitle || item.listing?.title || 'Phòng cho thuê'}
                              </p>
                              {item.listing?.slug && (
                                <Link
                                  href={`/tin/${item.listing.slug}`}
                                  target="_blank"
                                  className="text-[11px] text-amber-400 hover:underline inline-flex items-center gap-0.5 mt-0.5"
                                >
                                  <span>Xem chi tiết phòng</span>
                                  <span>↗</span>
                                </Link>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <p className="font-semibold text-white">
                                {item.preferredDate ? item.preferredDate : 'Chưa chọn ngày'}
                              </p>
                              <p className="text-[11px] text-amber-300 mt-0.5 font-medium">
                                {item.preferredTime ? item.preferredTime : 'Linh hoạt'}
                              </p>
                            </td>
                            <td className="p-3.5 max-w-[180px]">
                              <p className="text-slate-300 text-[11px] line-clamp-2">
                                {item.message || item.note || 'Không có ghi chú'}
                              </p>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <select
                                value={item.status}
                                onChange={(e) => handleUpdateLeadStatus(item.id, e.target.value)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${statusConfig.badgeClass} bg-slate-900 focus:outline-none`}
                              >
                                <option value="new">Mới gửi</option>
                                <option value="contacted">Đã liên hệ</option>
                                <option value="qualified">Đã hẹn xem</option>
                                <option value="completed">Đã chốt thuê</option>
                                <option value="cancelled">Đã hủy</option>
                              </select>
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setNoteModalLead(item);
                                    setInternalNoteInput(item.internalNotes || '');
                                  }}
                                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
                                  title="Ghi chú kết quả tư vấn"
                                >
                                  Ghi chú
                                </button>
                                <button
                                  onClick={() => handleDeleteLead(item.id)}
                                  className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/30"
                                  title="Xóa yêu cầu"
                                >
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 2: CHỦ NHÀ & QUẢN LÝ BÀI ĐĂNG PHÒNG CHO THUÊ */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'listings' && (
          <div className="space-y-4">
            {/* Cổng duyệt tin tập trung chính thức */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 shadow-md">
              <div className="space-y-1">
                <p className="font-bold text-sm text-white flex items-center gap-2">
                  <span className="text-amber-400">⚡</span>
                  <span>Cổng duyệt tin đăng tập trung</span>
                </p>
                <p className="text-xs text-amber-200/90">
                  Mọi tin đăng mới từ chủ nhà được đồng bộ và kiểm duyệt chính thức tại trang Duyệt tin chuẩn
                </p>
              </div>
              <Link
                href="/admin/tin-cho-duyet"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand to-amber-400 text-slate-950 font-bold text-xs hover:brightness-105 transition-all shadow-md shrink-0"
              >
                <span>Chuyển tới Trang Duyệt Tin</span>
                <span>→</span>
              </Link>
            </div>

            {/* Search and Status Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2.5 flex-wrap">
                <input
                  type="text"
                  value={listingSearch}
                  onChange={(e) => setListingSearch(e.target.value)}
                  placeholder="Tìm theo tiêu đề, địa chỉ, mã tin, tên hoặc SĐT chủ nhà..."
                  className="rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand w-full sm:w-96"
                />
                <select
                  value={listingStatusFilter}
                  onChange={(e) => setListingStatusFilter(e.target.value)}
                  className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand"
                >
                  <option value="">Tất cả trạng thái bài đăng</option>
                  <option value="pending">Chờ duyệt</option>
                  <option value="active">Đang hiển thị</option>
                  <option value="rented">Đã cho thuê</option>
                  <option value="rejected">Bị từ chối</option>
                  <option value="removed">Đã gỡ</option>
                </select>
              </div>

              <Link
                href="/dang-tin"
                target="_blank"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand hover:bg-brand-dark text-slate-950 text-xs font-bold transition-colors shadow-sm"
              >
                <span>+</span>
                <span>Đăng tin phòng mới</span>
              </Link>
            </div>

            {/* Listings Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-800/40 overflow-hidden shadow-lg">
              {filteredListings.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Không tìm thấy bài đăng phòng nào phù hợp
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/80 bg-slate-800/80 text-slate-300 font-semibold">
                        <th className="p-3.5">Phòng cho thuê</th>
                        <th className="p-3.5">Địa chỉ chi tiết</th>
                        <th className="p-3.5">Giá thuê / Cọc</th>
                        <th className="p-3.5">Chủ nhà đăng tin</th>
                        <th className="p-3.5">Trạng thái</th>
                        <th className="p-3.5 text-right">Thao tác Quản trị viên</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filteredListings.map((listing) => {
                        const st = (listing.status || 'pending').toLowerCase();
                        const stConfig = LISTING_STATUS_CONFIG[st] || {
                          label: listing.status,
                          badgeClass: 'bg-slate-700 text-slate-300',
                        };
                        const firstImg = listing.images?.[0]?.imageUrl || DEFAULT_ROOM_FALLBACK_IMAGES[0];
                        const owner = (listing.owner as any) || {};

                        return (
                          <tr key={listing.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <div className="h-14 w-16 shrink-0 rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={firstImg}
                                    alt={listing.title}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src = DEFAULT_ROOM_FALLBACK_IMAGES[0];
                                    }}
                                  />
                                </div>
                                <div className="min-w-0 max-w-xs">
                                  <p className="font-bold text-white text-sm line-clamp-1">{listing.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                    <span>#{listing.id}</span>
                                    <span>•</span>
                                    <span>{listing.areaM2 ? `${listing.areaM2} m²` : '25 m²'}</span>
                                    <span>•</span>
                                    <span>{listing.propertyType || 'Chung cư'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 max-w-[200px]">
                              <p className="text-slate-200 font-medium line-clamp-2">
                                {listing.addressDetail || listing.location?.name || 'Hà Nội'}
                              </p>
                            </td><td className="p-3.5 whitespace-nowrap">
                              <p className="font-bold text-brand text-sm">{formatPrice(listing.price)}</p>
                              {listing.depositAmount && (
                                <p className="text-[11px] text-slate-400">
                                  Cọc: {formatExactPrice(listing.depositAmount)}
                                </p>
                              )}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <p className="font-bold text-white">{owner.fullName || 'Chủ nhà'}</p>
                              <p className="font-mono text-amber-300 text-[11px]">{owner.phone || '0981 753 082'}</p>
                              <p className="text-slate-400 text-[11px]">{owner.email || 'chunha@qns.com'}</p>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${stConfig.badgeClass}`}>
                                {stConfig.label}
                              </span>
                              {(listing as any).rejectionReason && st === 'rejected' && (
                                <p className="text-[10px] text-red-400 mt-1 max-w-[140px] truncate" title={(listing as any).rejectionReason}>
                                  Lý do: {(listing as any).rejectionReason}
                                </p>
                              )}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                                {listing.slug && (
                                  <Link
                                    href={`/tin/${listing.slug}`}
                                    target="_blank"
                                    className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium"
                                  >
                                    Xem phòng
                                  </Link>
                                )}

                                {st === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => handleApproveListing(String(listing.id))}
                                      className="px-2.5 py-1 rounded bg-brand/20 hover:bg-brand/30 text-amber-300 border border-brand/40 text-xs font-bold"
                                    >
                                      Duyệt tin
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejectModalListing(listing);
                                        setRejectionReasonInput('');
                                      }}
                                      className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 text-xs font-bold"
                                    >
                                      Từ chối
                                    </button>
                                  </>
                                )}

                                {st === 'active' && (
                                  <button
                                    onClick={() => handleMarkListingRented(String(listing.id))}
                                    className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold"
                                    title="Đánh dấu phòng đã cho thuê và tự động gỡ khỏi khách tìm phòng"
                                  >
                                    Đã cho thuê
                                  </button>
                                )}

                                {(st === 'rented' || st === 'removed' || st === 'rejected') && (
                                  <button
                                    onClick={() => handleReactivateListing(String(listing.id))}
                                    className="px-2.5 py-1 rounded bg-brand/20 hover:bg-brand/30 text-amber-300 border border-brand/40 text-xs font-semibold"
                                  >
                                    Mở lại tin
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteListingPermanent(String(listing.id))}
                                  className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium"
                                  title="Xóa vĩnh viễn"
                                >
                                  Xóa hẳn
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 3: QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG & CHỦ NHÀ */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search and Role Filter */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2.5 flex-wrap">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
                  className="rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-brand w-full sm:w-80"
                />
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-brand"
                >
                  <option value="">Tất cả vai trò tài khoản</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="broker">Chủ nhà</option>
                  <option value="user">Người dùng / Khách thuê</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-800/40 overflow-hidden shadow-lg">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  Không tìm thấy tài khoản người dùng nào phù hợp
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-700/80 bg-slate-800/80 text-slate-300 font-semibold">
                        <th className="p-3.5">Họ và tên</th>
                        <th className="p-3.5">Email tài khoản</th>
                        <th className="p-3.5">Số điện thoại</th>
                        <th className="p-3.5">Vai trò</th>
                        <th className="p-3.5">Trạng thái</th>
                        <th className="p-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-300">
                      {filteredUsers.map((u) => {
                        const isMainAdmin = u.email?.toLowerCase() === 'ducquan16102006@gmail.com';
                        return (
                          <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                            <td className="p-3.5 font-bold text-white flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[11px] text-amber-400">
                                {u.fullName ? u.fullName[0].toUpperCase() : 'U'}
                              </div>
                              <div>
                                <p>{u.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-normal">
                                  Tham gia: {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                                </p>
                              </div>
                            </td>
                            <td className="p-3.5 font-mono text-slate-300">{u.email || 'Chưa cập nhật'}</td>
                            <td className="p-3.5 font-mono text-amber-300">{u.phone || 'Chưa có SĐT'}</td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  u.role === 'admin'
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    : u.role === 'broker'
                                      ? 'bg-brand/20 text-amber-300 border border-brand/30'
                                      : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {u.role === 'admin' ? 'Quản trị viên' : u.role === 'broker' ? 'Chủ nhà' : 'Khách thuê'}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              {u.isBlocked ? (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                                  Đã khóa
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand/20 text-amber-300 border border-brand/30">
                                  Hoạt động
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              {!isMainAdmin && (
                                <button
                                  onClick={() => handleToggleBlockUser(u.id, u.isBlocked)}
                                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                                    u.isBlocked
                                      ? 'bg-brand/20 hover:bg-brand/30 text-amber-300 border border-brand/30'
                                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                                  }`}
                                >
                                  {u.isBlocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Modal Từ chối bài đăng phòng ── */}
      {rejectModalListing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Từ chối bài đăng phòng</h3>
            <p className="text-xs text-slate-300 line-clamp-2">
              Bài đăng: <strong>{rejectModalListing.title}</strong>
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lý do từ chối (gửi thông báo cho chủ nhà)
              </label>
              <textarea
                rows={3}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Ví dụ: Hình ảnh phòng bị mờ, địa chỉ chưa chính xác hoặc mức giá không khớp..."
                className="w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-400"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalListing(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleRejectListingConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Ghi chú nội bộ cho Lead khách hàng ── */}
      {noteModalLead && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Ghi chú xử lý nội bộ</h3>
            <p className="text-xs text-slate-300">
              Khách hàng: <strong>{noteModalLead.fullName}</strong> ({noteModalLead.phone})
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nội dung ghi chú nhân viên tư vấn
              </label>
              <textarea
                rows={4}
                value={internalNoteInput}
                onChange={(e) => setInternalNoteInput(e.target.value)}
                placeholder="Ví dụ: Đã gọi điện lúc 10h, khách chốt hẹn xem phòng 15h thứ 7 tuần này..."
                className="w-full rounded-xl bg-slate-800 border border-slate-700 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setNoteModalLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveLeadNote}
                className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-xs font-bold text-slate-950"
              >
                Lưu ghi chú
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
