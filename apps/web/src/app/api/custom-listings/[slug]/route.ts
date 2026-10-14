import { NextRequest, NextResponse } from 'next/server';
import { getCustomListingBySlugServer } from '@/lib/custom-listings-server';

interface Params {
  params: { slug: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const listing = getCustomListingBySlugServer(params.slug);
    if (!listing) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy phòng cho thuê' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, listing });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Lỗi máy chủ khi lấy thông tin phòng' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, message: 'Cổng xóa dữ liệu file tạm thời đã ngừng hoạt động' },
    { status: 410 }
  );
}
