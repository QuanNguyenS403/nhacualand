import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu đăng nhập để tải ảnh' },
        { status: 401 }
      );
    }

    const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000';
    try {
      const authRes = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: authHeader },
      });
      if (!authRes.ok) {
        return NextResponse.json(
          { success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' },
          { status: 401 }
        );
      }
    } catch (authErr) {
      console.error('[Upload Images API Route] Lỗi xác thực token:', authErr);
      return NextResponse.json(
        { success: false, message: 'Dịch vụ xác thực không khả dụng' },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng chọn ít nhất 1 ảnh để tải lên' },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, message: 'Dung lượng mỗi ảnh không được vượt quá 5MB' },
          { status: 400 }
        );
      }
      const mime = file.type || '';
      if (!ALLOWED_MIME_TYPES.includes(mime)) {
        return NextResponse.json(
          { success: false, message: 'Định dạng tệp không hợp lệ, chỉ chấp nhận JPG, PNG, WEBP' },
          { status: 400 }
        );
      }
    }

    // Chuyển tiếp FormData sang Backend API NestJS để lưu trữ tập trung (hoặc R2/S3)
    const uploadRes = await fetch(`${apiUrl}/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      return NextResponse.json(
        { success: false, message: uploadData.message || 'Không thể tải ảnh lên máy chủ lưu trữ' },
        { status: uploadRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      urls: uploadData.urls || uploadData.data || [],
    });
  } catch (error) {
    console.error('Lỗi khi tải ảnh lên máy chủ:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi tải ảnh lên' },
      { status: 500 }
    );
  }
}
