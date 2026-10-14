import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordResetCodeServer } from '@/lib/password-reset-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || '').trim().toLowerCase();
    const code = (body?.code || '').trim();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập đầy đủ email và mã khôi phục' },
        { status: 400 }
      );
    }

    const res = verifyPasswordResetCodeServer(email, code);
    if (!res.success) {
      return NextResponse.json(
        { success: false, message: res.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: res.message,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi xác thực mã khôi phục' },
      { status: 500 }
    );
  }
}
