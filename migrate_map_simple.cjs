#!/usr/bin/env node
/**
 * MapDemo.jsx - useState → useReducer 마이그레이션 (간소화 버전)
 *
 * 5개 useState를 단일 reducer로 통합 (orderedRelics는 복잡한 초기화 로직으로 인해 그대로 유지)
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'map', 'MapDemo.jsx');

let content = fs.readFileSync(filePath, 'utf8');

// 백업
fs.writeFileSync(filePath + '.map_simple_backup', content);
console.log('✅ 백업 생성: MapDemo.jsx.map_simple_backup');

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

// 3. 5개 useState 제거 (orderedRelics 및 relicActivated 제외)
const simpleStatesPattern = /  const \[showCharacterSheet, setShowCharacterSheet\] = useState\(false\);\\n  const \[isDungeonExploring, setIsDungeonExploring\] = useState\(false\);\\n  const \[devToolsOpen, setDevToolsOpen\] = useState\(false\);\\n  const \[hoveredRelic, setHoveredRelic\] = useState\(null\);/;

const hookInsertion = `  // Map UI 상태 (useReducer 기반) - orderedRelics/relicActivated는 아래에서 별도 관리
  const { mapUI, actions } = useMapState({});

  // Destructure map UI state
  const showCharacterSheet = mapUI.showCharacterSheet;
  const isDungeonExploring = mapUI.isDungeonExploring;
  const devToolsOpen = mapUI.devToolsOpen;
  const hoveredRelic = mapUI.hoveredRelic;`;

if (content.match(simpleStatesPattern)) {
  content = content.replace(simpleStatesPattern, hookInsertion);
  changes += 4;
  console.log('✅ 4개 useState 제거 및 useMapState로 교체');
}

// 4. orderedRelics와 relicActivated를 Map UI 상태에 추가
// orderedRelics useState를 제거하고 reducer로 이동
const orderedRelicsPattern = /  const \[orderedRelics, setOrderedRelics\] = useState\(\(\) => \{[\\s\\S]*?\}\);/;
const orderedRelicsReplacement = `  // orderedRelics 초기값 (localStorage 복원)
  const initialOrderedRelics = useMemo(() => {
    try {
      const saved = localStorage.getItem("relicOrder");
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length) return mergeRelicOrder(relics || [], ids);
      }
    } catch { }
    return relics || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // orderedRelics를 useMapState에 추가
  const orderedRelics = mapUI.orderedRelics || initialOrderedRelics;`;

if (content.match(orderedRelicsPattern)) {
  content = content.replace(orderedRelicsPattern, orderedRelicsReplacement);
  changes++;
  console.log('✅ orderedRelics useState 제거 및 reducer로 이동');
}

// 5. relicActivated useState 제거
const relicActivatedPattern = /  const \[relicActivated, setRelicActivated\] = useState\(null\);/;
const relicActivatedReplacement = `  const relicActivated = mapUI.relicActivated;`;

if (content.match(relicActivatedPattern)) {
  content = content.replace(relicActivatedPattern, relicActivatedReplacement);
  changes++;
  console.log('✅ relicActivated useState 제거');
}

// 6. initialOrderedRelics를 useMapState 초기값으로 전달하도록 수정
const useMapStatePattern = /const \{ mapUI, actions \} = useMapState\(\{\}\);/;
const useMapStateFixed = `const { mapUI, actions } = useMapState({
    orderedRelics: initialOrderedRelics,
  });`;

if (content.match(useMapStatePattern)) {
  content = content.replace(useMapStatePattern, useMapStateFixed);
  changes++;
  console.log('✅ useMapState에 initialOrderedRelics 전달 추가');
}

// 7. setter 호출을 actions로 변경
const setterReplacements = [
  { old: /\\bsetShowCharacterSheet\\(/g, new: 'actions.setShowCharacterSheet(', name: 'setShowCharacterSheet' },
  { old: /\\bsetIsDungeonExploring\\(/g, new: 'actions.setIsDungeonExploring(', name: 'setIsDungeonExploring' },
  { old: /\\bsetDevToolsOpen\\(/g, new: 'actions.setDevToolsOpen(', name: 'setDevToolsOpen' },
  { old: /\\bsetHoveredRelic\\(/g, new: 'actions.setHoveredRelic(', name: 'setHoveredRelic' },
  { old: /\\bsetOrderedRelics\\(/g, new: 'actions.setOrderedRelics(', name: 'setOrderedRelics' },
  { old: /\\bsetRelicActivated\\(/g, new: 'actions.setRelicActivated(', name: 'setRelicActivated' },
];

setterReplacements.forEach(({ old, new: replacement, name }) => {
  const matches = content.match(old);
  if (matches) {
    content = content.replace(old, replacement);
    changes += matches.length;
    console.log(`✅ ${name} → ${replacement.slice(0, -1)}: ${matches.length}개 변경`);
  }
});

console.log(`\\n총 ${changes}개 변경`);

fs.writeFileSync(filePath, content);
console.log(`\\n✅ 파일 저장 완료: ${filePath}`);
console.log('\\n다음 단계:');
console.log('1. npm run build로 빌드 테스트');
console.log('2. 성공하면 커밋');
