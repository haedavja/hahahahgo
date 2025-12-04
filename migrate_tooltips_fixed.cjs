#!/usr/bin/env node
/**
 * Phase 4: 남은 툴팁 useState 제거 (수정 버전)
 *
 * showPtsTooltip, showBarTooltip는 이미 destructure가 있으므로 useState만 제거
 * showTooltip는 tooltipVisible로 변경 (이미 destructure됨)
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'battle', 'LegacyBattleApp.jsx');

let content = fs.readFileSync(filePath, 'utf8');

// 백업
fs.writeFileSync(filePath + '.tooltip_backup2', content);
console.log('✅ 백업 생성: LegacyBattleApp.jsx.tooltip_backup2');

let changes = 0;

// 1. useState 선언 제거 (showPtsTooltip, showBarTooltip는 destructure가 있으므로 상태 참조는 변경 안함)
const patterns = [
  {
    old: /  const \[showPtsTooltip, setShowPtsTooltip\] = useState\(false\);\n/g,
    new: '',
    name: 'showPtsTooltip useState 제거'
  },
  {
    old: /  const \[showBarTooltip, setShowBarTooltip\] = useState\(false\);\n/g,
    new: '',
    name: 'showBarTooltip useState 제거'
  },
  {
    old: /  const \[showTooltip, setShowTooltip\] = useState\(false\); \/\/ 툴팁 표시 여부 \(딜레이 후\)\n/g,
    new: '',
    name: 'showTooltip useState 제거'
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

// 2. setShowPtsTooltip → actions.setShowPtsTooltip (상태 참조는 그대로)
const setShowPtsTooltipPattern = /\bsetShowPtsTooltip\(/g;
const setShowPtsTooltipMatches = content.match(setShowPtsTooltipPattern);
if (setShowPtsTooltipMatches) {
  content = content.replace(setShowPtsTooltipPattern, 'actions.setShowPtsTooltip(');
  changes += setShowPtsTooltipMatches.length;
  console.log(`✅ setShowPtsTooltip → actions.setShowPtsTooltip: ${setShowPtsTooltipMatches.length}개 변경`);
}

// 3. setShowBarTooltip → actions.setShowBarTooltip (상태 참조는 그대로)
const setShowBarTooltipPattern = /\bsetShowBarTooltip\(/g;
const setShowBarTooltipMatches = content.match(setShowBarTooltipPattern);
if (setShowBarTooltipMatches) {
  content = content.replace(setShowBarTooltipPattern, 'actions.setShowBarTooltip(');
  changes += setShowBarTooltipMatches.length;
  console.log(`✅ setShowBarTooltip → actions.setShowBarTooltip: ${setShowBarTooltipMatches.length}개 변경`);
}

// 4. setShowTooltip → actions.setTooltipVisible
const setShowTooltipPattern = /\bsetShowTooltip\(/g;
const setShowTooltipMatches = content.match(setShowTooltipPattern);
if (setShowTooltipMatches) {
  content = content.replace(setShowTooltipPattern, 'actions.setTooltipVisible(');
  changes += setShowTooltipMatches.length;
  console.log(`✅ setShowTooltip → actions.setTooltipVisible: ${setShowTooltipMatches.length}개 변경`);
}

// 5. showTooltip → tooltipVisible (상태 참조만 변경, setter는 이미 변경됨)
// 주의: setShowTooltip은 이미 변경되었으므로 제외
const showTooltipPattern = /(?<!set)\bshowTooltip\b/g;
const showTooltipMatches = content.match(showTooltipPattern);
if (showTooltipMatches) {
  content = content.replace(showTooltipPattern, 'tooltipVisible');
  changes += showTooltipMatches.length;
  console.log(`✅ showTooltip → tooltipVisible: ${showTooltipMatches.length}개 변경`);
}

console.log(`\n총 ${changes}개 변경`);

fs.writeFileSync(filePath, content);
console.log(`\n✅ 파일 저장 완료: ${filePath}`);
console.log('\n다음 단계:');
console.log('1. npm run build로 빌드 테스트');
console.log('2. 성공하면 커밋');
