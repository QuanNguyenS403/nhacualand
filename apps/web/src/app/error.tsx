'use client';

import { useEffect } from 'react';
import Link from 'next/link';

function isBrowserExtensionError(error?: Error & { digest?: string }): boolean {
  if (!error) return false;
  const combined = `${error.message || ''}\n${error.stack || ''}`;
  return (
    combined.includes('chrome-extension://') ||
    combined.includes('moz-extension://') ||
    combined.includes('safari-extension://') ||
    combined.includes('safari-web-extension://') ||
    combined.includes('eppiocemhmnlbhjplcgkofciiegomcon') ||
    combined.includes('executors/200.js') ||
    combined.includes("reading 'M_ID'")
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isExtErr = isBrowserExtensionError(error);

  useEffect(() => {
    if (isExtErr) {
      reset();
      return;
    }
    console.error('Unhandled app error:', error);
  }, [error, isExtErr, reset]);

  if (isExtErr) {
    return null;
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-2xl font-bold text-amber-600 mb-6 ring-1 ring-amber-500/20">
          !
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Đã có sự cố xảy ra</h1>
        <p className="mt-3 text-sm text-text-secondary leading-relaxed">
          Hệ thống gặp sự cố trong quá trình xử lý yêu cầu hoặc chưa thể kết nối tới máy chủ dữ liệu
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary w-full sm:w-auto"
          >
            Thử lại
          </button>
          <Link href="/" className="btn-secondary w-full sm:w-auto">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
