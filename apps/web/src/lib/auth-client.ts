/**
 * auth-client.ts — fetch có gắn sẵn Bearer accessToken, tự động thử làm mới token khi hết hạn.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL !== undefined
  ? process.env.NEXT_PUBLIC_API_URL
  : (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken') || localStorage.getItem('access_token');
}

export function getRefreshToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
}

export function setTokens(accessToken: string, refreshToken: string, user?: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.removeItem('access_token');
  if (user) {
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch {}
  }
  window.dispatchEvent(new Event('storage'));
}

export function setCurrentUser(user: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch {}
  window.dispatchEvent(new Event('storage'));
}

export function getCurrentUser(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Giải mã Google ID token JWT an toàn phía client (hỗ trợ đầy đủ tiếng Việt UTF-8) */
export function parseGoogleJwt(token: string): {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('storage'));
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

/** Gọi /auth/refresh bằng refreshToken hiện có. Trả về accessToken mới, hoặc null nếu thất bại. */
async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

/**
 * fetch có Bearer token, tự retry 1 lần sau khi refresh nếu gặp 401.
 * Dùng thay cho fetch() thủ công ở MỌI nơi cần gọi API đã đăng nhập từ Client Component.
 */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = (token: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await doFetch(getAccessToken());

  if (res.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      res = await doFetch(newToken);
    } else {
      clearTokens();
    }
  }

  return res;
}
