import fs from 'fs';
import path from 'path';

export interface StoredUser {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  role: 'user' | 'admin';
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// Tìm đường dẫn tệp users.json chính xác dù ứng dụng chạy từ root hay apps/web
function getUsersFilePaths(): string[] {
  const paths: string[] = [];
  const cwd = process.cwd();

  // 1. Thư mục data trực tiếp từ cwd (vd: apps/web/data/users.json khi chạy npm run dev trong apps/web)
  paths.push(path.join(cwd, 'data', 'users.json'));

  // 2. Thư mục apps/web/data từ root
  paths.push(path.join(cwd, 'apps', 'web', 'data', 'users.json'));

  // 3. Thư mục data ở gốc repo
  if (cwd.includes('apps') && (cwd.endsWith('apps/web') || cwd.endsWith('apps\\web'))) {
    paths.push(path.join(cwd, '..', '..', 'data', 'users.json'));
  }

  return Array.from(new Set(paths));
}

function ensureUsersFile() {
  const filePaths = getUsersFilePaths();
  for (const filePath of filePaths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(filePath)) {
        const defaultUsers: StoredUser[] = [
          {
            id: '1',
            email: 'admin@qns.com',
            password: 'Quannguyenkay6@',
            fullName: 'Chủ sàn QNS',
            phone: '0981 753 082',
            role: 'admin',
            avatarUrl: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-10-11T11:00:00.000Z',
          },
          {
            id: 'admin-ducquan',
            email: 'ducquan16102006@gmail.com',
            password: 'Quannguyenkay6@',
            fullName: 'Đức Quân (Quản trị viên)',
            phone: '0981 753 082',
            role: 'admin',
            avatarUrl: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-10-11T11:00:00.000Z',
          },
          {
            id: 'usr_vuphuonglinh23102006',
            email: 'vuphuonglinh23102006@gmail.com',
            password: 'vuphuonglinh23102006',
            fullName: 'Vũ Phương Linh',
            phone: '0981 753 082',
            role: 'user',
            avatarUrl: null,
            createdAt: '2026-10-11T10:00:00.000Z',
            updatedAt: '2026-10-11T11:00:00.000Z',
          },
        ];
        fs.writeFileSync(filePath, JSON.stringify(defaultUsers, null, 2), 'utf-8');
      }
    } catch (err) {
      console.warn(`Lỗi khởi tạo users file tại ${filePath}:`, err);
    }
  }
}

/** Đọc danh sách toàn bộ tài khoản khách hàng trên máy chủ */
export function getUsersServer(): StoredUser[] {
  ensureUsersFile();
  const filePaths = getUsersFilePaths();

  for (const filePath of filePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`Lỗi đọc users file tại ${filePath}:`, err);
    }
  }

  return [];
}

/** Lưu danh sách tài khoản đồng bộ vào tất cả các tệp lưu trữ trên máy chủ */
function writeUsersToDisk(users: StoredUser[]) {
  const filePaths = getUsersFilePaths();
  for (const filePath of filePaths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf-8');
    } catch (err) {
      console.warn(`Lỗi ghi users file tại ${filePath}:`, err);
    }
  }
}

/** Tìm kiếm tài khoản theo email (chuẩn hóa chữ thường) */
export function findUserByEmailServer(email: string): StoredUser | null {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  const users = getUsersServer();
  return users.find((u) => u.email.trim().toLowerCase() === cleanEmail) || null;
}

/** Tìm kiếm tài khoản theo mã ID */
export function findUserByIdServer(id: string): StoredUser | null {
  if (!id) return null;
  const cleanId = String(id).trim();
  const users = getUsersServer();
  return users.find((u) => String(u.id).trim() === cleanId) || null;
}

/** Lưu hoặc cập nhật tài khoản khách hàng bền vững trên máy chủ */
export function saveUserServer(userData: {
  id?: string;
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  role?: 'user' | 'admin';
  avatarUrl?: string | null;
}): StoredUser {
  const users = getUsersServer();
  const cleanEmail = userData.email.trim().toLowerCase();
  const existingIdx = users.findIndex((u) => u.email.trim().toLowerCase() === cleanEmail);

  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const existing = users[existingIdx];
    const updated: StoredUser = {
      ...existing,
      fullName: userData.fullName || existing.fullName,
      phone: userData.phone || existing.phone,
      avatarUrl: userData.avatarUrl !== undefined ? userData.avatarUrl : existing.avatarUrl,
      updatedAt: now,
    };
    if (userData.password) {
      updated.password = userData.password;
    }
    if (userData.role) {
      updated.role = userData.role;
    }
    users[existingIdx] = updated;
    writeUsersToDisk(users);
    return updated;
  }

  const newUser: StoredUser = {
    id: userData.id || `usr_${Date.now()}`,
    email: cleanEmail,
    password: userData.password,
    fullName: userData.fullName.trim() || cleanEmail.split('@')[0],
    phone: userData.phone || '0981 753 082',
    role: userData.role || 'user',
    avatarUrl: userData.avatarUrl || null,
    createdAt: now,
    updatedAt: now,
  };

  users.push(newUser);
  writeUsersToDisk(users);
  return newUser;
}

/** Xác thực đăng nhập chính xác theo email và mật khẩu */
export function verifyUserPasswordServer(
  email: string,
  pass: string
): { success: boolean; user?: StoredUser; message?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = (pass || '').trim();

  const isAdmin =
    cleanEmail === 'admin@qns.com' ||
    cleanEmail === 'contact@qns.com' ||
    cleanEmail === 'ducquan16102006@gmail.com' ||
    cleanEmail === '0981753082';

  // 1. Kiểm tra tài khoản Quản trị viên
  if (isAdmin) {
    if (cleanPass !== 'Quannguyenkay6@') {
      return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
    }
    const adminUser: StoredUser = {
      id: '1',
      email: cleanEmail.includes('@') ? cleanEmail : 'admin@qns.com',
      fullName: 'Chủ sàn QNS',
      phone: '0981 753 082',
      role: 'admin',
      avatarUrl: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    return { success: true, user: adminUser };
  }

  // 2. Tra cứu tài khoản khách hàng trong cơ sở dữ liệu máy chủ
  const user = findUserByEmailServer(cleanEmail);
  if (!user) {
    return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
  }

  // 3. Kiểm tra mật khẩu khớp 100% với tài khoản đã đăng ký
  if (!user.password) {
    return {
      success: false,
      message: 'Tài khoản này được đăng nhập bằng Google, vui lòng chọn Tiếp tục với Google',
    };
  }

  if (user.password !== cleanPass) {
    return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
  }

  return { success: true, user };
}

/** Loại bỏ mật khẩu trước khi gửi thông tin tài khoản cho client */
export function sanitizeUser(user: StoredUser) {
  const { password, ...safe } = user;
  return safe;
}
