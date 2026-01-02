# 새 이변(Anomaly) 추가

전투 이변을 추가합니다.

## 작업 순서
1. `src/data/anomalies.ts` 확인
2. 이변 타입 확인
3. 새 이변 데이터 추가
4. 이변 효과 로직 구현
5. UI 표시 확인 (`AnomalyDisplay.tsx`)
6. 빌드 테스트

## 이변 구조
```typescript
{
  id: string,
  name: string,
  emoji: string,
  description: string,
  effect: AnomalyEffect,
  duration: number,
}
```

## 사용자 요청
$ARGUMENTS
