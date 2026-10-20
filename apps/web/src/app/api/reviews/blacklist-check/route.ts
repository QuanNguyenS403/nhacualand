import { NextRequest, NextResponse } from 'next/server';
import { checkBlacklist } from '@/lib/reviews-data';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const keyword = searchParams.get('keyword') || searchParams.get('q') || '';

    if (!keyword.trim()) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập số điện thoại hoặc địa chỉ cần kiểm tra' },
        { status: 400 }
      );
    }

    const result = checkBlacklist(keyword);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Lỗi API /api/reviews/blacklist-check:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi kiểm tra hệ thống' },
      { status: 500 }
    );
  }
}
