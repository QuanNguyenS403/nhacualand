import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Đăng nhập tài khoản — NHACUALAND',
  description:
    'Đăng nhập hoặc tạo tài khoản để quản lý phòng cho thuê, lưu tin và kết nối nhanh chóng',
  robots: { index: false, follow: false }, // trang auth không cần SEO index
};

export default function DangNhapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
