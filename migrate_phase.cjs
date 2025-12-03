#!/usr/bin/env node
/**
 * Phase 1: phase 상태 마이그레이션
 * - phase → battle.phase
 * - setPhase → actions.setPhase
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'battle', 'LegacyBattleApp.jsx');

// 파일 읽기
let content = fs.readFileSync(filePath, 'utf8');

// 백업
fs.writeFileSync(filePath + '.phase_backup', content);
console.log('✅ 백업 생성: LegacyBattleApp.jsx.phase_backup');

let changes = 0;

// 1. setPhase( → actions.setPhase(
const pattern1 = /\bsetPhase\(/g;
const count1 = (content.match(pattern1) || []).length;
content = content.replace(pattern1, 'actions.setPhase(');
changes += count1;
console.log(`✅ setPhase → actions.setPhase: ${count1}개 변경`);

// 2. phase === → battle.phase ===
const pattern2 = /\bphase\s*===/g;
const count2 = (content.match(pattern2) || []).length;
content = content.replace(pattern2, 'battle.phase ===');
changes += count2;
console.log(`✅ phase === → battle.phase ===: ${count2}개 변경`);

// 3. phase !== → battle.phase !==
const pattern3 = /\bphase\s*!==/g;
const count3 = (content.match(pattern3) || []).length;
content = content.replace(pattern3, 'battle.phase !==');
changes += count3;
console.log(`✅ phase !== → battle.phase !==: ${count3}개 변경`);

// 4. (phase → (battle.phase (괄호 안)
const pattern4 = /\(\s*phase\b/g;
const count4 = (content.match(pattern4) || []).length;
content = content.replace(pattern4, '(battle.phase');
changes += count4;
console.log(`✅ (phase → (battle.phase: ${count4}개 변경`);

// 5. , phase → , battle.phase (함수 인자)
const pattern5 = /,\s*phase\b/g;
const count5 = (content.match(pattern5) || []).length;
content = content.replace(pattern5, ', battle.phase');
changes += count5;
console.log(`✅ , phase → , battle.phase: ${count5}개 변경`);

// 6. { phase → { battle.phase (객체 안)
const pattern6 = /\{\s*phase\b/g;
const count6 = (content.match(pattern6) || []).length;
content = content.replace(pattern6, '{ battle.phase');
changes += count6;
console.log(`✅ { phase → { battle.phase: ${count6}개 변경`);

// 7. [phase → [battle.phase (배열 의존성)
const pattern7 = /\[\s*phase\b/g;
const count7 = (content.match(pattern7) || []).length;
content = content.replace(pattern7, '[battle.phase');
changes += count7;
console.log(`✅ [phase → [battle.phase: ${count7}개 변경`);

console.log(`\n총 ${changes}개 변경`);

// 파일 저장
fs.writeFileSync(filePath, content);
console.log(`✅ 파일 저장 완료: ${filePath}`);
console.log('\n다음 단계:');
console.log('1. npm run build 로 빌드 테스트');
console.log('2. 문제 있으면: cp LegacyBattleApp.jsx.phase_backup LegacyBattleApp.jsx');
console.log('3. 성공하면: 다음 Phase로 진행');
