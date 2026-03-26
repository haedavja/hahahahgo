#!/bin/bash
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# ============================================
# PreCommit 체크: 버전 태그 갱신 확인
# src/ 파일 변경 시 버전 태그가 오늘 날짜인지 확인
# ============================================

# 스테이징된 src/ 파일 확인
STAGED_SRC=$(git diff --cached --name-only -- 'src/' 2>/dev/null | head -1)

if [ -z "$STAGED_SRC" ]; then
  # src/ 변경 없음 - 통과
  exit 0
fi

# 현재 한국시간 날짜
TODAY=$(TZ='Asia/Seoul' date '+%m-%d')

# 버전 태그 파일에서 날짜 추출
VERSION_FILE="src/components/map/utils/mapConfig.ts"
if [ ! -f "$VERSION_FILE" ]; then
  echo "⚠️ 버전 태그 파일을 찾을 수 없습니다: $VERSION_FILE"
  exit 0
fi

# PATCH_VERSION_TAG에서 날짜 부분 추출 (예: "01-04 22:26" -> "01-04")
VERSION_DATE=$(grep -o 'PATCH_VERSION_TAG = "[0-9]\{2\}-[0-9]\{2\}' "$VERSION_FILE" | grep -o '[0-9]\{2\}-[0-9]\{2\}' || echo "")

if [ -z "$VERSION_DATE" ]; then
  echo "⚠️ 버전 태그를 파싱할 수 없습니다"
  exit 0
fi

if [ "$VERSION_DATE" != "$TODAY" ]; then
  echo ""
  echo "============================================"
  echo "❌ 커밋 차단: 버전 태그 미갱신"
  echo "============================================"
  echo ""
  echo "src/ 파일이 변경되었지만 버전 태그가 오래됨:"
  echo "  - 현재 버전 태그: $VERSION_DATE"
  echo "  - 오늘 날짜 (KST): $TODAY"
  echo ""
  echo "해결 방법:"
  echo "  1. TZ='Asia/Seoul' date '+%m-%d %H:%M' 실행"
  echo "  2. $VERSION_FILE의 PATCH_VERSION_TAG 업데이트"
  echo "  3. 다시 커밋"
  echo ""
  echo "============================================"
  exit 1
fi

# 버전 태그가 오늘 날짜면 통과
echo "✅ 버전 태그 확인됨: $VERSION_DATE"
exit 0
