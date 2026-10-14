import { NextRequest, NextResponse } from 'next/server';
import {
  getUsersServer,
  saveUserServer,
  sanitizeUser,
} from '@/lib/users-server';

export async function GET() {
  try {
    const users = getUsersServer();
    const safeUsers = users.map((u) => sanitizeUser(u));
    return NextResponse.json({ success: true, users: safeUsers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi tải danh sách tài khoản' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clientUsers = Array.isArray(body?.users) ? body.users : [];

    for (const u of clientUsers) {
      if (u?.email) {
        saveUserServer({
          id: u.id,
          email: u.email,
          password: u.password,
          fullName: u.fullName || u.email.split('@')[0],
          phone: u.phone,
          role: u.role || 'user',
          avatarUrl: u.avatarUrl,
        });
      }
    }

    const updated = getUsersServer().map((u) => sanitizeUser(u));
    return NextResponse.json({ success: true, users: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Lỗi đồng bộ danh sách tài khoản' },
      { status: 500 }
    );
  }
}
