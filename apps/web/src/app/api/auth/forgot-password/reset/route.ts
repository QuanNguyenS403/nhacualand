import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordServer } from '@/lib/password-reset-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || '').trim().toLowerCase();
    const code = (body?.code || '').trim();
    const newPassword = (body?.newPassword || '').trim();

    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp đầy đủ thông tin đặt lại mật khẩu' },
        { status: 400 }
      );
    }

    const res = resetPasswordServer(email, code, newPassword);
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
      { success: false, message: 'Lỗi máy chủ khi đặt lại mật khẩu' },
      { status: 500 }
    );
  }
}
