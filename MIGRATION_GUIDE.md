# useState → useReducer 마이그레이션 가이드

## 🎯 목표

LegacyBattleApp.jsx의 70+ useState를 하나의 useReducer로 통합하여 코드 관리성 향상

---

## ✅ 완료된 작업 (인프라)

1. **battleReducer.js**: 모든 상태 및 액션 정의 완료
2. **useBattleState.js**: Hook 구현 완료
3. **LegacyBattleApp.jsx**: 초기화 완료

---

## 📖 마이그레이션 방법

### 1단계: 상태 참조 변경

**패턴**: `상태명` → `battle.상태명`

```javascript
// ❌ Before
if (player.hp <= 0) {
  setPhase('defeat');
}

// ✅ After
if (battle.player.hp <= 0) {
  actions.setPhase('defeat');
}
```

### 2단계: Setter 변경

#### 기본 Setter

```javascript
// ❌ Before
setPhase('resolve')
setHand([...cards])
setSelected([])

// ✅ After
actions.setPhase('resolve')
actions.setHand([...cards])
actions.setSelected([])
```

#### 업데이트 패턴

```javascript
// ❌ Before
setPlayer(prev => ({ ...prev, hp: 10 }))

// ✅ After
actions.updatePlayer({ hp: 10 })
```

#### 배열 추가 패턴

```javascript
// ❌ Before
setLog(prev => [...prev, message])

// ✅ After
actions.addLog(message)
```

#### 증가 패턴

```javascript
// ❌ Before
setQIndex(prev => prev + 1)
setTurnNumber(prev => prev + 1)

// ✅ After
actions.incrementQIndex()
actions.incrementTurn()
```

---

## 🗺️ 섹션별 작업 가이드

### Section 1: Hooks (useEffect, useMemo, useCallback)

**위치**: 1000~1700줄

**작업**:
1. 의존성 배열의 상태를 `battle.*`로 변경
2. 내부의 setter를 `actions.*`로 변경

```javascript
// ❌ Before
useEffect(() => {
  if (phase === 'resolve') {
    setQueue([...]);
  }
}, [phase, player, enemy]);

// ✅ After
useEffect(() => {
  if (battle.phase === 'resolve') {
    actions.setQueue([...]);
  }
}, [battle.phase, battle.player, battle.enemy, actions]);
```

### Section 2: Event Handlers

**위치**: 1700~2500줄

**작업**:
- onClick, onChange 등 이벤트 핸들러 내부의 상태 참조 및 setter 변경

```javascript
// ❌ Before
const handleSubmit = () => {
  if (selected.length === 0) return;
  setPhase('planning');
};

// ✅ After
const handleSubmit = () => {
  if (battle.selected.length === 0) return;
  actions.setPhase('planning');
};
```

### Section 3: JSX 렌더링

**위치**: 2500~4300줄

**작업**:
- JSX 표현식 내의 상태 참조 변경

```javascript
// ❌ Before
<div>{player.hp} / {player.maxHp}</div>

// ✅ After
<div>{battle.player.hp} / {battle.player.maxHp}</div>
```

---

## 🔍 Find & Replace 패턴

### 안전한 패턴 (정규식)

```regex
# player 상태 (. 앞에 있는 경우만)
\bplayer\.
→ battle.player.

# setPlayer 호출
\bsetPlayer\(
→ actions.setPlayer(

# phase 비교
\bphase ===
→ battle.phase ===

# setPhase 호출
\bsetPhase\(
→ actions.setPhase(
```

### ⚠️ 주의: 변경하면 안 되는 패턴

```javascript
// ❌ 변경 금지: 함수 매개변수
function applyDamage(player, enemy) { // 이건 그대로
  return { ...player, hp: player.hp - 10 };
}

// ❌ 변경 금지: 로컬 변수
const newPlayer = { ...battle.player, hp: 10 }; // 이건 그대로

// ❌ 변경 금지: orderedRelics (별도 useState 유지)
setOrderedRelics([...]) // 이건 그대로
```

---

## 📝 체크리스트

### 핵심 상태 (우선순위 높음)

- [ ] `player` → `battle.player` (155개 참조)
- [ ] `setPlayer` → `actions.setPlayer` / `actions.updatePlayer`
- [ ] `enemy` → `battle.enemy` (123개 참조)
- [ ] `setEnemy` → `actions.setEnemy` / `actions.updateEnemy`
- [ ] `phase` → `battle.phase` (129개 참조)
- [ ] `setPhase` → `actions.setPhase`

### 배열 상태

- [ ] `hand` → `battle.hand`
- [ ] `selected` → `battle.selected`
- [ ] `queue` → `battle.queue`
- [ ] `qIndex` → `battle.qIndex`
- [ ] `log` → `battle.log`

### UI 상태

- [ ] `showCharacterSheet` → `battle.showCharacterSheet`
- [ ] `hoveredCard` → `battle.hoveredCard`
- [ ] `tooltipVisible` → `battle.tooltipVisible`
- [ ] `previewDamage` → `battle.previewDamage`

### 애니메이션 상태

- [ ] `playerHit` → `battle.playerHit`
- [ ] `enemyHit` → `battle.enemyHit`
- [ ] `playerBlockAnim` → `battle.playerBlockAnim`
- [ ] `enemyBlockAnim` → `battle.enemyBlockAnim`

### 에테르 시스템

- [ ] `willOverdrive` → `battle.willOverdrive`
- [ ] `etherPulse` → `battle.etherPulse`
- [ ] `playerOverdriveFlash` → `battle.playerOverdriveFlash`
- [ ] `soulShatter` → `battle.soulShatter`

### 유물 UI

- [ ] `hoveredRelic` → `battle.hoveredRelic`
- [ ] `relicActivated` → `battle.relicActivated`
- [ ] `activeRelicSet` → `battle.activeRelicSet`
- [ ] `multiplierPulse` → `battle.multiplierPulse`

---

## 🧪 테스트 전략

### 1. 빌드 테스트 (각 변경 후)

```bash
npm run build
```

### 2. 런타임 테스트

```bash
npm run dev
```

**테스트 시나리오**:
1. ✅ 전투 시작
2. ✅ 카드 선택
3. ✅ 카드 사용
4. ✅ 에테르 획득
5. ✅ 기원 폭주 발동
6. ✅ 적 처치
7. ✅ 승리/패배 처리

---

## 🚨 주의사항

### 1. HP 바 주변 (3700줄대)

파일이 너무 커서 apply_patch 실패 가능

**해결**:
```bash
# 1. Grep으로 정확한 위치 찾기
grep -n "hp-bar" LegacyBattleApp.jsx

# 2. Read로 해당 구간만 읽기
Read with offset + limit

# 3. Edit로 최소 범위만 수정
```

### 2. 의존성 배열 누락 주의

```javascript
// ❌ 잘못된 예
useEffect(() => {
  actions.setPlayer({ ...battle.player, hp: 10 });
}, []); // actions와 battle.player가 의존성에 없음!

// ✅ 올바른 예
useEffect(() => {
  actions.updatePlayer({ hp: 10 });
}, [actions]); // actions만 있어도 충분 (battle.player는 읽기만 함)
```

### 3. Setter 내부의 prev 패턴

```javascript
// ❌ 작동 안 함
actions.setPlayer(prev => ({ ...prev, hp: 10 }))

// ✅ 대신 updatePlayer 사용
actions.updatePlayer({ hp: 10 })
```

---

## 💡 유용한 명령어

### Grep 패턴 찾기

```bash
# player 상태 사용처
grep -n "\bplayer\." LegacyBattleApp.jsx | head -20

# setPlayer 호출
grep -n "setPlayer" LegacyBattleApp.jsx

# phase 조건문
grep -n "phase ===" LegacyBattleApp.jsx

# useEffect 의존성
grep -A 2 "useEffect" LegacyBattleApp.jsx | grep -E "\[.*\]"
```

---

## 📊 현재 진행 상황

| 상태 | 진행률 | 상태 |
|------|--------|------|
| 인프라 구축 | 100% | ✅ |
| 상태 참조 변경 | 0% | ⏳ |
| Setter 변경 | 0% | ⏳ |
| 테스트 | 0% | ⏳ |

---

## 🎓 예제: 섹션 단위 마이그레이션

### 예제 1: 간단한 useEffect

```javascript
// ❌ Before
useEffect(() => {
  if (phase === 'resolve') {
    setQueue(sortActionQueue(selected, enemyPlan.actions));
  }
}, [phase, selected, enemyPlan]);

// ✅ After
useEffect(() => {
  if (battle.phase === 'resolve') {
    actions.setQueue(sortActionQueue(battle.selected, battle.enemyPlan.actions));
  }
}, [battle.phase, battle.selected, battle.enemyPlan, actions]);
```

### 예제 2: 복잡한 업데이트

```javascript
// ❌ Before
setPlayer(prev => ({
  ...prev,
  hp: Math.max(0, prev.hp - damage),
  block: Math.max(0, prev.block - remainingDamage)
}));

// ✅ After
actions.updatePlayer({
  hp: Math.max(0, battle.player.hp - damage),
  block: Math.max(0, battle.player.block - remainingDamage)
});
```

### 예제 3: 조건부 상태 변경

```javascript
// ❌ Before
if (player.hp <= 0) {
  setPhase('defeat');
  setPostCombatOptions({ type: 'defeat' });
} else if (enemy.hp <= 0) {
  setPhase('victory');
  setPostCombatOptions({ type: 'victory', rewards: [...] });
}

// ✅ After
if (battle.player.hp <= 0) {
  actions.setPhase('defeat');
  actions.setPostCombatOptions({ type: 'defeat' });
} else if (battle.enemy.hp <= 0) {
  actions.setPhase('victory');
  actions.setPostCombatOptions({ type: 'victory', rewards: [...] });
}
```

---

## 🔄 점진적 마이그레이션 전략

대규모 파일이므로 한 번에 모두 변경하는 것은 위험합니다.

### Phase 1: 핵심 로직만 (권장)
- player, enemy, phase 상태만 마이그레이션
- 나머지는 기존 useState 유지
- 동작 확인 후 다음 단계

### Phase 2: UI 상태
- 툴팁, 애니메이션 상태 마이그레이션
- 렌더링 로직 테스트

### Phase 3: 에테르 시스템
- 에테르 관련 모든 상태
- 복잡한 계산 로직 포함

### Phase 4: 완전 마이그레이션
- 모든 useState 제거
- 최종 최적화

---

**작성일**: 2025-12-03
**작성자**: Claude (AI)
**상태**: 인프라 완료, 마이그레이션 대기
