#!/usr/bin/env bash
set -e

# =============================================================================
# SCRIPT CÀI ĐẶT CLOUDFLARE TUNNEL SYSTEMD SERVICE TRÊN LINUX SERVER (UBUNTU/DEBIAN)
# Dự án: NHACUALAND (nhacualand.com & api.nhacualand.com)
# =============================================================================

echo "======================================================================="
echo "  CÀI ĐẶT CLOUDFLARE TUNNEL SERVICE TRÊN LINUX SERVER (24/7)"
echo "======================================================================="
echo ""

# 1. Kiểm tra quyền root / sudo
if [ "$EUID" -ne 0 ]; then
  echo "❌ Vui lòng chạy script với quyền root hoặc sudo: sudo bash scripts/setup-cloudflare-tunnel-linux.sh"
  exit 1
fi

# Tunnel ID: 60c935e3-03d3-411f-b703-c3eb5c172399
DEFAULT_TOKEN="eyJhIjoiNzU3MDcwMTE0ZWM1NTA3MTY2OWJhNmM5OWUxOTk2ZGQiLCJ0IjoiNjBjOTM1ZTMtMDNkMy00MTFmLWI3MDMtYzNlYjVjMTcyMzk5IiwicyI6Ill6YzBZVEl4WmpVdE9ESmhOeTAwTlRFd0xUbGxaRE10WWpWaU5XSTVORFk1WXpOak0yWXlPR1ZtTmpFdE56Qm1NQzAwTlRabExXSmpObU10WmpsbVlUaGlOekZpT1dNeCJ9"
TOKEN="${1:-$DEFAULT_TOKEN}"

echo "[1/4] Kiểm tra và cài đặt cloudflared binary..."
if ! command -v cloudflared &> /dev/null; then
    ARCH=$(dpkg --print-architecture 2>/dev/null || uname -m)
    case "$ARCH" in
        amd64|x86_64)
            PKG_ARCH="amd64"
            ;;
        arm64|aarch64)
            PKG_ARCH="arm64"
            ;;
        *)
            PKG_ARCH="amd64"
            ;;
    esac

    echo "Phát hiện kiến trúc: $PKG_ARCH. Đang tải cloudflared..."
    if command -v dpkg &> /dev/null; then
        curl -L --output /tmp/cloudflared.deb "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${PKG_ARCH}.deb"
        dpkg -i /tmp/cloudflared.deb
        rm -f /tmp/cloudflared.deb
    elif command -v rpm &> /dev/null; then
        curl -L --output /tmp/cloudflared.rpm "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${PKG_ARCH}.rpm"
        rpm -ivh /tmp/cloudflared.rpm
        rm -f /tmp/cloudflared.rpm
    else
        curl -L --output /usr/local/bin/cloudflared "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${PKG_ARCH}"
        chmod +x /usr/local/bin/cloudflared
    fi
    echo "✅ Cài đặt cloudflared hoàn tất"
else
    echo "✅ cloudflared đã có sẵn trên máy: $(cloudflared --version)"
fi

echo ""
echo "[2/4] Dừng service cũ nếu có..."
systemctl stop cloudflared 2>/dev/null || true

echo ""
echo "[3/4] Cài đặt cloudflared systemd service với token..."
cloudflared service install "$TOKEN"

echo ""
echo "[4/4] Khởi động và kích hoạt tự khởi chạy cùng hệ thống (enable)..."
systemctl daemon-reload
systemctl enable cloudflared
systemctl restart cloudflared

echo ""
echo "======================================================================="
echo "✅ HOÀN TẤT CÀI ĐẶT CLOUDFLARE TUNNEL TRÊN SERVER!"
echo "Trạng thái service:"
systemctl status cloudflared --no-pager
echo ""
echo "Các Public Hostname cấu hình tại Cloudflare Zero Trust (Networks > Tunnels):"
echo "  - nhacualand.com     -> http://localhost:3000"
echo "  - api.nhacualand.com -> http://localhost:4000"
echo "======================================================================="
