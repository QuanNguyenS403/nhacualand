'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth-client';

interface UserItem {
  id: string;
  phone: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  isBlocked: boolean;
  isPhoneVerified: boolean;
  isIdVerified: boolean;
  createdAt: string;
  listingsCount: number;
  savedListingsCount?: number;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Quản trị viên', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  broker: { label: 'Môi giới', color: 'bg-brand-50 text-brand-800 border-brand-200' },
  user: { label: 'Người dùng', color: 'bg-slate-50 text-slate-700 border-slate-200' },
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal Khóa/Mở khóa
  const [userToToggle, setUserToToggle] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function loadUsers(searchVal = search) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
      });
      if (roleFilter) params.set('role', roleFilter);
      if (searchVal.trim()) params.set('search', searchVal.trim());

      const res = await authFetch(`/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items ?? []);
        setTotal(data.pagination?.total ?? 0);
        setTotalPages(data.pagination?.totalPages ?? 1);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách người dùng:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadUsers(search);
  }

  async function handleConfirmToggle() {
    if (!userToToggle) return;
    setSubmitting(true);
    try {
      let res = await authFetch(`/admin/users/${userToToggle.id}/toggle-block`, {
        method: 'POST',
      });

      // Nếu hệ thống yêu cầu xác thực hai bước (MFA)
      if (res.status === 403) {
        const err = await res.json();
        if (err.message && (err.message.includes('MFA') || err.message.includes('x-admin-mfa-code'))) {
          const mfaCode = prompt('Thao tác nhạy cảm yêu cầu mã xác thực hai bước (MFA).\nVui lòng nhập mã x-admin-mfa-code:');
          if (mfaCode && mfaCode.trim()) {
            res = await authFetch(`/admin/users/${userToToggle.id}/toggle-block`, {
              method: 'POST',
              headers: {
                'x-admin-mfa-code': mfaCode.trim(),
              },
            });
          }
        }
      }

      if (res.ok) {
        const data = await res.json();
        showToast(data.message ?? 'Cập nhật trạng thái người dùng thành công');
        setUserToToggle(null);
        loadUsers();
      } else {
        const err = await res.json();
        alert(err.message ?? 'Không thể thay đổi trạng thái người dùng');
      }
    } catch {
      alert('Không thể kết nối đến máy chủ');
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quản lý Người dùng</h1>
          <p className="text-sm text-slate-500 mt-1">
            Quản trị danh sách thành viên, kiểm tra số tin đăng và kiểm soát quyền truy cập tài khoản
          </p>
        </div>

        {/* Bộ lọc vai trò */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl text-xs font-semibold self-start">
          <button
            onClick={() => {
              setRoleFilter('');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              roleFilter === ''
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({total})
          </button>
          <button
            onClick={() => {
              setRoleFilter('admin');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              roleFilter === 'admin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Quản trị viên
          </button>
          <button
            onClick={() => {
              setRoleFilter('broker');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              roleFilter === 'broker'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Môi giới
          </button>
          <button
            onClick={() => {
              setRoleFilter('user');
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              roleFilter === 'user'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Người dùng
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo số điện thoại hoặc họ tên thành viên..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
        >
          Tìm kiếm
        </button>
      </form>

      {/* Bảng Người dùng */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Không tìm thấy người dùng
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Không có tài khoản nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm đã nhập
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Thành viên</th>
                  <th className="py-3.5 px-4">Vai trò</th>
                  <th className="py-3.5 px-4">Số tin đăng</th>
                  <th className="py-3.5 px-4">Xác thực</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Ngày tham gia</th>
                  <th className="py-3.5 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {users.map((u) => {
                  const roleConfig = ROLE_LABELS[u.role] ?? {
                    label: u.role,
                    color: 'bg-slate-50 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Thành viên */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-700 shrink-0">
                            {(u.fullName ?? u.phone).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              {u.fullName ?? 'Chưa cập nhật tên'}
                            </p>
                            <p className="font-mono text-slate-500 text-[11px] mt-0.5">
                              {u.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Vai trò */}
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-semibold border ${roleConfig.color}`}>
                          {roleConfig.label}
                        </span>
                      </td>

                      {/* Số tin & phòng đã lưu */}
                      <td className="py-4 px-4">
                        <span className="font-semibold text-slate-800">
                          {u.listingsCount} tin • {u.savedListingsCount ?? 0} đã lưu
                        </span>
                      </td>

                      {/* Xác thực */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          {u.isPhoneVerified ? (
                            <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-800 text-[10px] font-bold">
                              SĐT đã xác thực
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-400 text-[10px]">
                              SĐT chưa xác thực
                            </span>
                          )}
                          {u.isIdVerified && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold">
                              CCCD đã duyệt
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-4 px-4">
                        {u.isBlocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Đã bị khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-800 border border-brand-200 text-[11px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                            Hoạt động
                          </span>
                        )}
                      </td>

                      {/* Ngày tham gia */}
                      <td className="py-4 px-4 text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-6 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => setUserToToggle(u)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              u.isBlocked
                                ? 'bg-brand-50 text-brand-800 hover:bg-brand-100 border border-brand-200'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            }`}
                          >
                            {u.isBlocked ? 'Mở khóa' : 'Khóa tài khoản'}
                          </button>
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
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Trang {page} / {totalPages} (tổng số {total} người dùng)
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

      {/* Modal Xác nhận Khóa / Mở khóa tài khoản */}
      {userToToggle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                {userToToggle.isBlocked
                  ? `Mở khóa tài khoản: ${userToToggle.fullName ?? userToToggle.phone}?`
                  : `Khóa tài khoản: ${userToToggle.fullName ?? userToToggle.phone}?`}
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {userToToggle.isBlocked
                  ? 'Sau khi mở khóa, người dùng sẽ có thể đăng nhập và đăng tin trở lại bình thường'
                  : 'Sau khi bị khóa, người dùng sẽ không thể đăng nhập vào hệ thống và không thể thực hiện các thao tác đăng hoặc sửa tin'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUserToToggle(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                disabled={submitting}
                onClick={handleConfirmToggle}
                className={`flex-1 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-colors disabled:opacity-50 ${
                  userToToggle.isBlocked
                    ? 'bg-brand hover:bg-brand-dark'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {userToToggle.isBlocked ? 'Xác nhận mở khóa' : 'Xác nhận khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
