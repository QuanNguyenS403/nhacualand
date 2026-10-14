/**
 * Loading boundary riêng cho trang Điều khoản (/dieu-khoan)
 */
export default function DieuKhoanLoading() {
  return (
    <div className="min-h-screen bg-[#f8fafc] pb-16 animate-pulse" aria-busy="true" aria-live="polite">
      {/* Header Banner skeleton */}
      <div className="bg-gradient-to-b from-brand to-brand-700 py-14 md:py-18 text-center text-white">
        <div className="container-max max-w-4xl mx-auto space-y-3">
          <div className="mx-auto h-9 w-64 rounded-xl bg-brand-900/80" />
          <div className="mx-auto h-4 w-96 max-w-full rounded bg-brand-900/60" />
        </div>
      </div>

      <div className="container-max max-w-5xl mt-10 px-4 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm space-y-6">
          <div className="h-6 w-56 rounded bg-slate-200" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-11/12 rounded bg-slate-100" />
            <div className="h-4 w-4/5 rounded bg-slate-100" />
          </div>
          <div className="h-6 w-48 rounded bg-slate-200 pt-4" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-slate-100" />
            <div className="h-4 w-5/6 rounded bg-slate-100" />
          </div>
        </div>
      </div>
      <span className="sr-only">Đang tải trang điều khoản</span>
    </div>
  );
}
