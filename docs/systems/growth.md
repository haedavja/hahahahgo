# 성장 시스템

## 피라미드 구조

```
        [정점: 자아 + 로고스]
           /          \
      [5단계: 상위 에토스]
         /      |      \
    [4단계: 파토스 노드]
       /    |    |    \
  [3단계: 에토스 노드]
     /   |   |   |   \
[2단계: 기본 파토스]
   /  |  |  |  |  \
[1단계: 기초 에토스]
```

## 핵심 개념

### 에토스 (Ethos)

패시브 효과로 항상 적용되는 영구 버프:

- **종류**: 힘, 민첩, 통찰, 체력, 에너지 등
- **해금 조건**: 특정 개성(Trait) 보유

### 파토스 (Pathos)

액티브 스킬로 전투 중 수동 발동:

- **쿨다운**: 사용 후 일정 턴 대기
- **장착 제한**: 최대 5개까지 장착 가능

### 로고스 (Logos)

궁극기로 강력한 특수 능력:

- **충전 필요**: 특정 조건 달성 시 사용 가능
- **자아별 차이**: 검사/총잡이 각각 다른 로고스

## 스킬 포인트

개성(Trait) 획득 시 스킬 포인트 지급:

| 개성 타입 | 스킬 포인트 |
|---------|-----------|
| 일반 | 1 |
| 희귀 | 2 |
| 특별 | 3 |

## 자아 시스템

6단계에서 자아 선택 가능:

### 검사 (Sword)
- 근접 공격 특화
- 연속 공격 보너스
- 방어 관통

### 총잡이 (Gun)
- 원거리 공격 특화
- 치명타 확률
- 빠른 속도

## 카드 성장

### 강화 (Enhance)
- 카드 스탯 상승
- 최대 5레벨

### 특화 (Specialize)
- 특성 부여
- 랜덤 5개 중 선택

### 승격 (Promote)
- 등급 상승
- 1회 → 희귀, 3회 → 특별, 5회 → 전설

## 컴포넌트 구조

```
GrowthPyramidModal
├── StatusSummary
├── LogosSection
├── IdentitySection
├── TierRow
│   └── NodeButton
├── TraitEthosSection
└── PyramidConnections
```

## 관련 파일

- `src/components/growth/GrowthPyramidModal.tsx`
- `src/data/growth/ethosData.ts`
- `src/data/growth/pathosData.ts`
- `src/data/growth/logosData.ts`
- `src/state/slices/growthSlice.ts`
