import type { MetadataRoute } from 'next';

/**
 * Sitemap cho nền tảng chuyên biệt Cho thuê (FE-12 / CLAUDE.md § 2.6).
 * Bao gồm các trang landing danh mục cho thuê cốt lõi và các tin đăng đang active.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nhacualand.com';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/thue`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/cho-thue-tro`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/cho-thue-mat-bang`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/gioi-thieu`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/lien-he`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/dieu-khoan`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/chinh-sach`, changeFrequency: 'monthly', priority: 0.4 },
  ];

  // Cố gắng nạp các tin active để đưa vào sitemap động
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${apiUrl}/listings?pageSize=100&status=active`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const rawItems = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : [];

      const listingRoutes: MetadataRoute.Sitemap = rawItems
        .filter((item: any) => item.slug && !item.slug.startsWith('demo-') && (item.status === 'active' || !item.status))
        .map((item: any) => ({
          url: `${base}/tin/${item.slug}`,
          lastModified: item.updatedAt ? new Date(item.updatedAt) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        }));

      return [...staticRoutes, ...listingRoutes];
    }
  } catch {
    // safe-fail fallback sang danh sách trang tĩnh nếu API offline
  }

  return staticRoutes;
}
