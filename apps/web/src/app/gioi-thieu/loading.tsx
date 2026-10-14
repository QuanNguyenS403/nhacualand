/**
 * Loading boundary riêng cho trang Giới thiệu (/gioi-thieu & /ve-chung-toi)
 */
export default function GioiThieuLoading() {
  return (
    <div className="min-h-screen bg-surface-muted animate-pulse" aria-busy="true" aria-live="polite">
      {/* Hero Banner skeleton */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-brand-700 py-16 px-4 text-center">
        <div className="container-max max-w-4xl mx-auto space-y-4">
          <div className="mx-auto h-10 w-64 rounded-xl bg-brand-800/80" />
          <div className="mx-auto h-4 w-96 max-w-full rounded bg-brand-800/60" />
        </div>
      </div>

      <div className="container-max max-w-6xl py-12 px-4 sm:px-6 space-y-12">
        {/* Section 1 skeleton */}
        <div className="space-y-4 text-center max-w-2xl mx-auto">
          <div className="mx-auto h-8 w-72 rounded-lg bg-slate-200" />
          <div className="mx-auto h-4 w-full rounded bg-slate-100" />
          <div className="mx-auto h-4 w-4/5 rounded bg-slate-100" />
        </div>

        {/* 3 cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <div className="h-12 w-12 rounded-xl bg-slate-100" />
              <div className="h-5 w-40 rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-100" />
              <div className="h-4 w-5/6 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Đang tải trang giới thiệu</span>
    </div>
  );
}
