'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { setTokens, sendAuthRequest } from '@/lib/auth-client';

type ViewMode = 'login' | 'register' | 'forgot';

function formatFriendlyError(err: unknown): string {
  const msg = (err as Error)?.message || 'Vui lòng kiểm tra lại thông tin hoặc thử lại';
  if (
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('network') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('Load failed')
  ) {
    return 'Không thể kết nối đến máy chủ, vui lòng kiểm tra lại kết nối mạng';
  }
  if (
    msg.includes('1033') ||
    msg.includes('530') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('bảo trì') ||
    msg.includes('Argo Tunnel')
  ) {
    return 'Hệ thống đang bảo trì máy chủ, vui lòng quay lại sau ít phút';
  }
  if (msg.includes('Đã có lỗi xảy ra') || msg.includes('thử lại sau')) {
    return 'Không thể hoàn tất yêu cầu lúc này, vui lòng kiểm tra lại thông tin hoặc thử lại';
  }
  return msg.replace(/\.+$/, '');
}

function getSafeReturnUrl(rawUrl: string | null): string {
  if (!rawUrl) return '/';
  if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
    return rawUrl;
  }
  return '/';
}

function DangNhapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToParam = searchParams.get('returnTo') || searchParams.get('redirect') || searchParams.get('callbackUrl');

  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const safeReturnUrl = getSafeReturnUrl(returnToParam);

  useEffect(() => {
    router.prefetch(safeReturnUrl);
    router.prefetch('/');
    router.prefetch('/tai-khoan/thong-tin');
    router.prefetch('/tai-khoan/quan-ly-tin');
    router.prefetch('/tai-khoan/tin-da-luu');
    router.prefetch('/dang-tin');

    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('qns_remember_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, [router, safeReturnUrl]);

  async function handleGoogleLogin(credential: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await sendAuthRequest('/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.accessToken) {
        if (res.status === 530 || res.status >= 500) {
          throw new Error('Hệ thống đang bảo trì máy chủ, vui lòng quay lại sau ít phút');
        }
        throw new Error(data?.message || 'Không thể xác thực thông tin tài khoản Google, vui lòng thử lại');
      }

      setTokens(data.accessToken, data.refreshToken, data.user);
      router.push(safeReturnUrl);
    } catch (err) {
      setError(formatFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      const res = await sendAuthRequest('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.accessToken) {
        if (res.status === 530 || res.status >= 500) {
          throw new Error('Hệ thống đang bảo trì máy chủ, vui lòng quay lại sau ít phút');
        }
        throw new Error(data?.message || 'Email hoặc mật khẩu không chính xác');
      }

      setTokens(data.accessToken, data.refreshToken, data.user);
      if (typeof window !== 'undefined' && rememberMe) {
        localStorage.setItem('qns_remember_email', cleanEmail);
      }
      router.push(safeReturnUrl);
    } catch (err) {
      setError(formatFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      let cleanFullName = fullName.trim() || cleanEmail.split('@')[0];
      if (cleanFullName.length < 2) {
        cleanFullName = 'Người dùng';
      }

      const res = await sendAuthRequest('/auth/register-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          fullName: cleanFullName,
          password: cleanPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.accessToken) {
        if (res.status === 409) {
          throw new Error('Email này đã được đăng ký, vui lòng đăng nhập');
        }
        if (res.status === 530 || res.status >= 500) {
          throw new Error('Hệ thống đang bảo trì máy chủ, vui lòng quay lại sau ít phút');
        }
        const messageText = Array.isArray(data?.message) ? data.message[0] : data?.message;
        throw new Error(messageText || 'Không thể đăng ký tài khoản lúc này, vui lòng thử lại');
      }

      setTokens(data.accessToken, data.refreshToken, data.user);
      router.push(safeReturnUrl);
    } catch (err) {
      setError(formatFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/60 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-[440px] rounded-2xl sm:rounded-[22px] border border-slate-200/80 bg-white p-7 sm:p-9 shadow-elevated">
        {/* Header Title */}
        <div className="text-center">
          <h1 className="font-bold text-2xl sm:text-[27px] text-slate-900 tracking-tight">
            {viewMode === 'login'
              ? 'Chào mừng trở lại'
              : viewMode === 'register'
                ? 'Tạo tài khoản'
                : 'Khôi phục mật khẩu'}
          </h1>
          <p className="text-sm sm:text-[14.5px] text-slate-500 mt-2">
            {viewMode === 'login'
              ? 'Đăng nhập vào tài khoản của bạn'
              : viewMode === 'register'
                ? 'Đăng ký để lưu tin và trải nghiệm đầy đủ'
                : 'Liên hệ quản trị viên để được hỗ trợ cấp lại mật khẩu'}
          </p>
        </div>

        {/* Nút Tiếp tục với Google */}
        {viewMode === 'login' && (
          <>
            <div className="mt-6 sm:mt-7 w-full">
              <GoogleSignInButton
                onSuccess={handleGoogleLogin}
                onError={setError}
                text="continue_with"
                disabled={loading}
              />
            </div>

            {/* Dòng phân cách HOẶC ĐĂNG NHẬP VỚI */}
            <div className="my-5 sm:my-6 flex items-center">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3.5 text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 uppercase select-none">
                HOẶC ĐĂNG NHẬP VỚI
              </span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* Tab/Nút Email đồng bộ màu chủ đạo Vàng Gold */}
            <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand text-slate-950 font-bold text-sm shadow-xs select-none">
              <svg className="w-4.5 h-4.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
              <span>Email</span>
            </div>
          </>
        )}

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="mt-4 rounded-xl bg-brand-50 border border-brand-200 p-3 text-center text-xs sm:text-sm font-bold text-brand-900">
            {successMsg}
          </div>
        )}

        {/* Thông báo lỗi */}
        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-center text-xs sm:text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {/* ── FORM ĐĂNG NHẬP ── */}
        {viewMode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="mt-4 sm:mt-5">
            <div>
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email của bạn"
                required
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-2xs"
              />
            </div>

            <div className="mt-3.5 sm:mt-4">
              <label className="block text-sm font-bold text-slate-900 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox Ghi nhớ đăng nhập + Link Quên mật khẩu */}
            <div className="mt-4 flex items-center justify-between text-xs sm:text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                />
                <span>Ghi nhớ đăng nhập</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setViewMode('forgot');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-slate-700 hover:text-brand font-medium transition-colors cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Nút Đăng nhập */}
            <button
              type="submit"
              disabled={loading}
              className="mt-5 sm:mt-6 w-full rounded-xl bg-brand hover:bg-brand-700 text-white font-bold py-3.5 text-sm sm:text-base shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang đăng nhập</span>
                </div>
              ) : (
                <span>Đăng nhập</span>
              )}
            </button>

            {/* Dòng chân trang chuyển sang Đăng ký */}
            <div className="mt-5 sm:mt-6 text-center text-xs sm:text-sm text-slate-500">
              <span>Bạn chưa có tài khoản? </span>
              <button
                type="button"
                onClick={() => {
                  setViewMode('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="font-bold text-brand hover:text-brand-700 hover:underline cursor-pointer"
              >
                Đăng ký ngay
              </button>
            </div>
          </form>
        )}

        {/* ── FORM ĐĂNG KÝ TÀI KHOẢN MỚI ── */}
        {viewMode === 'register' && (
          <>
            <div className="mt-6 sm:mt-7 w-full">
              <GoogleSignInButton
                onSuccess={handleGoogleLogin}
                onError={setError}
                text="continue_with"
                disabled={loading}
              />
            </div>

            <div className="my-5 sm:my-6 flex items-center">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3.5 text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 uppercase select-none">
                HOẶC ĐĂNG KÝ VỚI EMAIL
              </span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Họ và tên</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nhập họ và tên của bạn"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu tối thiểu 6 ký tự"
                    required
                    minLength={6}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-brand hover:bg-brand-700 text-white font-bold py-3.5 text-sm sm:text-base shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang đăng ký</span>
                  </div>
                ) : (
                  <span>Đăng ký</span>
                )}
              </button>

              <div className="mt-4 text-center text-xs sm:text-sm text-slate-500">
                <span>Đã có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="font-bold text-brand hover:text-brand-700 hover:underline cursor-pointer"
                >
                  Đăng nhập ngay
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── QUY TRÌNH KHÔI PHỤC MẬT KHẨU (BẢO TRÌ) ── */}
        {viewMode === 'forgot' && (
          <div className="mt-5 sm:mt-6 space-y-4">
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/80 p-5 text-center text-sm font-medium text-amber-900 leading-relaxed shadow-2xs">
              Tính năng khôi phục mật khẩu tự động đang được bảo trì, vui lòng liên hệ quản trị viên qua hotline để được hỗ trợ
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs text-slate-500 font-semibold mb-1">Hotline hỗ trợ kỹ thuật</p>
              <a
                href="tel:0981753082"
                className="text-base font-extrabold text-brand hover:text-brand-700 hover:underline"
              >
                0981 753 082
              </a>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="font-bold text-sm text-brand hover:text-brand-700 hover:underline cursor-pointer"
              >
                Quay lại đăng nhập
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DangNhapPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-slate-500">Đang tải</div>}>
      <DangNhapContent />
    </Suspense>
  );
}
