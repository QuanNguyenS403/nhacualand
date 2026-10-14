import React from 'react';

export interface QnsLogoProps {
  /**
   * 'emblem': Chỉ biểu tượng ngôi nhà trong chữ Q (tỉ lệ 1:1, phù hợp avatar, icon, badge)
   * 'full': Logo đầy đủ dạng dọc (Biểu tượng Q + chữ QNS bên dưới chuẩn hình ảnh)
   * 'horizontal': Biểu tượng bên trái + chữ QNS BROKER bên phải (chuẩn thanh header website)
   */
  variant?: 'emblem' | 'full' | 'horizontal';
  /**
   * 'brand': Màu vàng gold hoàng gia đặc trưng (#b88014) chuẩn logo trên nền sáng
   * 'light': Màu trắng nguyên bản khi đặt trên nền tối (Header, Footer, Admin bar)
   */
  theme?: 'brand' | 'light';
  className?: string;
  size?: number | string;
}

/**
 * Component Logo QNS chuẩn nhận diện thương hiệu
 * Thiết kế vector SVG độ phân giải vô hạn, đồng bộ cho toàn bộ website và logo chủ nhà
 */
export function QnsLogo({
  variant = 'full',
  theme = 'brand',
  className = '',
  size,
}: QnsLogoProps) {
  const primaryColor = theme === 'light' ? '#ffffff' : '#b88014';
  const cutoutColor = theme === 'light' ? 'rgba(184, 128, 20, 0.95)' : '#ffffff';
  const knobColor = theme === 'light' ? 'rgba(184, 128, 20, 0.95)' : '#ffffff';

  // SVG Biểu tượng Q kết hợp Ngôi nhà & Kính lúp (Emblem)
  const renderEmblem = (width: number | string = 100, height: number | string = 100) => (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 overflow-visible"
    >
      {/* 1. Thân chính chữ Q (Vòng tròn) */}
      <circle cx="92" cy="88" r="66" fill={primaryColor} />

      {/* 2. Đuôi chữ Q / Cán kính lúp (Bo tròn 45 độ hướng xuống phải) */}
      <path
        d="M 112 128 L 148 164 A 14.5 14.5 0 0 0 168.5 143.5 L 132.5 107.5 Z"
        fill={primaryColor}
      />

      {/* 3. Khoang cắt hình ngôi nhà màu trắng bên trong chữ Q */}
      <path
        d="M 92 41 L 130 75 L 130 125 C 130 131 125 136 119 136 L 65 136 C 59 136 54 131 54 125 L 54 75 Z"
        fill={cutoutColor}
      />

      {/* 4. Cửa sổ 4 cánh (2x2) màu xanh ở tầng trên ngôi nhà */}
      <rect x="80.5" y="60" width="9.5" height="9.5" rx="2" fill={primaryColor} />
      <rect x="94" y="60" width="9.5" height="9.5" rx="2" fill={primaryColor} />
      <rect x="80.5" y="73" width="9.5" height="9.5" rx="2" fill={primaryColor} />
      <rect x="94" y="73" width="9.5" height="9.5" rx="2" fill={primaryColor} />

      {/* 5. Cửa ra vào vòm tròn ở tầng dưới ngôi nhà */}
      <path
        d="M 78 136 L 78 111 A 14 14 0 0 1 106 111 L 106 136 Z"
        fill={primaryColor}
      />

      {/* 6. Nút nắm cửa (Doorknob) màu trắng */}
      <circle cx="100" cy="118" r="2.6" fill={knobColor} />
    </svg>
  );

  // Dạng 1: Chỉ Emblem (Dành cho Avatar chủ nhà, Icon tròn, Badge)
  if (variant === 'emblem') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        {renderEmblem(size ?? '100%', size ?? '100%')}
      </div>
    );
  }

  // Dạng 2: Full dọc (Emblem + Chữ QNS chuẩn 100% theo ảnh cung cấp)
  if (variant === 'full') {
    return (
      <div className={`inline-flex flex-col items-center justify-center ${className}`}>
        {renderEmblem(size ? Number(size) * 0.72 : 108, size ? Number(size) * 0.72 : 108)}
        <span
          className="font-black tracking-tight leading-none mt-1 select-none"
          style={{
            color: primaryColor,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: size ? `${Number(size) * 0.28}px` : '32px',
            letterSpacing: '0.04em',
          }}
        >
          QNS
        </span>
      </div>
    );
  }

  // Dạng 3: Horizontal (Dành cho Header chính của website & Admin Bar)
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {renderEmblem(size ?? 38, size ?? 38)}
      <div className="flex flex-col">
        <span
          className="font-black tracking-tight leading-none text-lg select-none"
          style={{ color: primaryColor, letterSpacing: '0.02em' }}
        >
          QNS <span className={theme === 'light' ? 'font-light opacity-90' : 'font-semibold text-slate-700'}>BROKER</span>
        </span>
      </div>
    </div>
  );
}

/**
 * Avatar Chủ Nhà mặc định mang thương hiệu QNS
 * Dùng trên tất cả các bề mặt trang (chi tiết tin, danh sách tin, sidebar liên hệ)
 */
export function LandlordAvatar({
  avatarUrl,
  name = 'Chủ nhà',
  size = 44,
  className = '',
}: {
  avatarUrl?: string | null;
  name?: string;
  size?: number;
  className?: string;
}) {
  if (avatarUrl && avatarUrl.trim() !== '') {
    return (
      <div
        className={`relative shrink-0 rounded-full overflow-hidden bg-slate-100 ring-2 ring-white shadow-xs ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden flex items-center justify-center bg-[#fdfbf2] border border-[#f5dc93]/60 shadow-xs ring-2 ring-white p-1 ${className}`}
      style={{ width: size, height: size }}
      title={`${name} (Đối tác xác thực QNS)`}
    >
      <QnsLogo variant="emblem" theme="brand" size={size - 8} />
    </div>
  );
}
