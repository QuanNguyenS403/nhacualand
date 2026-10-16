'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE_CONFIG } from '@/lib/constants';
import { QnsLogo } from '@/components/QnsLogo';

export function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith('/qnsbroker/admin')) {
    return null;
  }

  return (
    <footer className="border-t border-brand-600/30 bg-gradient-to-b from-brand to-brand-700 text-white">
      <div className="container-max py-7 sm:py-8 md:py-9">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 md:gap-7 lg:gap-8">
          {/* Cột Thương hiệu */}
          <div className="sm:col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-white/20 group-hover:scale-105 transition-transform">
                <QnsLogo variant="emblem" theme="brand" size={24} />
              </div>
              <span className="text-base sm:text-lg font-bold tracking-tight text-white">
                NHACUA <span className="font-normal text-white/80">LAND</span>
              </span>
            </Link>
            <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-white/90">
              Nền tảng công nghệ cho thuê chuyên biệt — <strong className="text-white">Minh bạch chi phí, đúng người cho thuê</strong>
              <br />
              Minh bạch chi phí, kết nối trực tiếp bên có quyền cho thuê
            </p>

            {/* 4 biểu tượng mạng xã hội trưng bày */}
            <div className="mt-3 sm:mt-3.5 flex items-center gap-3 text-white/80">
              <span className="flex items-center justify-center cursor-default select-none hover:text-white transition-colors" title="Facebook">
                <svg className="w-4 h-4 fill-current" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </span>
              <span className="flex items-center justify-center cursor-default select-none hover:text-white transition-colors" title="Twitter">
                <svg className="w-4 h-4 fill-current" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z" />
                </svg>
              </span>
              <span className="flex items-center justify-center cursor-default select-none hover:text-white transition-colors" title="Instagram">
                <svg className="w-4 h-4 fill-current" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 0C8.74 0 8.333.015 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.74 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 3.675a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </span>
              <span className="flex items-center justify-center cursor-default select-none hover:text-white transition-colors" title="LinkedIn">
                <svg className="w-4 h-4 fill-current" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M19 0H5a5 5 0 00-5 5v14a5 5 0 005 5h14a5 5 0 005-5V5a5 5 0 00-5-5zM8 19H5V8h3v11zM6.5 6.732c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zM20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476V19z" />
                </svg>
              </span>
            </div>
          </div>

          {/* Cột 1: Liên kết nhanh */}
          <div>
            <h3 className="mb-2 sm:mb-2.5 text-xs sm:text-sm font-semibold tracking-wide text-white">
              Liên kết nhanh
            </h3>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <Link href="/" className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors">
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link href="/thue" className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors">
                  Tìm phòng
                </Link>
              </li>
              <li>
                <Link href="/danh-gia" className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors">
                  Đánh giá
                </Link>
              </li>
              <li>
                <Link href="/gioi-thieu" className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors">
                  Về chúng tôi
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 2: Hỗ trợ */}
          <div>
            <h3 className="mb-2 sm:mb-2.5 text-xs sm:text-sm font-semibold tracking-wide text-white">
              Hỗ trợ
            </h3>
            <ul className="space-y-1.5 sm:space-y-2">
              <li>
                <Link href="/dieu-khoan" className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link href="/chinh-sach" className="text-xs sm:text-sm text-white/80 hover:text-white transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Liên hệ */}
          <div>
            <h3 className="mb-2 sm:mb-2.5 text-xs sm:text-sm font-semibold tracking-wide text-white">
              Liên hệ
            </h3>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-white/90">
              <svg className="h-4 w-4 shrink-0 text-white/80" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
                <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
              </svg>
              <span className="select-text cursor-default">
                {SITE_CONFIG.supportEmail}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/15">
        <div className="container-max flex flex-col items-center justify-between gap-2 py-3 sm:py-3.5 sm:flex-row">
          <p className="text-xs text-white/70" suppressHydrationWarning>
            © {new Date().getFullYear()} NHACUALAND
          </p>
          <div className="flex items-center gap-5 text-xs text-white/80">
            <Link href="/dieu-khoan" className="hover:text-white transition-colors">
              Điều khoản
            </Link>
            <Link href="/chinh-sach" className="hover:text-white transition-colors">
              Bảo mật
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

