#!/usr/bin/env bash
set -e

echo "=== [Render API] Kích hoạt pnpm ==="
corepack enable
corepack prepare pnpm@9.15.9 --activate

echo "=== [Render API] Cài đặt dependencies monorepo ==="
pnpm install --frozen-lockfile

echo "=== [Render API] Prisma generate Client ==="
pnpm db:generate

echo "=== [Render API] Chạy Migration Database ==="
if [ -n "$DATABASE_URL" ]; then
  pnpm db:migrate:deploy || echo "Migration deploy đã cập nhật hoặc bỏ qua."
fi

echo "=== [Render API] Build NestJS Backend ==="
pnpm --filter @batdongsan/api build

echo "=== [Render API] Build hoàn tất thành công ==="
