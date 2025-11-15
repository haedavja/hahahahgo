@echo off
chcp 65001 >nul
echo ====================================
echo    게임을 시작합니다...
echo ====================================
echo.

cd /d "%~dp0"

REM 의존성 체크 및 자동 설치
if not exist "node_modules\" (
    echo [1/2] 처음 실행입니다. 의존성을 설치합니다...
    echo       잠시만 기다려주세요 (1~2분 소요)
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo 설치 실패! Node.js가 설치되어 있는지 확인하세요.
        pause
        exit /b 1
    )
    echo.
    echo 설치 완료!
    echo.
)

echo [2/2] 게임 서버 시작 중...
echo.
echo 브라우저가 자동으로 열립니다...
echo.
echo ┌─────────────────────────────────────┐
echo │ 게임 접속 주소:                     │
echo │                                     │
echo │ 컴퓨터:   http://localhost:5173     │
echo │                                     │
echo │ 아이패드/폰: 서버 시작 후 표시됨    │
echo │ (같은 WiFi에 연결 필요)             │
echo └─────────────────────────────────────┘
echo.
echo 게임을 종료하려면 이 창을 닫으세요.
echo ====================================
echo.

timeout /t 2 /nobreak >nul
start http://localhost:5173

call npm run dev
