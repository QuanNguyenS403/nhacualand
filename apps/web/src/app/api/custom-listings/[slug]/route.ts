import { NextResponse } from 'next/server';

function goneResponse() {
  return NextResponse.json(
    {
      statusCode: 410,
      error: 'Gone',
      message: 'Tuyến API lưu trữ tin đăng cục bộ cũ đã bị vô hiệu hóa vĩnh viễn, vui lòng sử dụng API chính thức tại /listings',
    },
    { status: 410 },
  );
}

export async function GET() {
  return goneResponse();
}

export async function POST() {
  return goneResponse();
}

export async function PUT() {
  return goneResponse();
}

export async function PATCH() {
  return goneResponse();
}

export async function DELETE() {
  return goneResponse();
}
