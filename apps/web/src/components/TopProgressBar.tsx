'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Hệ thống Loading toàn thể website NHACUALAND
 *
 * Tự động điều phối hiệu ứng loading và đảm bảo chuyển trang dứt khoát
 * ngay sau 0.5 giây (500ms) khi click vào bất kỳ mục nào trên toàn bộ website.
 *
 * Cơ chế hoạt động:
 * 1. Bắt tất cả sự kiện click vào các liên kết nội bộ, nút điều hướng, dropdown menu, tabs, v.v.
 * 2. Kích hoạt hiệu ứng loading tức thì: thanh tiến trình trên đỉnh + vòng xoay spinner tinh tế
 * 3. Tiến trình loading chạy mượt mà từ 0% lên 100% trong đúng 500ms (0.5 giây)
 * 4. Đúng sau 0.5 giây, nếu Next.js soft navigation chưa hoàn tất chuyển route,
 *    hệ thống kích hoạt chuyển trang ngay lập tức (window.location.assign) để đảm bảo không bị kẹt ở trang cũ
 */
export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFullUrl = `${pathname}?${searchParams?.toString() ?? ''}`;
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const timersRef = useRef<NodeJS.Timeout[]>([]);
  const pendingHrefRef = useRef<string | null>(null);

  function clearAllTimers() {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }

  // Khởi động chu kỳ loading 0.5 giây (500ms)
  function startProgressCycle(targetHref: string) {
    clearAllTimers();
    pendingHrefRef.current = targetHref;

    setVisible(true);
    setProgress(35);

    // Tiến trình chuyển động mượt mà trong đúng 500ms (0.5 giây)
    const t1 = setTimeout(() => setProgress(65), 120);
    const t2 = setTimeout(() => setProgress(85), 250);
    const t3 = setTimeout(() => setProgress(96), 380);

    // Mốc đúng 0.5 giây (500ms): Hoàn tất 100% và kích hoạt chuyển trang dứt điểm nếu chưa đổi URL
    const tNavigate = setTimeout(() => {
      setProgress(100);

      try {
        const urlObj = new URL(targetHref, window.location.origin);
        const targetPath = urlObj.pathname + urlObj.search;
        const currentPath = window.location.pathname + window.location.search;

        // Nếu sau 0.5s mà route chưa đổi sang URL đích: chuyển trang ngay lập tức
        if (currentPath !== targetPath) {
          window.location.assign(urlObj.href);
        }
      } catch {
        // Fallback an toàn nếu chuỗi href đặc thù
        if (window.location.href !== targetHref) {
          window.location.assign(targetHref);
        }
      }
    }, 500);

    timersRef.current.push(t1, t2, t3, tNavigate);
  }

  // Khi URL thay đổi (Next.js đã hoàn tất chuyển route): Kết thúc thanh loading mượt mà
  useEffect(() => {
    clearAllTimers();
    pendingHrefRef.current = null;

    setProgress(100);

    const tFade = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);

    timersRef.current.push(tFade);

    return () => clearAllTimers();
  }, [currentFullUrl]);

  // Lắng nghe click trên toàn bộ website và các lệnh điều hướng
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      // Bỏ qua các click với phím tắt mở tab mới hoặc chuột phụ
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
        return;
      }

      const targetEl = e.target as HTMLElement | null;
      if (!targetEl) return;

      // 1. Kiểm tra thẻ <a> hoặc phần tử được bọc trong <a>
      const anchor = targetEl.closest('a');
      let href = anchor?.getAttribute('href');

      // 2. Nếu không có <a>, kiểm tra các nút hoặc phần tử có thuộc tính data-href / data-navigate
      if (!href) {
        const navEl = targetEl.closest('[data-href], [data-navigate]') as HTMLElement | null;
        if (navEl) {
          href = navEl.getAttribute('data-href') || navEl.getAttribute('data-navigate');
        }
      }

      if (!href) return;

      // Loại trừ các liên kết không phải chuyển trang nội bộ
      if (
        href.startsWith('#') ||
        href.startsWith('tel:') ||
        href.startsWith('mailto:') ||
        href.startsWith('javascript:') ||
        href.startsWith('blob:') ||
        anchor?.getAttribute('target') === '_blank' ||
        anchor?.hasAttribute('download')
      ) {
        return;
      }

      // Kiểm tra URL ngoại bộ
      if (href.startsWith('http://') || href.startsWith('https://')) {
        try {
          const parsed = new URL(href);
          if (parsed.origin !== window.location.origin) {
            return;
          }
          href = parsed.pathname + parsed.search + parsed.hash;
        } catch {
          return;
        }
      }

      // Bỏ qua nếu click vào chính URL hiện tại
      const currentPath = window.location.pathname + window.location.search;
      let targetPath = href;
      try {
        const parsed = new URL(href, window.location.origin);
        targetPath = parsed.pathname + parsed.search;
      } catch {
        // Giữ nguyên href
      }

      if (targetPath === currentPath) {
        return;
      }

      // Kích hoạt chu kỳ loading và chuyển trang 0.5 giây
      startProgressCycle(href);
    }

    // Lắng nghe sự kiện custom nếu có component nào chủ động phát tín hiệu điều hướng
    function handleCustomNav(e: Event) {
      const customEvent = e as CustomEvent<{ href: string }>;
      if (customEvent.detail?.href) {
        startProgressCycle(customEvent.detail.href);
      }
    }

    // Intercept pushState để bắt cả các lời gọi router.push() từ code
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      const url = args[2];
      if (typeof url === 'string') {
        const currentPath = window.location.pathname + window.location.search;
        let dest = url;
        try {
          const parsed = new URL(url, window.location.origin);
          dest = parsed.pathname + parsed.search;
        } catch {
          // ignore
        }
        if (dest !== currentPath) {
          startProgressCycle(url);
        }
      }
      return originalPushState.apply(this, args);
    };

    document.addEventListener('click', handleClick, { capture: true });
    window.addEventListener('qns_navigation_start', handleCustomNav);

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      window.removeEventListener('qns_navigation_start', handleCustomNav);
      window.history.pushState = originalPushState;
      clearAllTimers();
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <>
      {/* Thanh tiến trình gradient NHACUALAND trên mép trên cùng */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[99999] h-[3.5px] w-full overflow-hidden bg-transparent"
      >
        <div
          className="relative h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 shadow-[0_0_12px_rgba(217,158,26,0.95)] transition-all duration-150 ease-out"
          style={{
            width: `${progress}%`,
            opacity: progress === 100 ? 0 : 1,
            transitionProperty: 'width, opacity',
            transitionDuration: progress === 100 ? '200ms' : '120ms',
          }}
        >
          {/* Vệt sáng shimmer lướt trên thanh tiến trình */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
        </div>
      </div>

      {/* Vòng xoay spinner nhỏ tinh tế ở góc phải trên cùng khi đang tải */}
      {visible && progress < 100 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed top-2.5 right-3.5 z-[99999] flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm border border-amber-200 transition-opacity"
        >
          <span className="h-3 w-3 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          <span className="text-[11px] font-semibold text-brand-800 tracking-tight">Đang tải</span>
        </div>
      )}
    </>
  );
}
