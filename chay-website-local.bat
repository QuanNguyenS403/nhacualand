@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================================
echo   KHOI DONG HE THONG WEB VA API SERVER (LOCAL DEVELOPMENT)
echo ========================================================
echo.

:: 1. Kiem tra docker compose database
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo [1/2] Khoi chay Database PostgreSQL va Redis qua Docker...
    docker-compose up -d
) else (
    echo [1/2] Bo qua Docker (neu ban chay PostgreSQL truc tiep tren may)
)

:: 2. Khoi chay Web Next.js (port 3000) va API NestJS (port 4000)
echo.
echo [2/2] Dang khoi chay Website va API Server...
echo Giao dien Website: http://localhost:3000
echo Backend API:       http://localhost:4000
echo.
npm run dev
