#!/bin/bash

echo "===================================="
echo "   게임을 시작합니다..."
echo "===================================="
echo ""

cd "$(dirname "$0")"

# 의존성 체크 및 자동 설치
if [ ! -d "node_modules" ]; then
    echo "[1/2] 처음 실행입니다. 의존성을 설치합니다..."
    echo "      잠시만 기다려주세요 (1~2분 소요)"
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "설치 실패! Node.js가 설치되어 있는지 확인하세요."
        read -p "아무 키나 눌러 종료..."
        exit 1
    fi
    echo ""
    echo "설치 완료!"
    echo ""
fi

echo "[2/2] 게임 서버 시작 중..."
echo ""
echo "브라우저가 자동으로 열립니다..."
echo ""
echo "┌─────────────────────────────────────┐"
echo "│ 게임 접속 주소:                     │"
echo "│                                     │"
echo "│ 컴퓨터:   http://localhost:5173     │"
echo "│                                     │"
echo "│ 아이패드/폰: 서버 시작 후 표시됨    │"
echo "│ (같은 WiFi에 연결 필요)             │"
echo "└─────────────────────────────────────┘"
echo ""
echo "게임을 종료하려면 Ctrl+C를 누르세요."
echo "===================================="
echo ""

# 2초 대기 후 브라우저 열기
sleep 2

# 운영체제에 따라 브라우저 열기
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Mac
    open http://localhost:5173
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open http://localhost:5173 2>/dev/null || echo "브라우저를 수동으로 열어주세요: http://localhost:5173"
fi

npm run dev
