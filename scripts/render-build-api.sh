#!/usr/bin/env bash
set -e

# Tắt xác thực chữ ký corepack phòng trường hợp corepack được gọi ngầm
export COREPACK_INTEGRITY_KEYS=0

echo "=== [Render API] Cài đặt pnpm toàn cục bằng npm ==="
npm install -g pnpm@9.15.9

echo "=== [Render API] Cài đặt dependencies monorepo ==="
pnpm install --frozen-lockfile

echo "=== [Render API] Prisma generate Client ==="
pnpm db:generate

echo "=== [Render API] Chạy Migration Database ==="
if [ -n "$DATABASE_URL" ]; then
  pnpm db:migrate:deploy || echo "Migration deploy đã cập nhật hoặc bỏ qua"
fi

echo "=== [Render API] Build NestJS Backend ==="
pnpm --filter @batdongsan/api build

echo "=== [Render API] Build hoàn tất thành công ==="
