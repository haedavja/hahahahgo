#!/usr/bin/env node
/**
 * 모든 functional update 패턴 제거
 *
 * actions.setXxx(prev => ...) 형태를 모두 찾아서 수정
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'battle', 'LegacyBattleApp.jsx');

let content = fs.readFileSync(filePath, 'utf8');

// 백업
fs.writeFileSync(filePath + '.all_func_backup', content);
console.log('✅ 백업 생성: LegacyBattleApp.jsx.all_func_backup');

let changes = 0;

// 각 라인별로 수동 패턴 정의
const patterns = [
  // Line 1109: setOrderedRelics
  {
    old: /actions\.setOrderedRelics\(prev => mergeRelicOrder\(relics, prev\)\)/g,
    new: 'actions.setOrderedRelics(mergeRelicOrder(relics, orderedRelics))',
    name: 'setOrderedRelics'
  },
  // Line 2377: setUsedCardIndices - 배열 추가
  {
    old: /actions\.setUsedCardIndices\(prev => \[\.\.\.prev, battle\.qIndex\]\)/g,
    new: 'actions.setUsedCardIndices([...usedCardIndices, battle.qIndex])',
    name: 'setUsedCardIndices'
  },
  // Line 2394: setDisappearingCards - 배열 추가
  {
    old: /actions\.setDisappearingCards\(prev => \[\.\.\.prev, battle\.qIndex\]\)/g,
    new: 'actions.setDisappearingCards([...disappearingCards, battle.qIndex])',
    name: 'setDisappearingCards (add)'
  },
  // Line 2397: setHiddenCards - 배열 추가
  {
    old: /actions\.setHiddenCards\(prev => \[\.\.\.prev, battle\.qIndex\]\)/g,
    new: 'actions.setHiddenCards([...hiddenCards, battle.qIndex])',
    name: 'setHiddenCards'
  },
  // Line 2398: setDisappearingCards - 배열 필터
  {
    old: /actions\.setDisappearingCards\(prev => prev\.filter\(i => i !== battle\.qIndex\)\)/g,
    new: 'actions.setDisappearingCards(disappearingCards.filter(i => i !== battle.qIndex))',
    name: 'setDisappearingCards (filter)'
  },
  // Line 2438: setNextTurnEffects - 객체 업데이트
  {
    old: /actions\.setNextTurnEffects\(prev => \({ \.\.\.prev, bonusEnergy: \(prev\.bonusEnergy \|\| 0\) \+ 2 }\)\)/g,
    new: 'actions.setNextTurnEffects({ ...nextTurnEffects, bonusEnergy: (nextTurnEffects.bonusEnergy || 0) + 2 })',
    name: 'setNextTurnEffects'
  },
];

patterns.forEach(({ old, new: replacement, name }) => {
  const matches = content.match(old);
  if (matches) {
    content = content.replace(old, replacement);
    changes += matches.length;
    console.log(`✅ ${name}: ${matches.length}개 변경`);
  }
});

console.log(`\n총 ${changes}개 자동 변경`);
console.log('\n⚠️  복잡한 패턴은 수동 확인 필요:');
console.log('   - Line 1260, 1273: setActiveRelicSet(prev => { ... })');
console.log('   - Line 1278: setRelicActivated(prev => ...)');
console.log('   - Line 1586: setAutoProgress(prev => !prev)');
console.log('   - Line 2419: setCardUsageCount(prev => ({ ... }))');
console.log('   - Line 2497-2544: setResolvedPlayerCards(prev => { ... }) - 여러 줄');
console.log('   - Line 2550, 2990, 3006: setActionEvents(prev => ({ ...prev, ... }))');
console.log('   - Line 3400: setRelicActivated(prev => ...)');
console.log('   - Line 4192: setIsSimplified(prev => { ... })');

fs.writeFileSync(filePath, content);
console.log(`\n✅ 파일 저장 완료: ${filePath}`);
console.log('\n다음 단계:');
console.log('1. 복잡한 패턴 수동 수정');
console.log('2. npm run build로 빌드 테스트');
console.log('3. 성공하면 커밋');
