# 상태 관리 가이드라인

## 문제 배경

2024년 12월, 장전 카드가 빈탄창 토큰을 제거하지 못하는 버그 발생.
원인: useMemo 내부에서 클로저에 갇힌 stale state 참조.

## 핵심 원칙

### 1. Stale Closure 방지 패턴

**문제 코드 (BAD):**
```javascript
const actions = useMemo(() => ({
  doSomething: () => {
    const value = state.player; // ❌ stale closure!
  }
}), [dispatch]); // state가 dependency에 없음
```

**해결 패턴 (GOOD):**
```javascript
const stateRef = useRef(state);
useEffect(() => { stateRef.current = state; }, [state]);

const actions = useMemo(() => ({
  doSomething: () => {
    const value = stateRef.current.player; // ✅ 항상 최신
  }
}), [dispatch]);
```

### 2. 상태 소스 단일화

현재 문제점:
- `battle` (React state)
- `battleRef.current` (Ref)
- `P`, `E` (로컬 변수)

**권장 구조:**
```
battleRef.current (Single Source of Truth)
    ↓
React state (렌더링용, ref에서 동기화)
    ↓
로컬 변수 (계산용, 반드시 ref/state로 업데이트)
```

### 3. 상태 업데이트 순서

카드 실행 시 상태 업데이트 순서:
1. 로컬 변수(`P`)에서 계산
2. `battleRef.current` 즉시 업데이트
3. `actions.setPlayer()` 호출 (React state 업데이트)

```javascript
// 올바른 순서
P.tokens = result.tokens;
battleRef.current = { ...battleRef.current, player: { ...P } };
actions.setPlayer({ ...P });
```

## 금지 패턴

### ❌ useMemo/useCallback 내 state 직접 참조
```javascript
// BAD
const fn = useMemo(() => () => state.value, []);
```

### ❌ require() 사용 (ES modules)
```javascript
// BAD - Vite에서 작동 안함
const { fn } = require('./module');

// GOOD
import { fn } from './module';
```

### ❌ 비동기 콜백에서 stale state 참조
```javascript
// BAD
setTimeout(() => {
  console.log(state); // stale!
}, 1000);

// GOOD
setTimeout(() => {
  console.log(stateRef.current); // fresh
}, 1000);
```

## 체크리스트

새 기능 추가 시 확인:
- [ ] useMemo/useCallback 내에서 state 직접 참조하지 않음
- [ ] setTimeout/비동기 콜백에서 ref 사용
- [ ] 상태 업데이트 시 ref → React state 순서 준수
- [ ] ES module import 사용 (require 금지)

## 관련 파일

- `src/components/battle/hooks/useBattleState.js` - battleRef 패턴 구현
- `src/components/battle/LegacyBattleApp.jsx` - battleRef 사용 예시
