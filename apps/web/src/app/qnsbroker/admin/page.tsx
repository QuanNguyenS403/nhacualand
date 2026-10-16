'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand border-t-transparent" />
        <p className="text-sm text-slate-400">Đang chuyển hướng sang trang quản trị</p>
      </div>
    </div>
  );
}
