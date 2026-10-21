'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';

export interface GoogleAuthPayload {
  credential?: string;
  accessToken?: string;
}

interface GoogleSignInButtonProps {
  onSuccess: (data: GoogleAuthPayload | string) => void;
  onError?: (error: string) => void;
  text?: 'continue_with' | 'signin_with' | 'signup_with';
  className?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
            error_callback?: (error: any) => void;
            prompt?: string;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
        };
        id?: {
          initialize: (config: any) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  text = 'continue_with',
  className = '',
  disabled = false,
}: GoogleSignInButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const tokenClientRef = useRef<any>(null);

  const DEFAULT_GOOGLE_CLIENT_ID = '853230977507-6f7vlho33papqgpn12j5eq3p4ids6hdh.apps.googleusercontent.com';
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tải script Google Identity Services
  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !clientId) return;

    if (window.google?.accounts?.oauth2 || window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-gsi-client');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      script.onerror = () => {
        onError?.('Không thể tải tiện ích Google, vui lòng kiểm tra kết nối mạng');
      };
      document.body.appendChild(script);
    } else {
      const handleLoad = () => setScriptLoaded(true);
      existingScript.addEventListener('load', handleLoad);
      return () => {
        existingScript.removeEventListener('load', handleLoad);
      };
    }
  }, [mounted, clientId, onError]);

  // Dọn dẹp session prompt khi unmount
  useEffect(() => {
    return () => {
      try {
        window.google?.accounts?.id?.cancel?.();
      } catch {}
    };
  }, []);

  const handleGoogleClick = useCallback(() => {
    if (disabled || isAuthenticating) return;

    if (!clientId) {
      onError?.('Chưa cấu hình Google Client ID trên hệ thống');
      return;
    }

    if (typeof window === 'undefined' || !window.google) {
      onError?.('Đang kết nối tới máy chủ Google, vui lòng thử lại sau giây lát');
      return;
    }

    // 1. Sử dụng Google OAuth2 Token Client với prompt: 'select_account'
    // Đảm bảo mở cửa sổ popup chính thức để người dùng tự chọn tài khoản Google của họ,
    // tuyệt đối không hiển thị trước tên/email cá nhân của bất kỳ ai trên giao diện
    if (window.google.accounts?.oauth2) {
      try {
        setIsAuthenticating(true);

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: (response: any) => {
            setIsAuthenticating(false);

            if (response?.error) {
              if (response.error === 'popup_closed_by_user') {
                return;
              }
              if (response.error === 'access_denied') {
                onError?.('Bạn đã hủy yêu cầu đăng nhập Google');
                return;
              }
              onError?.(response.error_description || 'Xác thực Google không thành công, vui lòng thử lại');
              return;
            }

            if (response?.access_token) {
              onSuccess({ accessToken: response.access_token });
            } else {
              onError?.('Không nhận được thông tin xác thực từ Google');
            }
          },
          error_callback: (err: any) => {
            setIsAuthenticating(false);
            console.error('[GoogleOAuth] Lỗi mở popup:', err);
            onError?.('Không thể mở cửa sổ đăng nhập Google, vui lòng kiểm tra trình duyệt chặn popup');
          },
        });

        tokenClientRef.current = tokenClient;
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err: any) {
        setIsAuthenticating(false);
        console.error('[GoogleOAuth] Lỗi khởi chạy Token Client:', err);
      }
    }

    // 2. Dự phòng trường hợp chỉ có Google ID Services
    if (window.google.accounts?.id) {
      try {
        setIsAuthenticating(true);
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
            setIsAuthenticating(false);
            if (response?.credential) {
              onSuccess({ credential: response.credential });
            } else {
              onError?.('Không nhận được thông tin xác thực từ Google');
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        window.google.accounts.id.prompt((notification: any) => {
          if (notification?.isNotDisplayed?.() || notification?.isSkippedMoment?.()) {
            setIsAuthenticating(false);
          }
        });
        return;
      } catch (err: any) {
        setIsAuthenticating(false);
        onError?.('Không thể kết nối đến Google, vui lòng thử lại');
        return;
      }
    }

    onError?.('Đang kết nối tới máy chủ Google, vui lòng thử lại sau giây lát');
  }, [disabled, isAuthenticating, clientId, onSuccess, onError]);

  const buttonLabel = text === 'signup_with' ? 'Đăng ký với Google' : 'Tiếp tục với Google';

  return (
    <div className={`relative w-full flex justify-center ${className}`} suppressHydrationWarning>
      <button
        type="button"
        disabled={disabled || isAuthenticating}
        onClick={handleGoogleClick}
        suppressHydrationWarning
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 active:scale-[0.99] transition-all shadow-xs text-sm sm:text-[15px] font-semibold text-slate-800 disabled:opacity-60 cursor-pointer select-none"
      >
        {isAuthenticating ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700" />
            <span className="text-slate-700">Đang kết nối Google</span>
          </div>
        ) : (
          <>
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span suppressHydrationWarning>{buttonLabel}</span>
          </>
        )}
      </button>
    </div>
  );
}
