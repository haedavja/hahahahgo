#!/bin/bash

# useState → useReducer 마이그레이션 자동화 스크립트
# 주의: 백업 없이 실행하지 마세요!

FILE="src/components/battle/LegacyBattleApp.jsx"

echo "========================================="
echo "마이그레이션 스크립트"
echo "========================================="
echo "파일: $FILE"
echo ""

# 백업 생성
cp "$FILE" "$FILE.backup"
echo "✅ 백업 생성: $FILE.backup"

# Phase 1: 기본 setter 변경 (간단한 것들부터)
echo ""
echo "Phase 1: Setter 변경..."

# setPhase
sed -i 's/\bsetPhase(/actions.setPhase(/g' "$FILE"
echo "  - setPhase → actions.setPhase"

# setHand
sed -i 's/\bsetHand(/actions.setHand(/g' "$FILE"
echo "  - setHand → actions.setHand"

# setSelected
sed -i 's/\bsetSelected(/actions.setSelected(/g' "$FILE"
echo "  - setSelected → actions.setSelected"

# setCanRedraw
sed -i 's/\bsetCanRedraw(/actions.setCanRedraw(/g' "$FILE"
echo "  - setCanRedraw → actions.setCanRedraw"

# setQueue
sed -i 's/\bsetQueue(/actions.setQueue(/g' "$FILE"
echo "  - setQueue → actions.setQueue"

# setQIndex (단순 set만, increment는 별도 처리)
sed -i 's/\bsetQIndex(\([^p]\)/actions.setQIndex(\1/g' "$FILE"
echo "  - setQIndex → actions.setQIndex"

# setLog (단순 set만, addLog는 이미 처리됨)
sed -i 's/\bsetLog(\([^p]\)/actions.setLog(\1/g' "$FILE"
echo "  - setLog → actions.setLog"

# 간단한 UI 상태들
sed -i 's/\bsetShowCharacterSheet(/actions.setShowCharacterSheet(/g' "$FILE"
sed -i 's/\bsetHoveredCard(/actions.setHoveredCard(/g' "$FILE"
sed -i 's/\bsetTooltipVisible(/actions.setTooltipVisible(/g' "$FILE"
sed -i 's/\bsetPreviewDamage(/actions.setPreviewDamage(/g' "$FILE"
echo "  - UI 상태들 변경 완료"

# 애니메이션 상태들
sed -i 's/\bsetPlayerHit(/actions.setPlayerHit(/g' "$FILE"
sed -i 's/\bsetEnemyHit(/actions.setEnemyHit(/g' "$FILE"
sed -i 's/\bsetPlayerBlockAnim(/actions.setPlayerBlockAnim(/g' "$FILE"
sed -i 's/\bsetEnemyBlockAnim(/actions.setEnemyBlockAnim(/g' "$FILE"
echo "  - 애니메이션 상태들 변경 완료"

# 유물 UI
sed -i 's/\bsetHoveredRelic(/actions.setHoveredRelic(/g' "$FILE"
sed -i 's/\bsetRelicActivated(/actions.setRelicActivated(/g' "$FILE"
sed -i 's/\bsetActiveRelicSet(/actions.setActiveRelicSet(/g' "$FILE"
sed -i 's/\bsetMultiplierPulse(/actions.setMultiplierPulse(/g' "$FILE"
echo "  - 유물 UI 상태들 변경 완료"

# 에테르 시스템
sed -i 's/\bsetWillOverdrive(/actions.setWillOverdrive(/g' "$FILE"
sed -i 's/\bsetEtherPulse(/actions.setEtherPulse(/g' "$FILE"
sed -i 's/\bsetPlayerOverdriveFlash(/actions.setPlayerOverdriveFlash(/g' "$FILE"
sed -i 's/\bsetEnemyOverdriveFlash(/actions.setEnemyOverdriveFlash(/g' "$FILE"
sed -i 's/\bsetSoulShatter(/actions.setSoulShatter(/g' "$FILE"
sed -i 's/\bsetPlayerTransferPulse(/actions.setPlayerTransferPulse(/g' "$FILE"
sed -i 's/\bsetEnemyTransferPulse(/actions.setEnemyTransferPulse(/g' "$FILE"
echo "  - 에테르 시스템 상태들 변경 완료"

echo ""
echo "✅ Phase 1 완료"
echo ""
echo "다음 단계: 수동으로 player, enemy 상태 변경 필요"
echo "  - setPlayer(prev => ...) → actions.updatePlayer({...})"
echo "  - setEnemy(prev => ...) → actions.updateEnemy({...})"
echo ""
echo "빌드 테스트: npm run build"
echo "복구 방법: mv $FILE.backup $FILE"
