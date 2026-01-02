# 새 이벤트 추가

던전 탐험 이벤트를 추가합니다.

## 작업 순서
1. `src/data/events.ts` 확인
2. 이벤트 타입 확인
3. 새 이벤트 데이터 추가
4. 선택지 및 결과 구현
5. 빌드 테스트

## 이벤트 구조
```typescript
{
  id: string,
  title: string,
  description: string,
  choices: EventChoice[],
  requirements?: EventRequirement,
}
```

## 사용자 요청
$ARGUMENTS
