import { NextRequest, NextResponse } from 'next/server';
import { verifyUserPasswordServer, sanitizeUser } from '@/lib/users-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email || '';
    const password = body?.password || '';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập đầy đủ email và mật khẩu' },
        { status: 400 }
      );
    }

    const verifyResult = verifyUserPasswordServer(email, password);
    if (!verifyResult.success || !verifyResult.user) {
      return NextResponse.json(
        { success: false, message: verifyResult.message || 'Email hoặc mật khẩu không chính xác' },
        { status: 401 }
      );
    }

    const safeUser = sanitizeUser(verifyResult.user);
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
      { success: false, message: 'Lỗi máy chủ khi xác thực đăng nhập' },
      { status: 500 }
    );
  }
}
