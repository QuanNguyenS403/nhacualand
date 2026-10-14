import { NextRequest, NextResponse } from 'next/server';
import {
  getCustomListingsServer,
  getCustomListingsByOwnerServer,
  getPublicCustomListingsServer,
} from '@/lib/custom-listings-server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('ownerId');
    const ownerEmail = searchParams.get('ownerEmail');
    const scope = searchParams.get('scope');

    let items;
    if (ownerId || ownerEmail) {
      items = getCustomListingsByOwnerServer(ownerId || undefined, ownerEmail || undefined);
    } else if (scope === 'all') {
      items = getCustomListingsServer();
    } else {
      items = getPublicCustomListingsServer();
    }

    return NextResponse.json({ success: true, items });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Không thể tải danh sách tin tự đăng' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'Cổng ghi dữ liệu file tạm thời đã ngừng hoạt động, vui lòng đăng tin qua API chính thức' },
    { status: 410 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, message: 'Cổng cập nhật dữ liệu file tạm thời đã ngừng hoạt động' },
    { status: 410 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, message: 'Cổng xóa dữ liệu file tạm thời đã ngừng hoạt động' },
    { status: 410 }
  );
}
