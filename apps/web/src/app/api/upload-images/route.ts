import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

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
    } catch {
      // Nếu API backend không phản hồi thì từ chối vì không thể xác thực
      return NextResponse.json(
        { success: false, message: 'Hệ thống xác thực tạm thời không khả dụng' },
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

    const batchId = `post-${Date.now()}`;
    const uploadDir = path.join(process.cwd(), 'public', 'user-uploads', 'listings', batchId);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const savedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || typeof file.arrayBuffer !== 'function') continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const rawExt = path.extname(file.name || '').toLowerCase();
      const ext = ['.jpg', '.jpeg', '.png', '.webp'].includes(rawExt) ? rawExt : '.jpg';
      const fileName = `img-${i + 1}-${Date.now().toString(36)}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      fs.writeFileSync(filePath, buffer);
      savedUrls.push(`/user-uploads/listings/${batchId}/${fileName}`);
    }

    return NextResponse.json({
      success: true,
      urls: savedUrls,
    });
  } catch (error) {
    console.error('Lỗi khi tải ảnh lên máy chủ:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi tải ảnh lên' },
      { status: 500 }
    );
  }
}
