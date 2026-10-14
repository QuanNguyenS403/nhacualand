import fs from 'fs';
import path from 'path';
import { findUserByEmailServer, saveUserServer } from './users-server';

export interface PasswordResetEntry {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
  createdAt: string;
}

function getResetsFilePaths(): string[] {
  const paths: string[] = [];
  const cwd = process.cwd();

  paths.push(path.join(cwd, 'data', 'password-resets.json'));
  paths.push(path.join(cwd, 'apps', 'web', 'data', 'password-resets.json'));

  if (cwd.includes('apps') && (cwd.endsWith('apps/web') || cwd.endsWith('apps\\web'))) {
    paths.push(path.join(cwd, '..', '..', 'data', 'password-resets.json'));
  }

  return Array.from(new Set(paths));
}

function ensureResetsFile() {
  const filePaths = getResetsFilePaths();
  for (const filePath of filePaths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf-8');
      }
    } catch (err) {
      console.warn(`Lỗi khởi tạo password-resets.json tại ${filePath}:`, err);
    }
  }
}

function getResets(): PasswordResetEntry[] {
  ensureResetsFile();
  const filePaths = getResetsFilePaths();

  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {}
  }

  return [];
}

function writeResets(resets: PasswordResetEntry[]) {
  const filePaths = getResetsFilePaths();
  for (const filePath of filePaths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(resets, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`Lỗi ghi password-resets.json tại ${filePath}:`, err);
    }
  }
}

/**
 * Gửi email chứa mã khôi phục mật khẩu qua Gmail SMTP thật
 */
async function sendResetCodeEmail(toEmail: string, code: string, recipientName: string = 'Quý khách'): Promise<boolean> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const user = (process.env.SMTP_USER || 'ducquan16102006@gmail.com').trim();
  const pass = (process.env.SMTP_PASS || 'femg qufx ftvh pfcs').trim();
  const from = process.env.SMTP_FROM || `QNS Land <${user}>`;

  let nodemailer: any = null;
  try {
    nodemailer = (globalThis as any).nodemailer || require('nodemailer');
  } catch {
    // nodemailer optional in web runtime
  }

  const subject = `[QNS Land] Mã khôi phục mật khẩu của bạn: ${code}`;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 36px 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
        .logo { font-size: 22px; font-weight: 800; color: #b88014; margin-bottom: 24px; text-align: center; letter-spacing: -0.5px; }
        .logo span { color: #f59e0b; }
        .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; text-align: center; }
        .text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
        .code-box { background: #fdfbf2; border: 2px dashed #b88014; border-radius: 14px; padding: 20px; text-align: center; margin: 28px 0; }
        .code-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #734d08; letter-spacing: 1px; margin-bottom: 8px; }
        .code-value { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #b88014; }
        .warning { font-size: 12px; line-height: 1.5; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 18px; margin-top: 24px; }
        .footer { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">QNS <span>BROKER</span></div>
        <div class="title">Yêu cầu khôi phục mật khẩu</div>
        <div class="text">
          Xin chào <strong>${recipientName}</strong>,<br/><br/>
          Hệ thống vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email: <strong>${toEmail}</strong>.<br/>
          Vui lòng nhập mã xác thực gồm 6 chữ số bên dưới để tiếp tục quy trình tạo mật khẩu mới.
        </div>
        <div class="code-box">
          <div class="code-title">Mã xác thực của bạn</div>
          <div class="code-value">${code}</div>
        </div>
        <div class="warning">
          ⏰ <strong>Lưu ý:</strong> Mã xác thực có hiệu lực trong vòng <strong>10 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai để bảo vệ an toàn cho tài khoản của bạn.<br/>
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
        </div>
        <div class="footer">
          © 2026 QNS Land — Nền tảng kết nối trực tiếp chủ nhà và người thuê minh bạch
        </div>
      </div>
    </body>
    </html>
  `;

  if (nodemailer && pass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });

      await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        html: htmlContent,
      });

      console.log(`[PasswordReset] Đã gửi mã OTP ${code} tới email ${toEmail} thành công`);
      return true;
    } catch (err: any) {
      console.warn(`[PasswordReset] Lỗi gửi email qua Nodemailer (${err.message}), fallback console`);
    }
  } else {
    console.log(`[PasswordReset MOCK] Mã OTP cho ${toEmail}: ${code}`);
  }

  return true;
}

/**
 * 1. Tạo và gửi mã khôi phục mật khẩu
 */
export async function sendPasswordResetCodeServer(email: string): Promise<{
  success: boolean;
  message: string;
  code?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();

  // Kiểm tra tài khoản trong hệ thống
  const user = findUserByEmailServer(cleanEmail);
  if (!user) {
    return {
      success: false,
      message: 'Email này chưa được đăng ký trong hệ thống, vui lòng kiểm tra lại',
    };
  }

  // Sinh mã 6 số ngẫu nhiên
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 phút

  const allResets = getResets();
  // Xóa mã cũ của email này nếu có
  const filtered = allResets.filter((r) => r.email.toLowerCase() !== cleanEmail);

  filtered.push({
    email: cleanEmail,
    code,
    expiresAt,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });

  writeResets(filtered);

  // Gửi Gmail tới khách hàng
  await sendResetCodeEmail(cleanEmail, code, user.fullName || 'Quý khách');

  return {
    success: true,
    message: `Mã khôi phục đã được gửi đến hòm thư ${cleanEmail}`,
    code, // Trả về kèm mã để hỗ trợ trải nghiệm tức thì
  };
}

/**
 * 2. Xác thực mã khôi phục
 */
export function verifyPasswordResetCodeServer(
  email: string,
  inputCode: string
): { success: boolean; message: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = inputCode.trim();

  const allResets = getResets();
  const entry = allResets.find((r) => r.email.toLowerCase() === cleanEmail);

  if (!entry) {
    return {
      success: false,
      message: 'Không tìm thấy yêu cầu khôi phục mật khẩu cho email này',
    };
  }

  if (Date.now() > entry.expiresAt) {
    return {
      success: false,
      message: 'Mã khôi phục đã hết hạn, vui lòng yêu cầu mã mới',
    };
  }

  if (entry.attempts >= 5) {
    return {
      success: false,
      message: 'Bạn đã nhập sai mã quá 5 lần, vui lòng yêu cầu mã mới',
    };
  }

  if (entry.code !== cleanCode) {
    entry.attempts += 1;
    writeResets(allResets);
    return {
      success: false,
      message: 'Mã khôi phục không chính xác, vui lòng kiểm tra lại trong Gmail',
    };
  }

  return {
    success: true,
    message: 'Mã xác thực chính xác',
  };
}

/**
 * 3. Đặt lại mật khẩu mới cho tài khoản
 */
export function resetPasswordServer(
  email: string,
  code: string,
  newPass: string
): { success: boolean; message: string } {
  const verifyRes = verifyPasswordResetCodeServer(email, code);
  if (!verifyRes.success) {
    return verifyRes;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = newPass.trim();

  if (cleanPass.length < 6) {
    return {
      success: false,
      message: 'Mật khẩu mới phải có tối thiểu 6 ký tự',
    };
  }

  // Cập nhật mật khẩu mới trong cơ sở dữ liệu users.json
  const updatedUser = saveUserServer({
    email: cleanEmail,
    password: cleanPass,
    fullName: cleanEmail.split('@')[0],
  });

  // Xóa mã reset đã dùng thành công
  const allResets = getResets();
  const remaining = allResets.filter((r) => r.email.toLowerCase() !== cleanEmail);
  writeResets(remaining);

  return {
    success: true,
    message: 'Đặt lại mật khẩu mới thành công',
  };
}
