#!/bin/bash

echo "===================================="
echo "   게임을 시작합니다..."
echo "===================================="
echo ""

cd "$(dirname "$0")"

echo "[1/3] 게임 빌드 중..."
npm run build
if [ $? -ne 0 ]; then
    echo ""
    echo "빌드 실패! npm install을 먼저 실행하세요."
    read -p "아무 키나 눌러 종료..."
    exit 1
fi

echo ""
echo "[2/3] 서버 시작 중..."
echo "[3/3] 브라우저가 자동으로 열립니다..."
echo ""
echo "게임 URL: http://localhost:3000"
echo ""
echo "게임을 종료하려면 Ctrl+C를 누르세요."
echo "===================================="
echo ""

# 운영체제에 따라 브라우저 열기
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Mac
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open http://localhost:3000 2>/dev/null || echo "브라우저를 수동으로 열어주세요: http://localhost:3000"
fi

npx serve -s dist -l 3000
