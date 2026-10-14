'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Error boundary riêng cho khu vực /admin
 *
 * Trước đây lỗi runtime ở một trang con (VD: API trả dữ liệu sai định dạng) rơi lên error.tsx
 * gốc — thay thế TOÀN BỘ layout admin, sidebar biến mất và không thể bấm sang mục khác nữa
 * Boundary này giữ sidebar lại, chỉ thay vùng nội dung bằng thông báo lỗi
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Lỗi trang quản trị:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md w-full rounded-2xl border border-rose-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-xl font-bold text-rose-600 ring-1 ring-rose-100">
          !
        </div>
        <h2 className="text-lg font-bold text-slate-900">Không thể hiển thị mục này</h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          Dữ liệu trả về từ máy chủ không hợp lệ hoặc máy chủ dữ liệu đang tạm ngưng — bạn vẫn có thể chuyển sang mục khác ở thanh bên trái
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            id="admin-error-retry"
            type="button"
            onClick={() => reset()}
            className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:bg-brand-dark"
          >
            Thử lại
          </button>
          <Link
            id="admin-error-home"
            href="/admin"
            className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Về Tổng quan
          </Link>
        </div>
      </div>
    </div>
  );
}
