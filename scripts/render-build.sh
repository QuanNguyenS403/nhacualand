#!/usr/bin/env bash
set -e

# Tắt xác thực chữ ký corepack phòng trường hợp corepack được gọi ngầm
export COREPACK_INTEGRITY_KEYS=0

echo "=== [Render Unified Build] Cài đặt pnpm toàn cục bằng npm ==="
npm install -g pnpm@9.15.9

# Tạm thời để NODE_ENV không phải production trong lúc cài đặt để pnpm luôn cài đủ devDependencies (prisma, turbo, tsc)
ORIGINAL_NODE_ENV="${NODE_ENV:-production}"
export NODE_ENV=development

echo "=== [Render Unified Build] Cài đặt dependencies toàn monorepo ==="
pnpm install --prod=false

export NODE_ENV="$ORIGINAL_NODE_ENV"

echo "=== [Render Unified Build] Sinh Prisma Database Client ==="
pnpm db:generate

echo "=== [Render Unified Build] Áp dụng Database Migrations ==="
if [ -n "$DATABASE_URL" ]; then
  pnpm db:migrate:deploy || echo "Database migration đã cập nhật hoặc bỏ qua"
fi

echo "=== [Render Unified Build] Build tuần tự từng package (Tránh nghẽn tài nguyên trên Render) ==="
echo "1. Build Shared Package..."
pnpm --filter @qns/shared build

echo "2. Build Backend API (NestJS)..."
pnpm --filter @batdongsan/api build

echo "3. Build Frontend Web (Next.js)..."
NODE_OPTIONS="--max-old-space-size=2048" pnpm --filter @batdongsan/web build

echo "=== [Render Unified Build] Build thành công toàn bộ hệ thống ==="
