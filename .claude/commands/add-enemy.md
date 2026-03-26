# 새 적 추가

새로운 적(몬스터)을 게임에 추가합니다.

## 작업 순서
1. `src/components/battle/battleData.ts`에서 ENEMIES 확인
2. 적 타입 확인 (`src/types/enemy.ts`)
3. 적 AI 패턴 설계
4. 새 적 데이터 추가
5. 필요시 특수 능력 구현
6. 빌드 테스트

## 적 구조 참고
```typescript
{
  id: string,
  name: string,
  emoji: string,
  hp: number,
  maxHp: number,
  ether: number,
  etherCapacity: number,
  deck: Card[],
  ai: EnemyAI,
}
```

## 사용자 요청
$ARGUMENTS
