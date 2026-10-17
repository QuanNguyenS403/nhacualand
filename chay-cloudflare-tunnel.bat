@echo off
chcp 65001 >nul
title Cloudflare Tunnel Console - NHACUALAND
cd /d "%~dp0"

echo =======================================================================
echo   CHẠY TRỰC TIẾP CLOUDFLARE TUNNEL (DEBUG CONSOLE) - NHACUALAND
echo =======================================================================
echo.

:: Kiem tra va tu dong tai cloudflared.exe neu chua co
if not exist "%~dp0cloudflared.exe" (
    echo Khong tim thay cloudflared.exe. Dang tu dong tai phien ban moi nhat...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object System.Net.WebClient).DownloadFile('https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', '%~dp0cloudflared.exe')"
    if not exist "%~dp0cloudflared.exe" (
        echo [LOI] Khong the tai cloudflared.exe. Vui long tai thu cong!
        pause
        exit /b 1
    )
    echo -> Da tai cloudflared.exe thanh cong
)

set "DEFAULT_TOKEN=eyJhIjoiNzU3MDcwMTE0ZWM1NTA3MTY2OWJhNmM5OWUxOTk2ZGQiLCJ0IjoiYThlNGRkOGEtNzVjYy00NjE3LThiYTAtNWRhNzNhNTM1MTE4IiwicyI6IlpHUTFNR0kzTURjdFl6RXhaaTAwTmpsbUxUZzVZelF0TVRVNFpqbGlaalV6TXprMyJ9"

echo [THONG TIN] Dang ket noi Tunnel toi Cloudflare Network...
echo - Nhan Ctrl+C de dung tunnel bat cu luc nao.
echo - Luu y: Neu ban da cai dat Service (cai-dat-cloudflare-service.bat), 
echo   khong can chay file nay nua vi service da tu chay ngam 24/7.
echo.

"%~dp0cloudflared.exe" tunnel run --token %DEFAULT_TOKEN%

echo.
pause
