import React from 'react';

const REPEATED_ITEMS = [0, 1, 2, 3];

export function SecurityAnnouncementBar() {
  return (
    <div
      role="region"
      aria-label="Cảnh báo an toàn NHACUALAND"
      className="relative w-full overflow-hidden bg-[#5c3e07] border-t border-white/10 shadow-inner select-none pointer-events-none"
    >
      <div className="animate-marquee-scroll py-1.5 sm:py-2">
        {/* Track 1 */}
        <div className="flex shrink-0 items-center">
          {REPEATED_ITEMS.map((item) => (
            <div
              key={`track-1-${item}`}
              className="flex items-center mx-6 sm:mx-10 shrink-0 text-xs sm:text-[13px] md:text-sm font-medium tracking-wide"
            >
              <span className="font-bold text-white">Cảnh báo an toàn:</span>
              <span className="ml-1.5 text-white/95">
                NHACUALAND không bao giờ yêu cầu cung cấp mã OTP hoặc chuyển tiền vào tài khoản cá nhân
              </span>
              <span className="ml-6 sm:ml-10 text-white/40 text-xs select-none">•</span>
            </div>
          ))}
        </div>

        {/* Track 2 — bản sao liền mạch cho vòng lặp vô tận */}
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {REPEATED_ITEMS.map((item) => (
            <div
              key={`track-2-${item}`}
              className="flex items-center mx-6 sm:mx-10 shrink-0 text-xs sm:text-[13px] md:text-sm font-medium tracking-wide"
            >
              <span className="font-bold text-white">Cảnh báo an toàn:</span>
              <span className="ml-1.5 text-white/95">
                NHACUALAND không bao giờ yêu cầu cung cấp mã OTP hoặc chuyển tiền vào tài khoản cá nhân
              </span>
              <span className="ml-6 sm:ml-10 text-white/40 text-xs select-none">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


