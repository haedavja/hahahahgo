# 던전 시스템

## 개요

그래프 기반 탐험 시스템. 노드를 이동하며 이벤트를 해결하고 보상을 획득합니다.

## 노드 타입

| 타입 | 아이콘 | 설명 |
|-----|-------|-----|
| ENTRANCE | 🚪 | 던전 입구 |
| ROOM | 🏠 | 일반 방 |
| CORRIDOR | 🚶 | 좁은 복도 |
| CROSSROAD | 🔀 | 갈림길 |
| EXIT | 🌅 | 출구 |

## 이벤트 타입

| 타입 | 아이콘 | 설명 |
|-----|-------|-----|
| CHEST | 📦 | 보물 상자 |
| COMBAT | ⚔️ | 전투 조우 |
| CURIO | 🔮 | 수수께끼 |
| OBSTACLE | 🧗 | 장애물 |
| TRAP | ⚠️ | 함정 |
| REST | 🔥 | 휴식처 |
| MERCHANT | 🛒 | 상인 |

## 시간 시스템

던전에는 제한 시간이 있으며, 시간이 지날수록 페널티 증가:

| 시간 비율 | 레벨 | 색상 | 페널티 |
|---------|-----|-----|-------|
| 0-50% | 0 | 초록 | 없음 |
| 50-75% | 1 | 노랑 | 경미 |
| 75-90% | 2 | 주황 | 중간 |
| 90%+ | 3 | 빨강 | 심각 |

## 선택지 시스템

### 스탯 요구사항

```typescript
// 힘 5 이상 필요
requirements: { strength: 5 }

// 민첩 기반 스케일링
scalingRequirement: {
  stat: 'agility',
  baseValue: 3,
  increment: 1
}
```

### 반복 선택

```typescript
// 최대 3회까지 시도 가능
maxAttempts: 3

// 과잉 시도 시 경고
warningAtAttempt: 2
warningText: "더 이상 시도하면 위험할 수 있습니다..."
```

### 특수 선택지

주특기 카드 보유 시 특별한 선택지 활성화:

```typescript
specialOverrides: [{
  requiredSpecial: 'lockpick',
  newText: '자물쇠를 따다',
  outcome: { type: 'success', text: '쉽게 열렸습니다!' }
}]
```

## 컴포넌트 구조

```
DungeonExploration
├── DungeonNode
│   ├── ChoiceButton
│   └── NavigationButtons
└── DungeonModals
    ├── RewardModal
    ├── DungeonSummaryModal
    └── CrossroadModal
```

## 관련 파일

- `src/components/dungeon/DungeonExploration.tsx`
- `src/components/dungeon/DungeonNode.tsx`
- `src/lib/dungeonChoices.ts`
- `src/data/dungeonNodes.ts`
