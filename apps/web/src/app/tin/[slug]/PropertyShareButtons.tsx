'use client';

import { useState } from 'react';

export function PropertyShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  function getShareUrl(): string {
    if (typeof window !== 'undefined') {
      return window.location.href;
    }
    return '';
  }

  function handleShareFacebook() {
    const url = getShareUrl();
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400',
    );
  }

  function handleShareZalo() {
    const url = getShareUrl();
    window.open(
      `https://zalo.me/share?url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer,width=600,height=500',
    );
  }

  async function handleCopyLink() {
    const url = getShareUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Nút chia sẻ Facebook */}
      <button
        type="button"
        title="Chia sẻ lên Facebook"
        onClick={handleShareFacebook}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-colors"
      >
        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>

      {/* Nút chia sẻ Zalo */}
      <button
        type="button"
        title="Chia sẻ qua Zalo"
        onClick={handleShareZalo}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0068FF]/10 text-[#0068FF] hover:bg-[#0068FF] hover:text-white transition-colors font-bold text-xs"
      >
        Z
      </button>

      {/* Nút sao chép link */}
      <div className="relative">
        <button
          type="button"
          title="Sao chép liên kết tin đăng"
          onClick={handleCopyLink}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-text-secondary hover:bg-slate-200 transition-colors"
        >
          {copied ? (
            <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          )}
        </button>
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-0.5 text-[10px] text-white shadow">
            Đã chép link
          </span>
        )}
      </div>
    </div>
  );
}
