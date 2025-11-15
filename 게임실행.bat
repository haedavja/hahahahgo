@echo off
chcp 65001 >nul
echo ====================================
echo    게임을 시작합니다...
echo ====================================
echo.

cd /d "%~dp0"

echo [1/3] 게임 빌드 중...
call npm run build
if errorlevel 1 (
    echo.
    echo 빌드 실패! npm install을 먼저 실행하세요.
    pause
    exit /b 1
)

echo.
echo [2/3] 서버 시작 중...
echo [3/3] 브라우저가 자동으로 열립니다...
echo.
echo 게임 URL: http://localhost:3000
echo.
echo 게임을 종료하려면 이 창을 닫으세요.
echo ====================================
echo.

start http://localhost:3000
npx serve -s dist -l 3000
