import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TopProgressBar } from '@/components/TopProgressBar';
import { FloatingCustomerHub } from '@/components/FloatingCustomerHub';

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://accounts.google.com" />
        <link rel="dns-prefetch" href="https://accounts.google.com" />
      </head>
      <body className="flex min-h-screen flex-col bg-surface-muted font-sans antialiased">
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <Header />
        <main className="flex-1">{children}</main>
        <FloatingCustomerHub />
        <Footer />
      </body>
    </html>
  );
}
