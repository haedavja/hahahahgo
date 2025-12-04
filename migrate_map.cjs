#!/usr/bin/env node
/**
 * MapDemo.jsx - useState → useReducer 마이그레이션
 *
 * 6개 useState를 단일 reducer로 통합
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'map', 'MapDemo.jsx');

let content = fs.readFileSync(filePath, 'utf8');

// 백업
fs.writeFileSync(filePath + '.map_backup', content);
console.log('✅ 백업 생성: MapDemo.jsx.map_backup');

let changes = 0;

// 1. useReducer import 추가
const oldImport = /import \{ useEffect, useMemo, useRef, useState, useCallback \} from "react";/g;
const newImport = `import { useEffect, useMemo, useRef, useState, useCallback, useReducer } from "react";`;
if (content.match(oldImport)) {
  content = content.replace(oldImport, newImport);
  changes++;
  console.log('✅ useReducer import 추가');
}

// 2. useMapState import 추가
const importInsertPoint = /import \{ useEffect, useMemo, useRef, useState, useCallback, useReducer \} from "react";/;
const mapImport = `import { useEffect, useMemo, useRef, useState, useCallback, useReducer } from "react";
import { useMapState } from "./hooks/useMapState";`;
if (content.match(importInsertPoint)) {
  content = content.replace(importInsertPoint, mapImport);
  changes++;
  console.log('✅ useMapState import 추가');
}

// 3. useState 선언 제거 및 useMapState로 교체
// orderedRelics는 초기화 로직이 복잡하므로 초기값만 추출
const stateBlockPattern = /  const \[showCharacterSheet, setShowCharacterSheet\] = useState\(false\);[\s\S]*?  const \[relicActivated, setRelicActivated\] = useState\(null\);/;

const hookInsertion = `  // orderedRelics 초기값 계산 (localStorage 복원)
  const initialOrderedRelics = useMemo(() => {
    try {
      const saved = localStorage.getItem("relicOrder");
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length) {
          // mergeRelicOrder는 아래에서 정의되므로 여기서는 단순 반환
          return ids;
        }
      }
    } catch { }
    return relics || [];
  }, []); // 초기 마운트 시에만 실행

  // Map UI 상태 (useReducer 기반)
  const { mapUI, actions } = useMapState({
    orderedRelics: initialOrderedRelics,
  });

  // Destructure map UI state
  const showCharacterSheet = mapUI.showCharacterSheet;
  const isDungeonExploring = mapUI.isDungeonExploring;
  const devToolsOpen = mapUI.devToolsOpen;
  const hoveredRelic = mapUI.hoveredRelic;
  const orderedRelics = mapUI.orderedRelics;
  const relicActivated = mapUI.relicActivated;`;

if (content.match(stateBlockPattern)) {
  content = content.replace(stateBlockPattern, hookInsertion);
  changes += 6;
  console.log('✅ 6개 useState 제거 및 useMapState로 교체');
}

// 4. setter 호출을 actions로 변경
const setterReplacements = [
  { old: /\bsetShowCharacterSheet\(/g, new: 'actions.setShowCharacterSheet(', name: 'setShowCharacterSheet' },
  { old: /\bsetIsDungeonExploring\(/g, new: 'actions.setIsDungeonExploring(', name: 'setIsDungeonExploring' },
  { old: /\bsetDevToolsOpen\(/g, new: 'actions.setDevToolsOpen(', name: 'setDevToolsOpen' },
  { old: /\bsetHoveredRelic\(/g, new: 'actions.setHoveredRelic(', name: 'setHoveredRelic' },
  { old: /\bsetOrderedRelics\(/g, new: 'actions.setOrderedRelics(', name: 'setOrderedRelics' },
  { old: /\bsetRelicActivated\(/g, new: 'actions.setRelicActivated(', name: 'setRelicActivated' },
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
