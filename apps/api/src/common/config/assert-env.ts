/**
 * assert-env.ts — kiểm tra các biến môi trường bảo mật cốt lõi TRƯỚC khi ứng dụng khởi động.
 *
 * PHÁT HIỆN TRONG ĐỢT AUDIT ĐỘC LẬP (kiểm tra bởi Claude, 01/09/2026):
 * `auth.service.ts` và `jwt.strategy.ts` trước đây dùng pattern
 * `process.env.JWT_ACCESS_SECRET ?? 'changeme_access'` — nghĩa là nếu file .env bị thiếu, đặt
 * sai đường dẫn, hoặc chỉ đơn giản là quên điền, ứng dụng vẫn KHỞI ĐỘNG BÌNH THƯỜNG và ký JWT
 * bằng một chuỗi placeholder CỐ ĐỊNH, in rõ ràng trong mã nguồn công khai trên GitHub
 * (`'changeme_access'` / `'changeme_refresh'`, trùng khớp giá trị mẫu trong `.env.example`).
 *
 * Hậu quả: BẤT KỲ AI đọc được repo (kể cả public) đều có thể tự ký một JWT hợp lệ với
 * payload `{ sub: '1', phone: '...', role: 'admin' }` bằng secret đã biết trước, giả mạo
 * hoàn toàn danh tính bất kỳ user/admin nào — vượt qua toàn bộ lớp xác thực mà không cần
 * mật khẩu hay OTP. Đây là lỗ hổng nghiêm trọng nhất tìm được trong đợt audit này.
 *
 * Cách sửa: bắt buộc secret phải được set; nếu vẫn còn là giá trị placeholder mặc định thì
 * CHẶN KHỞI ĐỘNG hoàn toàn ở môi trường production, chỉ cảnh báo (không chặn) ở dev/test để
 * không phá vỡ trải nghiệm phát triển cục bộ khi chưa cấu hình secret thật.
 */

const INSECURE_KEY_VALUES: Record<string, string[]> = {
  JWT_ACCESS_SECRET: [
    'changeme_access',
    'c27987125a9cdaadf550541f5a048eb3b55c5c37a7a21dde7b3a51baa3c9dd49',
    'ac4a434d314c000e3f774d1f56f5a6a01c3326c74022d1a84ebaa5b5e3d0434b',
  ],
  JWT_REFRESH_SECRET: [
    'changeme_refresh',
    'ac4a434d314c000e3f774d1f56f5a6a01c3326c74022d1a84ebaa5b5e3d0434b',
    'c27987125a9cdaadf550541f5a048eb3b55c5c37a7a21dde7b3a51baa3c9dd49',
  ],
  ADMIN_BOOTSTRAP_SECRET: [
    'ae45fa53647fdc8811164f26ad6ebda9275b379a0a092a739351c80f11fd357e',
  ],
};

export function assertRequiredSecrets(): void {
  const isProduction = process.env.NODE_ENV === 'production';

  for (const [key, insecureList] of Object.entries(INSECURE_KEY_VALUES)) {
    const value = process.env[key];

    if (!value) {
      if (key === 'ADMIN_BOOTSTRAP_SECRET') continue; // optional in production
      throw new Error(
        `[Cấu hình thiếu] Biến môi trường ${key} chưa được thiết lập.\n` +
          `→ Tạo file ".env" ở gốc monorepo (copy từ ".env.example") và điền giá trị thật, ` +
          `rồi khởi động lại. Ứng dụng KHÔNG được phép chạy khi thiếu secret ký JWT.`,
      );
    }

    if (insecureList.includes(value)) {
      if (isProduction) {
        throw new Error(
          `[BẢO MẬT NGHIÊM TRỌNG] ${key} vẫn đang dùng giá trị placeholder mặc định công khai ` +
            `trong môi trường production (NODE_ENV=production).\n` +
            `→ Sinh giá trị ngẫu nhiên đủ mạnh (ví dụ: chạy "openssl rand -hex 32") và điền vào biến ${key} trong .env thật trước khi deploy. ` +
            `Ứng dụng sẽ KHÔNG khởi động cho tới khi được sửa.`,
        );
      }
      // eslint-disable-next-line no-console
      console.warn(
        `⚠️  [CHỈ CHẤP NHẬN Ở DEV] ${key} đang dùng giá trị placeholder mặc định công khai. ` +
          `Việc này CHỈ được phép ở môi trường development/test. TUYỆT ĐỐI không deploy production ` +
          `khi biến này chưa được đổi sang giá trị bí mật thật`,
      );
    }

    if (isProduction && value.length < 32) {
      throw new Error(
        `[BẢO MẬT YẾU] Biến môi trường ${key} có độ dài quá ngắn (${value.length} ký tự).\n` +
          `→ Trong môi trường production, secret ký JWT phải có độ dài tối thiểu 32 ký tự để chống brute-force.`,
      );
    }
  }

  // BẮT BUỘC có DATABASE_URL
  if (!process.env.DATABASE_URL) {
    throw new Error(
      `[CẤU HÌNH THIẾU] Biến DATABASE_URL chưa được thiết lập. Ứng dụng không thể kết nối tới cơ sở dữ liệu PostgreSQL.`,
    );
  }

  // BẢO MẬT BOOTSTRAP ADMIN (RB-14)
  if (isProduction && process.env.ADMIN_BOOTSTRAP_PASSWORD) {
    const adminPass = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    if (adminPass === 'Admin123456!@#' || adminPass.length < 12) {
      throw new Error(
        `[BẢO MẬT NGUY HIỂM] ADMIN_BOOTSTRAP_PASSWORD đang sử dụng mật khẩu mặc định hoặc quá ngắn trong môi trường production.\n` +
          `→ Vui lòng sử dụng mật khẩu ngẫu nhiên phức tạp tối thiểu 12 ký tự hoặc bỏ cấu hình tự động bootstrap trên production.`,
      );
    }
  }

  // BẢO MẬT MFA ADMIN (F12)
  if (process.env.ADMIN_MFA_ENFORCED === 'true') {
    const mfaSecret = process.env.ADMIN_MFA_SECRET;
    if (!mfaSecret) {
      throw new Error(
        `[CẤU HÌNH MFA THIẾU] ADMIN_MFA_ENFORCED=true nhưng ADMIN_MFA_SECRET chưa được thiết lập trong .env.`,
      );
    }
    if (isProduction && (mfaSecret === '123456' || mfaSecret.length < 8)) {
      throw new Error(
        `[BẢO MẬT MFA YẾU] ADMIN_MFA_SECRET không được dùng giá trị mặc định "123456" và phải có tối thiểu 8 ký tự trong môi trường production.`,
      );
    }
  }

}

