# useState → useReducer 마이그레이션 진행 상황

## ✅ 완료된 작업

### 1. battleReducer 확장 (100% 완료)
- **파일**: `src/components/battle/reducer/battleReducer.js`
- **내용**: 모든 70+ 상태를 포함하도록 확장
- **추가된 상태**:
  - 애니메이션: `playerBlockAnim`, `enemyBlockAnim`
  - 자동진행 & 스냅샷: `autoProgress`, `resolveStartPlayer`, `resolveStartEnemy`, `respondSnapshot`, `rewindUsed`
  - 유물 UI: `hoveredRelic`, `relicActivated`, `activeRelicSet`, `multiplierPulse`
  - 전투 진행: `resolvedPlayerCards`
  - 카드 툴팁: `hoveredCard`, `tooltipVisible`, `previewDamage`
  - 통찰 시스템: `insightBadge`, `insightAnimLevel`, `insightAnimPulseKey`, `showInsightTooltip`
  - 적 행동 툴팁: `hoveredEnemyAction`

### 2. useBattleState Hook 확장 (100% 완료)
- **파일**: `src/components/battle/hooks/useBattleState.js`
- **변경사항**:
  - 모든 새 상태에 대한 액션 생성자 추가
  - 초기화 방식 변경: 직접 상태 오버라이드 지원
  - 반환 형식 변경: `[state, actions]` → `{ battle, actions }`

### 3. LegacyBattleApp.jsx 초기화 (100% 완료)
- **파일**: `src/components/battle/LegacyBattleApp.jsx`
- **변경사항**:
  - `useBattleState` import 추가
  - `useReducer` import 추가
  - `useBattleState`로 상태 초기화
  - `orderedRelics`는 localStorage 로직 때문에 별도 useState 유지
  - 모든 refs 유지 (lethalSoundRef, overkillSoundRef, etc.)

### 4. 빌드 테스트 (통과 ✅)
- `npm run build` 성공 (경고만 있음, 기존 이슈)

---

## ⏳ 남은 작업 (아직 미완성)

### 1. 모든 상태 참조를 `battle.*` 형태로 변경 ❌
**현재 상태**: 아직 시작 안 됨

**작업 내용**:
- LegacyBattleApp.jsx 파일 전체(4,300+ 줄)에서 다음 패턴들을 찾아 변경:

```javascript
// Before
player
enemy
phase
hand
selected
canRedraw
sortType
// ... (70개 이상의 상태)

// After
battle.player
battle.enemy
battle.phase
battle.hand
battle.selected
battle.canRedraw
battle.sortType
// ...
```

**권장 방법**:
1. Grep으로 각 상태 이름을 검색
2. 컨텍스트를 보고 올바른 참조인지 확인
3. Edit 도구로 작은 범위씩 변경
4. 각 변경 후 빌드 테스트

**예상 변경 위치**:
- useEffect 의존성 배열
- useMemo/useCallback 의존성
- 조건문 (if, switch)
- 함수 인자
- JSX 표현식
- 계산식

### 2. 모든 setState를 `actions.*` 형태로 변경 ❌
**현재 상태**: 아직 시작 안 됨

**작업 내용**:
- 모든 `setXxx()` 호출을 `actions.setXxx()`로 변경:

```javascript
// Before
setPlayer({ ...player, hp: 10 })
setEnemy({ ...enemy, hp: 20 })
setPhase('resolve')
setHand([...])
setSelected([])
// ... (70개 이상의 setter)

// After
actions.setPlayer({ ...battle.player, hp: 10 })
actions.setEnemy({ ...battle.enemy, hp: 20 })
actions.setPhase('resolve')
actions.setHand([...])
actions.setSelected([])
// ...
```

**특별히 주의할 setter들**:
- `setPlayer(prev => ...)` → `actions.updatePlayer({ ... })` (부분 업데이트)
- `setEnemy(prev => ...)` → `actions.updateEnemy({ ... })` (부분 업데이트)
- `setLog(prev => [...prev, msg])` → `actions.addLog(msg)` (전용 헬퍼)
- `setQIndex(prev => prev + 1)` → `actions.incrementQIndex()` (전용 헬퍼)
- `setTurnNumber(prev => prev + 1)` → `actions.incrementTurn()` (전용 헬퍼)

**유지해야 할 setter** (별도 useState):
- `setOrderedRelics()` - localStorage 로직 때문

---

## 📊 진행률

| 단계 | 상태 | 진행률 |
|------|------|--------|
| 1. battleReducer 확장 | ✅ 완료 | 100% |
| 2. useBattleState Hook 확장 | ✅ 완료 | 100% |
| 3. LegacyBattleApp 초기화 | ✅ 완료 | 100% |
| 4. 상태 참조 변경 (battle.*) | ❌ 미완 | 0% |
| 5. setState 변경 (actions.*) | ❌ 미완 | 0% |
| 6. 런타임 테스트 | ❌ 대기 | 0% |
| **전체** | **⚠️ 진행 중** | **약 40%** |

---

## 🚨 중요 주의사항

### 1. HP 바 주변 코드 (3700줄대)
- **문제**: 파일이 너무 커서 apply_patch 실패 가능
- **해결**: Grep → Read (offset + limit) → Edit 사용

### 2. 대량 변경의 위험성
- **위험**: 4,300+ 줄 파일에서 수백 개의 참조를 한 번에 변경하면 실수 가능성 높음
- **권장**: 작은 섹션으로 나누어 변경하고 각각 테스트

### 3. useCallback/useMemo 의존성 배열
- 상태 참조가 변경되면 의존성 배열도 업데이트 필요:
```javascript
// Before
useCallback(() => {
  setPlayer(...)
}, [player])

// After
useCallback(() => {
  actions.setPlayer(...)
}, [actions, battle.player])
```

---

## 🎯 다음 단계

1. **안전한 접근법**:
   - 한 번에 한 상태씩 변경 (예: `player` → `battle.player`)
   - Grep으로 모든 사용처 찾기
   - 각 사용처를 신중하게 변경
   - 빌드 테스트
   - 다음 상태로 이동

2. **우선 순위가 높은 상태들**:
   - `player` (가장 많이 사용됨)
   - `enemy`
   - `phase`
   - `hand`, `selected`
   - `queue`, `qIndex`

3. **테스트 전략**:
   - 빌드 테스트: `npm run build`
   - 런타임 테스트: `npm run dev` 후 전투 진입 및 플레이
   - 모든 기능 테스트:
     - 카드 선택
     - 전투 진행
     - 에테르 시스템
     - 유물 효과
     - 승리/패배

---

## 📝 변경 기록

- **2025-12-03**: 인프라 구축 완료 (battleReducer, useBattleState, 초기화)
- **다음**: 상태 참조 및 setter 마이그레이션 필요

---

## 💡 유용한 Grep 패턴

```bash
# player 상태 사용처 찾기
grep -n "player\." LegacyBattleApp.jsx
grep -n "setPlayer" LegacyBattleApp.jsx

# enemy 상태 사용처 찾기
grep -n "enemy\." LegacyBattleApp.jsx
grep -n "setEnemy" LegacyBattleApp.jsx

# phase 상태 사용처 찾기
grep -n "phase ===" LegacyBattleApp.jsx
grep -n "setPhase" LegacyBattleApp.jsx
```

---

**현재 상태**: 인프라 완성, 실제 마이그레이션 대기 중
**예상 남은 시간**: 2-3시간 (신중한 수동 작업 필요)
