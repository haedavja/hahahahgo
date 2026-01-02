# 통계 분석 개선 로드맵

**최종 업데이트**: 2025-01-03
**현재 버전**: v3

---

## 현재 분석 방법론 요약

### 적용 중인 방법
| 출처 | 방법 | 적용 방식 |
|------|------|----------|
| Riot | 동적 임계값 (±2σ) | Z-score로 이상치 탐지 |
| Supercell | 픽률+승률 4분면 | OP/함정/히든젬/약함 분류 |
| StS | 카드 경쟁 분석 | 제시 시 선택률, 라이벌 대결 |
| 자체 | 난이도별 목표 승률 | 1(75%)~5(15%) 기준 |

### 한계점
- AI 데이터만 사용 → 편향 가능성
- 단순 상관관계 분석 → 인과 파악 어려움
- 복합 조건 미분석 → 컨텍스트 무시

---

## 개선 방향 1: 통계적 엄밀성 강화

### 1.1 신뢰구간 도입
**현재**: 승률 60% → "높다"
**개선**: 승률 60% (95% CI: 52-68%, n=25) → "아직 불확실"

```typescript
// Wilson Score Interval (이미 구현됨)
function wilsonScoreLower(wins: number, total: number): number

// 추가: 신뢰구간 전체 반환
function wilsonScoreInterval(wins: number, total: number, confidence: number = 0.95): {
  lower: number;
  upper: number;
  point: number;
}
```

### 1.2 다중 비교 보정
**문제**: 100개 카드 분석 시 5%는 우연히 "이상치"로 판정
**해결**: Bonferroni 보정 또는 FDR (False Discovery Rate) 적용

```typescript
// 다중 비교 보정
function adjustPValues(pValues: number[], method: 'bonferroni' | 'fdr'): number[]
```

### 1.3 효과 크기 (Effect Size) 추가
**현재**: "유의미하게 다름" (p < 0.05)
**개선**: "얼마나 다른지"도 표시 (Cohen's d)

```typescript
interface BalanceIssue {
  // 기존
  isSignificant: boolean;
  pValue: number;

  // 추가
  effectSize: number;  // Cohen's d
  effectInterpretation: 'negligible' | 'small' | 'medium' | 'large';
}
```

---

## 개선 방향 2: 조건부 분석

### 2.1 층별 분석
```typescript
// 현재: 전체 승률
cardWinRate = 0.55

// 개선: 층별 분리
cardWinRateByFloor = {
  '1-3': 0.70,  // 초반에 강함
  '4-6': 0.50,  // 중반 보통
  '7+': 0.35,   // 후반에 약함
}
```

### 2.2 덱 아키타입별 분석
```typescript
// 덱 분류 기준 정의
type DeckArchetype = 'aggressive' | 'defensive' | 'combo' | 'balanced';

// 아키타입별 카드 성능
cardPerformanceByArchetype = {
  'aggressive': { pickRate: 0.8, winRate: 0.6 },
  'defensive': { pickRate: 0.2, winRate: 0.4 },
}
// → "공격 덱에서만 강한 카드"
```

### 2.3 시너지 조건부 분석
```typescript
// 현재: 카드 A 승률 60%
// 개선: 카드 B 보유 시 카드 A 승률 75%
//       카드 B 미보유 시 카드 A 승률 45%
// → "A는 B와 함께일 때만 강함"
```

---

## 개선 방향 3: 시계열 분석

### 3.1 런 내 성능 변화
```typescript
// 카드별 성능 곡선
interface CardPerformanceCurve {
  cardId: string;
  // 획득 시점별 승률 기여도
  impactByAcquisitionFloor: Record<number, number>;
  // 최적 획득 시점
  optimalPickupFloor: number;
}
```

### 3.2 학습 곡선 정밀화
```typescript
// 현재: 낮은 픽률 + 높은 승률 = 학습 곡선 의심
// 개선: 시뮬레이션 회차별 성능 추적

interface LearningCurveData {
  cardId: string;
  performanceBySimulationBatch: {
    batch: number;  // 1-10회, 11-20회, ...
    pickRate: number;
    winRate: number;
  }[];
  // 수렴 여부
  hasConverged: boolean;
  convergencePoint: number | null;
}
```

---

## 개선 방향 4: 인과 분석 시도

### 4.1 성향 점수 매칭 (Propensity Score Matching)
**목표**: "카드 A를 픽한 런 vs 픽하지 않은 런" 공정 비교

```typescript
// 문제: 카드 A를 픽하는 런은 이미 잘 진행 중인 런일 가능성
// 해결: 비슷한 상황의 런끼리 비교

interface MatchedComparison {
  cardId: string;
  // 매칭 기준 (층, 현재 덱 크기, HP 등)
  matchingCriteria: string[];
  // 매칭된 샘플
  withCard: RunSample[];
  withoutCard: RunSample[];
  // 조정된 효과
  adjustedEffect: number;
}
```

### 4.2 자연 실험 활용
```typescript
// 밸런스 패치 전후 비교
interface NaturalExperiment {
  patchDate: string;
  changedCards: string[];
  beforeStats: DetailedStats;
  afterStats: DetailedStats;
  // Difference-in-Differences
  didEffect: number;
}
```

---

## 개선 방향 5: 분석 결과 표현

### 5.1 불확실성 시각화
```
현재: 승률 55% ⚠️ 높음
개선: 승률 55% [48-62%] ████░░░░ 중간 신뢰도
              ↑ 신뢰구간   ↑ 샘플 크기 표시
```

### 5.2 증거 강도 표시
```typescript
interface EvidenceStrength {
  conclusion: string;
  strength: 'weak' | 'moderate' | 'strong';
  supportingEvidence: string[];
  contradictingEvidence: string[];  // 반대 증거도 표시
  caveats: string[];  // 주의사항
}
```

### 5.3 분석 방법 투명성
```typescript
interface AnalysisResult {
  // 기존 결과
  ...

  // 분석 메타데이터
  methodology: {
    method: string;
    assumptions: string[];
    limitations: string[];
    alternativeInterpretations: string[];
  };
}
```

---

## 우선순위 및 난이도

| 개선 항목 | 우선순위 | 난이도 | 예상 효과 |
|----------|---------|--------|----------|
| 신뢰구간 도입 | 높음 | 낮음 | 과신 방지 |
| 층별 분석 | 높음 | 중간 | 컨텍스트 파악 |
| 효과 크기 추가 | 중간 | 낮음 | 실용적 판단 |
| 덱 아키타입별 분석 | 중간 | 중간 | 빌드별 이해 |
| 다중 비교 보정 | 중간 | 낮음 | 오탐 감소 |
| 성향 점수 매칭 | 낮음 | 높음 | 인과 추론 |
| 시계열 분석 | 낮음 | 높음 | 동적 패턴 |

---

## 검증 방법

각 개선 사항 적용 후 검증:

1. **일관성 검사**: 같은 데이터에 여러 번 분석해도 같은 결과?
2. **민감도 분석**: 파라미터 변경 시 결론이 뒤집히나?
3. **역사적 검증**: 과거 밸런스 패치가 정당했는지 재분석
4. **전문가 검토**: 직접 플레이로 느낀 것과 일치하나?

---

## 탐구 질문

### 방법론 관련
1. 우리 게임에서 "유의미한" Z-score 임계값은 2가 맞나? 1.5? 2.5?
2. 픽률과 승률 중 어느 것에 더 가중치를 둬야 하나?
3. 최소 샘플 크기 20은 적절한가?

### 데이터 관련
4. AI 전략별로 통계가 얼마나 달라지나?
5. 난이도별로 카드 밸런스가 다르게 나타나나?
6. 특정 적에게 강한 카드가 전체 승률에 얼마나 기여하나?

---

## 참고 자료

- **통계 방법론**: "Statistical Methods for Research Workers" (Fisher)
- **게임 분석**: "Game Analytics" (Seif El-Nasr et al.)
- **인과 추론**: "Causal Inference: The Mixtape" (Cunningham)
- **A/B 테스트**: "Trustworthy Online Controlled Experiments" (Kohavi et al.)

---

**이 로드맵은 새로운 분석 기법이나 발견이 있을 때마다 업데이트합니다.**
