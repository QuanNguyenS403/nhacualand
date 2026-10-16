import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Hàm escape các ký tự đặc biệt trong chuỗi để triệt tiêu lỗi HTML/XSS injection trong email clients (BE-11).
 */
export function escapeHtml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Kiểm tra địa chỉ email có đúng định dạng chuẩn RFC hay không.
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  public isMock = true;

  constructor(private readonly config?: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const isStaging = (this.config?.get<string>('APP_ENV') ?? process.env.APP_ENV) === 'staging' ||
      (this.config?.get<string>('SAFETY_NET_DISABLE_OUTBOUND') ?? process.env.SAFETY_NET_DISABLE_OUTBOUND) === 'true';

    if (isStaging) {
      this.isMock = true;
      this.logger.warn(`🛡️ [SAFETY NET] Đang chạy trong môi trường STAGING (hoặc SAFETY_NET_DISABLE_OUTBOUND=true). Toàn bộ email bị chặn gửi thật, cưỡng chế chuyển sang chế độ MOCK.`);
      return;
    }

    const driver = this.config?.get<string>('MAIL_DRIVER') ?? process.env.MAIL_DRIVER ?? 'mock';
    const host = this.config?.get<string>('SMTP_HOST') ?? process.env.SMTP_HOST;
    const port = Number(this.config?.get<number>('SMTP_PORT') ?? process.env.SMTP_PORT ?? 465);
    const user = (this.config?.get<string>('SMTP_USER') ?? process.env.SMTP_USER)?.trim();
    const rawPass = this.config?.get<string>('SMTP_PASS') ?? process.env.SMTP_PASS;
    // Mật khẩu ứng dụng của Google có thể chứa khoảng trắng phân tách 4 ký tự (ví dụ: abcd efgh ijkl mnop)
    const pass = rawPass ? rawPass.trim().replace(/\s+/g, '') : '';

    if (driver !== 'mock' && user && pass) {
      try {
        const isGmail = host === 'smtp.gmail.com' || user.toLowerCase().endsWith('@gmail.com');
        const transportConfig: any = isGmail
          ? {
              service: 'gmail',
              auth: { user, pass },
              pool: true,
              maxConnections: 5,
              maxMessages: 100,
            }
          : {
              host: host || 'smtp.gmail.com',
              port,
              secure: port === 465,
              auth: { user, pass },
              pool: true,
              maxConnections: 5,
              maxMessages: 100,
            };
        this.transporter = nodemailer.createTransport(transportConfig);
        this.isMock = false;
        this.logger.log(`[EmailService] Khởi tạo SMTP transporter thành công (${isGmail ? 'Gmail Service (Pooled)' : `${host}:${port} (Pooled)`})`);
      } catch (err) {
        this.logger.error(`[EmailService] Không thể kết nối SMTP, fallback về MOCK: ${err}`);
        this.isMock = true;
      }
    } else {
      this.isMock = true;
      this.logger.log(`[EmailService] Chạy ở chế độ MOCK (cần cấu hình MAIL_DRIVER=smtp, SMTP_USER, SMTP_PASS trong .env để gửi email thật qua mạng)`);
    }
  }

  private async sendEmail(to: string, subject: string, html: string, textSummary: string): Promise<boolean> {
    const rawFrom = this.config?.get<string>('SMTP_FROM') ?? process.env.SMTP_FROM ?? 'NHACUALAND <no-reply@nhacualand.com>';
    let from = rawFrom.trim();
    // Tự động chuẩn hóa nếu SMTP_FROM bị thiếu địa chỉ email (ví dụ chỉ có tên "NHACUALAND")
    if (from && !from.includes('@')) {
      const userEmail = (this.config?.get<string>('SMTP_USER') ?? process.env.SMTP_USER)?.trim() || 'ducquan16102006@gmail.com';
      from = `"${from}" <${userEmail}>`;
    }

    if (this.isMock || !this.transporter) {
      this.logger.log(`\n📧 ========== [MOCK EMAIL NOTIFICATION] ==========
To:      ${to}
From:    ${from}
Subject: ${subject}
Content: ${textSummary}
==================================================\n`);
      return true;
    }

    // Nếu là môi trường SMTP thật nhưng địa chỉ nhận không hợp lệ, không cố gửi để tránh blacklisting domain
    if (!isValidEmail(to)) {
      this.logger.warn(`[EmailService] Bỏ qua gửi email thật: Địa chỉ "${to}" không hợp lệ.`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
        text: textSummary,
      });
      this.logger.log(`[EmailService] Đã gửi email "${subject}" tới ${to}`);
      return true;
    } catch (err: any) {
      this.logger.error(`[EmailService] Lỗi khi gửi email tới ${to}: ${err.message}`);
      return false;
    }
  }

  /**
   * (a) Thông báo cho Chủ trọ/Môi giới: Tin đăng đã được tiếp nhận và đang chờ duyệt
   */
  async sendListingSubmittedToLandlord(listing: { id: bigint | string; title: string; price: bigint | number }, landlordPhone: string, landlordEmail?: string) {
    if (!isValidEmail(landlordEmail)) {
      if (!this.isMock) {
        this.logger.log(`[EmailService] Chủ tin ${landlordPhone} chưa cấu hình email thật. Bỏ qua gửi email thông báo tiếp nhận.`);
        return false;
      }
    }
    const targetEmail = isValidEmail(landlordEmail) ? landlordEmail! : `landlord-${landlordPhone}@mock.batdongsan.local`;
    const safeTitle = escapeHtml(listing.title);
    const safePhone = escapeHtml(landlordPhone);
    const subject = `[BĐS Cho Thuê] Xác nhận tiếp nhận tin đăng: ${listing.title}`;
    const summary = `Xin chào! Tin đăng "${listing.title}" (Mã BĐS: #${listing.id}) của bạn đã được tiếp nhận thành công và đang trong hàng đợi kiểm duyệt. Ban quản trị sẽ xét duyệt trong vòng 24h.`;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0d9488;">BĐS Cho Thuê — Xác nhận tiếp nhận tin</h2>
        <p>Xin chào quý chủ nhà / môi giới <strong>${safePhone}</strong>,</p>
        <p>Tin cho thuê của bạn đã được gửi thành công lên hệ thống:</p>
        <blockquote style="background: #f0fdfa; padding: 12px 16px; border-left: 4px solid #0d9488; margin: 16px 0;">
          <strong>Tiêu đề:</strong> ${safeTitle}<br/>
          <strong>Mã tin:</strong> #${listing.id}<br/>
          <strong>Trạng thái:</strong> Đang chờ duyệt (Pending)
        </blockquote>
        <p>Đội ngũ kiểm duyệt sẽ kiểm tra thông tin để đảm bảo tính minh bạch và thông báo tới bạn ngay khi hoàn tất.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">BĐS Cho Thuê — Nền tảng tìm phòng trọ & nhà cho thuê minh bạch.</p>
      </div>
    `;

    return this.sendEmail(targetEmail, subject, html, summary);
  }

  /**
   * (b1) Thông báo cho Chủ trọ/Môi giới: Tin đăng ĐÃ ĐƯỢC DUYỆT lên sàn
   */
  async sendListingApprovedToLandlord(listing: { id: bigint | string; title: string; slug: string }, landlordPhone: string, landlordEmail?: string) {
    if (!isValidEmail(landlordEmail)) {
      if (!this.isMock) {
        this.logger.log(`[EmailService] Chủ tin ${landlordPhone} chưa cấu hình email thật. Bỏ qua gửi email phê duyệt.`);
        return false;
      }
    }
    const targetEmail = isValidEmail(landlordEmail) ? landlordEmail! : `landlord-${landlordPhone}@mock.batdongsan.local`;
    const safeTitle = escapeHtml(listing.title);
    const safePhone = escapeHtml(landlordPhone);
    const subject = `[BĐS Cho Thuê] Tin đăng #${listing.id} đã được PHÊ DUYỆT`;
    const summary = `Chúc mừng bạn! Tin đăng "${listing.title}" (Mã BĐS: #${listing.id}) đã được phê duyệt và đang hiển thị công khai tới hàng nghìn sinh viên, người thuê.`;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0d9488;">🎉 Tin đăng của bạn đã được phê duyệt!</h2>
        <p>Xin chào <strong>${safePhone}</strong>,</p>
        <p>Tin cho thuê của bạn đã chính thức được hiển thị công khai:</p>
        <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; border: 1px solid #a7f3d0; margin: 16px 0;">
          <p style="margin: 0; font-weight: bold; color: #065f46;">${safeTitle}</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #047857;">Mã tin: #${listing.id}</p>
        </div>
        <p>Khách thuê quan tâm có thể tìm kiếm và liên hệ trực tiếp với bạn qua SĐT/Zalo.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">BĐS Cho Thuê — Nền tảng kết nối trực tiếp chủ nhà và người thuê.</p>
      </div>
    `;

    return this.sendEmail(targetEmail, subject, html, summary);
  }

  /**
   * (b2) Thông báo cho Chủ trọ/Môi giới: Tin đăng BỊ TỪ CHỐI kèm lý do
   */
  async sendListingRejectedToLandlord(listing: { id: bigint | string; title: string }, landlordPhone: string, reason: string, landlordEmail?: string) {
    if (!isValidEmail(landlordEmail)) {
      if (!this.isMock) {
        this.logger.log(`[EmailService] Chủ tin ${landlordPhone} chưa cấu hình email thật. Bỏ qua gửi email từ chối.`);
        return false;
      }
    }
    const targetEmail = isValidEmail(landlordEmail) ? landlordEmail! : `landlord-${landlordPhone}@mock.batdongsan.local`;
    const safeTitle = escapeHtml(listing.title);
    const safePhone = escapeHtml(landlordPhone);
    const safeReason = escapeHtml(reason);
    const subject = `[BĐS Cho Thuê] Thông báo từ chối tin đăng #${listing.id}`;
    const summary = `Tin đăng "${listing.title}" (Mã BĐS: #${listing.id}) chưa đáp ứng tiêu chuẩn sàn. Lý do: "${reason}". Vui lòng cập nhật lại thông tin.`;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #dc2626;">Thông báo về tin đăng chưa được duyệt</h2>
        <p>Xin chào <strong>${safePhone}</strong>,</p>
        <p>Rất tiếc, tin cho thuê <strong>"${safeTitle}"</strong> (Mã: #${listing.id}) chưa thể xuất bản vì lý do sau:</p>
        <div style="background: #fef2f2; padding: 14px 18px; border-left: 4px solid #ef4444; border-radius: 4px; margin: 16px 0; color: #991b1b;">
          <strong>Lý do từ chối:</strong> ${safeReason}
        </div>
        <p>Bạn có thể vào trang Quản lý tin để chỉnh sửa lại thông tin và gửi yêu cầu duyệt lại.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">Ban Quản Trị BĐS Cho Thuê.</p>
      </div>
    `;

    return this.sendEmail(targetEmail, subject, html, summary);
  }

  /**
   * (c) Thông báo cho Quản trị viên (Admin): Có tin mới cần duyệt
   */
  async sendNewListingToAdmin(listing: { id: bigint | string; title: string; propertyType: string; price: bigint | number; ownerPhone?: string }) {
    const adminEmail = this.config?.get<string>('ADMIN_NOTIFICATION_EMAIL') ?? process.env.ADMIN_NOTIFICATION_EMAIL ?? 'ducquan16102006@gmail.com';
    const safeTitle = escapeHtml(listing.title);
    const safePhone = escapeHtml(listing.ownerPhone ?? 'Chưa rõ');
    const safeType = escapeHtml(listing.propertyType);
    const subject = `[ADMIN CẦN DUYỆT] Tin cho thuê mới #${listing.id}: ${listing.title}`;
    const summary = `Có tin cho thuê mới cần duyệt từ SĐT ${listing.ownerPhone ?? 'Chưa rõ'}. Tiêu đề: "${listing.title}". Giá: ${Number(listing.price).toLocaleString('vi-VN')} đ/tháng.`;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0d9488;">⚡ Cần duyệt: Tin đăng mới #${listing.id}</h2>
        <p>Hệ thống vừa nhận được 1 tin cho thuê mới từ người dùng <strong>${safePhone}</strong>:</p>
        <ul>
          <li><strong>Mã tin:</strong> #${listing.id}</li>
          <li><strong>Tiêu đề:</strong> ${safeTitle}</li>
          <li><strong>Loại hình:</strong> ${safeType}</li>
          <li><strong>Giá thuê:</strong> ${Number(listing.price).toLocaleString('vi-VN')} đ/tháng</li>
        </ul>
        <p>Vui lòng đăng nhập vào trang Quản trị để kiểm tra nội dung và duyệt tin.</p>
      </div>
    `;

    return this.sendEmail(adminEmail, subject, html, summary);
  }

  /**
   * (d) Thông báo cho Quản trị viên (Admin): Có báo cáo vi phạm mới
   */
  async sendNewReportToAdmin(report: { id: bigint | string; reason: string; note?: string | null; listingTitle?: string; listingId?: bigint | string; reporterPhone?: string }) {
    const adminEmail = this.config?.get<string>('ADMIN_NOTIFICATION_EMAIL') ?? process.env.ADMIN_NOTIFICATION_EMAIL ?? 'ducquan16102006@gmail.com';
    const safeReason = escapeHtml(report.reason);
    const safeTitle = escapeHtml(report.listingTitle ?? 'Chưa rõ');
    const safePhone = escapeHtml(report.reporterPhone ?? 'Khách vãng lai');
    const safeNote = escapeHtml(report.note ?? 'Không có');
    const subject = `[CẢNH BÁO VI PHẠM] Báo cáo mới cho tin #${report.listingId ?? ''}: ${report.reason}`;
    const summary = `Có báo cáo vi phạm mới từ SĐT ${report.reporterPhone ?? 'Ẩn danh'}. Lý do: ${report.reason}. Tin: "${report.listingTitle ?? ''}". Ghi chú: ${report.note ?? 'Không có'}.`;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #b91c1c;">⚠️ Cảnh báo: Có báo cáo vi phạm mới</h2>
        <p>Người dùng <strong>${safePhone}</strong> vừa gửi báo cáo vi phạm:</p>
        <div style="background: #fff1f2; border: 1px solid #fecdd3; padding: 16px; border-radius: 8px;">
          <p><strong>Mã báo cáo:</strong> #${report.id}</p>
          <p><strong>Tin bị báo cáo:</strong> #${report.listingId} — ${safeTitle}</p>
          <p><strong>Lý do vi phạm:</strong> <span style="color: #e11d48; font-weight: bold;">${safeReason}</span></p>
          <p><strong>Ghi chú chi tiết:</strong> ${safeNote}</p>
        </div>
        <p>Vui lòng xử lý báo cáo tại trang Quản trị Báo cáo vi phạm.</p>
      </div>
    `;

    return this.sendEmail(adminEmail, subject, html, summary);
  }

  /**
   * (e) Thông báo cho Chủ trọ/Môi giới: Tin đăng đã hết hạn hiển thị (30 ngày)
   */
  async sendListingExpiredToLandlord(listing: { id: bigint | string; title: string }, landlordPhone: string, landlordEmail?: string) {
    if (!isValidEmail(landlordEmail)) {
      if (!this.isMock) {
        this.logger.log(`[EmailService] Chủ tin ${landlordPhone} chưa cấu hình email thật. Bỏ qua gửi email hết hạn.`);
        return false;
      }
    }
    const targetEmail = isValidEmail(landlordEmail) ? landlordEmail! : `landlord-${landlordPhone}@mock.batdongsan.local`;
    const safeTitle = escapeHtml(listing.title);
    const safePhone = escapeHtml(landlordPhone);
    const subject = `[BĐS Cho Thuê] Tin đăng #${listing.id} đã hết hạn hiển thị`;
    const summary = `Tin đăng "${listing.title}" (Mã BĐS: #${listing.id}) của bạn đã hết hạn 30 ngày hiển thị. Nếu phòng vẫn còn trống hoặc tiếp tục cho thuê, bạn có thể gia hạn bất kỳ lúc nào tại mục Quản lý tin.`;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #475569;">⏰ Tin đăng của bạn đã hết hạn hiển thị</h2>
        <p>Xin chào <strong>${safePhone}</strong>,</p>
        <p>Tin cho thuê <strong>"${safeTitle}"</strong> (Mã: #${listing.id}) của bạn đã hoàn thành chu kỳ hiển thị 30 ngày.</p>
        <p>Nếu phòng vẫn còn trống và bạn muốn tiếp tục tìm khách thuê, vui lòng đăng nhập vào trang Quản lý tin để gia hạn lại tin đăng.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">BĐS Cho Thuê — Nền tảng kết nối trực tiếp chủ nhà và người thuê.</p>
      </div>
    `;

    return this.sendEmail(targetEmail, subject, html, summary);
  }

  /**
   * (f) Thông báo cho Admin: Có yêu cầu nâng cấp gói thành viên mới cần kiểm tra & duyệt
   */
  async sendMembershipUpgradeRequestToAdmin(request: {
    id: bigint | string;
    userPhone: string;
    userName?: string | null;
    planName: string;
    price: bigint | number;
    paymentNote?: string | null;
  }) {
    const adminEmail = this.config?.get<string>('ADMIN_NOTIFICATION_EMAIL') ?? process.env.ADMIN_NOTIFICATION_EMAIL ?? 'ducquan16102006@gmail.com';
    const formattedPrice = new Intl.NumberFormat('vi-VN').format(Number(request.price)) + ' đ';
    const safePlan = escapeHtml(request.planName);
    const safeUser = escapeHtml(request.userName || request.userPhone);
    const safePhone = escapeHtml(request.userPhone);
    const safeNote = escapeHtml(request.paymentNote || 'Không có');
    const subject = `[BĐS Quản trị] Yêu cầu nâng cấp gói: ${request.planName} từ ${request.userPhone}`;
    const summary = `Người dùng ${request.userName || request.userPhone} (SĐT: ${request.userPhone}) vừa gửi yêu cầu nâng cấp gói "${request.planName}" (Trị giá: ${formattedPrice}). Ghi chú: ${request.paymentNote || 'Không có'}. Vui lòng kiểm tra sao kê ngân hàng và bấm duyệt trên Admin portal.`;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0d9488;">💳 Yêu cầu nâng cấp gói thành viên mới (#${request.id})</h2>
        <p>Hệ thống vừa nhận được yêu cầu đăng ký/nâng cấp gói từ người dùng:</p>
        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 16px 0;">
          <p><strong>Người dùng:</strong> ${safeUser} (SĐT: <strong>${safePhone}</strong>)</p>
          <p><strong>Gói đăng ký:</strong> <span style="color: #0d9488; font-weight: bold;">${safePlan}</span></p>
          <p><strong>Số tiền cần thu:</strong> <strong style="color: #e11d48; font-size: 16px;">${formattedPrice}</strong></p>
          <p><strong>Ghi chú thanh toán:</strong> ${safeNote}</p>
        </div>
        <p>Vui lòng kiểm tra tài khoản ngân hàng và kích hoạt gói tại trang <strong>Quản trị &gt; Duyệt gói thành viên</strong>.</p>
      </div>
    `;

    return this.sendEmail(adminEmail, subject, html, summary);
  }

  /**
   * (g) Thông báo cho Người dùng: Gói thành viên đã được Admin xác nhận & kích hoạt
   */
  async sendMembershipActivatedToUser(membership: {
    userPhone: string;
    userName?: string | null;
    planName: string;
    maxActiveListings: number;
    expiresAt?: Date | null;
  }, userEmail?: string) {
    if (!isValidEmail(userEmail)) {
      if (!this.isMock) {
        this.logger.log(`[EmailService] Người dùng ${membership.userPhone} chưa cấu hình email thật. Bỏ qua gửi email kích hoạt gói.`);
        return false;
      }
    }
    const targetEmail = isValidEmail(userEmail) ? userEmail! : `member-${membership.userPhone}@mock.batdongsan.local`;
    const expiryStr = membership.expiresAt ? new Intl.DateTimeFormat('vi-VN').format(membership.expiresAt) : '30 ngày';
    const safePlan = escapeHtml(membership.planName);
    const safeUser = escapeHtml(membership.userName || membership.userPhone);
    const subject = `[BĐS Cho Thuê] Gói ${membership.planName} của bạn đã được kích hoạt thành công!`;
    const summary = `Chúc mừng bạn! Gói thành viên "${membership.planName}" đã được kích hoạt. Hạn mức đăng tin mới: tối đa ${membership.maxActiveListings} tin hiển thị đồng thời. Hạn dùng đến ngày ${expiryStr}.`;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #0d9488;">🎉 Kích hoạt gói thành viên thành công!</h2>
        <p>Xin chào <strong>${safeUser}</strong>,</p>
        <p>Ban quản trị đã xác nhận thanh toán và chính thức kích hoạt gói thành viên cho tài khoản của bạn:</p>
        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 16px 0;">
          <p><strong>Gói thành viên:</strong> <span style="color: #15803d; font-weight: bold;">${safePlan}</span></p>
          <p><strong>Hạn mức hiển thị đồng thời:</strong> <strong>${membership.maxActiveListings} tin đăng</strong></p>
          <p><strong>Thời hạn sử dụng:</strong> Đến hết ngày <strong>${expiryStr}</strong></p>
        </div>
        <p>Bây giờ bạn đã có thể tiếp tục đăng thêm tin mới và tiếp cận hàng ngàn khách thuê tiềm năng.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #888;">BĐS Cho Thuê — Nền tảng tìm phòng trọ & nhà cho thuê uy tín.</p>
      </div>
    `;

    return this.sendEmail(targetEmail, subject, html, summary);
  }

  /**
   * Bắn thông báo Telegram khi có sự kiện quan trọng (nếu đã cấu hình)
   */
  private async notifyTelegram(message: string): Promise<void> {
    const botToken = this.config?.get<string>('TELEGRAM_BOT_TOKEN') ?? process.env.TELEGRAM_BOT_TOKEN;
    const chatId = this.config?.get<string>('TELEGRAM_CHAT_ID') ?? process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
    } catch {
      // Non-blocking telegram alert failure
    }
  }

  /**
   * (h) Thông báo cho Quản trị viên/Chủ website: Khách hàng gửi phản hồi góp ý
   */
  async sendFeedbackNotification(feedback: {
    rating?: number;
    content: string;
    name?: string;
    email?: string;
    ip?: string;
  }) {
    const adminEmail = this.config?.get<string>('ADMIN_NOTIFICATION_EMAIL') ?? process.env.ADMIN_NOTIFICATION_EMAIL ?? 'ducquan16102006@gmail.com';
    const safeContent = escapeHtml(feedback.content);
    const safeName = escapeHtml(feedback.name || 'Khách vãng lai');
    const safeEmail = escapeHtml(feedback.email || 'Không cung cấp');
    const ratingStars = feedback.rating ? `${'⭐'.repeat(feedback.rating)} (${feedback.rating}/5)` : 'Không đánh giá';
    const nowStr = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());

    const subject = `[NHACUALAND - PHẢN HỒI MỚI] Góp ý từ khách hàng ${safeName}${feedback.rating ? ` [${feedback.rating}⭐]` : ''}`;
    const summary = `Khách hàng ${safeName} (${safeEmail}) vừa gửi phản hồi mới trên website. Đánh giá: ${ratingStars}. Nội dung: "${feedback.content}". Thời gian: ${nowStr}.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0d9488, #0f766e); padding: 24px 28px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">💬 Phản Hồi / Góp Ý Mới Từ Khách Hàng</h2>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Hệ thống website NHACUALAND ghi nhận phản hồi mới</p>
        </div>
        <div style="padding: 24px 28px; background: #ffffff;">
          <div style="margin-bottom: 20px; padding: 14px 18px; background: #f0fdfa; border-left: 4px solid #0d9488; border-radius: 8px;">
            <p style="margin: 0 0 6px; font-size: 14px;"><strong>Đánh giá trải nghiệm:</strong> <span style="font-size: 16px; color: #f59e0b;">${ratingStars}</span></p>
            <p style="margin: 0 0 6px; font-size: 14px;"><strong>Người gửi:</strong> <strong>${safeName}</strong></p>
            <p style="margin: 0; font-size: 14px;"><strong>Email liên hệ:</strong> ${safeEmail}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <p style="font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Nội dung góp ý chi tiết:</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; font-size: 14px; color: #334155; white-space: pre-wrap;">${safeContent}</div>
          </div>
          <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 14px;">
            <p style="margin: 0;">Thời gian tiếp nhận: ${nowStr}${feedback.ip ? ` • IP: ${feedback.ip}` : ''}</p>
          </div>
        </div>
      </div>
    `;

    await this.notifyTelegram(
      `💬 <b>[PHẢN HỒI MỚI - NHACUALAND]</b>\n` +
      `👤 Người gửi: <b>${safeName}</b> (${safeEmail})\n` +
      `⭐ Đánh giá: ${ratingStars}\n` +
      `📝 Nội dung: <i>${safeContent.slice(0, 300)}</i>\n` +
      `⏰ Thời gian: ${nowStr}`
    );

    return this.sendEmail(adminEmail, subject, html, summary);
  }

  /**
   * (i) Thông báo cho Quản trị viên/Chủ website: Khách hàng yêu cầu tư vấn
   */
  async sendConsultationNotification(consultation: {
    phone: string;
    reason: string;
    description?: string;
    selectedRoomIds?: string[];
    ip?: string;
  }) {
    const adminEmail = this.config?.get<string>('ADMIN_NOTIFICATION_EMAIL') ?? process.env.ADMIN_NOTIFICATION_EMAIL ?? 'ducquan16102006@gmail.com';
    const safePhone = escapeHtml(consultation.phone);
    const safeReason = escapeHtml(consultation.reason);
    const safeDesc = escapeHtml(consultation.description || 'Không có mô tả thêm');
    const roomsInfo = consultation.selectedRoomIds && consultation.selectedRoomIds.length > 0
      ? `${consultation.selectedRoomIds.length} phòng (Mã: #${consultation.selectedRoomIds.join(', #')})`
      : 'Chưa chọn phòng cụ thể';
    const nowStr = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());

    const subject = `[NHACUALAND - YÊU CẦU TƯ VẤN] Khách hàng ${safePhone}: ${safeReason}`;
    const summary = `Khách hàng SĐT ${safePhone} vừa gửi yêu cầu tư vấn trên website. Lý do: "${consultation.reason}". Chi tiết: "${consultation.description || 'Không có'}". Phòng quan tâm: ${roomsInfo}. Thời gian: ${nowStr}.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0d9488, #0f766e); padding: 24px 28px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">🎧 Yêu Cầu Tư Vấn Mới Từ Khách Hàng</h2>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Website NHACUALAND — Liên hệ hỗ trợ khách thuê</p>
        </div>
        <div style="padding: 24px 28px; background: #ffffff;">
          <div style="margin-bottom: 20px; padding: 16px 20px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px;">
            <p style="margin: 0 0 8px; font-size: 15px;"><strong>Số điện thoại khách hàng:</strong> <a href="tel:${safePhone}" style="color: #047857; font-size: 18px; font-weight: 800; text-decoration: none;">${safePhone}</a></p>
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>Lý do cần tư vấn:</strong> <span style="background: #0d9488; color: #ffffff; padding: 2px 10px; border-radius: 9999px; font-weight: 600; font-size: 12px;">${safeReason}</span></p>
            <p style="margin: 0; font-size: 14px;"><strong>Phòng quan tâm:</strong> ${escapeHtml(roomsInfo)}</p>
          </div>
          <div style="margin-bottom: 20px;">
            <p style="font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Mô tả thêm / Nhu cầu chi tiết:</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; font-size: 14px; color: #334155; white-space: pre-wrap;">${safeDesc}</div>
          </div>
          <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 14px;">
            <p style="margin: 0;">Thời gian tiếp nhận: ${nowStr}${consultation.ip ? ` • IP: ${consultation.ip}` : ''}</p>
          </div>
        </div>
      </div>
    `;

    await this.notifyTelegram(
      `🎧 <b>[YÊU CẦU TƯ VẤN - NHACUALAND]</b>\n` +
      `📞 Khách hàng: <b>${safePhone}</b>\n` +
      `❓ Lý do: <b>${safeReason}</b>\n` +
      `🏠 Phòng quan tâm: ${roomsInfo}\n` +
      `📝 Mô tả: <i>${safeDesc.slice(0, 300)}</i>\n` +
      `⏰ Thời gian: ${nowStr}`
    );

    return this.sendEmail(adminEmail, subject, html, summary);
  }

  /**
   * (j) Thông báo cho Admin (Đức Quân): Khách hàng đặt lịch xem phòng trực tiếp
   */
  async sendViewingAppointmentToAdmin(appointment: {
    fullName: string;
    phone: string;
    email?: string;
    listingTitle?: string;
    listingId?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    note?: string;
    ip?: string;
  }) {
    const adminEmail = this.config?.get<string>('ADMIN_NOTIFICATION_EMAIL') ?? process.env.ADMIN_NOTIFICATION_EMAIL ?? 'ducquan16102006@gmail.com';
    const safeName = escapeHtml(appointment.fullName);
    const safePhone = escapeHtml(appointment.phone);
    const safeEmail = escapeHtml(appointment.email || 'Không cung cấp');
    const safeTitle = escapeHtml(appointment.listingTitle || `Tin #${appointment.listingId || 'Chưa rõ'}`);
    const safeDate = escapeHtml(appointment.appointmentDate || 'Chưa chọn ngày cụ thể');
    const safeTime = escapeHtml(appointment.appointmentTime || 'Linh hoạt trong ngày');
    const safeNote = escapeHtml(appointment.note || 'Không có ghi chú thêm');
    const nowStr = new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());

    const subject = `[NHACUALAND - ĐẶT LỊCH XEM PHÒNG] ${safeName} (${safePhone}) đặt lịch xem ${safeTitle}`;
    const summary = `Khách hàng ${safeName} (SĐT: ${safePhone}, Email: ${safeEmail}) vừa đặt lịch xem phòng "${safeTitle}" vào ngày ${safeDate} (${safeTime}). Ghi chú: ${appointment.note || 'Không có'}. Thời gian tiếp nhận: ${nowStr}.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0d9488, #0f766e); padding: 24px 28px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700;">🏠 Yêu Cầu Đặt Lịch Xem Phòng Mới</h2>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Website NHACUALAND — Khách hàng quan tâm phòng trọ / căn hộ</p>
        </div>
        <div style="padding: 24px 28px; background: #ffffff;">
          <div style="margin-bottom: 20px; padding: 16px 20px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px;">
            <p style="margin: 0 0 8px; font-size: 15px;"><strong>Phòng muốn xem:</strong> <span style="color: #0f766e; font-weight: 700;">${safeTitle}</span></p>
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>Khách hàng:</strong> <strong>${safeName}</strong></p>
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>Số điện thoại:</strong> <a href="tel:${safePhone}" style="color: #0d9488; font-weight: 800; font-size: 16px; text-decoration: none;">${safePhone}</a></p>
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>Email khách:</strong> ${safeEmail}</p>
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>Ngày mong muốn xem:</strong> <span style="background: #0d9488; color: #ffffff; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 12.5px;">${safeDate}</span></p>
            <p style="margin: 0; font-size: 14px;"><strong>Khung giờ:</strong> <strong>${safeTime}</strong></p>
          </div>
          <div style="margin-bottom: 20px;">
            <p style="font-size: 13px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Ghi chú hoặc yêu cầu thêm của khách:</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; font-size: 14px; color: #334155; white-space: pre-wrap;">${safeNote}</div>
          </div>
          <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 14px;">
            <p style="margin: 0;">Thời gian tiếp nhận: ${nowStr}${appointment.ip ? ` • IP: ${appointment.ip}` : ''}</p>
          </div>
        </div>
      </div>
    `;

    const tgPromise = this.notifyTelegram(
      `🏠 <b>[ĐẶT LỊCH XEM PHÒNG - NHACUALAND]</b>\n` +
      `👤 Khách hàng: <b>${safeName}</b> (<a href="tel:${safePhone}">${safePhone}</a>)\n` +
      `📧 Email: ${safeEmail}\n` +
      `🏢 Phòng: <b>${safeTitle}</b>\n` +
      `📅 Ngày xem: ${safeDate} (${safeTime})\n` +
      `📝 Ghi chú: <i>${safeNote.slice(0, 300)}</i>\n` +
      `⏰ Tiếp nhận: ${nowStr}`
    ).catch(() => {});

    const mailPromise = this.sendEmail(adminEmail, subject, html, summary);

    const [, mailRes] = await Promise.all([tgPromise, mailPromise]);
    return mailRes;
  }

  /**
   * (k) Thông báo cho Khách hàng: Xác nhận đã đặt lịch xem phòng thành công trên NHACUALAND
   */
  async sendViewingAppointmentConfirmationToCustomer(appointment: {
    fullName: string;
    phone: string;
    email: string;
    listingTitle?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    note?: string;
  }) {
    if (!isValidEmail(appointment.email)) {
      this.logger.warn(`[EmailService] Bỏ qua gửi email xác nhận đặt lịch cho khách vì email không hợp lệ: "${appointment.email}"`);
      return false;
    }

    const safeName = escapeHtml(appointment.fullName);
    const safePhone = escapeHtml(appointment.phone);
    const safeTitle = escapeHtml(appointment.listingTitle || 'Phòng cho thuê');
    const safeDate = escapeHtml(appointment.appointmentDate || 'Theo thỏa thuận');
    const safeTime = escapeHtml(appointment.appointmentTime || 'Linh hoạt');
    const safeNote = escapeHtml(appointment.note || 'Không có');

    const subject = `[NHACUALAND] Xác nhận đặt lịch xem phòng thành công: ${safeTitle}`;
    const summary = `Chào ${appointment.fullName}, yêu cầu đặt lịch xem phòng "${appointment.listingTitle || ''}" của bạn đã được tiếp nhận thành công. Nhân viên phụ trách Đức Quân (0981 753 082) sẽ sớm liên hệ xác nhận và trực tiếp dẫn bạn xem phòng thực tế`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 620px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <div style="background: linear-gradient(135deg, #0d9488, #0f766e); padding: 26px 30px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 21px; font-weight: 700;">Xác Nhận Đặt Lịch Xem Phòng Thành Công</h2>
          <p style="margin: 6px 0 0; font-size: 13.5px; opacity: 0.95;">Cảm ơn bạn đã tin tưởng dịch vụ kết nối thuê phòng tại NHACUALAND</p>
        </div>
        <div style="padding: 26px 30px; background: #ffffff;">
          <p style="font-size: 15px; margin-top: 0;">Chào bạn <strong>${safeName}</strong>,</p>
          <p style="font-size: 14px; color: #475569;">Yêu cầu đặt lịch xem phòng của bạn trên hệ thống <strong>NHACUALAND</strong> đã được tiếp nhận thành công với các thông tin chi tiết như sau:</p>
          
          <div style="margin: 20px 0; padding: 18px 20px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px;">
            <p style="margin: 0 0 10px; font-size: 15px;"><strong>Phòng đăng ký xem:</strong> <span style="color: #0f766e; font-weight: 700;">${safeTitle}</span></p>
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>Ngày mong muốn xem:</strong> <span style="background: #0d9488; color: #ffffff; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 12.5px;">${safeDate}</span></p>
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>Khung giờ thuận tiện:</strong> <strong>${safeTime}</strong></p>
            <p style="margin: 0 0 8px; font-size: 14px;"><strong>Số điện thoại của bạn:</strong> <strong>${safePhone}</strong></p>
            ${appointment.note ? `<p style="margin: 0; font-size: 13.5px; color: #475569;"><strong>Ghi chú:</strong> ${safeNote}</p>` : ''}
          </div>

          <div style="margin: 22px 0; padding: 16px 20px; background: #f8fafc; border-left: 4px solid #0d9488; border-radius: 8px;">
            <h3 style="margin: 0 0 6px; font-size: 14.5px; font-weight: 700; color: #0f766e;">Người tư vấn và trực tiếp dẫn bạn xem phòng:</h3>
            <p style="margin: 0 0 4px; font-size: 14px;"><strong>Nhân viên phụ trách:</strong> Đức Quân</p>
            <p style="margin: 0; font-size: 14px;"><strong>Số điện thoại:</strong> <a href="tel:0981753082" style="color: #0d9488; font-weight: 700; text-decoration: none;">0981 753 082</a></p>
          </div>

          <p style="font-size: 13.5px; color: #64748b; margin-bottom: 0;">
            Đức Quân sẽ liên hệ lại với bạn qua số điện thoại <strong>${safePhone}</strong> trước giờ hẹn để xác nhận điểm hẹn và trực tiếp đón bạn đi xem phòng thực tế.
          </p>

          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0 16px;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
            NHACUALAND — Nền tảng kết nối tìm phòng trọ, studio & căn hộ minh bạch chi phí<br/>
            Hotline: 0981 753 082 • Email: contact@nhacualand.com • Hà Nội
          </p>
        </div>
      </div>
    `;

    return this.sendEmail(appointment.email, subject, html, summary);
  }
}
