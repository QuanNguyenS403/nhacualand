'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authFetch, clearTokens, getAccessToken } from '@/lib/auth-client';
import { QnsLogo } from '@/components/QnsLogo';
import { SecurityAnnouncementBar } from './SecurityAnnouncementBar';
import { getSelectedRooms, subscribeSelectedRooms, SelectedRoomItem } from '@/lib/selected-rooms';
import { triggerPageLoading } from '@/lib/nav-utils';

const FeedbackModal = dynamic(() => import('./FeedbackModal').then((module) => module.FeedbackModal), {
  ssr: false,
});
const ConsultationModal = dynamic(
  () => import('./ConsultationModal').then((module) => module.ConsultationModal),
  { ssr: false },
);
const SelectedRoomsModal = dynamic(
  () => import('./SelectedRoomsModal').then((module) => module.SelectedRoomsModal),
  { ssr: false },
);
const AuthModal = dynamic(() => import('./AuthModal').then((module) => module.AuthModal), {
  ssr: false,
});

interface CurrentUser {
  id: string;
  fullName: string | null;
  phone: string;
  role?: string;
  email?: string | null;
  avatarUrl?: string | null;
  picture?: string | null;
  image?: string | null;
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Trạng thái các Modal tiện ích (theo yêu cầu các ảnh cung cấp)
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [selectedRoomsOpen, setSelectedRoomsOpen] = useState(false);
  const [selectedRoomsCount, setSelectedRoomsCount] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [consultationPreload, setConsultationPreload] = useState<{
    reason?: string;
    description?: string;
    selectedRoomIds?: string[];
  }>({});

  function handleDangTinClick(e: React.MouseEvent) {
    if (!user && !getAccessToken()) {
      e.preventDefault();
      setMobileOpen(false);
      setAuthModalOpen(true);
    }
  }

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 8);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  // Lắng nghe thay đổi số lượng phòng đã chọn trong localStorage
  useEffect(() => {
    setSelectedRoomsCount(getSelectedRooms().length);
    return subscribeSelectedRooms(() => {
      setSelectedRoomsCount(getSelectedRooms().length);
    });
  }, []);

  // Khởi tạo và đồng bộ trạng thái người dùng từ localStorage ngay tức thì
  useEffect(() => {
    function syncUserFromStorage() {
      try {
        const cached = localStorage.getItem('user');
        if (cached) {
          setUser(JSON.parse(cached));
        } else if (!getAccessToken()) {
          setUser(null);
        }
      } catch {}
    }

    syncUserFromStorage();
    window.addEventListener('storage', syncUserFromStorage);
    return () => window.removeEventListener('storage', syncUserFromStorage);
  }, []);

  // Xác thực ngầm với server trong nền không chặn giao diện
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    authFetch('/auth/me')
      .then((res) => {
        if (res.status === 401) {
          const cachedUser = localStorage.getItem('user');
          if (!cachedUser) {
            clearTokens();
            setUser(null);
          }
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUser(data);
          try {
            localStorage.setItem('user', JSON.stringify(data));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('Lỗi kết nối /auth/me tạm thời:', err);
      });
  }, []);

  async function handleLogout() {
    try {
      await authFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Bỏ qua lỗi mạng khi đăng xuất để đảm bảo client luôn xóa token cục bộ
    }
    clearTokens();
    setUser(null);
    setMenuOpen(false);
    // Điều hướng dứt khoát làm mới phiên làm việc sạch sẽ, triệt tiêu mọi xung đột bộ nhớ
    window.location.href = '/';
  }

  const initials = user ? (user.fullName ?? user.email ?? user.phone ?? 'U').charAt(0).toUpperCase() : '';
  const avatarUrl = user?.avatarUrl || user?.picture || user?.image || null;

  if (pathname?.startsWith('/qnsbroker/admin')) {
    return null;
  }

  return (
    <header
      className={`sticky top-0 z-50 bg-brand text-white transition-shadow duration-200 ${
        scrolled ? 'shadow-elevated' : 'shadow-sm'
      }`}
    >
      <div className="container-max relative flex h-14 sm:h-16 items-center justify-between gap-3 sm:gap-4">
        {/* Logo NHACUALAND */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0 group">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-white p-0.5 sm:p-1 shadow-sm ring-1 ring-white/30 group-hover:scale-105 transition-transform">
            <QnsLogo variant="emblem" theme="brand" size={26} />
          </div>
          <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
            NHACUA<span className="font-normal opacity-90">LAND</span>
          </span>
        </Link>

        {/* 3 mục điều hướng chính trên header bar — căn chính giữa */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1.5 lg:gap-2.5 pointer-events-auto">
          <Link
            href="/"
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
              pathname === '/'
                ? 'bg-white/20 text-white font-semibold shadow-xs'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            }`}
          >
            Trang chủ
          </Link>
          <Link
            href="/thue"
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
              pathname === '/thue' || pathname.startsWith('/thue/') || pathname.startsWith('/tin/')
                ? 'bg-white/20 text-white font-semibold shadow-xs'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            }`}
          >
            Tìm phòng
          </Link>
          <Link
            href="/danh-gia"
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
              pathname === '/danh-gia' || pathname.startsWith('/danh-gia/')
                ? 'bg-white/20 text-white font-semibold shadow-xs'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            }`}
          >
            Đánh giá
          </Link>
          <Link
            href="/gioi-thieu"
            className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
              pathname === '/gioi-thieu'
                ? 'bg-white/20 text-white font-semibold shadow-xs'
                : 'text-white/90 hover:text-white hover:bg-white/10'
            }`}
          >
            Về chúng tôi
          </Link>
        </nav>

        {/* Actions bên phải — Luôn hiển thị tức thì 100% đồng bộ với trang */}
        <div className="flex items-center gap-2.5 sm:gap-3" suppressHydrationWarning>
          {/* Nút + Đăng tin — Đồng bộ tức thì cùng trang */}
          <Link
            href="/dang-tin"
            onClick={handleDangTinClick}
            className="inline-flex items-center gap-1.5 rounded-lg sm:rounded-xl bg-white text-brand px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold shadow-sm transition-all hover:bg-brand-50 active:scale-[0.98]"
          >
            <span>+ Đăng tin</span>
          </Link>

          {/* Nút Avatar Menu — Đồng bộ kích thước chuẩn ngang với logo của website */}
          <div className="relative shrink-0" suppressHydrationWarning>
            <button
              id="user-profile-menu-button"
              type="button"
              suppressHydrationWarning
              onClick={() => setMenuOpen((v) => !v)}
              className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-sm ring-1 ring-white/30 hover:scale-105 transition-transform focus:outline-none overflow-hidden"
              aria-label="Menu cá nhân và tiện ích"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={user?.fullName || 'Avatar'}
                  className="h-full w-full rounded-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : user ? (
                <span className="flex h-full w-full items-center justify-center rounded-full bg-brand text-white font-bold text-xs sm:text-[13px] shadow-inner">
                  {initials}
                </span>
              ) : (
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-brand" width="18" height="18" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
              {selectedRoomsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-brand">
                  {selectedRoomsCount > 9 ? '9+' : selectedRoomsCount}
                </span>
              )}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 sm:top-11 z-50 w-64 rounded-2xl border border-surface-border bg-white py-2 shadow-modal animate-slide-down text-slate-800">
                  {/* Banner user info nếu đã đăng nhập — Hiển thị ảnh đại diện và Gmail chính xác */}
                  {user && (
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border mb-1">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt={user.fullName || 'Avatar'}
                          className="h-10 w-10 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-sm shrink-0">
                          {initials}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-text-primary truncate">{user.fullName ?? user.email ?? 'Chủ nhà'}</p>
                        <p className="text-xs text-text-muted truncate font-medium">{user.email || user.phone}</p>
                      </div>
                    </div>
                  )}

                      {/* 1. Đăng nhập / Thông tin tài khoản (Ảnh 2 mục 1) */}
                      {user ? (
                        <Link
                          href="/tai-khoan/thong-tin"
                          onClick={() => setMenuOpen(false)}
                          className="group flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-slate-50 hover:text-brand transition-colors"
                        >
                          <svg className="h-5 w-5 text-slate-500 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                          <span className="font-medium">Thông tin tài khoản</span>
                        </Link>
                      ) : (
                        <Link
                          href="/dang-nhap"
                          onClick={() => setMenuOpen(false)}
                          className="group flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-slate-50 hover:text-brand transition-colors"
                        >
                          <svg className="h-5 w-5 text-slate-500 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                          <span className="font-medium">Đăng nhập</span>
                        </Link>
                      )}

                      {/* 2. Các phòng đã chọn (Ảnh 2 mục 2) */}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setSelectedRoomsOpen(true);
                        }}
                        className="group flex w-full items-center justify-between px-4 py-2.5 text-sm text-text-secondary hover:bg-slate-50 hover:text-brand transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <svg className="h-5 w-5 text-slate-500 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                          <span className="font-medium">Các phòng đã chọn</span>
                        </div>
                        {selectedRoomsCount > 0 && (
                          <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
                            {selectedRoomsCount}
                          </span>
                        )}
                      </button>

                      {/* Đánh giá & Bản đồ phòng trọ */}
                      <Link
                        href="/danh-gia"
                        onClick={() => setMenuOpen(false)}
                        className="group flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-slate-50 hover:text-brand transition-colors"
                      >
                        <svg className="h-5 w-5 text-slate-500 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934a1.12 1.12 0 01-.806.094l-4.706-1.57a1.12 1.12 0 00-.806.094L4.125 6.804A1.125 1.125 0 003.5 7.81v11.37c0 .836.88 1.38 1.628 1.006l3.869-1.934c.25-.125.54-.157.806-.094l4.706 1.57c.266.063.556.031.806-.094z" />
                        </svg>
                        <span className="font-medium">Đánh giá & Bản đồ</span>
                      </Link>

                      {/* 3. Cần tư vấn (Ảnh 2 mục 3) */}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setConsultationPreload({ reason: 'Khác' });
                          setConsultationOpen(true);
                        }}
                        className="group flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-slate-50 hover:text-brand transition-colors text-left"
                      >
                        <svg className="h-5 w-5 text-slate-500 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75v3.75a3 3 0 01-3 3h-1.5a1.5 1.5 0 01-1.5-1.5v-3.75a1.5 1.5 0 011.5-1.5h3v-.75a8.25 8.25 0 10-16.5 0v.75h3a1.5 1.5 0 011.5 1.5V17.25a1.5 1.5 0 01-1.5 1.5h-1.5a3 3 0 01-3-3V12z" />
                        </svg>
                        <span className="font-medium">Cần tư vấn</span>
                      </button>

                      {/* 4. Gửi phản hồi (Ảnh 2 mục 4) */}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setFeedbackOpen(true);
                        }}
                        className="group flex w-full items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-slate-50 hover:text-brand transition-colors text-left"
                      >
                        <svg className="h-5 w-5 text-slate-500 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                        </svg>
                        <span className="font-medium">Gửi phản hồi</span>
                      </button>

                      {/* 5. Về chúng tôi (Ảnh 2 mục 5) */}
                      <Link
                        href="/gioi-thieu"
                        onClick={() => setMenuOpen(false)}
                        className="group flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-slate-50 hover:text-brand transition-colors"
                      >
                        <svg className="h-5 w-5 text-slate-500 group-hover:text-brand transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        <span className="font-medium">Về chúng tôi</span>
                      </Link>

                      {/* Quản lý tin & Đăng xuất cho tài khoản đã đăng nhập */}
                      {user && (
                        <div className="border-t border-surface-border mt-1 pt-1">
                          {user.role === 'admin' && (
                            <Link
                              href="/admin"
                              onClick={() => setMenuOpen(false)}
                              className="flex items-center px-4 py-2 text-xs font-bold text-brand-700 hover:bg-brand-50 transition-colors"
                            >
                              <span>Trang Quản trị Hệ thống</span>
                            </Link>
                          )}
                          <Link
                            href="/tai-khoan/quan-ly-tin"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center px-4 py-2 text-xs text-text-secondary hover:bg-slate-50 hover:text-text-primary transition-colors"
                          >
                            <span>Quản lý tin đăng</span>
                          </Link>
                          <Link
                            href="/tai-khoan/tin-da-luu"
                            onClick={() => setMenuOpen(false)}
                            className="flex items-center px-4 py-2 text-xs text-text-secondary hover:bg-slate-50 hover:text-text-primary transition-colors"
                          >
                            <span>Phòng đã lưu</span>
                          </Link>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                            </svg>
                            <span>Đăng xuất</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

          {/* Mobile menu toggle */}
          <button
            id="mobile-menu-button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? (
              <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-4.5 h-4.5 sm:w-5 sm:h-5" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Thanh cảnh báo bảo mật chạy chữ liên tục ngay bên dưới header bar */}
      <SecurityAnnouncementBar />

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="border-t border-white/15 bg-brand-700/95 backdrop-blur-md pb-4 animate-slide-down md:hidden text-white">
          <div className="container-max pt-2 space-y-1">
            <Link
              href="/"
              className="flex rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Trang chủ
            </Link>
            <Link
              href="/thue"
              className="flex rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Tìm phòng
            </Link>
            <Link
              href="/danh-gia"
              className="flex rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Đánh giá
            </Link>
            <Link
              href="/gioi-thieu"
              className="flex rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Về chúng tôi
            </Link>

            {/* Các tiện ích từ Ảnh 2 cho Mobile */}
            <div className="pt-2 border-t border-white/10 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setSelectedRoomsOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                <span>Các phòng đã chọn</span>
                {selectedRoomsCount > 0 && (
                  <span className="rounded-full bg-white text-brand px-2 py-0.5 text-xs font-bold">
                    {selectedRoomsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setConsultationPreload({ reason: 'Khác' });
                  setConsultationOpen(true);
                }}
                className="flex w-full rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cần tư vấn
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setFeedbackOpen(true);
                }}
                className="flex w-full rounded-xl px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Gửi phản hồi
              </button>
            </div>

            {user ? (
              <>
                <Link
                  href="/tai-khoan/quan-ly-tin"
                  className="flex rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Quản lý tin đăng
                </Link>
                <Link
                  href="/tai-khoan/tin-da-luu"
                  className="flex rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  Phòng đã lưu
                </Link>
                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="flex items-center justify-center rounded-xl bg-slate-900 text-white font-bold py-2.5 text-sm mt-2"
                  >
                    <span>Trang Quản trị</span>
                  </Link>
                )}
              </>
            ) : (
              <Link
                href="/dang-nhap"
                className="flex rounded-xl px-4 py-2.5 text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors mt-2"
              >
                Đăng nhập
              </Link>
            )}
            <Link
              href="/dang-tin"
              onClick={handleDangTinClick}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white text-brand font-bold py-2.5 text-sm mt-2 shadow-sm"
            >
              <span>+ Đăng tin cho thuê miễn phí</span>
            </Link>
          </div>
        </div>
      )}

      {/* Các Modal tiện ích (Khớp hình ảnh cung cấp) */}
      {feedbackOpen && (
        <FeedbackModal isOpen onClose={() => setFeedbackOpen(false)} />
      )}

      {consultationOpen && (
        <ConsultationModal
          isOpen
          onClose={() => setConsultationOpen(false)}
          initialReason={consultationPreload.reason}
          initialDescription={consultationPreload.description}
          selectedRoomIds={consultationPreload.selectedRoomIds}
        />
      )}

      {selectedRoomsOpen && (
        <SelectedRoomsModal
          isOpen
          onClose={() => setSelectedRoomsOpen(false)}
          onOpenConsultationWithRooms={(rooms) => {
            setConsultationPreload({
              reason: 'Xem phòng trực tiếp',
              description: `Tôi muốn đặt lịch xem các phòng đã chọn:\n${rooms.map((r) => `- ${r.title} (${r.formattedPrice || ''})`).join('\n')}`,
              selectedRoomIds: rooms.map((r) => String(r.id)),
            });
            setConsultationOpen(true);
          }}
        />
      )}

      {authModalOpen && (
        <AuthModal
          isOpen
          onClose={() => setAuthModalOpen(false)}
          onSuccess={() => {
            setAuthModalOpen(false);
            try {
              const cached = localStorage.getItem('user');
              if (cached) setUser(JSON.parse(cached));
            } catch {}
            router.push('/dang-tin');
          }}
          title="Đăng nhập để đăng tin"
          subtitle="Vui lòng đăng nhập hoặc đăng ký tài khoản bằng Google để tiếp tục đến mục đăng tin"
        />
      )}
    </header>
  );
}
