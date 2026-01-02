# 새 토큰(상태이상) 추가

새로운 토큰/상태이상을 게임에 추가합니다.

## 작업 순서
1. `src/data/tokens.ts`에서 기존 토큰 확인
2. 토큰 타입 확인 (`src/types/token.ts`)
3. 새 토큰 데이터 추가
4. `src/lib/tokenUtils.ts`에서 토큰 로직 구현
5. UI 표시 확인 (`TokenDisplay.tsx`)
6. 빌드 테스트

## 토큰 구조 참고
```typescript
{
  id: string,
  name: string,
  emoji: string,
  description: string,
  stackable: boolean,
  duration: number | 'permanent',
  effect: TokenEffect,
}
```

## 사용자 요청
$ARGUMENTS
