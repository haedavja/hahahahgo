#!/bin/bash

# 특성창 위치를 카드 중앙으로 조정하는 스크립트

FILE="src/components/battle/LegacyBattleApp.jsx"

echo "🔧 특성창 위치 수정 중..."

# 백업 생성
cp "$FILE" "${FILE}.backup"

# 1. getTraitHoverHandlers에서 y 좌표를 카드 중앙으로 변경
# rect.top → rect.top + rect.height / 2
sed -i 's/setHoveredCard({ card, x, y: rect\.top, align });/setHoveredCard({ card, x, y: rect.top + rect.height \/ 2, align });/g' "$FILE"

# 2. 툴팁 렌더링 위치 조정
# top: ${hoveredCard.y - 10}px → top: ${hoveredCard.y}px
sed -i "s/top: \`\${hoveredCard\.y - 10}px\`/top: \`\${hoveredCard.y}px\`/g" "$FILE"

# 3. transform 변경: -100% → -50% (카드 중앙 정렬)
sed -i "s/'translate(-50%, -100%)'/'translate(-50%, -50%)'/g" "$FILE"

echo "✅ 수정 완료!"
echo "📝 백업 파일: ${FILE}.backup"
echo ""
echo "변경사항 확인:"
git diff src/components/battle/LegacyBattleApp.jsx | head -50
