# 고급 리팩토링 가이드

## 📋 개요

이 문서는 LegacyBattleApp.jsx의 유지보수성을 **4/10 → 2/10**으로 끌어올리기 위한 고급 리팩토링 가이드입니다.

**현재 진행 상황**:
- ✅ 기본 유틸리티 분리 완료 (1차 리팩토링)
- ✅ battleReducer.js 설계 완료
- ⏳ useReducer 마이그레이션 진행 예정

---

## 🎯 현재 상태 분석

### 문제점
1. **useState 70개** - 상태 관리 복잡도 매우 높음
2. **4,301줄 단일 컴포넌트** - 디버깅 어려움
3. **useEffect 의존성 추적 어려움**
4. **전투 로직 미분리** - applyAction, executeQueue 등

### 개선 목표
| 항목 | 현재 | 목표 | 방법 |
|------|------|------|------|
| 디버깅 난이도 | 5/10 | 2/10 | useReducer + 모듈화 |
| 유지보수 난이도 | 4/10 | 2/10 | Hooks 분리 + 문서화 |
| 확장성 | 6/10 | 8/10 | 전투 로직 모듈화 |

---

## 📦 battleReducer.js 사용 가이드

### 1. Reducer 구조

`battleReducer.js`는 70개의 useState를 하나의 상태 객체로 통합합니다.

```javascript
import { useReducer } from 'react';
import { battleReducer, createInitialState, ACTIONS } from './reducer/battleReducer';

// 초기 상태 생성
const initialState = createInitialState({
  initialPlayerState: { hp: 100, maxHp: 100, ... },
  initialEnemyState: { hp: 50, maxHp: 50, ... },
  initialPlayerRelics: [],
  simplifiedMode: false,
  sortType: 'cost'
});

// Reducer 사용
const [state, dispatch] = useReducer(battleReducer, initialState);
```

### 2. 상태 그룹 구조

#### 플레이어 & 적 상태
```javascript
state.player        // 플레이어 상태 (HP, 방어력, 버프 등)
state.enemy         // 적 상태
state.enemyIndex    // 현재 적 인덱스
```

#### 전투 페이즈
```javascript
state.phase  // 'select', 'planning', 'resolve', 'result', 'victory', 'defeat'
```

#### 카드 관리
```javascript
state.hand                  // 손패
state.selected              // 선택된 카드
state.canRedraw            // 재배치 가능 여부
state.vanishedCards        // 소멸된 카드
state.cardUsageCount       // 카드별 사용 횟수
```

#### 에테르 시스템
```javascript
state.turnEtherAccumulated        // 플레이어 누적 에테르
state.enemyTurnEtherAccumulated   // 적 누적 에테르
state.etherCalcPhase              // 계산 애니메이션 단계
state.currentDeflation            // 디플레이션 정보
```

#### 실행 큐
```javascript
state.queue      // 행동 큐
state.qIndex     // 현재 실행 인덱스
state.fixedOrder // 고정 순서
```

### 3. 액션 사용 예시

#### 단일 상태 변경
```javascript
// 페이즈 변경
dispatch({ type: ACTIONS.SET_PHASE, payload: 'resolve' });

// 플레이어 HP 업데이트
dispatch({
  type: ACTIONS.UPDATE_PLAYER,
  payload: { hp: state.player.hp - 10 }
});

// 로그 추가
dispatch({ type: ACTIONS.ADD_LOG, payload: "플레이어 공격!" });
```

#### 복합 액션 (여러 상태 한번에 변경)
```javascript
// 턴 초기화
dispatch({ type: ACTIONS.RESET_TURN });

// 에테르 애니메이션 초기화
dispatch({ type: ACTIONS.RESET_ETHER_ANIMATION });

// 전투 완전 초기화
dispatch({
  type: ACTIONS.RESET_BATTLE,
  payload: { initialPlayerState, initialEnemyState, ... }
});
```

### 4. 점진적 마이그레이션 전략

**단계 1: UI 상태부터 마이그레이션** (쉬움)
```javascript
// Before
const [showCharacterSheet, setShowCharacterSheet] = useState(false);
setShowCharacterSheet(true);

// After
dispatch({ type: ACTIONS.SET_SHOW_CHARACTER_SHEET, payload: true });
```

**단계 2: 카드 상태 마이그레이션** (보통)
```javascript
// Before
const [selected, setSelected] = useState([]);
setSelected([...selected, card]);

// After
dispatch({ type: ACTIONS.ADD_SELECTED, payload: card });
```

**단계 3: 에테르 상태 마이그레이션** (어려움)
```javascript
// Before
const [etherCalcPhase, setEtherCalcPhase] = useState(null);
const [etherFinalValue, setEtherFinalValue] = useState(null);
setEtherCalcPhase('sum');
setEtherFinalValue(100);

// After
dispatch({ type: ACTIONS.SET_ETHER_CALC_PHASE, payload: 'sum' });
dispatch({ type: ACTIONS.SET_ETHER_FINAL_VALUE, payload: 100 });
```

---

## 🔧 추가 리팩토링 계획

### Step 2: 전투 로직 모듈화

#### 생성할 파일
1. `combatActions.js` - 전투 행동 처리
2. `combatExecution.js` - 큐 실행 로직
3. `statusEffects.js` - 버프/디버프 관리

#### combatActions.js 예시
```javascript
/**
 * 전투 행동 처리 함수들
 */

export function applyAttack(attacker, defender, damage) {
  const actualDamage = Math.max(0, damage - (defender.block || 0));
  return {
    defender: {
      ...defender,
      hp: defender.hp - actualDamage,
      block: Math.max(0, (defender.block || 0) - damage)
    },
    damage: actualDamage
  };
}

export function applyDefense(actor, blockAmount) {
  return {
    ...actor,
    block: (actor.block || 0) + blockAmount
  };
}

export function applyBuff(actor, buffType, amount, duration) {
  return {
    ...actor,
    buffs: {
      ...actor.buffs,
      [buffType]: { amount, duration }
    }
  };
}
```

### Step 3: Custom Hooks 분리

#### useBattleState.js
```javascript
/**
 * 전투 상태 관리 Hook
 */
export function useBattleState(initialPlayer, initialEnemy) {
  const [state, dispatch] = useReducer(battleReducer, createInitialState({
    initialPlayerState: initialPlayer,
    initialEnemyState: initialEnemy
  }));

  const actions = useMemo(() => ({
    setPhase: (phase) => dispatch({ type: ACTIONS.SET_PHASE, payload: phase }),
    updatePlayer: (updates) => dispatch({ type: ACTIONS.UPDATE_PLAYER, payload: updates }),
    updateEnemy: (updates) => dispatch({ type: ACTIONS.UPDATE_ENEMY, payload: updates }),
    addLog: (message) => dispatch({ type: ACTIONS.ADD_LOG, payload: message }),
    // ... 더 많은 액션 헬퍼
  }), [dispatch]);

  return [state, actions];
}
```

#### useTimeline.js
```javascript
/**
 * 타임라인 관리 Hook
 */
export function useTimeline(queue, currentIndex, speed = 100) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 타임라인 진행 애니메이션
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + 1;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [currentIndex, speed]);

  return {
    progress,
    currentCard: queue[currentIndex],
    hasNext: currentIndex < queue.length - 1
  };
}
```

#### useEtherSystem.js
```javascript
/**
 * 에테르 시스템 관리 Hook
 */
export function useEtherSystem(initialPts = 0) {
  const [pts, setPts] = useState(initialPts);
  const [animationPhase, setAnimationPhase] = useState(null);

  const addEther = useCallback((amount, animated = true) => {
    if (animated) {
      setAnimationPhase('gaining');
      setTimeout(() => {
        setPts(prev => prev + amount);
        setAnimationPhase(null);
      }, 500);
    } else {
      setPts(prev => prev + amount);
    }
  }, []);

  const checkOverdrive = useCallback(() => {
    return pts >= ETHER_THRESHOLD;
  }, [pts]);

  return {
    pts,
    animationPhase,
    addEther,
    checkOverdrive,
    resetEther: () => setPts(0)
  };
}
```

---

## 📊 마이그레이션 체크리스트

### Phase 1: Reducer 기반 구축 ✅
- [x] battleReducer.js 생성
- [x] 액션 타입 정의 (100개 이상)
- [x] 복합 액션 정의 (RESET_TURN, RESET_ETHER_ANIMATION 등)

### Phase 2: 점진적 useState → dispatch 마이그레이션 ⏳
- [ ] UI 상태 마이그레이션 (10개)
- [ ] 카드 상태 마이그레이션 (15개)
- [ ] 에테르 상태 마이그레이션 (15개)
- [ ] 전투 상태 마이그레이션 (20개)
- [ ] 애니메이션 상태 마이그레이션 (10개)

**예상 소요 시간**: 각 그룹당 2~4시간

### Phase 3: Custom Hooks 분리 ⏳
- [ ] useBattleState 구현 (1일)
- [ ] useTimeline 구현 (반나절)
- [ ] useEtherSystem 구현 (반나절)

### Phase 4: 전투 로직 모듈화 ⏳
- [ ] combatActions.js (1일)
- [ ] combatExecution.js (1일)
- [ ] statusEffects.js (반나절)

### Phase 5: UI 컴포넌트 분리 ⏳
- [ ] Timeline.jsx
- [ ] CardHand.jsx
- [ ] BattleLog.jsx
- [ ] EtherDisplay.jsx

---

## 🚀 실제 적용 시 주의사항

### 1. 테스트 주도 마이그레이션
각 단계마다 전투가 정상 작동하는지 확인:
```bash
npm run dev
# 전투 시작 → 카드 선택 → 전투 실행 → 승리/패배
```

### 2. Git 커밋 전략
작은 단위로 자주 커밋:
```
[리팩토링] UI 상태를 battleReducer로 마이그레이션
[리팩토링] 카드 상태를 battleReducer로 마이그레이션
[리팩토링] useBattleState Hook 구현
```

### 3. 성능 모니터링
- useReducer는 useState보다 약간 느릴 수 있음
- React DevTools Profiler로 성능 확인
- 필요시 useMemo, useCallback 추가

### 4. 타입 안전성
- 가능하면 TypeScript로 마이그레이션
- 최소한 JSDoc으로 타입 힌트 추가

---

## 📈 예상 개선 효과

### 마이그레이션 완료 후
```
디버깅 난이도:     5/10 → 2/10  (⬇️ 60% 개선)
유지보수 난이도:   4/10 → 2/10  (⬇️ 50% 개선)
확장성:           6/10 → 8/10  (⬆️ 33% 개선)
테스트 용이성:    2/10 → 7/10  (⬆️ 250% 개선)
───────────────────────────────────────────────
종합:             4.25/10 → 4.75/10 (⬇️ 약 12% 개선)
```

### 구체적 개선
1. **상태 디버깅**: Redux DevTools 사용 가능
2. **시간 여행 디버깅**: 액션 히스토리 추적
3. **테스트**: Reducer는 순수 함수라 테스트 쉬움
4. **확장**: 새로운 상태 추가 시 reducer만 수정

---

## 💡 실전 팁

### Tip 1: 단계적 마이그레이션
한번에 모든 useState를 바꾸지 말고, **한 그룹씩** 마이그레이션:
1. UI 상태 (위험도 낮음)
2. 카드 상태 (위험도 중간)
3. 전투 로직 상태 (위험도 높음)

### Tip 2: 개발자 도구 활용
```javascript
// Reducer에 로깅 추가
export function battleReducer(state, action) {
  console.log('ACTION:', action.type, action.payload);
  console.log('BEFORE:', state);
  const newState = /* ... */;
  console.log('AFTER:', newState);
  return newState;
}
```

### Tip 3: 액션 생성자 함수 만들기
```javascript
// actions.js
export const battleActions = {
  setPhase: (phase) => ({ type: ACTIONS.SET_PHASE, payload: phase }),
  addLog: (message) => ({ type: ACTIONS.ADD_LOG, payload: message }),
  // ...
};

// 사용
dispatch(battleActions.setPhase('resolve'));
```

---

## 📚 참고 자료

- [React useReducer 공식 문서](https://react.dev/reference/react/useReducer)
- [Redux 스타일 가이드](https://redux.js.org/style-guide/)
- [Testing Library - Reducer 테스트](https://testing-library.com/docs/react-testing-library/api#act)

---

**문서 작성일**: 2025-12-02
**최종 수정일**: 2025-12-02
**작성자**: Claude
**버전**: 1.0
