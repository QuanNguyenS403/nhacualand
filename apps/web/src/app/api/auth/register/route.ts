import { NextRequest, NextResponse } from 'next/server';
import {
  findUserByEmailServer,
  saveUserServer,
  sanitizeUser,
} from '@/lib/users-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || '').trim().toLowerCase();
    const password = (body?.password || '').trim();
    const fullName = (body?.fullName || '').trim() || email.split('@')[0];
    const phone = (body?.phone || '').trim() || '0981 753 082';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền đầy đủ email và mật khẩu' },
        { status: 400 }
      );
    }

    const existing = findUserByEmailServer(email);
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Email này đã được đăng ký, vui lòng đăng nhập' },
        { status: 409 }
      );
    }

    const saved = saveUserServer({
      email,
      password,
      fullName,
      phone,
      role: 'user',
    });

    const safeUser = sanitizeUser(saved);
    const timestamp = Date.now();
    const accessToken = `qns_token_${safeUser.id}_${timestamp}`;
    const refreshToken = `qns_refresh_${safeUser.id}_${timestamp}`;

    return NextResponse.json({
      success: true,
      accessToken,
      refreshToken,
      user: safeUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi tạo tài khoản' },
      { status: 500 }
    );
  }
}
