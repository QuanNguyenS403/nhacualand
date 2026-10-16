#!/usr/bin/env bash
set -e

echo "=== [Render Unified Build] Kích hoạt pnpm ==="
corepack enable
corepack prepare pnpm@9.15.9 --activate

echo "=== [Render Unified Build] Cài đặt dependencies toàn monorepo ==="
pnpm install --frozen-lockfile

echo "=== [Render Unified Build] Sinh Prisma Database Client ==="
pnpm db:generate

echo "=== [Render Unified Build] Áp dụng Database Migrations ==="
if [ -n "$DATABASE_URL" ]; then
  pnpm db:migrate:deploy || echo "Database migration đã cập nhật hoặc bỏ qua."
fi

echo "=== [Render Unified Build] Build đồng thời cả Backend API và Frontend Web ==="
pnpm build

echo "=== [Render Unified Build] Build thành công toàn bộ hệ thống ==="
