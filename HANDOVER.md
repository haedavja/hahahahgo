# 프로젝트 인수인계 문서

## 프로젝트 개요
포커 스타일 콤보 시스템을 사용하는 덱빌딩 로그라이크 게임

## 최근 작업 내역 (2025-11-27)

### 이번 세션 작업 내역

#### 커밋 히스토리
```
0e6dde6 - feat: Blood Shackles relic always highlighted in combat
09fd6bc - fix: Blood Shackles strength display bug
2e2a456 - chore: Update patch version tag to 11-27-05:15
67a4f65 - fix: Apply combat start strength from Blood Shackles correctly
5f7b504 - feat: Add Blood Shackles relic (ON_COMBAT_START)
42abdad - fix: Use actual battle HP instead of simulation in resolveBattle
72173c5 - fix: Prevent turn start effects duplicate execution
```

#### 1. 무한방패 유물 버그 수정
- **문제**: 턴 시작 효과가 3회 중복 실행, 방어력이 제대로 적용되지 않음
- **원인**:
  1. `useEffect` 의존성 배열에 `player.etherPts` 포함 → 에테르 변경 시마다 재실행
  2. 방어력 적용 시 `def` 플래그 누락
- **해결**:
  - `turnStartProcessedRef` 추가로 중복 실행 방지
  - `player.etherPts` 의존성 제거
  - `def: true` 플래그 설정 when block > 0
- **파일**: `src/components/battle/LegacyBattleApp.jsx:1017, 1283-1347`
- **커밋**: 72173c5

#### 2. 전투 결과 체력 동기화 버그 수정
- **문제**: 전투에서 방어 성공했지만 맵으로 돌아가면 체력이 감소됨
- **원인**: `resolveBattle`이 pre-calculated simulation 결과 사용
- **해결**:
  - `onBattleResult`에 실제 `playerHp`, `playerMaxHp` 전달
  - `gameStore.resolveBattle`에서 실제 HP 우선 사용
- **파일**:
  - `src/components/battle/LegacyBattleApp.jsx:1018-1030`
  - `src/components/battle/LegacyBattleScreen.jsx:66-85`
  - `src/state/gameStore.js:618-619`
- **커밋**: 42abdad

#### 3. 피의 족쇄 유물 추가 및 버그 수정
- **유물 스펙**:
  - 이름: 피의 족쇄 (Blood Shackles) ⛓️
  - 등급: COMMON
  - 효과: 전투 시작 시 체력 -5, 힘 +2
  - 타입: ON_COMBAT_START
- **구현**:
  - `src/data/relics.js:157-169` - 유물 정의
  - `src/lib/relicEffects.js:53-75` - `applyCombatStartEffects` 확장
  - `src/components/battle/LegacyBattleScreen.jsx:17-50` - 전투 시작 효과 적용
  - `src/components/battle/LegacyBattleApp.jsx:1242-1260` - 로그 및 애니메이션
- **커밋**: 5f7b504

**버그 수정**:
1. **힘이 적용되지 않는 문제**
   - **원인**: `executeCardAction`의 임시 상태 객체 `P`에 `strength` 속성 누락
   - **해결**: `P` 초기화에 `strength: player.strength || 0` 추가
   - **파일**: `src/components/battle/LegacyBattleApp.jsx:1792`
   - **커밋**: 09fd6bc

2. **유물 애니메이션 문제**
   - **원인**: 피의 족쇄가 `isPersistent` 체크에 포함되지 않음
   - **해결**: `bloodShackles`를 항상 강조 표시하도록 추가
   - **파일**: `src/components/battle/LegacyBattleApp.jsx:2574-2578`
   - **커밋**: 0e6dde6

#### 4. 패치 버전 태그 갱신
- `PATCH_VERSION_TAG`: "11-27-03:07" → "11-27-05:15"
- **파일**: `src/components/map/MapDemo.jsx:119`
- **커밋**: 2e2a456

### 알려진 이슈

#### 🔴 CRITICAL: 힘(Strength) UI 표시 버그
- **현상**: 플레이어가 실제로 힘 2를 보유하고 있으나 UI에는 `💪 힘: 0`으로 표시됨
- **증거**:
  - 모든 콘솔 로그에서 `strength: 2` 확인됨
  - `initialPlayerState.strength: 2` 설정됨
  - 하지만 `useState` 직후 `player.strength: 0`으로 변경
  - 전투 로그: 실제 전투에서는 힘 2가 정상 작동함 (카드 데미지 증가 확인)
- **추정 원인**:
  - React Strict Mode 중복 렌더링 이슈
  - `useState` 초기화 타이밍 문제
  - 초기 렌더링 직후 turnStartProcessedRef 실행 전에 player 상태가 리셋됨
- **시도한 해결책**:
  - ✅ `initialPlayerState`에 `def: false` 추가
  - ✅ turnStart `setPlayer`에 `strength: p.strength || 0` 명시적 보존
  - ✅ `executeCardAction`의 `P` 객체에 `strength` 추가
  - ❌ 여전히 UI에는 0 표시
- **영향**:
  - 게임플레이 정상 작동 (실제 힘은 적용됨)
  - UI 표시만 잘못됨
- **파일**:
  - `src/components/battle/LegacyBattleApp.jsx:932-952` (초기화)
  - `src/components/battle/LegacyBattleApp.jsx:2828-2830` (UI 렌더링)
- **다음 단계**:
  - React DevTools로 실제 상태 확인
  - `player` 상태를 업데이트하는 모든 `setPlayer` 호출 검토
  - 초기화 useEffect 실행 순서 및 타이밍 분석 필요

### 이전 세션 작업 내역

#### 유물(Relic) 시스템 버그 수정 및 개선

**수정된 주요 버그들**:

1. **계약서 유물 (Contract Relic)**
   - 문제: 행동력 보너스가 UI에 표시되지 않음
   - 해결: `player.energy` 사용으로 변경
   - 파일: `src/components/battle/LegacyBattleApp.jsx:2260`

2. **은화 유물 (Silver Coin)**
   - 문제: 유물 소지 시 전투가 종료되지 않음
   - 해결: `setPlayer(p => ({ ...p, strength: newStrength }))` 사용
   - 파일: `src/components/battle/LegacyBattleApp.jsx:1999-2003`

3. **희귀한 조약돌 유물 (Rare Stone)**
   - 문제: 에테르 배율이 잘못된 단계에서 적용됨
   - 해결: `stepOnce`에서 카드 플레이 시점에 적용
   - 파일: `src/components/battle/LegacyBattleApp.jsx:1764-1774`

4. **에테르 미리보기 (Ether Preview)**
   - 문제: 유물 효과가 반영되지 않은 값 표시
   - 해결: `useMemo`로 모든 유물 효과 포함
   - 파일: `src/components/battle/LegacyBattleApp.jsx:2313-2338`

5. **악마의 주사위 배율 표시**
   - 문제: 배율 텍스트 미표시
   - 해결: `actualTotalMultiplier` 계산
   - 파일: `src/components/battle/LegacyBattleApp.jsx:2088-2094`

6. **하이카드 콤보 추가**
   - 카드 1장 또는 조합 없는 카드들을 "하이카드" 1.0배로 처리
   - 파일: `src/components/battle/LegacyBattleApp.jsx:263-302, 343-352`

#### 유물 시각적 피드백 시스템

**지속 효과 유물 (항상 노란색 강조)**:
- 🔮 에테르 수정, 🧥 긴 옷, 👟 트레이닝 부츠, 🪨 희귀한 조약돌, 💍 강철반지
- 🧤 현자주먹 장갑, 🍀 행운의 동전, 🥕 셀러리와 당근, 🥾 강철 군화
- 📚 참고서, 📓 노력의 일지, 🧪 충성물약, 🛡️ 피피한 갑옷
- ⛓️ 피의 족쇄 (NEW)

**조건부 발동 유물 (발동 시에만 흔들림)**:
- 💎 에테르 결정, 🎲 악마의 주사위, 🌿 붉은약초, 📜 계약서
- 🪙 은화, ✨ 황금 약초, 🎭 불멸의 가면, 🧭 적색의 지남철
- ❤️ 철의 심장, 📋 건강검진표

**시각 효과**:
- 배경: `rgba(251, 191, 36, 0.3)`
- 테두리: `2px solid rgba(251, 191, 36, 0.8)`
- 외곽 글로우: `0 0 15px rgba(251, 191, 36, 0.5)`
- 애니메이션: `@keyframes relicActivate` (0.5초 흔들림)

## 핵심 파일 구조

```
src/
├── components/
│   ├── battle/
│   │   ├── LegacyBattleApp.jsx  # 메인 전투 로직 (~3200줄)
│   │   ├── LegacyBattleScreen.jsx # 전투 화면 래퍼
│   │   └── legacy-battle.css     # 전투 스타일 및 애니메이션
│   └── map/
│       └── MapDemo.jsx           # 맵 화면 (패치 버전 태그 위치)
├── data/
│   └── relics.js                 # 유물 정의 (READ ONLY)
├── lib/
│   ├── relicEffects.js           # 유물 효과 계산 유틸리티
│   └── relics.js                 # 유물 보조 함수
└── state/
    └── gameStore.js              # 전역 상태 관리 (zustand)
```

## 주요 시스템 개념

### 에테르 계산 파이프라인
```
1. 카드 플레이 → BASE_ETHER_PER_CARD (10pt) × 희귀한 조약돌 (2배)
2. 카드 수만큼 누적 → turnEtherAccumulated
3. 콤보 감지 → COMBO_MULTIPLIERS 적용
4. 에테르 결정 효과 → 카드당 +2.0 배율
5. 참고서 효과 → (1 + 카드수 × 0.1)배
6. 악마의 주사위 → 5장이면 5배
7. 디플레이션 → 콤보 사용 횟수에 따라 감소
8. 최종 에테르 적용
```

### 유물 효과 타입
- **PASSIVE**: 항상 적용 (스탯 증가, 배율 증가 등)
- **ON_COMBAT_START**: 전투 시작 시 1회
- **ON_COMBAT_END**: 전투 종료 시 1회
- **ON_TURN_START**: 매 턴 시작 시
- **ON_TURN_END**: 매 턴 종료 시
- **ON_CARD_PLAYED**: 카드 사용마다
- **ON_DAMAGE_TAKEN**: 피해 받을 때마다
- **ON_NODE_MOVE**: 맵 이동 시

### 상태 관리
- React useState/useMemo 사용
- 전역 상태: `useGameStore` (zustand)
- 주요 상태:
  - `player`: 플레이어 스탯 (hp, energy, strength, agility, etc.)
  - `relics`: 유물 ID 배열
  - `hand`: 현재 손패
  - `selected`: 선택한 카드
  - `playerTimeline`: 플레이어 타임라인
  - `phase`: 현재 단계 (select, respond, resolve 등)

## 중요 함수

### LegacyBattleApp.jsx

**콤보 감지**
```javascript
function detectPokerCombo(cards)
// 위치: Line 263-302
// 하이카드, 페어, 투페어, 트리플, 플러쉬, 풀하우스, 포카드, 파이브카드 감지
```

**에테르 계산**
```javascript
const previewEtherGain = useMemo(...)
// 위치: Line 2313-2338
// 선택한 카드의 에테르 미리보기 계산
```

**턴 시작**
```javascript
useEffect() // Turn start
// 위치: Line 1283-1366
// 유물 턴 시작 효과, 에너지 계산, 손패 드로우
// turnStartProcessedRef로 중복 실행 방지
```

**턴 종료**
```javascript
function finishTurn()
// 위치: Line 1894-2139
// 유물 턴 종료 효과, 에테르 최종 계산, 디플레이션 적용
```

**카드 실행**
```javascript
function executeCardAction()
// 위치: Line 1788-1920
// 카드 액션 처리, P 객체에 strength 포함 필수
```

### LegacyBattleScreen.jsx

**전투 페이로드 생성**
```javascript
function buildBattlePayload(battle, etherPts, relics, maxHp)
// 위치: Line 7-47
// 전투 시작 시 초기 플레이어/적 상태 계산
// combatStartEffects (피의 족쇄 등) 적용
```

### relicEffects.js

```javascript
calculatePassiveEffects(relicIds)
// PASSIVE 효과 집계 (maxEnergy, strength, agility 등)

applyCombatStartEffects(relicIds, state)
// ON_COMBAT_START 효과 처리 (block, heal, energy, damage, strength)

applyTurnStartEffects(relicIds, state)
// ON_TURN_START 효과 처리 (block, heal, energy)

applyTurnEndEffects(relicIds, state)
// ON_TURN_END 효과 처리 (strength, energyNextTurn)

calculateEtherGain(baseEther, cardsPlayed, relicIds)
// 에테르 유물 효과 적용 (참고서, 악마의 주사위)
```

## 개발 가이드

### 패치 버전 갱신 (중요!)
- **위치**: `src/components/map/MapDemo.jsx:119`
- **형식**: `"MM-DD-HH:mm"` (KST)
- **규칙**: 매 업데이트마다 반드시 갱신할 것!

### 새로운 유물 추가 시
1. `src/data/relics.js`에 유물 정의 추가
2. `src/lib/relicEffects.js`에 효과 로직 추가 (필요시)
3. `src/components/battle/LegacyBattleApp.jsx`에서:
   - 지속 강조가 필요하면 `isPersistent` 체크에 추가 (Line 2574-2578)
   - 발동 타이밍에 맞는 useEffect/함수에서 처리
4. 전투 시작 효과면 `LegacyBattleScreen.jsx` 업데이트

### setPlayer 호출 시 주의사항
- **반드시 모든 중요 속성 보존**: `strength`, `def`, `counter` 등
- 예시:
```javascript
setPlayer(p => ({
  ...p,
  hp: newHp,
  strength: p.strength || 0, // 명시적 보존!
  def: newDef
}));
```

### 디버깅 팁
- React Strict Mode로 인해 2회 렌더링됨
- `turnStartProcessedRef` 같은 ref 플래그로 중복 실행 방지
- 콘솔 로그로 상태 추적 시 초기화/렌더링 시점 구분 필요

## 테스트 체크리스트

### 전투 시작 전
- [ ] 유물 목록이 정상 표시되는가?
- [ ] PASSIVE 유물 + 피의 족쇄가 노란색으로 강조되는가?
- [ ] 유물 툴팁이 정상 작동하는가?

### 전투 시작 시
- [ ] 피의 족쇄: 체력 -5, 로그 표시, 노란색 강조
- [ ] 피의 족쇄: 실제 힘 +2 적용 (카드 데미지 확인)
- [ ] ⚠️ 피의 족쇄: UI에는 💪 힘: 0 표시됨 (알려진 버그)

### 턴 시작 시
- [ ] 피피한 갑옷이 방어력 8을 제공하는가?
- [ ] 무한방패가 방어력 1000을 제공하는가?
- [ ] 턴 시작 효과가 중복 실행되지 않는가?

### 카드 플레이 시
- [ ] 희귀한 조약돌이 카드당 20pt를 제공하는가?
- [ ] 에테르 미리보기가 정확한가?
- [ ] 힘이 카드 데미지에 적용되는가?

### 턴 종료 시
- [ ] 은화가 힘을 증가시키는가?
- [ ] 계약서가 4장 이상 시 발동하는가?
- [ ] 악마의 주사위가 5장 시 5배를 적용하는가?

### 전투 종료 시
- [ ] 실제 전투 결과 HP가 맵에 반영되는가?
- [ ] 붉은약초/황금약초가 체력을 회복시키는가?
- [ ] 건강검진표가 조건에 따라 작동하는가?

## 다음 작업 제안

### 우선순위 높음
1. **힘(Strength) UI 표시 버그 해결** (CRITICAL)
   - React 상태 초기화 타이밍 분석
   - 모든 `setPlayer` 호출 검토
   - useState 초기화 함수 사용 고려
2. 전투 종료 시 유물 효과 처리 (건강검진표 등)
3. 카드 사용 시 유물 발동 피드백 (불멸의 가면)

### 우선순위 중간
1. 유물 발동 애니메이션 큐잉 시스템 (여러 유물 동시 발동 시)
2. 유물 툴팁 개선 (현재 효과값 표시)
3. 유물 획득 애니메이션

### 우선순위 낮음
1. 유물 효과 히스토리 로그
2. 유물 정렬/필터 기능
3. 유물 도감

## 연락처 및 참고자료

- Claude Code 세션 로그: `.claude/projects/`
- Git 히스토리: `git log --oneline --graph`
- 유물 데이터: `src/data/relics.js`

---
작성일: 2025-11-27 05:15 (KST)
작성자: Claude Code (Anthropic)
인수인계 대상: GPT Codex
