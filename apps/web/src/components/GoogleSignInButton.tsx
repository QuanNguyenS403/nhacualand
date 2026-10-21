'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  text?: 'continue_with' | 'signin_with' | 'signup_with';
  className?: string;
  disabled?: boolean;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const DEFAULT_GOOGLE_CLIENT_ID = '853230977507-6f7vlho33papqgpn12j5eq3p4ids6hdh.apps.googleusercontent.com';
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;

  // Đảm bảo chỉ khởi chạy sau khi client đã hydrate xong 100%
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCredentialCallback = useCallback(
    (response: any) => {
      if (response?.credential) {
        onSuccess(response.credential);
      } else {
        onError?.('Không nhận được thông tin xác thực từ Google');
      }
    },
    [onSuccess, onError]
  );

  // 1. Tải script Google Identity Services (GSI) sau khi mounted
  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !clientId) return;

    if (window.google?.accounts?.id) {
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
      existingScript.addEventListener('load', () => setScriptLoaded(true));
    }
  }, [mounted, clientId, onError]);

  // 2. Khởi tạo và render button chính thức chuẩn Google Branding
  useEffect(() => {
    if (!mounted || !scriptLoaded || !clientId || !containerRef.current || !window.google?.accounts?.id) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      const containerWidth = containerRef.current.parentElement?.offsetWidth || containerRef.current.offsetWidth || 360;
      const targetWidth = Math.min(Math.max(containerWidth, 240), 400);

      containerRef.current.innerHTML = '';

      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text,
        shape: 'rectangular',
        logo_alignment: 'left',
        width: targetWidth,
        locale: 'vi',
      });

      setIsRendered(true);

      // Thử gọi prompt One Tap nhẹ nhàng nếu người dùng chưa mở popup
      try {
        window.google.accounts.id.prompt();
      } catch {}
    } catch (err: any) {
      console.error('[GoogleSignIn] Lỗi khởi tạo:', err);
    }
  }, [mounted, scriptLoaded, clientId, handleCredentialCallback, text]);

  const handleFallbackClick = () => {
    if (!clientId) {
      onError?.('Vui lòng đăng nhập bằng Email và Mật khẩu');
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      onError?.('Đang kết nối tới máy chủ Google, vui lòng thử lại sau giây lát');
    }
  };

  const buttonLabel = 'Tiếp tục với Google';

  // Khung fallback tĩnh đồng bộ tuyệt đối giữa Server SSR và Initial Client Render
  if (!mounted) {
    return (
      <div className={`relative w-full flex justify-center ${className}`} suppressHydrationWarning>
        <button
          type="button"
          disabled={disabled}
          suppressHydrationWarning
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 active:scale-[0.99] transition-all shadow-xs text-sm sm:text-[15px] font-semibold text-slate-800 disabled:opacity-60 cursor-pointer"
        >
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
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-full flex flex-col items-center justify-center ${className}`} suppressHydrationWarning>
      {/* Container chứa nút Google iframe chính thức, hiển thị tự nhiên và tuân thủ 100% Google Branding */}
      <div
        ref={containerRef}
        suppressHydrationWarning
        className={`w-full flex justify-center items-center min-h-[44px] ${
          isRendered ? 'flex' : 'hidden'
        }`}
      />

      {/* Nút fallback hiển thị trong lúc Google Identity Services đang tải hoặc chưa render xong */}
      {!isRendered && (
        <button
          type="button"
          disabled={disabled}
          onClick={handleFallbackClick}
          suppressHydrationWarning
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 active:scale-[0.99] transition-all shadow-xs text-sm sm:text-[15px] font-semibold text-slate-800 disabled:opacity-60 cursor-pointer pointer-events-auto select-none"
        >
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
        </button>
      )}
    </div>
  );
}
