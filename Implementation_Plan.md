# Implementation Plan.md

> 대상: 탑뷰 동시턴 로그라이크 SRPG (**속도 시스템 포함**)  
> 기반 문서: GDD, 속도 규칙 초안, 기술 스택 가이드, battle.html 시제품  
> 2025-11-14 현황: `new/strategy-map` 폴더에 Vite + React + Phaser 구조를 리셋하고 battle.html을 iframe으로 연결

---

## 0) 프로젝트 베이스라인 고정

**목표**  
- 실행 중인 `new/strategy-map` 폴더만으로 개발·배포가 가능하도록 구조를 확정한다.

**작업 목록**  
1. `npm run dev`, `npm run build`가 모두 성공하도록 의존성 및 스크립트 정리  
2. `src/components`, `src/state`, `public/battle.html` 등 주요 폴더 설명 문서화  
3. 매일 `DEVLOG-YYYY-MM-DD.md`에 작업 내역 기록

**검증**  
- build/dev 명령을 실행해 성공 여부 확인  
- battle 노드 클릭 → 전투 → 맵 복귀 흐름을 수동 테스트

---

## 1) 맵 ↔ 전투 전환 안정화

**목표**  
- `LegacyBattleScreen`(React)과 battle.html 간 `postMessage` 프로토콜을 고정하고, 전투 결과가 맵 상태에 즉시 반영되도록 한다.

**작업 목록**  
1. `battleReady → battleInit → battleResult` 메시지 흐름 로깅  
2. `resolveBattle()` 실행 후 `lastBattleResult` 모달 자동 닫힘 (`formatBattleLogEntry` 포함)  
3. 단일 전투 모드(`singleBattle`)에서 승리 시 바로 맵으로 복귀 가능하도록 처리

**검증**  
- Quick Battle 승/패 시나리오 각각 1회 테스트  
- 전투 종료 후 화면이 “Battle”에 고정되지 않는지 확인

---

## 2) battle.html 안정화 및 수정 가이드

**목표**  
- battle.html 원본을 유지하고, 기능 추가가 필요할 때 작은 단위로 적용·검증한다.

**작업 목록**  
1. 실행작업물/의 battle.html을 `public/`에 그대로 복사(UTF-8 유지)  
2. battle.html 수정 시 단계별 체크리스트 작성 및 백업 후 작업  
3. 수정 후 `npm run build`로 Babel SyntaxError 여부 확인

**검증**  
- `view-source:/battle.html`에서 `<div id="root">`와 Babel 스크립트가 보이는지 확인  
- 브라우저 콘솔에 SyntaxError가 없는지 확인

---

## 3) 에테르/조합 시스템 확장 (향후)

**목표**  
- 맵/전투가 같은 에테르 자원을 공유하고, 조합(포커 핸드)별 에테르 보상을 UI에 표시한다.

**예정 작업**  
1. `resources.aether`를 battle.html에 전달해 전투 중 획득/소모를 반영  
2. `ETHER_GAIN_MAP`을 battle UI에 노출하고, `(+n Ether)` 정보를 조합 배지에 표시  
3. 전투 종료 후 맵에서도 동일한 에테르 값으로 이어지게 상태 저장

**검증**  
- 조합 배지에 `(+n Ether)`가 노출되는지 확인  
- 전투 후 `resources.aether` 값이 맞게 업데이트되는지 확인

---

## 4) UI/UX & 로그 개선

**목표**  
- “왜 지금 순서/피해가 이렇게 되었나”를 설명할 수 있는 로그/타임라인 구조를 확립한다.

**작업 목록**  
1. `formatBattleLogEntry` 확장 및 표준 메시지 표 작성  
2. `MapDemo` 타임라인과 battle.html 타임라인 색상/용어 통일  
3. 이벤트/던전/자원 HUD/에테르 표시의 위치와 시각 요소 정리

**검증**  
- 신규 플레테스터 1명을 대상으로 로그만 보고 3턴 시나리오를 설명할 수 있는지 평가

---

## 5) 문서/기록 체계

**목표**  
- 다른 담당자가 언제든 작업을 이어받을 수 있도록 계획/진행 문서를 정비한다.

**작업 목록**  
1. `Implementation_Plan.md`, `game-progress-md.md`, `통합규칙.md`를 UTF-8로 재작성  
2. `DEVLOG-YYYY-MM-DD.md`에 일별 작업/이슈/원인 기록  
3. `README`와 `tech-stack.md`에 폴더 구조, 실행 방법, 주의사항 업데이트

**검증**  
- 문서가 모두 읽을 수 있는 상태인지 확인  
- 신규 담당자가 문서만 보고 실행 방법과 주의 사항을 이해할 수 있는지 체크

---

## Definition of Done

1. battle.html과 React가 서로 간섭 없이 동작하며, 전투 승/패 후 맵으로 자연스럽게 복귀  
2. 전투 로그/모달이 오류 없이 렌더링되고, 최소한의 설명력을 확보  
3. `new/strategy-map` 폴더 단위 백업만으로 전체 프로젝트를 복구할 수 있음  
4. 에테르/조합 확장 작업을 시작할 수 있는 명확한 가이드와 기록이 완료됨
