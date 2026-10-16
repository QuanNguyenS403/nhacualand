import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as crypto from 'crypto';
import Redis from 'ioredis';

export type OtpPurpose = 'register' | 'reset_password' | 'lead_verification' | 'general';

interface ActiveOtp {
  codeHash: string;
  expiresAt: number;
  attempts: number;
  purpose: OtpPurpose;
}

interface RateLimitRecord {
  sentCount: number;
  windowStart: number;
}

/**
 * OtpService — quản lý sinh/gửi/xác thực OTP bảo mật cao.
 * GAP-15: Hỗ trợ lưu trữ Redis chia sẻ có TTL, CSPRNG crypto.randomInt, băm HMAC-SHA256 chống lộ OTP, không log OTP thật ở production.
 * GAP-11 & AT-08: Ràng buộc OTP khớp chính xác số điện thoại và mục đích yêu cầu, chống mượn OTP hoặc replay.
 */
@Injectable()
export class OtpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OtpService.name);
  private redis: Redis | null = null;
  private readonly activeOtps = new Map<string, ActiveOtp>();
  private readonly rateLimits = new Map<string, RateLimitRecord>();

  private readonly OTP_TTL_SECONDS = 300; // 5 phút
  private readonly MAX_ATTEMPTS = 5;
  private readonly MAX_SENDS_PER_HOUR = 5;

  async onModuleInit() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        lazyConnect: true,
        retryStrategy: () => null, // Không retry vô tận nếu redis offline
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`Redis không khả dụng, sử dụng In-Memory OTP Store dự phòng: ${err.message}`);
        this.redis = null;
      });

      await this.redis.connect().catch((err) => {
        this.logger.warn(`Redis không khả dụng (${err.message}), sử dụng In-Memory OTP Store dự phòng`);
        this.redis = null;
      });
      if (this.redis) {
        this.logger.log('Đã kết nối Redis chia sẻ thành công cho OTP Service');
      }
    } catch {
      this.redis = null;
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      try {
        this.redis.disconnect();
      } catch {
        // Bỏ qua lỗi ngắt kết nối
      }
    }
  }

  /**
   * Băm mã OTP bằng HMAC-SHA256 kết hợp pepper bí mật để chống rò rỉ khi Redis/bộ nhớ bị kiểm tra
   */
  private hashOtp(phone: string, code: string, purpose: string): string {
    const pepper = process.env.OTP_SECRET || process.env.JWT_ACCESS_SECRET || 'qns-otp-pepper-default';
    return crypto.createHmac('sha256', pepper).update(`${purpose}:${phone}:${code}`).digest('hex');
  }

  /**
   * Sinh mã OTP và gửi qua SMS adapter (phân tách theo mục đích sử dụng)
   */
  async sendOtp(phone: string, purpose: OtpPurpose = 'general'): Promise<string> {
    const cleanPhone = phone.replace(/[\s\-\.\(\)]/g, '');
    const now = Date.now();

    // 1. Kiểm tra Rate Limit 1 giờ (Redis hoặc Memory)
    let redisRateChecked = false;
    if (this.redis) {
      try {
        const rateKey = `otp_rate:${cleanPhone}`;
        const count = await this.redis.incr(rateKey);
        if (count === 1) {
          await this.redis.expire(rateKey, 3600); // 1 giờ
        }
        if (count > this.MAX_SENDS_PER_HOUR) {
          throw new HttpException(
            'Bạn đã yêu cầu OTP quá nhiều lần trong 1 giờ, vui lòng thử lại sau',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        redisRateChecked = true;
      } catch (err) {
        if (err instanceof HttpException) throw err;
        this.redis = null;
      }
    }

    if (!redisRateChecked) {
      const rateRecord = this.rateLimits.get(cleanPhone);
      if (rateRecord) {
        if (now - rateRecord.windowStart < 3600 * 1000) {
          if (rateRecord.sentCount >= this.MAX_SENDS_PER_HOUR) {
            throw new HttpException(
              'Bạn đã yêu cầu OTP quá nhiều lần trong 1 giờ, vui lòng thử lại sau',
              HttpStatus.TOO_MANY_REQUESTS,
            );
          }
          rateRecord.sentCount += 1;
        } else {
          this.rateLimits.set(cleanPhone, { sentCount: 1, windowStart: now });
        }
      } else {
        this.rateLimits.set(cleanPhone, { sentCount: 1, windowStart: now });
      }
    }

    // 2. GAP-15: Sinh mã OTP ngẫu nhiên 6 chữ số bằng CSPRNG (crypto.randomInt)
    const code = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashOtp(cleanPhone, code, purpose);

    // 3. Lưu OTP với TTL 5 phút, phân tách theo mục đích (purpose)
    const otpKey = `otp:${purpose}:${cleanPhone}`;
    const payload: ActiveOtp = {
      codeHash,
      expiresAt: now + this.OTP_TTL_SECONDS * 1000,
      attempts: 0,
      purpose,
    };

    let savedToRedis = false;
    if (this.redis) {
      try {
        await this.redis.setex(otpKey, this.OTP_TTL_SECONDS, JSON.stringify(payload));
        savedToRedis = true;
      } catch {
        this.redis = null;
      }
    }

    if (!savedToRedis) {
      this.activeOtps.set(otpKey, payload);
      if (purpose === 'general') {
        this.activeOtps.set(cleanPhone, payload);
      }
    }

    // 4. Phát qua SMS Provider (ẩn OTP trong log production)
    await this.sendViaProvider(cleanPhone, code);
    return code;
  }

  /**
   * Xác thực mã OTP có kiểm tra mục đích và băm bảo mật HMAC-SHA256
   */
  async verifyOtp(phone: string, code: string, purpose: OtpPurpose = 'general'): Promise<boolean> {
    if (!phone || !code || typeof phone !== 'string' || typeof code !== 'string') return false;
    const cleanPhone = phone.replace(/[\s\-\.\(\)]/g, '');
    const cleanCode = code.trim();
    if (!cleanPhone || !cleanCode) return false;

    // 1. Thử đọc từ Redis
    if (this.redis) {
      try {
        let otpKey = `otp:${purpose}:${cleanPhone}`;
        let raw = await this.redis.get(otpKey);

        // Fallback tìm key general hoặc legacy key nếu không tìm thấy key theo purpose
        if (!raw) {
          const generalRaw = await this.redis.get(`otp:general:${cleanPhone}`);
          if (generalRaw) {
            raw = generalRaw;
            otpKey = `otp:general:${cleanPhone}`;
          } else {
            const legacyRaw = await this.redis.get(`otp:${cleanPhone}`);
            if (legacyRaw) {
              raw = legacyRaw;
              otpKey = `otp:${cleanPhone}`;
            }
          }
        }

        if (raw) {
          let record: any;
          try {
            record = JSON.parse(raw);
          } catch {
            await this.redis.del(otpKey);
            return false;
          }

          if (Date.now() > record.expiresAt) {
            await this.redis.del(otpKey);
            return false;
          }

          if (record.attempts >= this.MAX_ATTEMPTS) {
            await this.redis.del(otpKey);
            return false;
          }

          // Kiểm tra mục đích (Purpose Isolation)
          if (record.purpose && record.purpose !== 'general' && purpose !== 'general' && record.purpose !== purpose) {
            return false;
          }

          record.attempts += 1;

          // So sánh an toàn: kiểm tra hash nếu có, hoặc so sánh mã trực tiếp nếu là bản ghi cũ
          let isMatch = false;
          if (record.codeHash) {
            const expectedHash = this.hashOtp(cleanPhone, cleanCode, record.purpose || purpose);
            try {
              isMatch = crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(record.codeHash, 'hex'));
            } catch {
              isMatch = false;
            }
          } else if (record.code) {
            isMatch = record.code === cleanCode;
          }

          if (!isMatch) {
            const remainingTtl = Math.max(1, Math.floor((record.expiresAt - Date.now()) / 1000));
            await this.redis.setex(otpKey, remainingTtl, JSON.stringify(record));
            return false;
          }

          // Xóa OTP ngay sau khi xác thực thành công (chống replay - AT-08)
          await this.redis.del(otpKey);
          await this.redis.del(`otp:general:${cleanPhone}`);
          await this.redis.del(`otp:${cleanPhone}`);
          return true;
        }
      } catch {
        this.redis = null;
      }
    }

    // 2. Fallback đọc từ In-Memory Store
    let otpKey = `otp:${purpose}:${cleanPhone}`;
    let record = this.activeOtps.get(otpKey);

    if (!record) {
      record = this.activeOtps.get(`otp:general:${cleanPhone}`) || this.activeOtps.get(cleanPhone);
      if (record) {
        otpKey = this.activeOtps.has(`otp:general:${cleanPhone}`) ? `otp:general:${cleanPhone}` : cleanPhone;
      }
    }

    if (!record) return false;

    if (Date.now() > record.expiresAt) {
      this.activeOtps.delete(otpKey);
      return false;
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      this.activeOtps.delete(otpKey);
      return false;
    }

    // Kiểm tra mục đích (Purpose Isolation)
    if (record.purpose && record.purpose !== 'general' && purpose !== 'general' && record.purpose !== purpose) {
      return false;
    }

    record.attempts += 1;

    let isMatch = false;
    if (record.codeHash) {
      const expectedHash = this.hashOtp(cleanPhone, cleanCode, record.purpose || purpose);
      try {
        isMatch = crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(record.codeHash, 'hex'));
      } catch {
        isMatch = false;
      }
    } else if ((record as any).code) {
      isMatch = (record as any).code === cleanCode;
    }

    if (!isMatch) return false;

    this.activeOtps.delete(otpKey);
    this.activeOtps.delete(`otp:general:${cleanPhone}`);
    this.activeOtps.delete(cleanPhone);
    return true;
  }

  /**
   * Xác thực mã OTP có ràng buộc chặt chẽ với số điện thoại của yêu cầu (AT-08).
   * Tuyệt đối không cho phép dùng OTP của số A để xác thực lead số B.
   */
  async verifyOtpForPhone(
    targetPhone: string,
    inputPhone: string,
    code: string,
    purpose: OtpPurpose = 'lead_verification',
  ): Promise<boolean> {
    const cleanTarget = targetPhone.replace(/[\s\-\.\(\)]/g, '');
    const cleanInput = inputPhone.replace(/[\s\-\.\(\)]/g, '');

    // AT-08: Kiểm tra số điện thoại gửi OTP phải khớp chính xác với số của Lead
    if (cleanTarget !== cleanInput) {
      this.logger.warn(`AT-08: Phát hiện mượn OTP từ số khác (target=${cleanTarget}, input=${cleanInput})`);
      return false;
    }

    return this.verifyOtp(cleanTarget, code, purpose);
  }

  private async sendViaProvider(phone: string, code: string): Promise<void> {
    const isStaging = process.env.APP_ENV === 'staging' || process.env.SAFETY_NET_DISABLE_OUTBOUND === 'true';
    if (isStaging) {
      this.logger.warn(`🛡️ [SAFETY NET] Staging mode: Chặn gửi SMS thật tới ${phone}`);
      return;
    }

    const provider = process.env.SMS_PROVIDER ?? 'mock';
    const allowMock = process.env.ALLOW_MOCK_SMS === 'true';

    if (provider === 'mock') {
      if (process.env.NODE_ENV === 'production' && !allowMock) {
        throw new HttpException('Chế độ SMS mock không được phép chạy ở môi trường production', HttpStatus.INTERNAL_SERVER_ERROR);
      }
      this.logger.log(`[MOCK SMS] Gửi OTP tới ${phone}: ${code}`);
      return;
    }

    const timeoutMs = 5000;
    try {
      if (provider === 'esms') {
        const apiKey = process.env.SMS_API_KEY;
        const secretKey = process.env.SMS_SECRET_KEY;
        if (!apiKey || !secretKey) {
          if (allowMock) {
            this.logger.warn(`⚠️ [SMS FALLBACK] Thiếu SMS_API_KEY hoặc SMS_SECRET_KEY cho eSMS, sử dụng MOCK OTP vì ALLOW_MOCK_SMS=true`);
            this.logger.log(`[MOCK SMS] Gửi OTP tới ${phone}: ${code}`);
            return;
          }
          throw new Error('Thiếu SMS_API_KEY hoặc SMS_SECRET_KEY cho eSMS');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch('https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ApiKey: apiKey,
            SecretKey: secretKey,
            Phone: phone,
            Content: `Ma xac thuc NHACUALAND cua ban la: ${code}. Hieu luc 5 phut.`,
            SmsType: '2',
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (!res.ok) throw new Error(`eSMS trả mã HTTP lỗi: ${res.status}`);
        const data: any = await res.json();
        if (data.CodeResult !== '100') {
          throw new Error(`eSMS từ chối gửi tin: ${data.ErrorMessage}`);
        }
        return;
      }

      if (provider === 'twilio') {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromPhone = process.env.TWILIO_PHONE_NUMBER;
        if (!accountSid || !authToken || !fromPhone) {
          throw new Error('Thiếu TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN hoặc TWILIO_PHONE_NUMBER');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const params = new URLSearchParams();
        params.set('To', phone.startsWith('+') ? phone : `+84${phone.replace(/^0/, '')}`);
        params.set('From', fromPhone);
        params.set('Body', `Ma xac thuc NHACUALAND cua ban la: ${code}. Hieu luc 5 phut.`);

        const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (!res.ok) throw new Error(`Twilio trả mã HTTP lỗi: ${res.status}`);
        return;
      }

      if (provider === 'speedsms') {
        const accessToken = process.env.SMS_API_KEY;
        if (!accessToken) throw new Error('Thiếu SMS_API_KEY cho SpeedSMS');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch('https://api.speedsms.vn/index.php/sms/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${accessToken}:x`).toString('base64')}`,
          },
          body: JSON.stringify({
            to: [phone],
            content: `Ma xac thuc NHACUALAND cua ban la: ${code}. Hieu luc 5 phut.`,
            sms_type: 2,
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (!res.ok) throw new Error(`SpeedSMS trả mã HTTP lỗi: ${res.status}`);
        return;
      }


      throw new Error(`SMS_PROVIDER="${provider}" không được hỗ trợ`);
    } catch (err: any) {
      this.logger.error(`Lỗi khi gửi SMS OTP qua provider "${provider}": ${err.message}`);
      throw new HttpException(
        'Không thể gửi mã xác thực SMS qua nhà mạng viễn thông, vui lòng thử lại sau',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /** Dọn dẹp bản ghi bộ nhớ dự phòng */
  cleanupExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [phone, record] of this.activeOtps.entries()) {
      if (now > record.expiresAt) {
        this.activeOtps.delete(phone);
        count++;
      }
    }
    for (const [phone, rate] of this.rateLimits.entries()) {
      if (now - rate.windowStart >= 3600 * 1000) {
        this.rateLimits.delete(phone);
      }
    }
    return count;
  }
}
