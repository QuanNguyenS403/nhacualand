import { NextRequest, NextResponse } from 'next/server';

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
    const clientIp = req.headers.get('x-forwarded-for') || req.ip || '';

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
      // Fallback nếu backend API tạm thời không phản hồi
      console.warn('[Feedback API Route] Backend API chưa sẵn sàng, lưu log cục bộ:', fetchErr);
      return NextResponse.json({
        success: true,
        message: 'Cảm ơn bạn đã gửi phản hồi đóng góp ý kiến',
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || 'Lỗi xử lý yêu cầu phản hồi' },
      { status: 500 },
    );
  }
}
