#!/usr/bin/env node
/**
 * Phase 3: player/enemy 상태 마이그레이션
 *
 * 간단한 패턴만 자동 변환:
 * - setPlayer( → actions.setPlayer(
 * - setEnemy( → actions.setEnemy(
 *
 * Functional update 내부의 prev/p/e는 수동으로 확인 필요
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'battle', 'LegacyBattleApp.jsx');

// 파일 읽기
let content = fs.readFileSync(filePath, 'utf8');

// 백업
fs.writeFileSync(filePath + '.player_enemy_backup', content);
console.log('✅ 백업 생성: LegacyBattleApp.jsx.player_enemy_backup');

let changes = 0;

// ===== 간단한 패턴 변환 =====

// 1. setPlayer( → actions.setPlayer(
// (이미 actions.setPlayer인 것은 제외, negative lookbehind 사용)
const setPlayerPattern = /(?<!actions\.)(?<!\/\/.*)\bsetPlayer\(/g;
const playerMatches = content.match(setPlayerPattern);
if (playerMatches) {
  content = content.replace(setPlayerPattern, 'actions.setPlayer(');
  changes += playerMatches.length;
  console.log(`✅ setPlayer → actions.setPlayer: ${playerMatches.length}개 변경`);
}

// 2. setEnemy( → actions.setEnemy(
const setEnemyPattern = /(?<!actions\.)(?<!\/\/.*)\bsetEnemy\(/g;
const enemyMatches = content.match(setEnemyPattern);
if (enemyMatches) {
  content = content.replace(setEnemyPattern, 'actions.setEnemy(');
  changes += enemyMatches.length;
  console.log(`✅ setEnemy → actions.setEnemy: ${enemyMatches.length}개 변경`);
}

console.log(`\n총 ${changes}개 변경`);
console.log('\n⚠️  주의: functional update 패턴 (prev =>, p =>, e =>)은 수동 확인 필요!');
console.log('예: actions.setPlayer(prev => ({ ...prev, ... }))');
console.log('→ actions.setPlayer({ ...player, ... })로 수정 필요');

// 파일 저장
fs.writeFileSync(filePath, content);
console.log(`\n✅ 파일 저장 완료: ${filePath}`);
console.log('\n다음 단계:');
console.log('1. npm run build 로 빌드 테스트');
console.log('2. grep으로 남은 "prev =>" 패턴 확인');
console.log('3. 수동으로 functional update 제거');
console.log('4. 성공하면 커밋');
