#!/usr/bin/env node
/**
 * DungeonExploration.jsx - useState → useReducer 마이그레이션
 *
 * 9개 useState를 단일 reducer로 통합
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'dungeon', 'DungeonExploration.jsx');

let content = fs.readFileSync(filePath, 'utf8');

// 백업
fs.writeFileSync(filePath + '.dungeon_backup', content);
console.log('✅ 백업 생성: DungeonExploration.jsx.dungeon_backup');

let changes = 0;

// 1. useState import를 useReducer 추가
const oldImport = /import \{ useState, useEffect, useRef \} from "react";/g;
const newImport = `import { useState, useEffect, useRef, useReducer } from "react";`;
if (content.match(oldImport)) {
  content = content.replace(oldImport, newImport);
  changes++;
  console.log('✅ useReducer import 추가');
}

// 2. useDungeonState import 추가
const importInsertPoint = /import { useState, useEffect, useRef, useReducer } from "react";/;
const dungeonImport = `import { useState, useEffect, useRef, useReducer } from "react";\nimport { useDungeonState } from "./hooks/useDungeonState";`;
if (content.match(importInsertPoint)) {
  content = content.replace(importInsertPoint, dungeonImport);
  changes++;
  console.log('✅ useDungeonState import 추가');
}

// 3. useState 선언 제거
const statePatterns = [
  { old: /  const \[segmentIndex, setSegmentIndex\] = useState\(activeDungeon\?\. segmentIndex \|\| 0\);\\n/g, name: 'segmentIndex' },
  { old: /  const \[playerX, setPlayerX\] = useState\(activeDungeon\?\.playerX \|\| 100\);\\n/g, name: 'playerX' },
  { old: /  const \[cameraX, setCameraX\] = useState\(0\);\\n/g, name: 'cameraX' },
  { old: /  const \[keys, setKeys\] = useState\(\{\}\);\\n/g, name: 'keys' },
  { old: /  const \[message, setMessage\] = useState\(""\);\\n/g, name: 'message' },
  { old: /  const \[rewardModal, setRewardModal\] = useState\(null\);\\n/g, name: 'rewardModal' },
  { old: /  const \[showCharacter, setShowCharacter\] = useState\(false\);\\n/g, name: 'showCharacter' },
  { old: /  const \[dungeonSummary, setDungeonSummary\] = useState\(null\); \/\/ 던전 탈출 요약\\n/g, name: 'dungeonSummary' },
  { old: /  const \[hoveredRelic, setHoveredRelic\] = useState\(null\);\\n/g, name: 'hoveredRelic' },
];

// 4. useDungeonState Hook 사용 추가 (useState 제거 후)
const hookInsertion = `  // Dungeon 상태 (useReducer 기반)
  const { dungeon, actions } = useDungeonState({
    segmentIndex: activeDungeon?.segmentIndex || 0,
    playerX: activeDungeon?.playerX || 100,
  });

  // Destructure dungeon state
  const segmentIndex = dungeon.segmentIndex;
  const playerX = dungeon.playerX;
  const cameraX = dungeon.cameraX;
  const keys = dungeon.keys;
  const message = dungeon.message;
  const rewardModal = dungeon.rewardModal;
  const showCharacter = dungeon.showCharacter;
  const dungeonSummary = dungeon.dungeonSummary;
  const hoveredRelic = dungeon.hoveredRelic;
`;

// useState 선언 찾아서 모두 제거하고 hookInsertion으로 교체
const firstStatePattern = /  const \[segmentIndex, setSegmentIndex\] = useState\(activeDungeon\?\.segmentIndex \|\| 0\);/;
if (content.match(firstStatePattern)) {
  // 첫 번째 useState부터 마지막 useState까지 모두 찾기
  const stateBlockPattern = /  const \[segmentIndex[\s\S]*?const \[hoveredRelic, setHoveredRelic\] = useState\(null\);/;
  content = content.replace(stateBlockPattern, hookInsertion);
  changes += 9;
  console.log('✅ 9개 useState 제거 및 useDungeonState로 교체');
}

// 5. setter 호출을 actions로 변경
const setterReplacements = [
  { old: /\bsetSegmentIndex\(/g, new: 'actions.setSegmentIndex(', name: 'setSegmentIndex' },
  { old: /\bsetPlayerX\(/g, new: 'actions.setPlayerX(', name: 'setPlayerX' },
  { old: /\bsetCameraX\(/g, new: 'actions.setCameraX(', name: 'setCameraX' },
  { old: /\bsetKeys\(/g, new: 'actions.setKeys(', name: 'setKeys' },
  { old: /\bsetMessage\(/g, new: 'actions.setMessage(', name: 'setMessage' },
  { old: /\bsetRewardModal\(/g, new: 'actions.setRewardModal(', name: 'setRewardModal' },
  { old: /\bsetShowCharacter\(/g, new: 'actions.setShowCharacter(', name: 'setShowCharacter' },
  { old: /\bsetDungeonSummary\(/g, new: 'actions.setDungeonSummary(', name: 'setDungeonSummary' },
  { old: /\bsetHoveredRelic\(/g, new: 'actions.setHoveredRelic(', name: 'setHoveredRelic' },
];

setterReplacements.forEach(({ old, new: replacement, name }) => {
  const matches = content.match(old);
  if (matches) {
    content = content.replace(old, replacement);
    changes += matches.length;
    console.log(`✅ ${name} → ${replacement.slice(0, -1)}: ${matches.length}개 변경`);
  }
});

console.log(`\n총 ${changes}개 변경`);

fs.writeFileSync(filePath, content);
console.log(`\n✅ 파일 저장 완료: ${filePath}`);
console.log('\n다음 단계:');
console.log('1. npm run build로 빌드 테스트');
console.log('2. 성공하면 커밋');
