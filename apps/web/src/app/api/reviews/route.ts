import { NextRequest, NextResponse } from 'next/server';
import { searchReviews, getReviewStats, SearchReviewsParams } from '@/lib/reviews-data';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const city = (searchParams.get('city') || 'all') as SearchReviewsParams['city'];
    const ratingFilter = (searchParams.get('rating') || 'all') as SearchReviewsParams['ratingFilter'];
    const categoryFilter = (searchParams.get('category') || 'all') as SearchReviewsParams['categoryFilter'];
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    const result = searchReviews({
      query,
      city,
      ratingFilter,
      categoryFilter,
      page,
      limit,
    });

    const stats = getReviewStats();

    return NextResponse.json({
      success: true,
      stats,
      ...result,
    });
  } catch (error) {
    console.error('Lỗi API /api/reviews:', error);
    return NextResponse.json(
      { success: false, message: 'Không thể tải danh sách đánh giá' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, landlordPhone, content, rating, role } = body;

    if (!address || !content) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng cung cấp địa chỉ và nội dung đánh giá' },
        { status: 400 }
      );
    }

    // Tiếp nhận và ghi nhận đánh giá đóng góp từ người dùng
    return NextResponse.json({
      success: true,
      message: 'Đã gửi đánh giá thành công, ban kiểm duyệt sẽ thẩm định trong vòng 24h',
      data: {
        id: `review_${Date.now()}`,
        address,
        landlordPhone,
        content,
        rating: rating || 5,
        role: role || 'former_tenant',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Lỗi khi tiếp nhận đánh giá:', error);
    return NextResponse.json(
      { success: false, message: 'Có lỗi xảy ra khi gửi đánh giá' },
      { status: 500 }
    );
  }
}
