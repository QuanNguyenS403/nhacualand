#!/usr/bin/env bash
set -e

echo "=== [Render Web] Kích hoạt pnpm ==="
corepack enable
corepack prepare pnpm@9.15.9 --activate

echo "=== [Render Web] Cài đặt dependencies monorepo ==="
pnpm install --frozen-lockfile

echo "=== [Render Web] Build Next.js Frontend ==="
pnpm --filter @batdongsan/web build

echo "=== [Render Web] Build hoàn tất thành công ==="
