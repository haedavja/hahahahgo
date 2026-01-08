---
name: Effect Core Integration
description: 효과 시스템 코어 통합 가이드
---

# Effect Core 통합 가이드

`useEffectCore` 플래그를 활성화하여 게임-시뮬레이터 효과 시스템 통합.

## 현재 상태

```typescript
// src/core/combat/types.ts
export const UNIFIED_CORE_FLAGS = {
  useTokenCore: true,      // ✅ 활성화
  useDamageCore: true,     // ✅ 활성화
  useEffectCore: false,    // ❌ 비활성화 (통합 필요)
};
```

## 통합 대상

### effect-core.ts 주요 함수
- `processEffect()` - 단일 효과 처리
- `processEffects()` - 다중 효과 처리
- `checkCondition()` - 조건 검사
- `processTurnStartPassives()` - 턴 시작 패시브
- `processTurnEndPassives()` - 턴 종료 패시브
- `processCounterEffect()` - 반격 처리
- `processThornEffect()` - 가시 처리

### 통합 위치

1. **시뮬레이터** - `battle-engine.ts`
   - `executeCard()` 내 효과 처리
   - `processTurn()` 내 턴 패시브

2. **게임** - `BattleApp.tsx` / `battleReducer.ts`
   - 카드 사용 시 효과 처리
   - 턴 시작/종료 시 패시브 처리

## 통합 패턴

```typescript
import * as EffectCore from '../../core/combat/effect-core';
import { UNIFIED_CORE_FLAGS } from '../../core/combat/types';

// 턴 시작 처리
if (UNIFIED_CORE_FLAGS.useEffectCore) {
  const passiveResult = EffectCore.processTurnStartPassives(player.tokens);
  player.hp += passiveResult.hpChange;
  player.tokens = passiveResult.newTokens;
  log.push(...passiveResult.logs);
} else {
  // 레거시 로직
}
```

## 주의사항

1. 레거시 호환성 유지 (플래그 기반 분기)
2. 테스트 커버리지 확보
3. 점진적 활성화 권장
