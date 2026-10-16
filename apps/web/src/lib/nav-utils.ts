/**
 * Tiện ích điều hướng toàn website NHACUALAND
 *
 * Kích hoạt hệ thống loading mượt mà 0.5 giây và hỗ trợ các component
 * chủ động phát tín hiệu điều hướng toàn cục
 */
export function triggerPageLoading(href: string) {
  if (typeof window !== 'undefined' && href) {
    window.dispatchEvent(new CustomEvent('qns_navigation_start', { detail: { href } }));
  }
}
