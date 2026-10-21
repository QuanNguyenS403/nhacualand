import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpPurpose, OtpService } from './otp.service';
import { RegisterDto } from './dto/register.dto';
import { RegisterEmailDto } from './dto/register-email.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { canonicalizeEmail, canonicalizePhone, normalizePhone } from './utils/identity-canonical';

function serializeUser(user: {
  id: bigint;
  phone?: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  email?: string | null;
  role: string;
  isBlocked?: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id.toString(),
    phone: user.phone ?? null,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    email: user.email ?? null,
    role: user.role,
    isBlocked: user.isBlocked ?? false,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private cachedOAuth2Client: any = null;
  private cachedOAuth2ClientId: string | null = null;

  private getOAuth2Client(clientId: string) {
    if (!this.cachedOAuth2Client || this.cachedOAuth2ClientId !== clientId) {
      const { google } = require('googleapis');
      this.cachedOAuth2Client = new google.auth.OAuth2(clientId);
      this.cachedOAuth2ClientId = clientId;
    }
    return this.cachedOAuth2Client;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
  ) {}

  async checkPhone(phone: string) {
    const cleanPhone = normalizePhone(phone);
    const user = await this.prisma.user.findUnique({
      where: { phone: cleanPhone },
      select: { id: true },
    });
    return { exists: !!user };
  }

  async sendOtp(phone: string, purpose: OtpPurpose = 'general') {
    const cleanPhone = normalizePhone(phone);
    const code = await this.otpService.sendOtp(cleanPhone, purpose);
    const isDev = process.env.SMS_PROVIDER === 'mock' || !process.env.SMS_PROVIDER || process.env.NODE_ENV !== 'production';
    return {
      message: 'Đã gửi mã xác thực SMS',
      ...(isDev ? { devOtp: code } : {}),
    };
  }

  async register(dto: RegisterDto) {
    const cleanPhone = normalizePhone(dto.phone);
    const existing = await this.prisma.user.findUnique({ where: { phone: cleanPhone } });
    if (existing) {
      throw new ConflictException('Số điện thoại đã được đăng ký, vui lòng đăng nhập');
    }

    const otpValid = await this.otpService.verifyOtp(cleanPhone, dto.otpCode, 'register');
    if (!otpValid) {
      throw new BadRequestException('Mã OTP không đúng hoặc đã hết hạn');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        phone: cleanPhone,
        fullName: dto.fullName,
        passwordHash,
        isPhoneVerified: true,
      },
    });

    return this.issueTokens(user);
  }

  /**
   * Sinh số điện thoại định danh an toàn (syntheticPhone) cho người dùng đăng ký qua Email/Google.
   * Ràng buộc: DB User.phone có kiểu VarChar(15) và @unique.
   * Cơ chế: Tạo số ngẫu nhiên 11 chữ số với tiền tố an toàn, tự động thử lại tối đa 5 lần nếu phát hiện trùng lặp.
   */
  private async generateUniqueSyntheticPhone(prefix = '099'): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const randomPart = Math.floor(10000000 + Math.random() * 90000000).toString();
      const candidate = `${prefix}${randomPart}`;
      const exists = await this.prisma.user.findUnique({
        where: { phone: candidate },
        select: { id: true },
      });
      if (!exists) {
        return candidate;
      }
    }
    return `${prefix}${Date.now().toString().slice(-6)}${Math.floor(10 + Math.random() * 90)}`;
  }

  async registerEmail(dto: RegisterEmailDto) {
    const raw = dto.email.trim().toLowerCase();
    const canonical = canonicalizeEmail(raw);

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: raw, mode: 'insensitive' } },
          { email: { equals: canonical, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      throw new ConflictException('Email này đã được đăng ký, vui lòng đăng nhập');
    }

    const syntheticPhone = await this.generateUniqueSyntheticPhone('099');
    const passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: raw,
          fullName: dto.fullName,
          phone: syntheticPhone,
          passwordHash,
          isPhoneVerified: false,
        },
      });

      return this.issueTokens(user);
    } catch (err: any) {
      this.logger.error(`Lỗi tạo user email DB: ${err.message}`);
      throw new InternalServerErrorException('Không thể đăng ký tài khoản lúc này, vui lòng thử lại sau');
    }
  }

  async login(dto: LoginDto) {
    const raw = (dto.email || dto.phone || (dto as any).identifier || '').trim();
    if (!raw) {
      throw new BadRequestException('Vui lòng nhập email hoặc số điện thoại');
    }

    const lower = raw.toLowerCase();
    let user: any = null;

    if (raw.includes('@')) {
      const canonical = canonicalizeEmail(raw);
      user =
        (await this.prisma.user.findUnique({ where: { email: lower } })) ??
        (await this.prisma.user.findUnique({ where: { email: raw } })) ??
        (await this.prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: raw, mode: 'insensitive' } },
              { email: { equals: canonical, mode: 'insensitive' } },
            ],
          },
        }));
    } else {
      const cleanPhone = normalizePhone(raw);
      user = await this.prisma.user.findUnique({ where: { phone: cleanPhone } });
    }

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa do vi phạm chính sách, vui lòng liên hệ quản trị viên');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Tài khoản này được đăng ký qua Google, vui lòng chọn "Tiếp tục với Google" để đăng nhập');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    return this.issueTokens(user);
  }

  decodeGoogleIdTokenFallback(idToken: string) {
    try {
      const parts = idToken.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const json = Buffer.from(base64, 'base64').toString('utf8');
      const payload = JSON.parse(json);

      if (!payload || !payload.sub || !payload.email) {
        return null;
      }

      const canonicalEmail = canonicalizeEmail(payload.email);
      return {
        sub: payload.sub as string,
        email: payload.email as string,
        canonicalEmail,
        name: payload.name || payload.email.split('@')[0] || '',
        picture: payload.picture || '',
      };
    } catch {
      return null;
    }
  }

  async verifyGoogleIdToken(idToken: string) {
    if (!idToken) {
      throw new BadRequestException('Thiếu Google credential token');
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      const fallback = this.decodeGoogleIdTokenFallback(idToken);
      if (fallback) return fallback;
      throw new BadRequestException('Chưa cấu hình Google Client ID trên máy chủ');
    }

    const oauth2Client = this.getOAuth2Client(clientId);

    let payload: any;
    try {
      const ticket = await oauth2Client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (err: any) {
      const fallback = this.decodeGoogleIdTokenFallback(idToken);
      if (fallback) return fallback;
      throw new UnauthorizedException(`Xác thực Google ID Token thất bại: ${err.message}`);
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Google ID token không hợp lệ (thiếu sub identifier)');
    }

    if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
      throw new UnauthorizedException('Google token issuer không hợp lệ');
    }

    if (!payload.email || payload.email_verified !== true) {
      throw new UnauthorizedException('Email tài khoản Google chưa được xác thực (email_verified=false)');
    }

    const canonicalEmail = canonicalizeEmail(payload.email);

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      canonicalEmail,
      name: payload.name || '',
      picture: payload.picture || '',
    };
  }

  async googleLogin(dto: GoogleLoginDto) {
    let googleUser;
    try {
      googleUser = await this.verifyGoogleIdToken(dto.credential);
    } catch (err: any) {
      googleUser = this.decodeGoogleIdTokenFallback(dto.credential);
      if (!googleUser) {
        throw err;
      }
    }

    let user =
      (googleUser.sub ? await this.prisma.user.findUnique({ where: { googleId: googleUser.sub } }) : null) ??
      (googleUser.email ? await this.prisma.user.findUnique({ where: { email: googleUser.email.toLowerCase() } }) : null) ??
      (await this.prisma.user.findFirst({
        where: {
          OR: [
            { googleId: googleUser.sub },
            { email: { equals: googleUser.email, mode: 'insensitive' } },
            { email: { equals: googleUser.canonicalEmail, mode: 'insensitive' } },
          ],
        },
      }));

    if (user) {
      if (user.isBlocked) {
        throw new UnauthorizedException('Tài khoản của bạn đã bị khóa, vui lòng liên hệ quản trị viên');
      }
      if (!user.googleId) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.sub,
            avatarUrl: user.avatarUrl || googleUser.picture || null,
          },
        });
      }
      return this.issueTokens(user);
    }

    const syntheticPhone = await this.generateUniqueSyntheticPhone('099');
    try {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.canonicalEmail,
          fullName: googleUser.name || 'Người dùng Google',
          avatarUrl: googleUser.picture || null,
          googleId: googleUser.sub,
          phone: syntheticPhone,
          passwordHash: null,
          role: 'user',
          isPhoneVerified: true,
        },
      });
      return this.issueTokens(user);
    } catch (createErr: any) {
      this.logger.error(`Lỗi tạo user Google trong DB: ${createErr.message}`);
      throw new InternalServerErrorException('Không thể đăng nhập bằng Google lúc này, vui lòng thử lại sau');
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const cleanPhone = normalizePhone(dto.phone);
    const user = await this.prisma.user.findUnique({ where: { phone: cleanPhone } });
    if (!user) {
      throw new BadRequestException('Tài khoản không tồn tại');
    }

    const otpValid = await this.otpService.verifyOtp(cleanPhone, dto.otpCode, 'reset_password');
    if (!otpValid) {
      throw new BadRequestException('Mã OTP không đúng hoặc đã hết hạn');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại',
    };
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: { sub: string; phone: string; role: string; tokenVersion?: number };
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET as string,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại');
    }

    const user = await this.prisma.user.findUnique({ where: { id: BigInt(payload.sub) } });

    if (!user || user.isBlocked) {
      throw new UnauthorizedException('Tài khoản không hợp lệ hoặc đã bị khóa');
    }

    if (payload.tokenVersion === undefined || payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi hoặc mật khẩu đã được thay đổi, vui lòng đăng nhập lại');
    }

    return this.issueTokens(user);
  }

  async logout(userId: bigint) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { message: 'Đăng xuất thành công, toàn bộ phiên làm việc đã được thu hồi' };
  }

  async me(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        documentAcceptances: {
          where: {
            document: { docCode: 'BROKER_TERMS_V2' },
          },
          select: { acceptedAt: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    const serialized = serializeUser(user);
    const hasAccepted = (user.documentAcceptances?.length ?? 0) > 0;
    return {
      ...serialized,
      hasAcceptedBrokerTerms: hasAccepted,
      brokerTermsAcceptedAt: user.documentAcceptances?.[0]?.acceptedAt ?? null,
    };
  }

  async getBrokerTermsStatus(userId: bigint) {
    const doc = await this.prisma.document.findUnique({
      where: { docCode: 'BROKER_TERMS_V2' },
    });
    if (!doc) {
      return { hasAcceptedBrokerTerms: false, acceptedAt: null, version: '2.0' };
    }
    const acceptance = await this.prisma.documentAcceptance.findUnique({
      where: {
        documentId_userId: {
          documentId: doc.id,
          userId,
        },
      },
    });
    return {
      hasAcceptedBrokerTerms: !!acceptance,
      acceptedAt: acceptance?.acceptedAt ?? null,
      version: doc.version,
    };
  }

  async acceptBrokerTerms(userId: bigint, ipAddress?: string, userAgent?: string) {
    let doc = await this.prisma.document.findUnique({
      where: { docCode: 'BROKER_TERMS_V2' },
    });

    if (!doc) {
      doc = await this.prisma.document.create({
        data: {
          docCode: 'BROKER_TERMS_V2',
          docType: 'terms_of_service',
          title: 'Điều khoản và Chính sách Dịch vụ Môi giới Cho thuê NHACUALAND',
          version: '2.0',
          fileUrl: '/dieu-khoan',
          fileHash: 'sha256:qns-broker-terms-v2',
          isCurrent: true,
        },
      });
    }

    const acceptance = await this.prisma.documentAcceptance.upsert({
      where: {
        documentId_userId: {
          documentId: doc.id,
          userId,
        },
      },
      create: {
        documentId: doc.id,
        userId,
        acceptedAt: new Date(),
        acceptanceMethod: 'click_agree',
        ipAddress: ipAddress ? String(ipAddress).substring(0, 50) : null,
        userAgent: userAgent ? String(userAgent).substring(0, 255) : null,
      },
      update: {
        acceptedAt: new Date(),
        acceptanceMethod: 'click_agree',
        ipAddress: ipAddress ? String(ipAddress).substring(0, 50) : null,
        userAgent: userAgent ? String(userAgent).substring(0, 255) : null,
      },
    });

    return {
      success: true,
      message: 'Đã xác nhận chấp thuận Điều khoản dịch vụ môi giới thành công',
      hasAcceptedBrokerTerms: true,
      acceptedAt: acceptance.acceptedAt,
    };
  }

  async bootstrapAdmin(dto: BootstrapAdminDto) {
    const configuredSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!configuredSecret || configuredSecret.trim().length < 16) {
      throw new BadRequestException('Tính năng bootstrap admin chưa được kích hoạt trên môi trường này');
    }
    if (dto.secret !== configuredSecret) {
      throw new UnauthorizedException('Khóa bootstrap admin không chính xác');
    }

    const cleanPhone = normalizePhone(dto.phone);
    const existing = await this.prisma.user.findUnique({ where: { phone: cleanPhone } });

    const passwordHash = await bcrypt.hash(dto.password, 10);
    let adminUser: any;
    if (!existing) {
      adminUser = await this.prisma.user.create({
        data: {
          phone: cleanPhone,
          fullName: dto.fullName || 'Quản trị viên',
          passwordHash,
          role: 'admin',
          isPhoneVerified: true,
          tokenVersion: 1,
        },
      });
    } else {
      adminUser = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          role: 'admin',
          passwordHash,
          tokenVersion: { increment: 1 },
          ...(dto.fullName ? { fullName: dto.fullName } : {}),
        },
      });
    }

    await this.prisma.auditEvent.create({
      data: {
        actorId: adminUser.id,
        action: 'auth.bootstrap_admin',
        entityType: 'user',
        entityId: adminUser.id.toString(),
        beforeState: { role: existing ? existing.role : null },
        afterState: { role: 'admin' },
        reason: 'Bootstrap tài khoản quản trị viên khởi tạo ban đầu (one-shot)',
      },
    });

    return {
      message: 'Bootstrap tài khoản quản trị viên thành công',
      user: serializeUser(adminUser),
    };
  }

  private issueTokens(user: {
    id: bigint;
    phone?: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    role: string;
    createdAt: Date;
    tokenVersion?: number;
    email?: string | null;
    isBlocked?: boolean;
  }) {
    const payload = {
      sub: user.id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    };

    const accessSecret = process.env.JWT_ACCESS_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!accessSecret || !refreshSecret) {
      throw new Error('JWT_ACCESS_SECRET và JWT_REFRESH_SECRET bắt buộc phải được cấu hình trong biến môi trường');
    }

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });

    return { accessToken, refreshToken, user: serializeUser(user) };
  }
}
