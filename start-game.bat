@echo off
cd /d "%~dp0"

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Installation failed!
        pause
        exit /b 1
    )
)

echo Starting game server...
echo.
echo Open browser: http://localhost:5173
echo For iPad/Phone, use Network address shown below
echo.

timeout /t 2 /nobreak >nul
start http://localhost:5173

call npm run dev
