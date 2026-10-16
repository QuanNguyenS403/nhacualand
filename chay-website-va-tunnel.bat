@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================================
echo   KHOI DONG HE THONG WEB VA CLOUDFLARE TUNNEL (nhacualand.com)
echo ========================================================
echo.

:: 1. Kiem tra docker compose database
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo [1/3] Khoi chay Database PostgreSQL va Redis qua Docker...
    docker-compose up -d
) else (
    echo [1/3] Bo qua Docker (neu ban chay PostgreSQL truc tiep tren may)
)

:: 2. Chay Cloudflare Tunnel ngam neu chua chay
tasklist /FI "IMAGENAME eq cloudflared.exe" 2>NUL | find /I /N "cloudflared.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [2/3] Cloudflare Tunnel da dang chay san
) else (
    echo [2/3] Dang khoi chay Cloudflare Tunnel ket noi toi nhacualand.com...
    start "Cloudflare Tunnel" /min "%~dp0cloudflared.exe" tunnel run --token eyJhIjoiNzU3MDcwMTE0ZWM1NTA3MTY2OWJhNmM5OWUxOTk2ZGQiLCJ0IjoiYThlNGRkOGEtNzVjYy00NjE3LThiYTAtNWRhNzNhNTM1MTE4IiwicyI6IlpHUTFNR0kzTURjdFl6RXhaaTAwTmpsbUxUZzVZelF0TVRVNFpqbGlaalV6TXprMyJ9
)

:: 3. Khoi chay Web Next.js (port 3000) va API NestJS (port 4000)
echo [3/3] Dang khoi chay Website va API Server...
echo Giao dien: http://localhost:3000 (Tunnel: https://nhacualand.com)
echo Backend API: http://localhost:4000 (Tunnel: https://api.nhacualand.com)
echo.
npm run dev
