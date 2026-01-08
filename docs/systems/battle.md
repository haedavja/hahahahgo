# 전투 시스템

## 전투 흐름

```
[select] 카드 선택 → [respond] 대응 → [resolve] 타임라인 진행
```

### 1. 선택 단계 (Select)
- 플레이어가 핸드에서 카드 선택
- 에너지 소비
- 카드가 타임라인에 배치

### 2. 대응 단계 (Respond)
- 적이 카드 선택
- 플레이어가 추가 대응 가능
- 아이템/파토스 사용 가능

### 3. 진행 단계 (Resolve)
- 타임라인 순서대로 카드 발동
- 데미지/효과 적용
- 턴 종료 처리

## 타임라인

카드 속도에 따라 발동 순서 결정:

| 속도 | 발동 순서 |
|-----|---------|
| 높음 | 먼저 발동 |
| 같음 | 플레이어 우선 |
| 낮음 | 나중에 발동 |

### 타이밍 동기화

| 항목 | 값 |
|-----|---|
| 시곗바늘 이동 | 0.25s |
| 카드 발동 대기 | 250ms |
| 카드 흔들림 | 200ms |
| 자동진행 딜레이 | 450ms |

> ⚠️ 자동진행 딜레이를 450ms 미만으로 줄이면 버그 발생

## 통찰 레벨

적 정보 확인 가능 범위:

| 레벨 | 이름 | 효과 |
|-----|-----|-----|
| -3 | 망각 | 타임라인, 적 체력 확인 불가 |
| -2 | 미련 | 진행단계에서 적 타임라인 불가 |
| -1 | 우둔 | 대응단계에서 적 타임라인 불가 |
| 0 | 평온 | 선택단계에서 적 카드 3개 확인 |
| +1 | 예측 | 선택단계에서 적 카드 2개 확인 |
| +2 | 독심 | 선택단계에서 적 카드 모두 확인 |
| +3 | 혜안 | 적 카드 모두 + 상세 정보 확인 |

## 컴포넌트 구조

```
BattleApp
├── BattleScreen
│   ├── PlayerArea
│   │   ├── HandArea
│   │   ├── PlayerHpBar
│   │   └── EnergyDisplay
│   ├── TimelineDisplay
│   ├── EnemyArea
│   │   ├── EnemyHpBar
│   │   └── EnemyCards
│   └── ActionButtons
├── ItemSlots
├── PathosSlots
└── RelicDisplay
```

## 관련 파일

- `src/components/battle/BattleApp.tsx`
- `src/components/battle/reducer/battleReducer.ts`
- `src/lib/battleResolver.ts`
- `src/lib/speedQueue.ts`
