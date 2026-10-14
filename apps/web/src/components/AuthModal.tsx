'use client';

import { useEffect, useState } from 'react';
import GoogleSignInButton from './GoogleSignInButton';
import { setTokens, parseGoogleJwt } from '@/lib/auth-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
  inline?: boolean;
}

type ViewMode = 'login' | 'register' | 'forgot';

function formatFriendlyError(err: unknown): string {
  const msg = (err as Error)?.message || 'Vui lòng kiểm tra lại thông tin hoặc thử lại';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network') || msg.includes('ENOTFOUND')) {
    return 'Không thể kết nối đến máy chủ, vui lòng kiểm tra lại kết nối mạng';
  }
  if (msg.includes('Đã có lỗi xảy ra') || msg.includes('thử lại sau')) {
    return 'Không thể hoàn tất yêu cầu lúc này, vui lòng kiểm tra lại thông tin hoặc thử lại';
  }
  return msg.replace(/\.+$/, '');
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
  inline = false,
}: AuthModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [forgotStep, setForgotStep] = useState<'email' | 'code' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // State quy trình khôi phục mật khẩu qua Gmail
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    // Tự động nạp email đã lưu nếu có
    const savedEmail = localStorage.getItem('qns_remember_email');
    if (savedEmail && !email) {
      setEmail(savedEmail);
    }
  }, [isOpen]);

  async function handleGoogleLogin(credential: string) {
    setError(null);
    setLoading(true);
    try {
      let loggedIn = false;

      // 1. Gửi credential lên server để xác thực & lưu DB
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`${API_URL}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          setTokens(data.accessToken, data.refreshToken, data.user);
          loggedIn = true;

          // Luôn đồng bộ tài khoản admin vào kho local
          const userEmail = (data.user?.email || '').toLowerCase();
          if (userEmail === 'ducquan16102006@gmail.com' || userEmail === 'admin@qns.com' || userEmail === 'contact@qns.com') {
            try {
              const savedUsersRaw = localStorage.getItem('qns_registered_users');
              const savedUsers: any[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
              const idx = savedUsers.findIndex((u) => u.email.toLowerCase() === userEmail);
              const adminEntry = {
                id: '1',
                fullName: 'Chủ nhà',
                email: userEmail,
                password: 'Quannguyenkay6@',
                phone: '0981 753 082',
                role: 'admin',
                createdAt: data.user?.createdAt || new Date().toISOString(),
              };
              if (idx >= 0) savedUsers[idx] = { ...savedUsers[idx], ...adminEntry };
              else savedUsers.push(adminEntry);
              localStorage.setItem('qns_registered_users', JSON.stringify(savedUsers));
            } catch {}
          }
        }
      } catch {
        // Fallback bên dưới nếu server offline hoặc mạng chậm
      }

      // 2. Tự động phục hồi tức thì cho khách hàng thật nếu server offline hoặc lỗi DB
      if (!loggedIn) {
        const googleProfile = parseGoogleJwt(credential);
        if (googleProfile?.email) {
          const lowerEmail = googleProfile.email.toLowerCase();
          const isAdmin = lowerEmail === 'ducquan16102006@gmail.com' || lowerEmail === 'admin@qns.com' || lowerEmail === 'contact@qns.com';
          const fallbackUser = {
            id: isAdmin ? '1' : (googleProfile.sub || `g_${Date.now()}`),
            fullName: isAdmin ? 'Chủ nhà' : (googleProfile.name || googleProfile.email.split('@')[0]),
            email: googleProfile.email,
            avatarUrl: googleProfile.picture || null,
            phone: '0981 753 082',
            role: isAdmin ? 'admin' : 'user',
            isPhoneVerified: true,
            isIdVerified: true,
            createdAt: new Date().toISOString(),
          };
          const mockToken = isAdmin ? `admin_token_${Date.now()}` : `g_token_${Date.now()}_${btoa(googleProfile.email)}`;
          setTokens(mockToken, mockToken, fallbackUser);
          loggedIn = true;

          // Luôn đồng bộ tài khoản vào kho qns_registered_users
          try {
            const savedUsersRaw = localStorage.getItem('qns_registered_users');
            const savedUsers: any[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
            const idx = savedUsers.findIndex((u) => u.email.toLowerCase() === lowerEmail);
            const userEntry = {
              id: fallbackUser.id,
              fullName: fallbackUser.fullName,
              email: fallbackUser.email,
              password: isAdmin ? 'Quannguyenkay6@' : (idx >= 0 ? savedUsers[idx].password : ''),
              phone: fallbackUser.phone,
              avatarUrl: fallbackUser.avatarUrl,
              role: fallbackUser.role,
              createdAt: fallbackUser.createdAt,
            };
            if (idx >= 0) savedUsers[idx] = { ...savedUsers[idx], ...userEntry };
            else savedUsers.push(userEntry);
            localStorage.setItem('qns_registered_users', JSON.stringify(savedUsers));
          } catch {}
        }
      }

      if (loggedIn) {
        handleClose();
        if (onSuccess) onSuccess();
      } else {
        throw new Error('Không thể xác thực thông tin tài khoản Google, vui lòng thử lại');
      }
    } catch (err) {
      setError(formatFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  function resetState() {
    setViewMode('login');
    setForgotStep('email');
    setPassword('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMsg(null);
    setLoading(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      let loggedIn = false;
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      const isAdminAccount =
        cleanEmail === 'admin@qns.com' ||
        cleanEmail === 'contact@qns.com' ||
        cleanEmail === 'ducquan16102006@gmail.com' ||
        cleanEmail === '0981753082';

      // 1. Kiểm tra nghiêm ngặt mật khẩu quản trị viên
      if (isAdminAccount && cleanPassword !== 'Quannguyenkay6@') {
        throw new Error('Email hoặc mật khẩu không chính xác');
      }

      // 2. Xác thực trực tiếp qua máy chủ Next.js (/api/auth/login) — Bền vững, nhanh chóng, độc lập
      try {
        const localApiRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
          }),
        });
        if (localApiRes.ok) {
          const data = await localApiRes.json();
          if (data && data.success && data.user) {
            setTokens(data.accessToken, data.refreshToken, data.user);
            loggedIn = true;
          }
        }
      } catch {
        // Tiếp tục thử các kênh khác
      }

      // 3. Nếu chưa đăng nhập được, thử qua Backend NestJS API nếu đang online
      if (!loggedIn) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password: cleanPassword,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            setTokens(data.accessToken, data.refreshToken, data.user);
            loggedIn = true;
          }
        } catch {
          // Bỏ qua lỗi kết nối backend để kiểm tra tiếp kho cục bộ
        }
      }

      // 4. Nếu vẫn chưa đăng nhập được, đối chiếu kho tài khoản cục bộ của trình duyệt
      if (!loggedIn) {
        if (isAdminAccount) {
          if (cleanPassword !== 'Quannguyenkay6@') {
            throw new Error('Email hoặc mật khẩu không chính xác');
          }
          const adminUser = {
            id: '1',
            fullName: 'Chủ sàn QNS',
            email: cleanEmail.includes('@') ? cleanEmail : 'admin@qns.com',
            phone: '0981 753 082',
            avatarUrl: null,
            role: 'admin',
            createdAt: new Date().toISOString(),
          };
          const mockToken = `admin_token_${Date.now()}`;
          setTokens(mockToken, mockToken, adminUser);
          loggedIn = true;
        } else {
          const savedUsersRaw = localStorage.getItem('qns_registered_users');
          const savedUsers: any[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
          const matched = savedUsers.find((u) => u.email.toLowerCase() === cleanEmail);
          if (matched) {
            if (!matched.password) {
              throw new Error('Tài khoản này được đăng nhập bằng Google, vui lòng chọn Tiếp tục với Google');
            }
            if (matched.password !== cleanPassword) {
              throw new Error('Email hoặc mật khẩu không chính xác');
            }
            const clientUser = {
              id: matched.id,
              fullName: matched.fullName,
              email: matched.email,
              phone: matched.phone || '0981 753 082',
              avatarUrl: matched.avatarUrl || null,
              role: matched.role || 'user',
              createdAt: matched.createdAt,
            };
            const mockToken = `user_token_${Date.now()}`;
            setTokens(mockToken, mockToken, clientUser);
            loggedIn = true;

            // Đồng bộ ngầm tài khoản này lên máy chủ để các lần sau đăng nhập tức thì
            fetch('/api/auth/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(matched),
            }).catch(() => {});
          }
        }
      }

      // 5. Nếu không khớp bất kỳ nguồn nào -> Thông báo lỗi chính xác
      if (!loggedIn) {
        throw new Error('Email hoặc mật khẩu không chính xác');
      }

      if (typeof window !== 'undefined' && rememberMe) {
        localStorage.setItem('qns_remember_email', cleanEmail);
      }

      handleClose();
      if (onSuccess) onSuccess();
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
      let registered = false;
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      const cleanFullName = fullName.trim() || cleanEmail.split('@')[0];

      // 1. Lưu bền vững vào cơ sở dữ liệu tài khoản máy chủ (/api/auth/register)
      try {
        const localRegRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
            fullName: cleanFullName,
            phone: '0981 753 082',
          }),
        });
        const data = await localRegRes.json();
        if (localRegRes.ok) {
          setTokens(data.accessToken, data.refreshToken, data.user);
          registered = true;
        } else if (localRegRes.status === 409) {
          throw new Error('Email này đã được đăng ký, vui lòng đăng nhập');
        }
      } catch (err: any) {
        if (err.message && err.message.includes('đã được đăng ký')) {
          throw err;
        }
      }

      // 2. Đồng bộ thêm tới Backend NestJS nếu đang online
      try {
        fetch(`${API_URL}/auth/register-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            fullName: cleanFullName,
            password: cleanPassword,
          }),
        }).catch(() => {});
      } catch {}

      // 3. Luôn đồng bộ tài khoản vào kho localStorage của trình duyệt
      const savedUsersRaw = localStorage.getItem('qns_registered_users');
      const savedUsers: any[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];
      const userIdx = savedUsers.findIndex((u) => u.email.toLowerCase() === cleanEmail);
      const clientUser = {
        id: `usr_${Date.now()}`,
        fullName: cleanFullName,
        email: cleanEmail,
        password: cleanPassword,
        phone: '0981 753 082',
        role: 'user',
        createdAt: new Date().toISOString(),
      };
      if (userIdx >= 0) {
        savedUsers[userIdx] = clientUser;
      } else {
        savedUsers.push(clientUser);
      }
      localStorage.setItem('qns_registered_users', JSON.stringify(savedUsers));

      if (!registered) {
        const mockToken = `user_token_${Date.now()}`;
        setTokens(mockToken, mockToken, clientUser);
        registered = true;
      }

      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(formatFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // ── CÁC HÀM XỬ LÝ KHÔI PHỤC MẬT KHẨU 3 BƯỚC QUA GMAIL TRONG MODAL ──
  // Bước 1: Gửi mã khôi phục về Gmail
  async function handleForgotSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) {
        throw new Error('Vui lòng nhập địa chỉ email của bạn');
      }

      const res = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Không thể gửi mã khôi phục, vui lòng thử lại');
      }

      setSuccessMsg(`Mã khôi phục 6 chữ số đã được gửi tới ${cleanEmail}, vui lòng kiểm tra hộp thư Gmail (kể cả hòm thư Spam)`);
      setForgotStep('code');
      setResendCooldown(60);
      setResetCode('');
    } catch (err) {
      setError(formatFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // Bước 2: Xác nhận mã khôi phục 6 chữ số
  async function handleForgotVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = resetCode.trim();

      if (!cleanCode || cleanCode.length !== 6) {
        throw new Error('Vui lòng nhập đầy đủ mã xác minh 6 chữ số');
      }

      const res = await fetch('/api/auth/forgot-password/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Mã xác minh không chính xác hoặc đã hết hạn');
      }

      setSuccessMsg('Mã xác minh chính xác, vui lòng nhập mật khẩu mới');
      setForgotStep('reset');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(formatFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // Bước 3: Đặt lại mật khẩu mới và xác nhận mật khẩu
  async function handleForgotResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = resetCode.trim();
      const cleanNewPass = newPassword.trim();
      const cleanConfirmPass = confirmPassword.trim();

      if (!cleanNewPass || cleanNewPass.length < 6) {
        throw new Error('Mật khẩu mới phải có tối thiểu 6 ký tự');
      }

      if (cleanNewPass !== cleanConfirmPass) {
        throw new Error('Mật khẩu xác nhận không trùng khớp');
      }

      const res = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
          newPassword: cleanNewPass,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Không thể đặt lại mật khẩu, vui lòng thử lại');
      }

      // Đồng bộ mật khẩu mới vào kho localStorage của trình duyệt
      try {
        const raw = localStorage.getItem('qns_registered_users');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const idx = list.findIndex((u) => (u.email || '').toLowerCase() === cleanEmail);
            if (idx >= 0) {
              list[idx].password = cleanNewPass;
              localStorage.setItem('qns_registered_users', JSON.stringify(list));
            }
          }
        }
      } catch {}

      setSuccessMsg('Khôi phục mật khẩu thành công, đang chuyển về màn hình đăng nhập');

      // Bước 4: Tự động chuyển về màn hình đăng nhập sau 1.5 giây
      setTimeout(() => {
        setViewMode('login');
        setForgotStep('email');
        setPassword('');
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg('Đặt lại mật khẩu thành công, bạn có thể đăng nhập ngay');
      }, 1500);
    } catch (err) {
      setError(formatFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  // Gửi lại mã khôi phục khi hết thời gian chờ
  async function handleResendCode() {
    if (resendCooldown > 0 || loading) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể gửi lại mã khôi phục');
      }
      setSuccessMsg(`Mã khôi phục mới đã được gửi tới ${cleanEmail}`);
      setResendCooldown(60);
    } catch (err) {
      setError(formatFriendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const card = (
    <div className={`relative w-full max-w-[440px] rounded-2xl sm:rounded-[22px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-2xl transition-all ${inline ? '' : 'max-h-[92vh] overflow-y-auto'}`}>
        {/* Nút đóng góc trên bên phải */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Tiêu đề & phụ đề đồng bộ giao diện Đăng nhập */}
        <div className="text-center pt-1">
          <h2 className="font-bold text-2xl sm:text-[26px] text-slate-900 tracking-tight">
            {viewMode === 'login'
              ? title || 'Chào mừng trở lại'
              : viewMode === 'register'
                ? 'Tạo tài khoản'
                : forgotStep === 'code'
                  ? 'Nhập mã khôi phục'
                  : forgotStep === 'reset'
                    ? 'Đặt lại mật khẩu mới'
                    : 'Khôi phục mật khẩu'}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {viewMode === 'login'
              ? subtitle || 'Đăng nhập vào tài khoản của bạn'
              : viewMode === 'register'
                ? 'Đăng ký để lưu tin và trải nghiệm đầy đủ'
                : forgotStep === 'code'
                  ? `Nhập mã xác minh 6 chữ số đã gửi về ${email}`
                  : forgotStep === 'reset'
                    ? 'Tạo mật khẩu mới cho tài khoản của bạn'
                    : 'Nhập email để nhận liên kết đặt lại mật khẩu'}
          </p>
        </div>

        {/* Nút Tiếp tục với Google (cho viewMode login) */}
        {viewMode === 'login' && (
          <>
            <div className="mt-6 w-full">
              <GoogleSignInButton
                onSuccess={handleGoogleLogin}
                onError={setError}
                text="continue_with"
                disabled={loading}
              />
            </div>

            {/* Dòng phân cách HOẶC ĐĂNG NHẬP VỚI */}
            <div className="my-5 flex items-center">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase select-none">
                HOẶC ĐĂNG NHẬP VỚI
              </span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* Tab/Nút Email đồng bộ màu chủ đạo Vàng Gold */}
            <div className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand text-white font-medium text-sm shadow-xs select-none">
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
          <div className="mt-4 rounded-xl bg-brand-50 border border-brand-200 p-3 text-center text-xs sm:text-sm font-medium text-brand-900">
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
          <form onSubmit={handleLoginSubmit} className="mt-4">
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

            <div className="mt-3.5">
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

            {/* Nút Đăng nhập màu chủ đạo Brand Teal */}
            <button
              type="submit"
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-brand hover:bg-brand-700 text-white font-bold py-3.5 text-sm sm:text-base shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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

            {/* Chuyển sang Đăng ký */}
            <div className="mt-5 text-center text-xs sm:text-sm text-slate-500">
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

        {/* ── FORM ĐĂNG KÝ ── */}
        {viewMode === 'register' && (
          <>
            <div className="mt-6 w-full">
              <GoogleSignInButton
                onSuccess={handleGoogleLogin}
                onError={setError}
                text="continue_with"
                disabled={loading}
              />
            </div>

            <div className="my-5 flex items-center">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase select-none">
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

        {/* ── QUY TRÌNH KHÔI PHỤC MẬT KHẨU 3 BƯỚC QUA GMAIL ── */}
        {viewMode === 'forgot' && (
          <div className="mt-5 space-y-4">
            {/* BƯỚC 1: Nhập email để nhận mã khôi phục về Gmail */}
            {forgotStep === 'email' && (
              <form onSubmit={handleForgotSendCode} className="space-y-4">
                {/* Hộp gợi ý vàng gold sang trọng chuẩn theo thiết kế */}
                <div className="rounded-2xl bg-brand-50/80 border border-brand-200/80 p-4 text-xs sm:text-[13px] text-brand-900 leading-relaxed text-center font-medium shadow-2xs">
                  Nếu email tồn tại trong hệ thống, hướng dẫn khôi phục mật khẩu đã được gửi đến hòm thư của bạn
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

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 w-full rounded-xl bg-brand hover:bg-brand-700 text-white font-bold py-3.5 text-sm sm:text-base shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Đang gửi mã tới Gmail</span>
                    </div>
                  ) : (
                    <span>Gửi yêu cầu khôi phục</span>
                  )}
                </button>

                <div className="mt-4 text-center text-xs sm:text-sm text-slate-500">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="font-bold text-brand hover:text-brand-700 hover:underline cursor-pointer"
                  >
                    Quay lại đăng nhập
                  </button>
                </div>
              </form>
            )}

            {/* BƯỚC 2: Nhập mã xác minh 6 chữ số gửi về Gmail */}
            {forgotStep === 'code' && (
              <form onSubmit={handleForgotVerifyCode} className="space-y-4">
                <div className="rounded-xl bg-brand-50/80 border border-brand-200 p-3.5 text-xs text-brand-900 leading-relaxed">
                  Vui lòng kiểm tra hộp thư đến (hoặc hòm thư rác/Spam) của địa chỉ Gmail <strong>{email}</strong> để lấy mã xác thực gồm 6 chữ số
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Mã khôi phục (6 chữ số)</label>
                  <input
                    type="text"
                    maxLength={6}
                    pattern="[0-9]*"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    required
                    className="w-full text-center font-mono text-2xl font-black tracking-[0.25em] rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || resetCode.length !== 6}
                  className="mt-2 w-full rounded-xl bg-brand hover:bg-brand-700 text-white font-bold py-3.5 text-sm sm:text-base shadow-md hover:shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Đang kiểm tra mã</span>
                    </div>
                  ) : (
                    <span>Xác nhận mã khôi phục</span>
                  )}
                </button>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-1">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || loading}
                    className="font-bold text-brand hover:text-brand-700 hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Gửi lại mã sau (${resendCooldown}s)` : 'Gửi lại mã mới'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('email');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="font-medium text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
                  >
                    Đổi địa chỉ email khác
                  </button>
                </div>
              </form>
            )}

            {/* BƯỚC 3: Đặt lại mật khẩu mới và xác nhận mật khẩu mới */}
            {forgotStep === 'reset' && (
              <form onSubmit={handleForgotResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showNewPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">Xác nhận mật khẩu mới</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới vừa đặt"
                      required
                      minLength={6}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
                      <span>Đang cập nhật mật khẩu</span>
                    </div>
                  ) : (
                    <span>Lưu mật khẩu mới</span>
                  )}
                </button>

                <div className="mt-4 text-center text-xs sm:text-sm text-slate-500">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setForgotStep('email');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="font-bold text-brand hover:text-brand-700 hover:underline cursor-pointer"
                  >
                    Quay lại đăng nhập
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    );

  if (inline) {
    return card;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {card}
    </div>
  );
}
