'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, clearTokens, isLoggedIn, getCurrentUser } from '@/lib/auth-client';

interface Profile {
  id: string;
  phone: string;
  email?: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export default function ThongTinTaiKhoanPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit profile state
  const [isEditing, setIsEditing] = useState(false);
  const [fullNameInput, setFullNameInput] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Change password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Logout state
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await authFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Bỏ qua lỗi mạng khi logout để luôn xóa token cục bộ
    }
    clearTokens();
    router.replace('/');
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/dang-nhap');
      return;
    }

    const localUser = getCurrentUser();
    if (localUser) {
      setProfile(localUser);
      setFullNameInput(localUser.fullName ?? '');
    }

    authFetch('/auth/me')
      .then((res) => {
        if (!res.ok) throw new Error('Không tải được thông tin tài khoản');
        return res.json();
      })
      .then((data: Profile) => {
        setProfile(data);
        setFullNameInput(data.fullName ?? '');
      })
      .catch((err) => {
        if (!localUser) setError((err as Error).message);
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(null);
    setError(null);

    try {
      const res = await authFetch('/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullNameInput.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message?.toString() ?? 'Cập nhật thất bại');

      setProfile((prev) => (prev ? { ...prev, fullName: data.fullName } : null));
      setProfileSuccess('Cập nhật họ và tên thành công');
      setIsEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await authFetch('/users/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message?.toString() ?? 'Đổi mật khẩu thất bại');

      setPasswordSuccess('Đổi mật khẩu thành công');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordError((err as Error).message);
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="container-max max-w-4xl py-12 px-4 sm:px-6">
      <h1 className="text-3xl font-bold text-text-primary">Thông tin tài khoản</h1>

      {error && <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>}
      {profileSuccess && <div className="mt-4 rounded-xl bg-brand-50 border border-brand-200 p-3 text-sm text-brand-900">{profileSuccess}</div>}
      {passwordSuccess && <div className="mt-4 rounded-xl bg-brand-50 border border-brand-200 p-3 text-sm text-brand-900">{passwordSuccess}</div>}

      {profile && (
        <div className="mt-6 space-y-6">
          {/* Thông tin cá nhân */}
          <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
            <div className="flex items-center justify-between border-b border-surface-border pb-4">
              <h2 className="text-base font-bold text-text-primary">Hồ sơ cá nhân</h2>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-semibold text-brand hover:text-brand-700 hover:underline"
                >
                  Chỉnh sửa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFullNameInput(profile.fullName ?? '');
                  }}
                  className="text-xs text-text-muted hover:underline"
                >
                  Huỷ
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-text-secondary">Số điện thoại</label>
                  <input
                    disabled
                    value={profile.phone}
                    className="input-field bg-slate-50 text-text-muted cursor-not-allowed"
                  />
                  <span className="text-[11px] text-text-muted">Số điện thoại đăng ký không thể thay đổi</span>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-text-secondary">Họ và tên</label>
                  <input
                    required
                    value={fullNameInput}
                    onChange={(e) => setFullNameInput(e.target.value)}
                    placeholder="Nhập họ và tên của bạn"
                    className="input-field"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="btn-primary"
                  >
                    {profileSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-3">
                {profile.email && <Field label="Email / Gmail" value={profile.email} />}
                <Field label="Số điện thoại" value={profile.phone} />
                <Field label="Họ và tên" value={profile.fullName ?? '— Chưa cập nhật —'} />
                <Field label="Vai trò" value={profile.role === 'admin' ? 'Quản trị viên' : profile.role === 'broker' ? 'Môi giới' : 'Người dùng'} />
                <Field label="Ngày tham gia" value={new Date(profile.createdAt).toLocaleDateString('vi-VN')} />
              </div>
            )}
          </div>

          {/* Đổi mật khẩu */}
          <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-primary">Bảo mật & Mật khẩu</h2>
                <p className="mt-0.5 text-xs text-text-secondary">Nên đặt mật khẩu mạnh để bảo vệ tài khoản và tin đăng</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(!showPasswordForm);
                  setPasswordError(null);
                }}
                className="rounded-xl border border-surface-border px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:border-brand hover:text-brand transition-colors"
              >
                {showPasswordForm ? 'Đóng' : 'Đổi mật khẩu'}
              </button>
            </div>

            {showPasswordForm && (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-3 border-t border-surface-border pt-4">
                {passwordError && <div className="text-xs font-medium text-red-600">{passwordError}</div>}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-text-secondary">Mật khẩu hiện tại *</label>
                  <input
                    required
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu đang dùng"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-text-secondary">Mật khẩu mới (tối thiểu 6 ký tự) *</label>
                  <input
                    required
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-text-secondary">Xác nhận mật khẩu mới *</label>
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="input-field"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="btn-primary"
                  >
                    {passwordSaving ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Phiên đăng nhập & Đăng xuất */}
          <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-primary">Phiên đăng nhập</h2>
                <p className="mt-0.5 text-xs text-text-secondary">Đăng xuất khỏi thiết bị này và thu hồi phiên làm việc trên hệ thống</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
              >
                {loggingOut ? 'Đang đăng xuất...' : 'Đăng xuất tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-surface-border pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}
