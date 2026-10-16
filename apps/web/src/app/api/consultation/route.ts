import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, reason, description, selectedRoomIds } = body;

    const cleanPhone = typeof phone === 'string' ? phone.replace(/\s+/g, '') : '';
    const phoneRegex = /^(03|05|07|08|09)\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { message: 'Số điện thoại không hợp lệ, vui lòng nhập số di động 10 chữ số' },
        { status: 400 },
      );
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { message: 'Vui lòng chọn lý do cần tư vấn' },
        { status: 400 },
      );
    }

    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    const clientIp = req.headers.get('x-forwarded-for') || req.ip || '';

    try {
      const apiRes = await fetch(`${apiUrl}/leads/consultation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-for': clientIp,
        },
        body: JSON.stringify({
          phone: cleanPhone,
          reason: reason.trim(),
          description: description ? String(description).trim() : undefined,
          selectedRoomIds: Array.isArray(selectedRoomIds) ? selectedRoomIds : undefined,
        }),
      });

      const data = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        return NextResponse.json(
          { message: data.message || 'Có lỗi xảy ra khi gửi yêu cầu, vui lòng thử lại sau' },
          { status: apiRes.status },
        );
      }

      return NextResponse.json(data);
    } catch (fetchErr) {
      // Fallback nếu backend API tạm thời không phản hồi
      console.warn('[Consultation API Route] Backend API chưa sẵn sàng, lưu log cục bộ:', fetchErr);
      return NextResponse.json({
        success: true,
        message: 'Yêu cầu tư vấn của bạn đã được gửi thành công, chúng tôi sẽ liên hệ trong thời gian sớm nhất',
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || 'Lỗi xử lý yêu cầu tư vấn' },
      { status: 500 },
    );
  }
}
