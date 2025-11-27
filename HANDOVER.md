# 프로젝트 인수인계 문서

## 프로젝트 개요
포커 스타일 콤보 시스템을 사용하는 덱빌딩 로그라이크 게임

## 최근 작업 내역 (2025-11-27)

### 1. 유물(Relic) 시스템 버그 수정 및 개선

#### 커밋 히스토리
```
cec60b6 - Fix relic highlighting logic for conditional effects
5791795 - Improve relic visual feedback and deflation badge position
d34684f - Add visual feedback for active relics
178dedd - Fix Devil's Dice multiplier display to show total multiplier
2a3cf79 - fix: 희귀한 조약돌 유물 효과 수정 및 에테르 미리보기 구현
7b47893 - fix: 계약서 유물 - 현재 에너지 UI 표시 문제 수정
```

#### 수정된 주요 버그들

1. **계약서 유물 (Contract Relic)**
   - 문제: 행동력 보너스가 UI에 표시되지 않음 (6/7 대신 8/7 표시되어야 함)
   - 원인: `playerEnergyBudget`이 `player.maxEnergy` 사용
   - 해결: `player.energy` 사용으로 변경
   - 파일: `src/components/battle/LegacyBattleApp.jsx:2260`

2. **은화 유물 (Silver Coin)**
   - 문제: 유물 소지 시 전투가 종료되지 않음
   - 원인: 존재하지 않는 `setPlayerStrength` 함수 호출
   - 해결: `setPlayer(p => ({ ...p, strength: newStrength }))` 사용
   - 파일: `src/components/battle/LegacyBattleApp.jsx:1999-2003`

3. **희귀한 조약돌 유물 (Rare Stone)**
   - 문제: 에테르 배율이 잘못된 단계에서 적용됨
   - 요구사항: 카드당 10pt → 20pt로 증가 (콤보 배율 전에 적용)
   - 해결: `stepOnce`에서 카드 플레이 시점에 적용, `calculateEtherGain`에서 중복 적용 제거
   - 파일:
     - `src/components/battle/LegacyBattleApp.jsx:1764-1774`
     - `src/lib/relicEffects.js:237-238` (주석 처리)

4. **에테르 미리보기 (Ether Preview)**
   - 문제: 유물 효과가 반영되지 않은 값 표시
   - 해결: `useMemo`로 모든 유물 효과 포함한 정확한 미리보기 계산
   - 파일: `src/components/battle/LegacyBattleApp.jsx:2313-2338`

5. **악마의 주사위 배율 표시**
   - 문제: 최종값은 정상이나 배율 텍스트에 5x 대신 전체 배율 미표시
   - 예: "+50pt × 5.00 = 1250pt" → "+50pt × 25.00 = 1250pt"
   - 해결: `actualTotalMultiplier = playerBeforeDeflation / turnEtherAccumulated` 계산
   - 파일: `src/components/battle/LegacyBattleApp.jsx:2088-2094`

6. **하이카드 콤보 추가**
   - 요구사항: 카드 1장 또는 조합 없는 카드들을 "하이카드" 1.0배로 처리
   - 해결: `detectPokerCombo`에 하이카드 로직 추가, `COMBO_MULTIPLIERS`에 추가
   - 파일: `src/components/battle/LegacyBattleApp.jsx:263-302, 343-352`

### 2. 유물 시각적 피드백 시스템

#### 구현 내용

**지속 효과 유물 (항상 노란색 강조):**
- 🔮 에테르 수정 (최대 행동력 +1)
- 🧥 긴 옷 (보조특기 슬롯 +1)
- 👟 트레이닝 부츠 (최대체력 +10)
- 🪨 희귀한 조약돌 (에테르 2배)
- 💍 강철반지 (최대 행동력 +2)
- 🧤 현자주먹 장갑 (보조특기 슬롯 +2)
- 🍀 행운의 동전 (카드 추출확률 +20%)
- 🥕 셀러리와 당근 (민첩 +1)
- 🥾 강철 군화 (민첩 -1, 힘 +3)
- 📚 참고서 (카드 수 비례 배율)
- 📓 노력의 일지 (주특기 슬롯 +1)
- 🧪 충성물약 (카드 추출확률 +30%)
- 🛡️ 피피한 갑옷 (턴 시작 시 방어력 +8)

**조건부 발동 유물 (발동 시에만 흔들림):**
- 💎 에테르 결정 (카드당 콤보 배율 +2.0)
- 🎲 악마의 주사위 (5장 시 5배)
- 🌿 붉은약초 (전투 종료 시 체력 +5)
- 📜 계약서 (카드 4장 이상 시 다음턴 행동력 +2)
- 🪙 은화 (턴 종료 시 힘 +1)
- ✨ 황금 약초 (전투 종료 시 체력 +10)
- 🎭 불멸의 가면 (카드 사용 시 체력 +1)
- 🧭 적색의 지남철 (맵 이동 시 에테르 +2%)
- ❤️ 철의 심장 (피해 시 다음턴 방어력/체력 +1)
- 📋 건강검진표 (전투 종료 시 조건부 효과)

#### 시각 효과
- 배경: `rgba(251, 191, 36, 0.3)`
- 테두리: `2px solid rgba(251, 191, 36, 0.8)`
- 외곽 글로우: `0 0 15px rgba(251, 191, 36, 0.5)`
- 애니메이션: `@keyframes relicActivate` (0.5초 흔들림)
- 사운드: 800Hz (일반), 900Hz (악마의 주사위)

#### 구현 위치
- 유물 표시 로직: `src/components/battle/LegacyBattleApp.jsx:2463-2469`
- 턴 시작 발동: `src/components/battle/LegacyBattleApp.jsx:1236-1243`
- 턴 종료 발동: `src/components/battle/LegacyBattleApp.jsx:1972-1983`
- 에테르 발동: `src/components/battle/LegacyBattleApp.jsx:2016-2039`
- CSS 애니메이션: `src/components/battle/legacy-battle.css:1354-1367`

### 3. UI 개선

#### 디플레이션 배지 위치 조정
- 변경: `left: 'calc(50% + 80px)'` → `left: 'calc(50% + 120px)'`
- 위치: `src/components/battle/LegacyBattleApp.jsx:2637`

## 핵심 파일 구조

```
src/
├── components/
│   └── battle/
│       ├── LegacyBattleApp.jsx  # 메인 전투 로직 (~3200줄)
│       └── legacy-battle.css     # 전투 스타일 및 애니메이션
├── data/
│   └── relics.js                 # 유물 정의 (READ ONLY)
└── lib/
    ├── relicEffects.js           # 유물 효과 계산 유틸리티
    └── relics.js                 # 유물 보조 함수
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
function startPlayerTurn()
// 위치: Line 1218-1280
// 유물 턴 시작 효과, 에너지 계산, 손패 드로우
```

**턴 종료**
```javascript
function finishTurn()
// 위치: Line 1894-2139
// 유물 턴 종료 효과, 에테르 최종 계산, 디플레이션 적용
```

### relicEffects.js

```javascript
calculatePassiveEffects(relicIds)
// PASSIVE 효과 집계 (maxEnergy, strength, agility 등)

applyTurnStartEffects(relicIds, state)
// ON_TURN_START 효과 처리 (block, heal, energy)

applyTurnEndEffects(relicIds, state)
// ON_TURN_END 효과 처리 (strength, energyNextTurn)

calculateEtherGain(baseEther, cardsPlayed, relicIds)
// 에테르 유물 효과 적용 (참고서, 악마의 주사위)
```

## 알려진 이슈 및 주의사항

### 1. React 상태 업데이트 타이밍
- `setPlayer` 내부에서 `addLog` 호출 시 중복 로그 발생 가능
- 해결: `addLog`를 `setState` 외부로 이동

### 2. 에테르 계산 순서
- 희귀한 조약돌은 **반드시** `stepOnce`에서 카드당 적용
- `calculateEtherGain`에서 중복 적용 방지 필요

### 3. 유물 발동 애니메이션
- `setTimeout(() => setRelicActivated(null), 500)` 사용
- 여러 유물 동시 발동 시 마지막 유물만 애니메이션 표시될 수 있음
- 현재는 0.5초 간격으로 순차 발동

### 4. 조건부 유물 체크
- 턴 종료 유물의 경우 `condition` 함수 확인 필수
- 예: 계약서는 `cardsPlayedThisTurn >= 4` 체크

## 다음 작업 제안

### 우선순위 높음
1. 유물 발동 애니메이션 큐잉 시스템 (여러 유물 동시 발동 시)
2. 전투 종료 시 유물 효과 처리 (건강검진표 등)
3. 카드 사용 시 유물 발동 피드백 (불멸의 가면)

### 우선순위 중간
1. 유물 툴팁 개선 (현재 효과값 표시)
2. 유물 획득 애니메이션
3. 유물 조합 시너지 표시

### 우선순위 낮음
1. 유물 효과 히스토리 로그
2. 유물 정렬/필터 기능
3. 유물 도감

## 테스트 체크리스트

전투 시작 전:
- [ ] 유물 목록이 정상 표시되는가?
- [ ] PASSIVE 유물이 노란색으로 강조되는가?
- [ ] 유물 툴팁이 정상 작동하는가?

턴 시작 시:
- [ ] 피피한 갑옷이 방어력 8을 제공하는가?
- [ ] 피피한 갑옷이 흔들리는가?
- [ ] 계약서 보너스 에너지가 UI에 표시되는가?

카드 플레이 시:
- [ ] 희귀한 조약돌이 카드당 20pt를 제공하는가?
- [ ] 에테르 미리보기가 정확한가?
- [ ] 에테르 결정이 배율을 증가시키는가?
- [ ] 에테르 결정이 발동 시 흔들리는가?

턴 종료 시:
- [ ] 은화가 힘을 증가시키는가?
- [ ] 은화가 발동 시 흔들리는가?
- [ ] 계약서가 4장 이상 시 발동하는가?
- [ ] 계약서가 발동 시 흔들리는가?
- [ ] 악마의 주사위가 5장 시 5배를 적용하는가?
- [ ] 악마의 주사위가 발동 시 흔들리는가?
- [ ] 악마의 주사위 배율이 로그에 정확히 표시되는가?

전투 종료 시:
- [ ] 붉은약초/황금약초가 체력을 회복시키는가?
- [ ] 건강검진표가 조건에 따라 작동하는가?

## 연락처 및 참고자료

- 이전 Claude Code 세션 로그: `.claude/projects/z--------memory-bank--claude/`
- Git 히스토리: `git log --oneline --graph`
- 유물 데이터: `src/data/relics.js`

---
작성일: 2025-11-27
작성자: Claude Code (Anthropic)
인수인계 대상: GPT Codex
