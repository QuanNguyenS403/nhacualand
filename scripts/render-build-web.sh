#!/usr/bin/env bash
set -e

# Tắt xác thực chữ ký corepack phòng trường hợp corepack được gọi ngầm
export COREPACK_INTEGRITY_KEYS=0

echo "=== [Render Web] Cài đặt pnpm toàn cục bằng npm ==="
npm install -g pnpm@9.15.9

echo "=== [Render Web] Cài đặt dependencies monorepo ==="
pnpm install --frozen-lockfile

echo "=== [Render Web] Build Next.js Frontend ==="
pnpm --filter @batdongsan/web build

echo "=== [Render Web] Build hoàn tất thành công ==="
