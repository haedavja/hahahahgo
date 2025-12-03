#!/usr/bin/env node
/**
 * Functional update 패턴 제거
 *
 * actions.setPlayer(prev => ({ ...prev, ... }))
 * → actions.setPlayer({ ...player, ... })
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'battle', 'LegacyBattleApp.jsx');

// 파일 읽기
let content = fs.readFileSync(filePath, 'utf8');

// 백업
fs.writeFileSync(filePath + '.func_update_backup', content);
console.log('✅ 백업 생성: LegacyBattleApp.jsx.func_update_backup');

let changes = 0;

// 패턴 1: actions.setPlayer(prev => ({ ...prev, ... })) - 한 줄
// actions.setPlayer(p => ({ ...p, field: value }))
const playerPattern = /actions\.setPlayer\(\s*(?:prev|p)\s*=>\s*\(\{\s*\.\.\.(?:prev|p),\s*([^}]+)\}\)\s*\)/g;
const playerMatches = content.match(playerPattern);
if (playerMatches) {
  content = content.replace(playerPattern, (match, fields) => {
    changes++;
    // prev 또는 p를 player로 교체
    const transformedFields = fields
      .replace(/\bprev\./g, 'player.')
      .replace(/\bp\./g, 'player.');
    return `actions.setPlayer({ ...player, ${transformedFields}})`;
  });
  console.log(`✅ setPlayer 한 줄 패턴 변환: ${playerMatches.length}개`);
}

// 패턴 2: actions.setEnemy(e => ({ ...e, ... })) - 한 줄
const enemyPattern = /actions\.setEnemy\(\s*(?:prev|e)\s*=>\s*\(\{\s*\.\.\.(?:prev|e),\s*([^}]+)\}\)\s*\)/g;
const enemyMatches = content.match(enemyPattern);
if (enemyMatches) {
  content = content.replace(enemyPattern, (match, fields) => {
    changes++;
    // prev 또는 e를 enemy로 교체
    const transformedFields = fields
      .replace(/\bprev\./g, 'enemy.')
      .replace(/\be\./g, 'enemy.');
    return `actions.setEnemy({ ...enemy, ${transformedFields}})`;
  });
  console.log(`✅ setEnemy 한 줄 패턴 변환: ${enemyMatches.length}개`);
}

console.log(`\n총 ${changes}개 자동 변환`);
console.log('\n⚠️  여러 줄 functional update는 수동 확인 필요:');
console.log('   - Line 1715: actions.setPlayer(p => { ... })');
console.log('   - Line 2872: actions.setPlayer(p => { ... })');
console.log('   - Line 2898: actions.setEnemy(e => { ... })');

// 파일 저장
fs.writeFileSync(filePath, content);
console.log(`\n✅ 파일 저장 완료: ${filePath}`);
console.log('\n다음 단계:');
console.log('1. npm run build로 빌드 테스트');
console.log('2. 여러 줄 패턴 3개 수동 수정');
console.log('3. 성공하면 커밋');
