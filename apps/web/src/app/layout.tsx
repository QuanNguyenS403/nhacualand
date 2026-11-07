import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TopProgressBar } from '@/components/TopProgressBar';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://nhacualand.com'),
  title: {
    default: 'NHACUALAND — Rõ chi phí, đúng người cho thuê',
    template: '%s | NHACUALAND',
  },
  description:
    'Nền tảng kết nối tìm phòng trọ sinh viên, căn hộ dịch vụ, studio và mặt bằng cho thuê NHACUALAND — biểu phí điện nước minh bạch, kết nối đúng bên có quyền cho thuê',
  keywords: [
    'NHACUALAND',
    'nhacualand.com',
    'thuê phòng trọ',
    'phòng trọ sinh viên',
    'căn hộ dịch vụ',
    'thuê studio',
    'nhà nguyên căn',
    'cho thuê mặt bằng',
    'thuê phòng chung cư',
  ],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'NHACUALAND',
  },
  icons: {
    icon: '/logo-nhacualand.svg',
    shortcut: '/logo-nhacualand.svg',
    apple: '/logo-nhacualand.svg',
  },
  robots: { index: true, follow: true },
};

const EXTENSION_ERROR_GUARD_SCRIPT = `
(function () {
  if (typeof window === 'undefined') return;
  var EXT_PATTERNS = [
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    'safari-web-extension://',
    'webkit-masked-url://',
    'eppiocemhmnlbhjplcgkofciiegomcon',
    'executors/200.js',
    "reading 'M_ID'"
  ];
  function isExtensionError(err, ev) {
    try {
      var filename = (ev && ev.filename) ? String(ev.filename) : '';
      var message = (err && err.message) ? String(err.message) : ((ev && ev.message) ? String(ev.message) : '');
      var stack = (err && err.stack) ? String(err.stack) : '';
      var combined = filename + '\\n' + message + '\\n' + stack;
      for (var i = 0; i < EXT_PATTERNS.length; i++) {
        if (combined.indexOf(EXT_PATTERNS[i]) !== -1) return true;
      }
    } catch (_) {}
    return false;
  }
  window.addEventListener('error', function (ev) {
    if (isExtensionError(ev && ev.error, ev)) {
      ev.stopImmediatePropagation();
      ev.preventDefault();
      return true;
    }
  }, true);
  window.addEventListener('unhandledrejection', function (ev) {
    if (isExtensionError(ev && ev.reason, ev)) {
      ev.stopImmediatePropagation();
      ev.preventDefault();
      return true;
    }
  }, true);
  var origAddEventListener = window.addEventListener;
  window.addEventListener = function (type, listener, options) {
    if ((type === 'error' || type === 'unhandledrejection') && typeof listener === 'function') {
      var wrapped = function (ev) {
        var targetErr = type === 'error' ? (ev && ev.error) : (ev && ev.reason);
        if (isExtensionError(targetErr, ev)) {
          if (ev && typeof ev.preventDefault === 'function') ev.preventDefault();
          return;
        }
        return listener.apply(this, arguments);
      };
      return origAddEventListener.call(this, type, wrapped, options);
    }
    return origAddEventListener.apply(this, arguments);
  };
  function cleanExtensionPortal() {
    try {
      var portals = document.querySelectorAll('nextjs-portal');
      for (var i = 0; i < portals.length; i++) {
        var sr = portals[i].shadowRoot;
        if (sr && sr.textContent) {
          for (var j = 0; j < EXT_PATTERNS.length; j++) {
            if (sr.textContent.indexOf(EXT_PATTERNS[j]) !== -1) {
              portals[i].remove();
              break;
            }
          }
        }
      }
    } catch (_) {}
  }
  if (typeof MutationObserver !== 'undefined') {
    var obs = new MutationObserver(cleanExtensionPortal);
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EXTENSION_ERROR_GUARD_SCRIPT }} />
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
      </head>
      <body className="flex min-h-screen flex-col bg-surface-muted font-sans antialiased">
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
