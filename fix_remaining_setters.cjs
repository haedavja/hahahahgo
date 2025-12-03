#!/usr/bin/env node
/**
 * 남아있는 setter들을 actions.로 변경
 * - setActiveRelicSet, setRelicActivated, setMultiplierPulse 등
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'battle', 'LegacyBattleApp.jsx');

let content = fs.readFileSync(filePath, 'utf8');
fs.writeFileSync(filePath + '.setters_backup', content);
console.log('✅ 백업 생성: LegacyBattleApp.jsx.setters_backup');

let changes = 0;

// UI 상태들 (로컬이 아닌 battle 상태)
const setters = [
  'setActiveRelicSet',
  'setRelicActivated',
  'setMultiplierPulse',
  'setInsightBadge',
  'setInsightAnimLevel',
  'setInsightAnimPulseKey',
  'setHoveredEnemyAction',
  'setShowCharacterSheet',
  'setHoveredCard',
  'setTooltipVisible',
  'setPreviewDamage',
  'setShowInsightTooltip',
  'setPlayerHit',
  'setEnemyHit',
  'setPlayerBlockAnim',
  'setEnemyBlockAnim',
  'setWillOverdrive',
  'setEtherPulse',
  'setPlayerOverdriveFlash',
  'setEnemyOverdriveFlash',
  'setSoulShatter',
  'setPlayerTransferPulse',
  'setEnemyTransferPulse',
  'setResolveStartPlayer',
  'setResolveStartEnemy',
  'setRespondSnapshot',
  'setRewindUsed',
  'setAutoProgress',
  'setResolvedPlayerCards',
  'setUsedCardIndices',
  'setDisappearingCards',
  'setHiddenCards',
  'setDisabledCardIndices',
  'setCardUsageCount',
  'setEtherAnimationPts',
  'setExecutingCardIndex',
  'setTurnNumber',
  'setNetEtherDelta',
  'setVanishedCards',
  'setIsSimplified',
  'setPostCombatOptions',
  'setNextTurnEffects',
  'setFixedOrder'
];

setters.forEach(setter => {
  // \b로 word boundary 사용하여 정확히 매치
  // 단, actions.setXxx는 제외 (이미 변경된 것)
  const pattern = new RegExp(`(?<!actions\\.)\\b${setter}\\(`, 'g');
  const matches = content.match(pattern);
  if (matches) {
    content = content.replace(pattern, `actions.${setter}(`);
    changes += matches.length;
    console.log(`✅ ${setter} → actions.${setter}: ${matches.length}개 변경`);
  }
});

console.log(`\n총 ${changes}개 변경`);

fs.writeFileSync(filePath, content);
console.log(`✅ 파일 저장 완료: ${filePath}`);
