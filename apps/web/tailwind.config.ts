import type { Config } from 'tailwindcss';

/**
 * Design system tokens — nguồn sự thật duy nhất cho toàn site.
 * Hướng thiết kế: PropTech sang trọng & cao cấp — Vàng Gold hoàng gia.
 *   • Màu chủ đạo: Vàng Gold (#b88014) — sang trọng, đủ tương phản WCAG AA với nền trắng
 *   • Font: Inter (Google Fonts) — heading semibold, body regular
 *   • Góc bo: rounded-xl mặc định cho card (12px), rounded-2xl cho modal/form lớn
 *   • Shadow: soft layered shadows với ánh vàng ấm áp thay vì shadow cứng mặc định Tailwind
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      spacing: {
        '4.5': '1.125rem',
      },
      colors: {
        brand: {
          50: '#fdfbf2',
          100: '#faecc5',
          200: '#f5dc93',
          300: '#ecc75b',
          400: '#e2b32f',
          500: '#c89218',
          DEFAULT: '#b88014', // vàng gold chủ đạo, WCAG AA
          700: '#94640b', // dark gold state (hover)
          800: '#734d08',
          900: '#543705',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f8fafc', // nền trang (ấm hơn gray-50 mặc định)
          card: '#ffffff',
          border: '#e2e8f0',
        },
        text: {
          primary: '#0f172a',   // slate-900
          secondary: '#475569', // slate-600
          muted: '#94a3b8',     // slate-400
          inverse: '#ffffff',
        },
        // Giữ tương thích ngược — component cũ dùng text-brand-dark vẫn hoạt động
        'brand-dark': '#94640b',
      },
      fontFamily: {
        // Inter từ Google Fonts (nạp qua next/font trong layout.tsx)
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'display-lg': ['2rem', { lineHeight: '1.25', fontWeight: '700' }],
        'display-md': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 10px 25px -5px rgb(184 128 20 / 0.18), 0 4px 10px -6px rgb(184 128 20 / 0.12)',
        'elevated': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'modal': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #fdfbf5 0%, #faecc5 40%, #f8fafc 100%)',
        'brand-gradient': 'linear-gradient(135deg, #c89218 0%, #94640b 100%)',
        'card-overlay': 'linear-gradient(to top, rgb(0 0 0 / 0.6) 0%, transparent 50%)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out both',
        shimmer: 'shimmer 1.5s infinite linear',
        'slide-down': 'slide-down 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
export default config;
