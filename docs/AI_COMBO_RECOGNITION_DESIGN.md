# 적 AI 포커콤보 인식 시스템 설계

## 개요

적 AI가 카드 조합 선택 시 포커 콤보를 인식하고 더 높은 배율의 조합을 우선시하도록 개선.

---

## 현재 시스템 분석

### 콤보 배율 (COMBO_MULTIPLIERS)

| 콤보 | 배율 | 조건 |
|------|-----|------|
| 하이카드 | 1x | 기본 |
| 페어 | 2x | 동일 actionCost 카드 2장 |
| 투페어 | 2.5x | 서로 다른 actionCost 페어 2쌍 |
| 트리플 | 3x | 동일 actionCost 카드 3장 |
| 플러쉬 | 3.25x | 동일 타입(공격/방어) 4장+ |
| 풀하우스 | 3.5x | 트리플 + 페어 |
| 포카드 | 4x | 동일 actionCost 카드 4장 |
| 파이브카드 | 5x | 동일 actionCost 카드 5장 |

### 현재 AI 스코어링

```javascript
// enemyAI.js - score() 함수
function score(m, list) {
  const s = stat(list);
  let base = 0;
  if (m?.key === 'aggro') base = s.atk * 100 + s.dmg * 10 - s.sp;
  else if (m?.key === 'turtle') base = s.def * 100 + s.blk * 10 - s.sp;
  else base = (s.dmg + s.blk) * 10 - s.sp;

  // 카드 수 보너스
  base += list.length * 10000;

  return base;
}
```

**문제점**: 콤보를 전혀 고려하지 않음

---

## 설계 방안

### 1. 콤보 스코어 시스템

```javascript
// src/components/battle/utils/comboScoring.js (신규)

import { detectPokerCombo } from './comboDetection';
import { COMBO_MULTIPLIERS } from './etherCalculations';

/**
 * 콤보 점수 가중치
 * 배율 기반이지만, AI가 너무 콤보만 추구하지 않도록 조정
 */
export const COMBO_SCORE_WEIGHTS = {
  '하이카드': 0,        // 기본, 보너스 없음
  '페어': 100,          // 2배 → 100점
  '투페어': 150,        // 2.5배 → 150점
  '트리플': 200,        // 3배 → 200점
  '플러쉬': 225,        // 3.25배 → 225점
  '풀하우스': 300,      // 3.5배 → 300점
  '포카드': 400,        // 4배 → 400점
  '파이브카드': 500     // 5배 → 500점
};

/**
 * 카드 조합의 콤보 점수 계산
 * @param {Array} cards - 카드 배열
 * @returns {Object} { comboName, score, multiplier }
 */
export function calculateComboScore(cards) {
  const combo = detectPokerCombo(cards);

  if (!combo) {
    return { comboName: null, score: 0, multiplier: 1 };
  }

  return {
    comboName: combo.name,
    score: COMBO_SCORE_WEIGHTS[combo.name] || 0,
    multiplier: COMBO_MULTIPLIERS[combo.name] || 1
  };
}

/**
 * 잠재적 콤보 분석 (덱 분석용)
 * @param {Array} deck - 사용 가능한 카드 덱
 * @returns {Object} 가능한 콤보 정보
 */
export function analyzePotentialCombos(deck) {
  const costFreq = new Map();
  const typeCount = { attack: 0, defense: 0 };

  deck.forEach(card => {
    costFreq.set(card.actionCost, (costFreq.get(card.actionCost) || 0) + 1);
    if (card.type === 'attack') typeCount.attack++;
    else typeCount.defense++;
  });

  return {
    costFrequency: costFreq,
    canFlush: typeCount.attack >= 4 || typeCount.defense >= 4,
    maxSameCost: Math.max(...costFreq.values()),
    pairCosts: Array.from(costFreq.entries())
      .filter(([, count]) => count >= 2)
      .map(([cost]) => cost)
  };
}
```

### 2. AI 스코어 함수 개선

```javascript
// enemyAI.js 수정

import { calculateComboScore } from './comboScoring';

/**
 * 콤보 인식 기반 스코어링
 * @param {Object} mode - AI 모드
 * @param {Array} cards - 카드 배열
 * @param {Object} options - 추가 옵션
 * @returns {number} 최종 점수
 */
function scoreWithCombo(mode, cards, options = {}) {
  const {
    comboWeight = 1.0,      // 콤보 중요도 (0~1, 기본 1)
    etherPriority = false   // 에테르 축적 우선 모드
  } = options;

  const s = stat(cards);

  // 1. 기본 모드 점수
  let modeScore = 0;
  if (mode?.key === 'aggro') {
    modeScore = s.atk * 100 + s.dmg * 10 - s.sp;
  } else if (mode?.key === 'turtle') {
    modeScore = s.def * 100 + s.blk * 10 - s.sp;
  } else {
    modeScore = (s.dmg + s.blk) * 10 - s.sp;
  }

  // 2. 카드 수 보너스 (더 많은 카드 = 더 많은 에테르)
  const cardCountBonus = cards.length * 10000;

  // 3. 콤보 점수
  const comboResult = calculateComboScore(cards);
  const comboScore = comboResult.score * comboWeight;

  // 4. 에테르 우선 모드: 배율 기반 추가 점수
  let etherBonus = 0;
  if (etherPriority) {
    // 예상 에테르 획득량 기반 보너스
    const estimatedEther = cards.length * 10 * comboResult.multiplier;
    etherBonus = estimatedEther * 5;
  }

  return modeScore + cardCountBonus + comboScore + etherBonus;
}
```

### 3. 콤보 인식 AI 모드

```javascript
// enemyAI.js에 추가

/**
 * 콤보 인식 모드 결정
 * 현재 에테르 상태와 HP에 따라 콤보 중요도 조정
 *
 * @param {Object} enemy - 적 객체
 * @param {number} playerEther - 플레이어 에테르
 * @returns {Object} { comboWeight, etherPriority }
 */
export function decideComboStrategy(enemy, playerEther = 0) {
  const enemyEther = enemy.ether || 0;
  const hpPercent = (enemy.hp / enemy.maxHp) * 100;

  // 기본 설정
  let comboWeight = 0.5;
  let etherPriority = false;

  // 에테르 경쟁 상황: 플레이어가 앞서면 콤보 중요도 증가
  if (playerEther > enemyEther + 200) {
    comboWeight = 1.0;
    etherPriority = true;
  }

  // HP 낮음: 콤보보다 즉각적인 공격/방어 우선
  if (hpPercent < 30) {
    comboWeight = 0.2;
    etherPriority = false;
  }

  // HP 높음: 에테르 축적 여유
  if (hpPercent > 70) {
    comboWeight = 0.8;
    etherPriority = true;
  }

  return { comboWeight, etherPriority };
}
```

---

## 구현 순서

### Phase 1: 기본 콤보 점수 시스템

1. [x] `comboScoring.js` 파일 생성
2. [ ] `calculateComboScore()` 함수 구현
3. [ ] `analyzePotentialCombos()` 함수 구현
4. [ ] 단위 테스트 작성

### Phase 2: AI 통합

5. [ ] `enemyAI.js`의 `score()` 함수를 `scoreWithCombo()`로 교체
6. [ ] `decideComboStrategy()` 함수 추가
7. [ ] `generateEnemyActions()`에서 콤보 전략 적용

### Phase 3: 스마트 카드 선택

8. [ ] 덱 분석을 통한 잠재적 콤보 식별
9. [ ] 콤보 완성을 위한 카드 우선 선택 로직
10. [ ] 플러쉬 가능성 인식 (동일 타입 카드 우선)

### Phase 4: 밸런싱 및 테스트

11. [ ] 콤보 가중치 튜닝
12. [ ] 다양한 적에 대한 테스트
13. [ ] 플레이어 경험 피드백 반영

---

## 예상 AI 행동 변화

### Before (현재)
```
턴 1: [공격 1] [방어 1] → 무작위 선택
턴 2: [공격 2] [방어 2] → 모드 기반 선택
```

### After (개선)
```
턴 1: 덱에 actionCost=1 카드 3장 → 트리플 가능!
      [공격 1] [공격 1] [방어 1] → 트리플 선택 (3배 에테르)

턴 2: 공격 카드 4장 보유 → 플러쉬 가능!
      [공격 A] [공격 B] [공격 C] [공격 D] → 플러쉬 선택
```

---

## 몬스터별 콤보 성향

| 몬스터 | 콤보 성향 | 이유 |
|--------|----------|------|
| 구울 | 낮음 (0.3) | 본능적, 전략 없음 |
| 약탈자 | 중간 (0.5) | 기본 지능 |
| 슬러심 | 없음 (0) | 디버프 전용, 콤보 무관 |
| 탈영병 | 높음 (0.8) | 전술적, 훈련받은 병사 |
| 살육자 | 중간 (0.5) | 공격 우선, 콤보는 부차적 |

```javascript
// enemyPatterns.js에 추가
export const ENEMY_COMBO_TENDENCIES = {
  'ghoul': 0.3,
  'marauder': 0.5,
  'slurthim': 0,
  'deserter': 0.8,
  'slaughterer': 0.5
};
```

---

## 테스트 케이스

```javascript
// comboScoring.test.js

describe('calculateComboScore', () => {
  it('페어 조합 점수', () => {
    const cards = [
      { actionCost: 1, type: 'attack' },
      { actionCost: 1, type: 'defense' }
    ];
    const result = calculateComboScore(cards);
    expect(result.comboName).toBe('페어');
    expect(result.score).toBe(100);
    expect(result.multiplier).toBe(2);
  });

  it('플러쉬 조합 점수', () => {
    const cards = [
      { actionCost: 1, type: 'attack' },
      { actionCost: 2, type: 'attack' },
      { actionCost: 3, type: 'attack' },
      { actionCost: 4, type: 'attack' }
    ];
    const result = calculateComboScore(cards);
    expect(result.comboName).toBe('플러쉬');
    expect(result.score).toBe(225);
  });
});

describe('scoreWithCombo', () => {
  it('콤보 가중치 0이면 기존 스코어와 동일', () => {
    // ...
  });

  it('콤보 가중치 1이면 콤보 점수 전체 반영', () => {
    // ...
  });
});
```

---

## 주의사항

1. **과도한 콤보 추구 방지**: 콤보 점수가 너무 높으면 AI가 비효율적인 조합 선택
2. **모드 우선순위 유지**: aggro/turtle 모드는 여전히 중요
3. **덱 제한 고려**: 적의 덱이 작으면 콤보 가능성 낮음
4. **성능 최적화**: 모든 조합에 대해 콤보 계산 → 캐싱 필요 가능

---

*작성일: 2025-12-23*
*관련 문서: AI_IMPROVEMENT_PLAN.md*
