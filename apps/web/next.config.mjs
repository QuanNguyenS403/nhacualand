import { config as loadEnv } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// next.config.mjs là ES Module (đuôi .mjs) — KHÔNG có sẵn __dirname/__filename như CommonJS,
// dùng phải quy đổi qua import.meta.url. Lỗi "__dirname is not defined" đã bắt được ngay khi build.
const __dirname = dirname(fileURLToPath(import.meta.url));

// QUAN TRỌNG: Next.js mặc định CHỈ đọc file .env trong chính thư mục app (apps/web/.env),
// không tự động đọc .env ở gốc monorepo. Nếu bỏ qua bước này, mọi biến NEXT_PUBLIC_* sẽ
// undefined khi build/dev dù .env gốc đã điền đầy đủ — lỗi rất khó nhận ra vì không throw,
// code chỉ âm thầm dùng giá trị fallback "localhost" mặc định trong lib/api.ts.
// Nạp SAU khi Next.js đã tự đọc .env local của riêng app (nếu có) — không ghi đè biến đã tồn tại.
if (process.env.NODE_ENV === 'production') {
  loadEnv({ path: join(__dirname, '..', '..', '.env.production') });
}
loadEnv({ path: join(__dirname, '..', '..', '.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '853230977507-6f7vlho33papqgpn12j5eq3p4ids6hdh.apps.googleusercontent.com',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL !== undefined ? process.env.NEXT_PUBLIC_API_URL : (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : ''),
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['@qns/shared'],
  compress: true,
  poweredByHeader: false,
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'qnsbroker.com' },
      { protocol: 'https', hostname: '*.qnsbroker.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: 'qns.vn' },
      { protocol: 'https', hostname: '*.qns.vn' },
      { protocol: 'https', hostname: 'nhacualand.com' },
      { protocol: 'https', hostname: '*.nhacualand.com' },
    ],
  },
  async rewrites() {
    const internalApi = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4000';
    const apiUrl = internalApi;

    return [
      {
        source: '/uploads/:path*',
        destination: `${apiUrl}/uploads/:path*`,
      },
      // Proxy toàn bộ API sang NestJS backend khi chạy gộp chung 1 service
      {
        source: '/auth/:path*',
        destination: `${apiUrl}/auth/:path*`,
      },
      {
        source: '/users/:path*',
        destination: `${apiUrl}/users/:path*`,
      },
      {
        source: '/listings/:path*',
        destination: `${apiUrl}/listings/:path*`,
      },
      {
        source: '/leads/:path*',
        destination: `${apiUrl}/leads/:path*`,
      },
      {
        source: '/locations/:path*',
        destination: `${apiUrl}/locations/:path*`,
      },
      {
        source: '/universities/:path*',
        destination: `${apiUrl}/universities/:path*`,
      },
      {
        source: '/tasks/:path*',
        destination: `${apiUrl}/tasks/:path*`,
      },
      {
        source: '/memberships/:path*',
        destination: `${apiUrl}/memberships/:path*`,
      },
      {
        source: '/membership/:path*',
        destination: `${apiUrl}/membership/:path*`,
      },
      {
        source: '/viewings/:path*',
        destination: `${apiUrl}/viewings/:path*`,
      },
      {
        source: '/deals/:path*',
        destination: `${apiUrl}/deals/:path*`,
      },
      {
        source: '/commissions/:path*',
        destination: `${apiUrl}/commissions/:path*`,
      },
      {
        source: '/health',
        destination: `${apiUrl}/health`,
      },
      {
        source: '/admin/dashboard',
        destination: `${apiUrl}/admin/dashboard`,
      },
      {
        source: '/admin/listings/:path*',
        destination: `${apiUrl}/admin/listings/:path*`,
      },
      {
        source: '/admin/reports',
        destination: `${apiUrl}/admin/reports`,
      },
      {
        source: '/admin/users',
        destination: `${apiUrl}/admin/users`,
      },
      {
        source: '/admin/audit-logs',
        destination: `${apiUrl}/admin/audit-logs`,
      },
      {
        source: '/admin/tasks/:path*',
        destination: `${apiUrl}/admin/tasks/:path*`,
      },
      {
        source: '/admin/pricing-seasons/:path*',
        destination: `${apiUrl}/admin/pricing-seasons/:path*`,
      },
      {
        source: '/admin/membership-requests/:path*',
        destination: `${apiUrl}/admin/membership-requests/:path*`,
      },
      {
        source: '/admin/api/:path*',
        destination: `${apiUrl}/admin/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/signin',
        destination: '/dang-nhap',
        permanent: false,
      },
      {
        source: '/login',
        destination: '/dang-nhap',
        permanent: false,
      },
      {
        source: '/mua-ban',
        destination: '/thue',
        permanent: true,
      },
      {
        source: '/du-an',
        destination: '/thue',
        permanent: true,
      },
      {
        source: '/gia-nha-dat',
        destination: '/thue',
        permanent: true,
      },
      {
        source: '/gia-thanh-vien',
        destination: '/thue',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/data': join(__dirname, 'src', 'data'),
      '../../data/nhaminhbach-reviews-899.json': join(__dirname, 'src', 'data', 'nhaminhbach-reviews-899.json'),
      '../data/nhaminhbach-reviews-899.json': join(__dirname, 'src', 'data', 'nhaminhbach-reviews-899.json'),
    };
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
};

export default nextConfig;
