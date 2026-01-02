@echo off
REM GPT Codex & Claude 협업 - Git 동기화 스크립트 (Windows)
REM 사용법: sync-workspace.bat [pull|push|status]

setlocal enabledelayedexpansion

REM 설정
set ROOT_REPO=.
set GAME_REPO=new\strategy-map
set BRANCH_DOCS=claude/game-development-collab-016AHeBc1gjCpKT5y2DspZE7
set BRANCH_GAME=master

set COMMAND=%1
if "%COMMAND%"=="" set COMMAND=status

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 메인 로직
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if /i "%COMMAND%"=="status" goto STATUS
if /i "%COMMAND%"=="s" goto STATUS
if /i "%COMMAND%"=="pull" goto PULL
if /i "%COMMAND%"=="p" goto PULL
if /i "%COMMAND%"=="push" goto PUSH
if /i "%COMMAND%"=="P" goto PUSH

echo 사용법: %0 [status^|pull^|push]
echo.
echo 명령어:
echo   status (s)  - 저장소 상태 확인
echo   pull (p)    - 최신 코드 받기
echo   push (P)    - 변경사항 업로드
goto END

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:STATUS
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   저장소 상태 확인
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

call :CHECK_STATUS "%ROOT_REPO%" "📄 문서 레포 (hahahahgo)"

if exist "%GAME_REPO%\.git" (
    call :CHECK_STATUS "%GAME_REPO%" "🎮 게임 레포 (strategy-map)"
) else (
    echo ⚠️  게임 레포 (%GAME_REPO%)가 없습니다
)

goto END

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:PULL
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   최신 코드 받기 (Pull)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

call :DO_PULL "%ROOT_REPO%" "%BRANCH_DOCS%" "📄 문서 레포"

if exist "%GAME_REPO%\.git" (
    call :DO_PULL "%GAME_REPO%" "%BRANCH_GAME%" "🎮 게임 레포"

    REM npm install 확인
    if exist "%GAME_REPO%\package.json" (
        echo.
        set /p npm_install="📦 npm install을 실행하시겠습니까? (y/N): "
        if /i "!npm_install!"=="y" (
            cd "%GAME_REPO%"
            call npm install
            cd ..\..
            echo ✅ 의존성 설치 완료
        )
    )
)

goto END

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:PUSH
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   변경사항 업로드 (Push)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

call :DO_PUSH "%ROOT_REPO%" "%BRANCH_DOCS%" "📄 문서 레포"

if exist "%GAME_REPO%\.git" (
    call :DO_PUSH "%GAME_REPO%" "%BRANCH_GAME%" "🎮 게임 레포"
)

goto END

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 함수: 상태 확인
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:CHECK_STATUS
set repo_path=%~1
set repo_name=%~2

if not exist "%repo_path%\.git" (
    echo ⚠️  %repo_name%: Git 저장소가 아님
    goto :EOF
)

cd "%repo_path%"

echo %repo_name%
echo    위치: %CD%

for /f "tokens=*" %%i in ('git branch --show-current') do set current_branch=%%i
echo    브랜치: !current_branch!

for /f "tokens=*" %%i in ('git rev-parse --short HEAD') do set commit_hash=%%i
for /f "tokens=*" %%i in ('git log -1 --pretty^=%%s') do set commit_msg=%%i
echo    커밋: !commit_hash! - !commit_msg!

git status --porcelain > temp_status.txt
set /p first_line=<temp_status.txt
del temp_status.txt

if not "!first_line!"=="" (
    echo    ⚠️  변경사항 있음:
    git status --short
) else (
    echo    ✅ 깨끗한 상태
)

echo.
cd ..
goto :EOF

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 함수: Pull
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:DO_PULL
set repo_path=%~1
set branch=%~2
set repo_name=%~3

if not exist "%repo_path%\.git" (
    echo ⚠️  %repo_name%: 건너뛰기 (Git 저장소 아님)
    goto :EOF
)

cd "%repo_path%"

echo 📥 %repo_name%: Pull 시작...

REM 변경사항 확인
git status --porcelain > temp_status.txt
set /p has_changes=<temp_status.txt
del temp_status.txt

if not "!has_changes!"=="" (
    echo ⚠️  커밋되지 않은 변경사항이 있습니다. 계속하시겠습니까? (y/N)
    set /p response=
    if /i not "!response!"=="y" (
        echo ❌ Pull 취소
        cd ..
        goto :EOF
    )
)

git pull origin %branch%
if errorlevel 1 (
    echo ❌ Pull 실패
) else (
    echo ✅ Pull 완료
)

cd ..
goto :EOF

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REM 함수: Push
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:DO_PUSH
set repo_path=%~1
set branch=%~2
set repo_name=%~3

if not exist "%repo_path%\.git" (
    echo ⚠️  %repo_name%: 건너뛰기 (Git 저장소 아님)
    goto :EOF
)

cd "%repo_path%"

echo 📤 %repo_name%: Push 시작...

REM 변경사항 확인
git status --porcelain > temp_status.txt
set /p has_changes=<temp_status.txt
del temp_status.txt

if "!has_changes!"=="" (
    echo ⚠️  변경사항 없음
    cd ..
    goto :EOF
)

REM 상태 표시
git status --short

echo.
echo 위 파일들을 커밋하시겠습니까? (y/N)
set /p response=
if /i not "!response!"=="y" (
    echo ❌ Push 취소
    cd ..
    goto :EOF
)

REM 커밋 메시지 입력
echo 커밋 메시지를 입력하세요:
set /p commit_msg=

if "!commit_msg!"=="" (
    echo ❌ 커밋 메시지가 비어있습니다
    cd ..
    goto :EOF
)

REM 커밋 & 푸시
git add -A
git commit -m "!commit_msg!"
git push -u origin %branch%

if errorlevel 1 (
    echo ❌ Push 실패
) else (
    echo ✅ Push 완료
)

cd ..
goto :EOF

REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
:END
REM ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   ✅ 완료
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
pause
