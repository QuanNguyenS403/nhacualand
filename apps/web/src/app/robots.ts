import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nhacualand.com';
  const isStaging = process.env.APP_ENV === 'staging' || process.env.NEXT_PUBLIC_APP_ENV === 'staging';

  // Nếu là môi trường Staging: chặn hoàn toàn bot tìm kiếm (FE-12 / Safety Net)
  if (isStaging) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  // Môi trường Production: Cho phép crawl các trang danh mục & tin đăng công khai,
  // nhưng cấm đánh chỉ mục các trang nội bộ admin, tài khoản cá nhân, đăng nhập
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/admin/*',
        '/tai-khoan/',
        '/tai-khoan/*',
        '/dang-nhap',
        '/api/',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
