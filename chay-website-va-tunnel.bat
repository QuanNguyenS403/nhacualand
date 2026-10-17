@echo off
chcp 65001 >nul
title NHACUALAND - Khoi Dong He Thong Va Cloudflare Tunnel
cd /d "%~dp0"

echo =======================================================================
echo   KHOI DONG HE THONG TOAN DIEN VA CLOUDFLARE TUNNEL - NHACUALAND
echo =======================================================================
echo.

:: 1. Kiem tra va khoi chay Database PostgreSQL va Redis qua Docker
where docker >nul 2>&1
if %errorlevel% equ 0 (
    echo [1/3] Kiem tra Database Docker PostgreSQL va Redis
    docker compose up -d
) else (
    echo [1/3] Bo qua Docker - Su dung Database PostgreSQL tren server
)

:: 2. Kiem tra Cloudflare Tunnel
echo.
echo [2/3] Kiem tra trang thai Cloudflare Tunnel
sc query cloudflared | find /I "STATE" | find /I "RUNNING" >nul 2>&1
if %errorlevel% equ 0 (
    echo -> Dich vu Cloudflare Tunnel Windows Service dang chay ngam 24/7
) else (
    tasklist /FI "IMAGENAME eq cloudflared.exe" 2>NUL | find /I /N "cloudflared.exe" >nul 2>&1
    if "%ERRORLEVEL%"=="0" (
        echo -> Tien trinh cloudflared.exe dang chay trong he thong
    ) else (
        if exist "%~dp0cloudflared.exe" (
            echo -> Dang khoi chay Cloudflare Tunnel ket noi toi Cloudflare Edge
            start "Cloudflare Tunnel" /min "%~dp0cloudflared.exe" tunnel run --token eyJhIjoiNzU3MDcwMTE0ZWM1NTA3MTY2OWJhNmM5OWUxOTk2ZGQiLCJ0IjoiYThlNGRkOGEtNzVjYy00NjE3LThiYTAtNWRhNzNhNTM1MTE4IiwicyI6IlpHUTFNR0kzTURjdFl6RXhaaTAwTmpsbUxUZzVZelF0TVRVNFpqbGlaalV6TXprMyJ9
        ) else (
            echo [CHU Y] Chua tim thay cloudflared.exe. Ban co the chay cai-dat-cloudflare-service.bat
        )
    )
)

:: 3. Khoi chay Web Next.js va API NestJS
echo.
echo [3/3] Dang khoi chay Website Next.js va Backend API NestJS
echo -----------------------------------------------------------------------
echo Frontend Web Local:     http://localhost:3000
echo Frontend Web Internet:  https://nhacualand.com
echo Backend API  Local:     http://localhost:4000
echo Backend API  Internet:  https://api.nhacualand.com
echo -----------------------------------------------------------------------
echo.
node scripts/start-all.js
