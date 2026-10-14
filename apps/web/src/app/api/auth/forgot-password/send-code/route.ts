import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetCodeServer } from '@/lib/password-reset-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập địa chỉ email của bạn' },
        { status: 400 }
      );
    }

    const res = await sendPasswordResetCodeServer(email);
    if (!res.success) {
      return NextResponse.json(
        { success: false, message: res.message },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: res.message,
      // Gửi kèm mã trong môi trường dev / local để hỗ trợ trải nghiệm tức thì nếu chưa mở Gmail
      previewCode: res.code,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi gửi mã khôi phục mật khẩu' },
      { status: 500 }
    );
  }
}
