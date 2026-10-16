@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================================
echo   KHOI CHAY CLOUDFLARE TUNNEL (QNS BROKER)
echo ========================================================
echo.
"%~dp0cloudflared.exe" tunnel run --token eyJhIjoiNzU3MDcwMTE0ZWM1NTA3MTY2OWJhNmM5OWUxOTk2ZGQiLCJ0IjoiYThlNGRkOGEtNzVjYy00NjE3LThiYTAtNWRhNzNhNTM1MTE4IiwicyI6IlpHUTFNR0kzTURjdFl6RXhaaTAwTmpsbUxUZzVZelF0TVRVNFpqbGlaalV6TXprMyJ9
pause
