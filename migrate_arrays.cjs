#!/usr/bin/env node
/**
 * Phase 2: 배열 상태 마이그레이션
 * - hand → battle.hand
 * - selected → battle.selected
 * - queue → battle.queue
 * - qIndex → battle.qIndex
 * - log → battle.log
 * - vanishedCards, usedCardIndices, etc.
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'battle', 'LegacyBattleApp.jsx');

// 파일 읽기
let content = fs.readFileSync(filePath, 'utf8');

// 백업
fs.writeFileSync(filePath + '.arrays_backup', content);
console.log('✅ 백업 생성: LegacyBattleApp.jsx.arrays_backup');

let changes = 0;

// ===== SETTERS =====

// setHand
const setHand = /\bsetHand\(/g;
const count_setHand = (content.match(setHand) || []).length;
content = content.replace(setHand, 'actions.setHand(');
changes += count_setHand;
console.log(`✅ setHand → actions.setHand: ${count_setHand}개 변경`);

// setSelected
const setSelected = /\bsetSelected\(/g;
const count_setSelected = (content.match(setSelected) || []).length;
content = content.replace(setSelected, 'actions.setSelected(');
changes += count_setSelected;
console.log(`✅ setSelected → actions.setSelected: ${count_setSelected}개 변경`);

// setQueue
const setQueue = /\bsetQueue\(/g;
const count_setQueue = (content.match(setQueue) || []).length;
content = content.replace(setQueue, 'actions.setQueue(');
changes += count_setQueue;
console.log(`✅ setQueue → actions.setQueue: ${count_setQueue}개 변경`);

// setQIndex (간단한 set만, prev => 패턴은 제외)
const setQIndex = /\bsetQIndex\(\s*([0-9])/g;
const count_setQIndex = (content.match(setQIndex) || []).length;
content = content.replace(setQIndex, 'actions.setQIndex($1');
changes += count_setQIndex;
console.log(`✅ setQIndex(숫자) → actions.setQIndex: ${count_setQIndex}개 변경`);

// setLog (간단한 set만)
const setLog = /\bsetLog\(\[\]/g;
const count_setLog = (content.match(setLog) || []).length;
content = content.replace(setLog, 'actions.setLog([]');
changes += count_setLog;
console.log(`✅ setLog([]) → actions.setLog: ${count_setLog}개 변경`);

// setCanRedraw
const setCanRedraw = /\bsetCanRedraw\(/g;
const count_setCanRedraw = (content.match(setCanRedraw) || []).length;
content = content.replace(setCanRedraw, 'actions.setCanRedraw(');
changes += count_setCanRedraw;
console.log(`✅ setCanRedraw → actions.setCanRedraw: ${count_setCanRedraw}개 변경`);

// setVanishedCards
const setVanishedCards = /\bsetVanishedCards\(/g;
const count_setVanishedCards = (content.match(setVanishedCards) || []).length;
content = content.replace(setVanishedCards, 'actions.setVanishedCards(');
changes += count_setVanishedCards;
console.log(`✅ setVanishedCards → actions.setVanishedCards: ${count_setVanishedCards}개 변경`);

// setUsedCardIndices
const setUsedCardIndices = /\bsetUsedCardIndices\(/g;
const count_setUsedCardIndices = (content.match(setUsedCardIndices) || []).length;
content = content.replace(setUsedCardIndices, 'actions.setUsedCardIndices(');
changes += count_setUsedCardIndices;
console.log(`✅ setUsedCardIndices → actions.setUsedCardIndices: ${count_setUsedCardIndices}개 변경`);

// setDisappearingCards
const setDisappearingCards = /\bsetDisappearingCards\(/g;
const count_setDisappearingCards = (content.match(setDisappearingCards) || []).length;
content = content.replace(setDisappearingCards, 'actions.setDisappearingCards(');
changes += count_setDisappearingCards;
console.log(`✅ setDisappearingCards → actions.setDisappearingCards: ${count_setDisappearingCards}개 변경`);

// setHiddenCards
const setHiddenCards = /\bsetHiddenCards\(/g;
const count_setHiddenCards = (content.match(setHiddenCards) || []).length;
content = content.replace(setHiddenCards, 'actions.setHiddenCards(');
changes += count_setHiddenCards;
console.log(`✅ setHiddenCards → actions.setHiddenCards: ${count_setHiddenCards}개 변경`);

// ===== STATE REFERENCES =====

// hand (배열 접근/비교 등)
const handLength = /\bhand\.length\b/g;
const count_handLength = (content.match(handLength) || []).length;
content = content.replace(handLength, 'battle.hand.length');
changes += count_handLength;
console.log(`✅ hand.length → battle.hand.length: ${count_handLength}개 변경`);

const handMap = /\bhand\.map\(/g;
const count_handMap = (content.match(handMap) || []).length;
content = content.replace(handMap, 'battle.hand.map(');
changes += count_handMap;
console.log(`✅ hand.map → battle.hand.map: ${count_handMap}개 변경`);

const handFilter = /\bhand\.filter\(/g;
const count_handFilter = (content.match(handFilter) || []).length;
content = content.replace(handFilter, 'battle.hand.filter(');
changes += count_handFilter;
console.log(`✅ hand.filter → battle.hand.filter: ${count_handFilter}개 변경`);

const handFind = /\bhand\.find\(/g;
const count_handFind = (content.match(handFind) || []).length;
content = content.replace(handFind, 'battle.hand.find(');
changes += count_handFind;
console.log(`✅ hand.find → battle.hand.find: ${count_handFind}개 변경`);

// selected
const selectedLength = /\bselected\.length\b/g;
const count_selectedLength = (content.match(selectedLength) || []).length;
content = content.replace(selectedLength, 'battle.selected.length');
changes += count_selectedLength;
console.log(`✅ selected.length → battle.selected.length: ${count_selectedLength}개 변경`);

const selectedMap = /\bselected\.map\(/g;
const count_selectedMap = (content.match(selectedMap) || []).length;
content = content.replace(selectedMap, 'battle.selected.map(');
changes += count_selectedMap;
console.log(`✅ selected.map → battle.selected.map: ${count_selectedMap}개 변경`);

const selectedFilter = /\bselected\.filter\(/g;
const count_selectedFilter = (content.match(selectedFilter) || []).length;
content = content.replace(selectedFilter, 'battle.selected.filter(');
changes += count_selectedFilter;
console.log(`✅ selected.filter → battle.selected.filter: ${count_selectedFilter}개 변경`);

const selectedIncludes = /\bselected\.includes\(/g;
const count_selectedIncludes = (content.match(selectedIncludes) || []).length;
content = content.replace(selectedIncludes, 'battle.selected.includes(');
changes += count_selectedIncludes;
console.log(`✅ selected.includes → battle.selected.includes: ${count_selectedIncludes}개 변경`);

// queue
const queueLength = /\bqueue\.length\b/g;
const count_queueLength = (content.match(queueLength) || []).length;
content = content.replace(queueLength, 'battle.queue.length');
changes += count_queueLength;
console.log(`✅ queue.length → battle.queue.length: ${count_queueLength}개 변경`);

const queueIndex = /\bqueue\[/g;
const count_queueIndex = (content.match(queueIndex) || []).length;
content = content.replace(queueIndex, 'battle.queue[');
changes += count_queueIndex;
console.log(`✅ queue[ → battle.queue[: ${count_queueIndex}개 변경`);

// qIndex (비교 등)
const qIndexCompare = /\bqIndex\s*(<|>|<=|>=|===|!==)/g;
const count_qIndexCompare = (content.match(qIndexCompare) || []).length;
content = content.replace(qIndexCompare, 'battle.qIndex $1');
changes += count_qIndexCompare;
console.log(`✅ qIndex 비교 → battle.qIndex: ${count_qIndexCompare}개 변경`);

const qIndexArith = /\bqIndex\s*(\+|\-)/g;
const count_qIndexArith = (content.match(qIndexArith) || []).length;
content = content.replace(qIndexArith, 'battle.qIndex $1');
changes += count_qIndexArith;
console.log(`✅ qIndex 연산 → battle.qIndex: ${count_qIndexArith}개 변경`);

// log
const logLength = /\blog\.length\b/g;
const count_logLength = (content.match(logLength) || []).length;
content = content.replace(logLength, 'battle.log.length');
changes += count_logLength;
console.log(`✅ log.length → battle.log.length: ${count_logLength}개 변경`);

const logMap = /\blog\.map\(/g;
const count_logMap = (content.match(logMap) || []).length;
content = content.replace(logMap, 'battle.log.map(');
changes += count_logMap;
console.log(`✅ log.map → battle.log.map: ${count_logMap}개 변경`);

// canRedraw (조건문)
const canRedrawCond = /\bcanRedraw\s*(&&|\|\||[=!<>])/g;
const count_canRedrawCond = (content.match(canRedrawCond) || []).length;
content = content.replace(canRedrawCond, 'battle.canRedraw $1');
changes += count_canRedrawCond;
console.log(`✅ canRedraw 조건 → battle.canRedraw: ${count_canRedrawCond}개 변경`);

// vanishedCards
const vanishedCardsLength = /\bvanishedCards\.length\b/g;
const count_vanishedCardsLength = (content.match(vanishedCardsLength) || []).length;
content = content.replace(vanishedCardsLength, 'battle.vanishedCards.length');
changes += count_vanishedCardsLength;
console.log(`✅ vanishedCards.length → battle.vanishedCards.length: ${count_vanishedCardsLength}개 변경`);

// usedCardIndices
const usedCardIndicesHas = /\busedCardIndices\.has\(/g;
const count_usedCardIndicesHas = (content.match(usedCardIndicesHas) || []).length;
content = content.replace(usedCardIndicesHas, 'battle.usedCardIndices.has(');
changes += count_usedCardIndicesHas;
console.log(`✅ usedCardIndices.has → battle.usedCardIndices.has: ${count_usedCardIndicesHas}개 변경`);

// disappearingCards
const disappearingCardsHas = /\bdisappearingCards\.has\(/g;
const count_disappearingCardsHas = (content.match(disappearingCardsHas) || []).length;
content = content.replace(disappearingCardsHas, 'battle.disappearingCards.has(');
changes += count_disappearingCardsHas;
console.log(`✅ disappearingCards.has → battle.disappearingCards.has: ${count_disappearingCardsHas}개 변경`);

// hiddenCards
const hiddenCardsHas = /\bhiddenCards\.has\(/g;
const count_hiddenCardsHas = (content.match(hiddenCardsHas) || []).length;
content = content.replace(hiddenCardsHas, 'battle.hiddenCards.has(');
changes += count_hiddenCardsHas;
console.log(`✅ hiddenCards.has → battle.hiddenCards.has: ${count_hiddenCardsHas}개 변경`);

console.log(`\n총 ${changes}개 변경`);

// 파일 저장
fs.writeFileSync(filePath, content);
console.log(`✅ 파일 저장 완료: ${filePath}`);
console.log('\n다음 단계:');
console.log('1. npm run build 로 빌드 테스트');
console.log('2. 문제 있으면 수동 수정');
console.log('3. 성공하면 커밋 후 Phase 3로 진행');
