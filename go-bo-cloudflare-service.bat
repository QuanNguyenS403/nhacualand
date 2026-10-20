@echo off
chcp 65001 >nul
title Go Bo Cloudflare Tunnel Cu - NHACUALAND

:: 1. Kiem tra va yeu cau quyen Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [THONG BAO] Dang yeu cau quyen Administrator de go bo Windows Service...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~dp0go-bo-cloudflare-service.bat\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
echo =======================================================================
echo   GỠ BỎ CLOUDFLARE TUNNEL CŨ KHỎI MÁY CHỦ - NHACUALAND
echo =======================================================================
echo.

echo [1/3] Dang dung tien trinh va service cloudflared cu...
net stop cloudflared >nul 2>&1
taskkill /f /im cloudflared.exe >nul 2>&1

echo [2/3] Dang go bo service khoi Windows...
if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
    "C:\Program Files (x86)\cloudflared\cloudflared.exe" service uninstall >nul 2>&1
)
sc delete cloudflared >nul 2>&1

echo [3/3] Dang don dep token cu trong he thong...
if exist "C:\ProgramData\cloudflared" (
    del /f /q "C:\ProgramData\cloudflared\*" >nul 2>&1
)

echo.
echo =======================================================================
echo [THANH CONG] Da go bo hoan toan Cloudflare Tunnel cu!
echo Bay gio ban co the cai dat Tunnel moi bang file: cai-dat-cloudflare-service.bat
echo =======================================================================
echo.
pause
