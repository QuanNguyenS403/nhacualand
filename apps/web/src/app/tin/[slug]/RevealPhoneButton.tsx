'use client';

import { useEffect, useState } from 'react';
import { authFetch, isLoggedIn } from '@/lib/auth-client';
import { SITE_CONFIG } from '@/lib/constants';

interface RevealPhoneButtonProps {
  listingId: string;
  onPhoneRevealed?: (phone: string) => void;
  onRequireAuth?: () => void;
  autoRevealTrigger?: number;
}

export function RevealPhoneButton({
  listingId,
  onPhoneRevealed,
  onRequireAuth,
  autoRevealTrigger,
}: RevealPhoneButtonProps) {
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (autoRevealTrigger && autoRevealTrigger > 0 && !phone && isLoggedIn()) {
      handleReveal();
    }
  }, [autoRevealTrigger]);

  async function handleReveal() {
    setError(null);
    if (listingId.startsWith('demo-')) {
      setError('Đây là tin thử nghiệm, vui lòng đặt lịch xem phòng để được hỗ trợ trực tiếp');
      return;
    }
    if (!isLoggedIn()) {
      if (onRequireAuth) {
        onRequireAuth();
      }
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(`/listings/${listingId}/reveal-phone`, { method: 'POST' });
      if (res.status === 401) {
        if (onRequireAuth) onRequireAuth();
        return;
      }
      if (!res.ok) throw new Error('Không lấy được số liên hệ');
      const data = await res.json();
      const revealedPhone = data.phone || SITE_CONFIG.hotline;
      setPhone(revealedPhone);
      if (onPhoneRevealed && revealedPhone) {
        onPhoneRevealed(revealedPhone);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (phone) {
    return (
      <a
        href={`tel:${phone.replace(/\s+/g, '')}`}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 font-bold text-white shadow-sm hover:bg-brand-700 active:scale-[0.99] transition-all"
      >
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
        <span>{phone}</span>
        <span className="text-xs font-normal opacity-90">• Gọi người dẫn xem</span>
      </a>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleReveal}
        disabled={loading}
        className="group flex w-full items-center justify-between rounded-xl border-2 border-brand/80 bg-brand-50/50 px-4 py-2.5 font-bold text-brand-900 hover:bg-brand hover:text-white transition-all active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-brand group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
          <span className="font-mono text-sm tracking-wide">09•• ••• •••</span>
        </div>
        <span className="text-xs font-semibold underline underline-offset-2">
          {loading ? 'Đang lấy số...' : 'Bấm để hiện số người dẫn xem'}
        </span>
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
