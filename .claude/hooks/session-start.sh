#!/bin/bash
set -euo pipefail

# 원격 환경(Claude Code on the web)에서만 실행
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# ============================================
# 세션 시작 시 Git 상태 자동 출력
# 목적: Claude가 중복 작업을 방지할 수 있도록 함
# ============================================

echo "============================================"
echo "🔍 [SESSION START] Git 상태 자동 확인"
echo "============================================"
echo ""

echo "📌 현재 브랜치:"
git branch --show-current
echo ""

echo "📋 최근 커밋 10개:"
git log --oneline -10
echo ""

echo "📁 현재 상태:"
git status --short
echo ""

echo "📊 최근 변경 파일 (HEAD~3):"
git diff HEAD~3 --stat 2>/dev/null || echo "(커밋 부족으로 표시 불가)"
echo ""

echo "============================================"
echo "⚠️  위 정보를 확인하고 중복 작업을 방지하세요!"
echo "============================================"
echo ""

# ============================================
# 의존성 설치
# ============================================

echo "📦 의존성 설치 중..."
npm install --silent

echo "✅ 세션 준비 완료!"
