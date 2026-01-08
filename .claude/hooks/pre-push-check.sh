#!/bin/bash
# Pre-push validation hook
# 푸시 전 검증 훅

set -e

echo "🔍 Pre-push 검증 시작..."

# 1. TypeScript 타입 체크
echo "📝 TypeScript 타입 체크..."
npx tsc --noEmit || {
  echo "❌ TypeScript 에러가 있습니다. 수정 후 다시 푸시하세요."
  exit 1
}

# 2. ESLint 체크
echo "🔧 ESLint 체크..."
npm run lint || {
  echo "❌ Lint 에러가 있습니다. 'npm run lint -- --fix'로 수정하세요."
  exit 1
}

# 3. 빌드 검증
echo "🏗️ 빌드 검증..."
npm run build || {
  echo "❌ 빌드 실패. 수정 후 다시 푸시하세요."
  exit 1
}

# 4. 관련 테스트 실행
echo "🧪 관련 테스트 실행..."
npm test -- --run || {
  echo "❌ 테스트 실패. 수정 후 다시 푸시하세요."
  exit 1
}

echo "✅ Pre-push 검증 완료!"
