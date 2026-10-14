'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary riêng cho trang /dang-tin
 *
 * Nếu thiếu file này, lỗi runtime (ví dụ API trả sai định dạng, lỗi geocoding...)
 * sẽ rơi lên root error.tsx — xoá toàn bộ layout và Header, người dùng không thể
 * bấm sang trang khác nữa.
 * Boundary này giữ Header/Footer, chỉ thay vùng nội dung bằng thông báo lỗi.
 */
export default function DangTinError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Lỗi trang đăng tin:', error);
  }, [error]);

  return (
    <div className="container-max max-w-4xl px-4 py-12 flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md w-full rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-xl font-bold text-rose-600 ring-1 ring-rose-100">
          !
        </div>
        <h2 className="text-lg font-bold text-slate-900">Không thể tải trang đăng tin</h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Đã xảy ra lỗi khi tải trang — bạn có thể thử lại hoặc quay về trang chủ
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            id="dang-tin-error-retry"
            type="button"
            onClick={() => reset()}
            className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:bg-brand-dark"
          >
            Thử lại
          </button>
          <Link
            id="dang-tin-error-home"
            href="/"
            className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
