---
name: use-test-factories
description: 테스트 팩토리 활용 가이드
---

# 테스트 팩토리 활용

`src/test/factories.ts`에 정의된 팩토리 함수를 활용하여 테스트 코드를 간결하게 작성합니다.

## 사용 가능한 팩토리

### 카드 팩토리
```typescript
import { createCard, createAttackCard, createDefenseCard, createSupportCard } from '../test/factories';

// 기본 카드
const card = createCard({ id: 'my-card', damage: 10 });

// 공격 카드 (damage: 10 기본값)
const attack = createAttackCard({ damage: 15 });

// 방어 카드 (block: 10 기본값)
const defense = createDefenseCard({ block: 20 });

// 지원 카드
const support = createSupportCard();
```

### 토큰 팩토리
```typescript
import { createTokenInstance, createTokenWithEffect, createTokenState } from '../test/factories';

// 토큰 인스턴스
const token = createTokenInstance({ id: 'strength', stacks: 3 });

// 효과 포함 토큰
const effectToken = createTokenWithEffect({
  id: 'burn',
  stacks: 2,
  durationType: 'turn',
});

// 토큰 상태 (여러 토큰)
const state = createTokenState({ strength: 2, dexterity: 1 });
```

### 엔티티 팩토리
```typescript
import { createEntity, createPlayerEntity, createEnemyEntity } from '../test/factories';

// 기본 엔티티
const entity = createEntity({ hp: 100, strength: 5 });

// 플레이어
const player = createPlayerEntity({ hp: 80, energy: 3 });

// 적
const enemy = createEnemyEntity({ hp: 50, pattern: 'aggressive' });
```

## 활용 예시

### Before (수동 생성)
```typescript
it('피해 계산 테스트', () => {
  const attacker = {
    hp: 100,
    maxHp: 100,
    block: 0,
    tokens: { strength: 2 },
    energy: 3,
    // ... 많은 필드
  };
  const defender = {
    hp: 50,
    maxHp: 50,
    block: 10,
    tokens: {},
    // ... 많은 필드
  };
  // 테스트
});
```

### After (팩토리 사용)
```typescript
it('피해 계산 테스트', () => {
  const attacker = createPlayerEntity({ tokens: { strength: 2 } });
  const defender = createEnemyEntity({ hp: 50, block: 10 });
  // 테스트
});
```

## 마이그레이션 체크리스트

1. 테스트 파일에서 수동 객체 생성 찾기
2. 적절한 팩토리 함수로 교체
3. 필요한 오버라이드만 전달
4. 테스트 실행하여 동작 확인
