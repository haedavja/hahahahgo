---
name: split-component
description: 대형 컴포넌트 분할 가이드
---

# 대형 컴포넌트 분할

## 대상 파일 식별

대형 컴포넌트 (>1500줄):
- `src/components/battle/BattleApp.tsx` (~2500줄)
- `src/components/simulator/SimulatorTab.tsx` (~2500줄)
- `src/components/widgets/StatsWidget.tsx` (~1000줄)

## 분할 전략

### 1. 훅 추출
컴포넌트 내 복잡한 로직을 커스텀 훅으로 분리:

```typescript
// Before: 컴포넌트 내부
const [state, setState] = useState();
const handleAction = useCallback(() => { ... }, []);

// After: 별도 훅 파일
// hooks/useBattleState.ts
export function useBattleState() {
  const [state, setState] = useState();
  const handleAction = useCallback(() => { ... }, []);
  return { state, handleAction };
}
```

### 2. 서브 컴포넌트 추출
UI 섹션을 별도 컴포넌트로 분리:

```
BattleApp/
├── index.tsx (메인 컴포넌트)
├── BattleHeader.tsx
├── BattleTimeline.tsx
├── BattleActions.tsx
├── BattleLog.tsx
└── hooks/
    ├── useBattleState.ts
    └── useBattleActions.ts
```

### 3. 유틸리티 추출
순수 함수를 utils로 분리:

```typescript
// utils/battleCalculations.ts
export function calculateDamage(...) { }
export function resolveEffects(...) { }
```

## 분할 우선순위

1. **재사용 가능한 UI 컴포넌트** - 다른 곳에서도 사용 가능
2. **복잡한 상태 로직** - 테스트 용이성 향상
3. **이벤트 핸들러** - 관심사 분리

## 검증

분할 후 확인사항:
- [ ] 기존 기능 동작 확인
- [ ] 타입 에러 없음
- [ ] 테스트 통과
- [ ] 성능 저하 없음 (memo 적용)
