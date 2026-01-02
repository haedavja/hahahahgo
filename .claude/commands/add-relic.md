# 새 상징(Relic) 추가

새로운 상징을 게임에 추가합니다.

## 작업 순서
1. `src/data/relics.ts`에서 기존 상징 확인
2. 상징 타입 확인 (`src/types/relic.ts`)
3. 새 상징 데이터 추가
4. `src/lib/relicEffects.ts`에서 효과 로직 구현
5. 빌드 테스트

## 상징 구조 참고
```typescript
{
  id: string,
  name: string,
  emoji: string,
  description: string,
  rarity: 'common' | 'rare' | 'legendary',
  effect: RelicEffect,
}
```

## 사용자 요청
$ARGUMENTS
