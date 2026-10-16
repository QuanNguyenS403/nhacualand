'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authFetch, isLoggedIn } from '@/lib/auth-client';

export function SaveListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) return;

    authFetch(`/listings/${listingId}/is-saved`)
      .then((res) => (res.ok ? res.json() : { saved: false }))
      .then((data) => setSaved(Boolean(data?.saved)))
      .catch(() => undefined);
  }, [listingId]);

  function showNotice(msg: string) {
    setNotice(msg.replace(/\.+$/, ''));
    setTimeout(() => setNotice(null), 3000);
  }

  async function handleToggle() {
    if (listingId.startsWith('demo-')) {
      showNotice('Tin thử nghiệm không hỗ trợ lưu vào danh sách');
      return;
    }

    if (!isLoggedIn()) {
      router.push(`/dang-nhap?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setLoading(true);
    try {
      if (saved) {
        // Bỏ lưu bằng DELETE
        const res = await authFetch(`/listings/${listingId}/save`, { method: 'DELETE' });
        if (res.ok) {
          setSaved(false);
          showNotice('Đã bỏ lưu phòng');
        } else {
          showNotice('Không thể bỏ lưu lúc này, vui lòng thử lại');
        }
      } else {
        // Lưu tin bằng PUT
        const res = await authFetch(`/listings/${listingId}/save`, { method: 'PUT' });
        if (res.ok) {
          setSaved(true);
          showNotice('Đã lưu phòng vào danh sách yêu thích');
        } else {
          const errData = await res.json().catch(() => null);
          const msg = errData?.message || 'Không thể lưu tin đăng';
          showNotice(Array.isArray(msg) ? msg.join(', ') : msg);
        }
      }
    } catch {
      showNotice('Lỗi kết nối máy chủ, vui lòng thử lại sau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative inline-block">
      {notice && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-md animate-fade-in z-20">
          {notice}
        </div>
      )}
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all active:scale-95 cursor-pointer ${
          saved
            ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
            : 'border-surface-border bg-white text-text-secondary hover:border-brand hover:text-brand'
        }`}
      >
        <svg
          className={`h-4 w-4 transition-colors ${saved ? 'fill-red-500 text-red-500' : 'fill-none text-text-muted'}`}
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        <span>{saved ? 'Đã lưu' : 'Lưu tin'}</span>
      </button>
    </div>
  );
}
