# useState → useReducer 마이그레이션 진행 현황

**최종 업데이트**: 2025-12-03 15:30

---

## ✅ 완료된 작업

### Infrastructure (100%)
1. **battleReducer.js**: 모든 70+ 상태 및 액션 정의 ✅
2. **useBattleState.js**: Custom Hook 구현 ✅
3. **LegacyBattleApp.jsx**: 초기화 완료 ✅

### Phase 1: phase 상태 (100% ✅)
- **변경**: 134개
  - `phase` → `battle.phase`: 124개
  - `setPhase()` → `actions.setPhase()`: 10개
- **빌드 테스트**: ✅ 통과
- **커밋**: `7905239`, `c69bf13`
- **스크립트**: `migrate_phase.cjs`

### Phase 2: 배열 상태 + 모든 UI/애니메이션 상태 (100% ✅)

#### 2-1. 배열 상태 마이그레이션
- **자동 변경**: 110개
  - Setters: `setHand`, `setSelected`, `setQueue`, `setQIndex`, `setLog` 등 (40개)
  - State refs: `hand.length`, `selected.map`, `queue[i]` 등 (70개)
- **수동 수정**: 15개
  - Dependency 배열 업데이트 (10+ useEffect/useMemo)
  - `battle.battle.phase` → `battle.phase`
  - `queue[qIndex]` → `queue[battle.qIndex]` (3곳)
  - Functional update 제거: `actions.setHand(prev =>)` → 직접 참조
  - Props 전달: ExpectedDamagePreview에 `battle.qIndex`, `battle.queue`
  - player/enemy/enemyPlan destructure 추가
- **커밋**: `a334452`
- **스크립트**: `migrate_arrays.cjs`

#### 2-2. 런타임 에러 수정
- **Runtime Error 1**: `player is not defined` → player/enemy destructure 추가
- **Runtime Error 2**: `enemyPlan is not defined` → enemyPlan destructure + 4개 setter 수정
- **Runtime Error 3**: `hoveredCard is not defined` → 종합 destructure 필요

#### 2-3. 나머지 모든 Setters 마이그레이션
- **자동 변경**: 114개
  - 37개 setter 함수: `setActiveRelicSet`, `setRelicActivated`, `setMultiplierPulse` 등
  - UI 상태, 애니메이션, 에테르 시스템, 유물, 통찰 등 모든 setter
- **커밋**: `67fe1c3`
- **스크립트**: `fix_remaining_setters.cjs`

#### 2-4. 종합 Destructure 추가 (Phase 2 완료)
- **추가된 destructure**: 38개 상태 변수
  - UI 상태 (6): hoveredCard, tooltipVisible, previewDamage, showCharacterSheet, showInsightTooltip, hoveredEnemyAction
  - 애니메이션 (11): playerHit, enemyHit, playerBlockAnim, enemyBlockAnim, willOverdrive, etherPulse, playerOverdriveFlash, enemyOverdriveFlash, soulShatter, playerTransferPulse, enemyTransferPulse
  - 유물 UI (3): activeRelicSet, relicActivated, multiplierPulse
  - 통찰 시스템 (3): insightBadge, insightAnimLevel, insightAnimPulseKey
  - 진행 상태 (7): resolveStartPlayer, resolveStartEnemy, respondSnapshot, rewindUsed, autoProgress, resolvedPlayerCards, executingCardIndex
  - 에테르 애니메이션 (2): etherAnimationPts, netEtherDelta
  - 카드 상태 (2): cardUsageCount, disabledCardIndices
  - 기타 (4): turnNumber, postCombatOptions, nextTurnEffects, fixedOrder
- **버그 수정**: 중복 `transform` 키 제거 (pre-existing bug)
- **빌드 테스트**: ✅ 60 modules transformed, 에러 없음
- **런타임 테스트**: ✅ 통과 (모든 destructure 추가 후)
- **커밋**: `7163dcd`

**Phase 2 총 변경**: 224개 자동 변경 + 38개 destructure + 수동 수정

---

## 📊 전체 진행률

| 단계 | 상태 | 진행률 |
|------|------|--------|
| 인프라 구축 | ✅ 완료 | 100% |
| Phase 1: phase | ✅ 완료 | 100% |
| Phase 2: 배열 + UI/애니메이션 | ✅ 완료 | 100% |
| Phase 3: player/enemy | ⏳ 대기 | 0% |
| 런타임 테스트 | ⏳ 대기 | 0% |
| **전체** | **⚠️ 진행 중** | **약 75%** |

---

## 🎯 다음 단계 (Phase 3)

### player/enemy 상태 마이그레이션

가장 복잡한 부분:
- `player` → `battle.player` (155개 참조)
- `enemy` → `battle.enemy` (123개 참조)
- `setPlayer(prev => ...)` → `actions.updatePlayer({...})`
- `setEnemy(prev => ...)` → `actions.updateEnemy({...})`

**현재 임시 방법**:
```javascript
const player = battle.player;
const enemy = battle.enemy;
```

**목표**:
- 모든 `player.` 참조를 `battle.player.`로 변경
- 모든 `enemy.` 참조를 `battle.enemy.`로 변경
- `setPlayer`/`setEnemy` 호출을 actions로 변경
- 임시 destructure 라인 제거

**예상 변경**: ~300개
**예상 소요 시간**: 1-1.5시간

---

## 📝 Git 커밋 히스토리

1. **f83ba23**: 인프라 구축
2. **c12b5a3**: 마이그레이션 가이드
3. **7905239**: Phase 1 - phase 상태 ✅
4. **c69bf13**: Phase 1 - 수동 수정 완료 ✅
5. **a334452**: Phase 2-1 - 배열 상태 완료 ✅
6. **67fe1c3**: Phase 2-3 - 나머지 setter 114개 완료 ✅
7. **7163dcd**: Phase 2-4 - 종합 destructure 38개 추가, Phase 2 완료 ✅

---

## 🔧 사용된 도구

### Phase 1: migrate_phase.cjs
- **정규식 패턴**:
  - `\bsetPhase\(` → `actions.setPhase(`
  - `\bphase\s*===` → `battle.phase ===`
  - `\bphase\s*!==` → `battle.phase !==`
  - `, phase\b` → `, battle.phase`
  - `[phase\b` → `[battle.phase`

### Phase 2: migrate_arrays.cjs
- **정규식 패턴**:
  - `\bsetHand\(` → `actions.setHand(`
  - `\bsetSelected\(` → `actions.setSelected(`
  - `\bhand\.length\b` → `battle.hand.length`
  - `\bselected\.map\(` → `battle.selected.map(`
  - `\bqueue\[` → `battle.queue[`
  - `\bqIndex\s*(===|!==|<|>)` → `battle.qIndex $1`

---

## ⚠️ 주의사항

### Phase 1에서 배운 교훈

1. **함수 매개변수 destructuring**
   ```javascript
   // ❌ 잘못된 변경
   function Component({ battle.phase }) { }

   // ✅ 올바른 변경
   function Component({ phase }) { }
   ```

2. **객체 리터럴 키**
   ```javascript
   // ❌ 잘못된 변경
   { battle.phase: 'select' }

   // ✅ 올바른 변경
   { phase: 'select' }
   ```

3. **Props로 받는 컴포넌트**
   - ExpectedDamagePreview는 phase를 props로 받으므로
   - 함수 내부에서는 `phase` 그대로 사용

### Phase 2에서 배운 교훈

4. **Dependency 배열 업데이트 필수**
   ```javascript
   // ❌ 잘못된 예
   useEffect(() => {
     if (selected.length > 0) { ... }
   }, [selected]); // 여전히 old reference

   // ✅ 올바른 예
   useEffect(() => {
     if (battle.selected.length > 0) { ... }
   }, [battle.selected]); // 새 reference
   ```

5. **Functional updates는 불가능**
   ```javascript
   // ❌ 작동 안 함
   actions.setHand(prev => [...prev, newCard])

   // ✅ 올바른 방법
   actions.setHand([...battle.hand, newCard])
   ```

6. **배열 인덱스 참조 주의**
   ```javascript
   // ❌ 잘못된 예
   queue[qIndex] // qIndex는 battle.qIndex여야 함

   // ✅ 올바른 예
   battle.queue[battle.qIndex]
   ```

7. **Player/Enemy 변수 선언 필요**
   - Phase 3 전까지는 임시로 destructure 사용
   - Phase 3에서 모든 참조를 `battle.player`로 변경 후 제거

8. **런타임 에러는 점진적으로 발견됨**
   - 빌드가 통과해도 런타임에서 undefined 에러 발생 가능
   - 3번의 runtime error를 통해 필요한 destructure를 점진적으로 추가
   - 최종적으로 38개 상태 변수를 한번에 destructure하여 해결

9. **Setter 마이그레이션은 2단계로 진행**
   - 1단계: 배열 관련 setter (10개) - migrate_arrays.cjs
   - 2단계: 나머지 모든 setter (37개) - fix_remaining_setters.cjs
   - Negative lookbehind (`(?<!actions\.)`) 사용으로 중복 변경 방지

---

## 💡 전체 교훈

1. **자동화 스크립트 필수**: 100+ 변경을 수동으로 하면 실수 가능성 높음
2. **작은 단위로 커밋**: Phase별로 나누어 진행하니 문제 발생 시 롤백 쉬움
3. **빌드 테스트 필수**: 각 Phase 후 반드시 빌드 테스트
4. **런타임 테스트 필수**: 빌드 통과 != 런타임 작동
5. **패턴 인식 중요**: 함수 매개변수, 객체 키, props 등 예외 케이스 파악 필요
6. **Dependency 배열 체크**: 상태 참조 변경 시 의존성 배열도 함께 변경

---

## 🚀 진행 방법

각 Phase마다:
1. ✅ 자동 마이그레이션 스크립트 작성
2. ✅ 스크립트 실행
3. ✅ 빌드 에러 확인
4. ✅ 수동으로 예외 케이스 수정
5. ✅ 빌드 테스트 통과
6. ✅ 런타임 테스트
7. ✅ Git 커밋
8. ⏩ 다음 Phase

---

**현재 상태**: Phase 2 완료 ✅
**다음 작업**: Phase 3 - player, enemy 상태 마이그레이션 (가장 복잡)
**전체 진행률**: ~75% 완료

---

## 📈 Phase 2 통계 요약

- **총 자동 변경**: 224개
  - 배열 상태 (2-1): 110개
  - 나머지 setter (2-3): 114개
- **총 Destructure 추가**: 38개 상태 변수
- **수동 수정**: ~20개
  - Dependency 배열 업데이트
  - Functional update 제거
  - Props 전달
  - 중복 키 버그 수정
- **런타임 에러 수정**: 3회 (player, enemyPlan, hoveredCard)
- **Git 커밋**: 3개 (a334452, 67fe1c3, 7163dcd)
- **사용 스크립트**: 2개 (migrate_arrays.cjs, fix_remaining_setters.cjs)
