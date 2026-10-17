@echo off
chcp 65001 >nul
title Cai Dat Cloudflare Tunnel Service - NHACUALAND

:: 1. Kiem tra va yeu cau quyen Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [THONG BAO] Dang yeu cau quyen Administrator de cai dat Windows Service...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~dp0cai-dat-cloudflare-service.bat\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
echo =======================================================================
echo   CÀI ĐẶT CLOUDFLARE TUNNEL WINDOWS SERVICE - NHACUALAND (24/7)
echo =======================================================================
echo.

:: 2. Kiem tra file cloudflared.exe, neu chua co thi tu dong tai ve
if not exist "%~dp0cloudflared.exe" (
    echo [1/3] Khong tim thay cloudflared.exe. Dang tu dong tai phien ban moi nhat tu Cloudflare...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', '%~dp0cloudflared.exe')"
    if not exist "%~dp0cloudflared.exe" (
        echo [LOI] Khong the tai xuong cloudflared.exe. Vui long kiem tra ket noi mang hoac tai thu cong!
        pause
        exit /b 1
    )
    echo -> Da tai thanh cong cloudflared.exe
) else (
    echo [1/3] Da tim thay file cloudflared.exe tai thu muc
)

:: 3. Token Tunnel (Tu dashboard Cloudflare Zero Trust: Networks -> Tunnels)
set "DEFAULT_TOKEN=eyJhIjoiNzU3MDcwMTE0ZWM1NTA3MTY2OWJhNmM5OWUxOTk2ZGQiLCJ0IjoiYThlNGRkOGEtNzVjYy00NjE3LThiYTAtNWRhNzNhNTM1MTE4IiwicyI6IlpHUTFNR0kzTURjdFl6RXhaaTAwTmpsbUxUZzVZelF0TVRVNFpqbGlaalV6TXprMyJ9"

echo.
echo [2/3] Xac nhan Tunnel Token:
echo - Nhan ENTER de su dung token mac dinh cua nhacualand.com
echo - Hoac dan token moi tu Cloudflare Dashboard: Networks ^> Tunnels
echo.
set /p "USER_TOKEN=Nhap token (de trong de dung mac dinh): "

if "%USER_TOKEN%"=="" (
    set "TUNNEL_TOKEN=%DEFAULT_TOKEN%"
) else (
    set "TUNNEL_TOKEN=%USER_TOKEN%"
)

:: 4. Dung va go bo service cu neu da ton tai
sc query cloudflared >nul 2>&1
if %errorLevel% equ 0 (
    echo.
    echo Dang dung va cap nhat service cloudflared hien co...
    net stop cloudflared >nul 2>&1
    "%~dp0cloudflared.exe" service uninstall >nul 2>&1
)

:: 5. Cai dat service moi
echo.
echo [3/3] Dang cai dat Windows Service cho Cloudflare Tunnel...
"%~dp0cloudflared.exe" service install %TUNNEL_TOKEN%
if %errorLevel% neq 0 (
    echo [LOI] Khong the cai dat service. Vui long kiem tra lai token!
    pause
    exit /b 1
)

:: 6. Khoi dong Service
echo Dang khoi dong Service cloudflared...
net start cloudflared

echo.
echo =======================================================================
echo   HOAN TAT! Service cloudflared da duoc cai dat va chay ngam 24/7!
echo   Website va API gio day duoc ket noi an toan toi Cloudflare Edge.
echo   - nhacualand.com      -^> localhost:3000
echo   - api.nhacualand.com  -^> localhost:4000
echo =======================================================================
echo.
pause
