# Stats Utils API 문서

통계 분석을 위한 유틸리티 함수 모음입니다.

**파일 위치**: `src/simulator/analysis/stats-utils.ts`

---

## 신뢰도 분석

### `getConfidenceLevel(sampleSize: number)`

샘플 크기에 따른 신뢰도 레벨을 반환합니다.

```typescript
const result = getConfidenceLevel(50);
// { level: 'medium', score: 0.6, minSample: 30 }
```

| 샘플 크기 | 레벨 | 점수 |
|----------|------|------|
| < 10 | very_low | 0.2 |
| 10-29 | low | 0.4 |
| 30-99 | medium | 0.6 |
| 100-299 | high | 0.8 |
| ≥ 300 | very_high | 1.0 |

### `getConfidenceLevelLabel(level: string)`

신뢰도 레벨의 한글 라벨을 반환합니다.

```typescript
getConfidenceLevelLabel('very_low');  // '매우 낮음'
getConfidenceLevelLabel('high');      // '높음'
```

---

## 신뢰 구간

### `calculateProportionCI(successes, total, confidence?)`

비율의 Wilson Score 신뢰 구간을 계산합니다.

```typescript
const ci = calculateProportionCI(75, 100);
// { proportion: 0.75, lower: 0.656, upper: 0.826, margin: 0.085 }
```

**매개변수**:
- `successes`: 성공 횟수
- `total`: 전체 횟수
- `confidence`: 신뢰 수준 (기본값: 0.95)

---

## 통계적 검정

### `testProportionSignificance(p1, n1, p2, n2)`

두 비율 간 유의성을 검정합니다 (two-proportion z-test).

```typescript
const result = testProportionSignificance(0.6, 100, 0.5, 100);
// {
//   zScore: 1.43,
//   pValue: 0.15,
//   significant: false,
//   effectSize: 0.1
// }
```

---

## 다양성 지표

### `calculateGini(values: number[])`

지니 계수를 계산합니다 (0 = 완전 평등, 1 = 완전 불평등).

```typescript
calculateGini([25, 25, 25, 25]);  // 0 (완전 평등)
calculateGini([100, 0, 0, 0]);    // 0.75 (매우 불평등)
```

### `calculateDiversityScore(gini: number)`

지니 계수를 다양성 점수로 변환합니다.

```typescript
calculateDiversityScore(0.2);  // 0.8 (높은 다양성)
calculateDiversityScore(0.8);  // 0.2 (낮은 다양성)
```

### `calculateTopConcentration(values, topPercent?)`

상위 N% 항목이 전체에서 차지하는 비율을 계산합니다.

```typescript
calculateTopConcentration([50, 30, 15, 5], 0.1);  // 상위 10%의 점유율
```

---

## 추세 분석

### `calculateTrend(values: number[])`

선형 회귀를 통한 추세 기울기를 계산합니다.

```typescript
calculateTrend([1, 2, 3, 4, 5]);   // 1 (상승 추세)
calculateTrend([5, 4, 3, 2, 1]);   // -1 (하락 추세)
calculateTrend([3, 3, 3, 3, 3]);   // 0 (안정)
```

### `detectSimpsonParadox(overallCorrelation, subgroupCorrelations)`

Simpson's Paradox를 감지합니다.

```typescript
const result = detectSimpsonParadox(-0.3, [0.2, 0.3, 0.1, 0.25]);
// {
//   detected: true,
//   explanation: '전체 상관관계(음)와 4/4개 하위 그룹이 반대 방향...'
// }
```

---

## 가중 평균

### `calculateWeightedAverage(values, weights)`

가중 평균을 계산합니다.

```typescript
calculateWeightedAverage([80, 60], [100, 50]);  // 73.33
// (80*100 + 60*50) / (100+50) = 11000/150
```

---

## 사용 예시

### ConfidenceBadge 컴포넌트에서 사용

```tsx
import { getConfidenceLevel, calculateProportionCI } from '@/simulator/analysis/stats-utils';
import { ConfidenceBadge, WinRateWithCI } from '@/components/stats';

// 신뢰도 배지
<ConfidenceBadge sampleSize={battles} />

// 승률과 신뢰구간
<WinRateWithCI wins={50} total={100} showCI />
```

### balance-insights에서 사용

```typescript
import {
  calculateGini,
  getConfidenceLevel,
  detectSimpsonParadox
} from './stats-utils';

// 지니 계수로 카드 다양성 측정
const gini = calculateGini(cardUsageCounts);

// 신뢰도 확인
const confidence = getConfidenceLevel(sampleSize).score;

// 역설 감지
const paradox = detectSimpsonParadox(overallCorr, subgroupCorrs);
```

---

## 테스트

```bash
npm test -- --run src/simulator/tests/stats-utils.test.ts
npm test -- --run src/simulator/tests/balance-insights.test.ts
```

---

## 관련 파일

| 파일 | 설명 |
|------|------|
| `src/simulator/analysis/stats-utils.ts` | 유틸리티 함수 |
| `src/simulator/tests/stats-utils.test.ts` | 유틸리티 테스트 (42개) |
| `src/simulator/analysis/balance-insights.ts` | 밸런스 분석 |
| `src/simulator/tests/balance-insights.test.ts` | 밸런스 테스트 (7개) |
| `src/components/stats/ConfidenceBadge.tsx` | UI 컴포넌트 |
| `src/components/stats/ConfidenceBadge.test.tsx` | UI 테스트 (19개) |
