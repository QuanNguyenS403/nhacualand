@echo off
chcp 65001 >nul
:: Tu dong kiem tra va xin quyen Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [THONG BAO] Dang yeu cau quyen Administrator de cai dat Windows Service...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~dp0cai-dat-cloudflare-service.bat\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
echo ========================================================
echo   CAI DAT CLOUDFLARE TUNNEL SERVICE TREN WINDOWS
echo ========================================================
echo.

if not exist "%~dp0cloudflared.exe" (
    echo [LOI] Khong tim thay cloudflared.exe tai: %~dp0
    pause
    exit /b 1
)

echo Dang cai dat Service Cloudflare Tunnel...
"%~dp0cloudflared.exe" service install eyJhIjoiNzU3MDcwMTE0ZWM1NTA3MTY2OWJhNmM5OWUxOTk2ZGQiLCJ0IjoiYThlNGRkOGEtNzVjYy00NjE3LThiYTAtNWRhNzNhNTM1MTE4IiwicyI6IlpHUTFNR0kzTURjdFl6RXhaaTAwTmpsbUxUZzVZelF0TVRVNFpqbGlaalV6TXprMyJ9

echo.
echo Khoi dong Service...
net start cloudflared

echo.
echo ========================================================
echo   HOAN TAT! Service cloudflared da duoc cai dat va chay ngam 24/7!
echo ========================================================
pause
