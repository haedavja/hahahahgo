# 새 카드 추가

새로운 카드를 게임에 추가합니다.

## 작업 순서
1. `src/data/cards.ts`에서 기존 카드 구조 확인
2. 카드 타입 확인 (`src/types/card.ts`)
3. 새 카드 데이터 추가
4. 필요시 새 특성(trait) 로직 구현
5. 빌드 테스트

## 카드 구조 참고
```typescript
{
  id: string,
  name: string,
  type: 'attack' | 'defense' | 'skill' | 'special',
  damage?: number,
  block?: number,
  speedCost: number,
  actionCost: number,
  traits: CardTrait[],
  description?: string,
}
```

## 사용자 요청
$ARGUMENTS
