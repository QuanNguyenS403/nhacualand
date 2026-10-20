import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rating, content, name, email } = body;

    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      return NextResponse.json(
        { message: 'Nội dung chi tiết phải có tối thiểu 10 ký tự' },
        { status: 400 },
      );
    }

    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    const clientIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '';

    try {
      const apiRes = await fetch(`${apiUrl}/leads/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': clientIp,
        },
        body: JSON.stringify({
          rating: rating ? Number(rating) : undefined,
          content: content.trim(),
          name: name ? String(name).trim() : undefined,
          email: email ? String(email).trim() : undefined,
        }),
      });

      const data = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        return NextResponse.json(
          { message: data.message || 'Có lỗi xảy ra khi gửi phản hồi, vui lòng thử lại sau' },
          { status: apiRes.status },
        );
      }

      return NextResponse.json(data);
    } catch (fetchErr) {
      console.error('[Feedback API Route] Không thể kết nối tới backend API:', fetchErr);
      return NextResponse.json(
        { message: 'Hệ thống tiếp nhận phản hồi đang bận, vui lòng thử lại sau' },
        { status: 503 },
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || 'Lỗi xử lý yêu cầu phản hồi' },
      { status: 500 },
    );
  }
}
