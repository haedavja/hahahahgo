/**
 * @file etherCalculations.test.js
 * @description 에테르 계산 로직 테스트
 *
 * ## 테스트 대상
 * - COMBO_MULTIPLIERS: 콤보별 에테르 배율 상수
 * - CARD_ETHER_BY_RARITY: 레어리티별 에테르 획득량
 * - applyEtherDeflation: 디플레이션 (반복 사용 감소)
 * - getCardEtherGain: 카드 1장 에테르 계산
 * - calcCardsEther: 카드 배열 총 에테르
 * - calculateComboEtherGain: 콤보 최종 에테르
 *
 * ## 주요 테스트 케이스
 * - 디플레이션 배율 (100% → 80% → 64%)
 * - 레어리티별 에테르 (common=10, rare=25, legendary=500)
 * - actionCost 보너스 에테르
 * - 콤보 배율 적용 (페어 2x, 트리플 3x 등)
 */

import { describe, it, expect } from 'vitest';
import {
  COMBO_MULTIPLIERS,
  CARD_ETHER_BY_RARITY,
  applyEtherDeflation,
  getCardEtherGain,
  calcCardsEther,
  calculateComboEtherGain,
  calculateActionCostBonus
} from './etherCalculations';

describe('상수 검증', () => {
  it('COMBO_MULTIPLIERS에 모든 조합이 정의됨', () => {
    expect(COMBO_MULTIPLIERS['하이카드']).toBe(1);
    expect(COMBO_MULTIPLIERS['페어']).toBe(2);
    expect(COMBO_MULTIPLIERS['투페어']).toBe(2.5);
    expect(COMBO_MULTIPLIERS['트리플']).toBe(3);
    expect(COMBO_MULTIPLIERS['플러쉬']).toBe(3.5);
    expect(COMBO_MULTIPLIERS['풀하우스']).toBe(3.75);
    expect(COMBO_MULTIPLIERS['포카드']).toBe(4);
    expect(COMBO_MULTIPLIERS['파이브카드']).toBe(5);
  });

  it('CARD_ETHER_BY_RARITY에 모든 등급이 정의됨', () => {
    expect(CARD_ETHER_BY_RARITY.common).toBe(10);
    expect(CARD_ETHER_BY_RARITY.rare).toBe(25);
    expect(CARD_ETHER_BY_RARITY.special).toBe(100);
    expect(CARD_ETHER_BY_RARITY.legendary).toBe(500);
  });
});

describe('applyEtherDeflation', () => {
  it('첫 사용 시 100% 배율', () => {
    const result = applyEtherDeflation(100, '페어', {});
    expect(result.gain).toBe(100);
    expect(result.multiplier).toBe(1);
    expect(result.usageCount).toBe(0);
  });

  it('두 번째 사용 시 80% 배율', () => {
    const result = applyEtherDeflation(100, '페어', { '페어': 1 });
    expect(result.gain).toBe(80);
    expect(result.multiplier).toBe(0.8);
    expect(result.usageCount).toBe(1);
  });

  it('세 번째 사용 시 64% 배율', () => {
    const result = applyEtherDeflation(100, '페어', { '페어': 2 });
    expect(result.gain).toBe(64);
    expect(result.multiplier).toBeCloseTo(0.64);
    expect(result.usageCount).toBe(2);
  });

  it('커스텀 디플레이션 배율 적용', () => {
    const result = applyEtherDeflation(100, '페어', { '페어': 1 }, 0.75);
    expect(result.gain).toBe(75); // 100 * 0.75
    expect(result.multiplier).toBe(0.75);
  });

  it('다른 조합은 영향 안 받음', () => {
    const result = applyEtherDeflation(100, '트리플', { '페어': 5 });
    expect(result.gain).toBe(100); // 트리플 첫 사용
    expect(result.multiplier).toBe(1);
  });
});

describe('getCardEtherGain', () => {
  it('common 등급 카드는 10 에테르', () => {
    const card = { rarity: 'common' };
    expect(getCardEtherGain(card)).toBe(10);
  });

  it('rare 등급 카드는 25 에테르', () => {
    const card = { rarity: 'rare' };
    expect(getCardEtherGain(card)).toBe(25);
  });

  it('special 등급 카드는 100 에테르', () => {
    const card = { rarity: 'special' };
    expect(getCardEtherGain(card)).toBe(100);
  });

  it('legendary 등급 카드는 500 에테르', () => {
    const card = { rarity: 'legendary' };
    expect(getCardEtherGain(card)).toBe(500);
  });

  it('rarity가 없으면 common으로 취급', () => {
    const card = {};
    expect(getCardEtherGain(card)).toBe(10);
  });
});

describe('calcCardsEther', () => {
  it('빈 배열이면 0', () => {
    expect(calcCardsEther([])).toBe(0);
  });

  it('null/undefined면 0', () => {
    expect(calcCardsEther(null as any)).toBe(0);
    expect(calcCardsEther(undefined)).toBe(0);
  });

  it('단일 카드 에테르 계산', () => {
    const cards = [{ rarity: 'common' }];
    expect(calcCardsEther(cards)).toBe(10);
  });

  it('여러 카드 에테르 합산', () => {
    const cards = [
      { rarity: 'common' },  // 10
      { rarity: 'rare' },     // 25
      { rarity: 'special' }   // 100
    ];
    expect(calcCardsEther(cards)).toBe(135);
  });

  it('배율 적용', () => {
    const cards = [{ rarity: 'common' }];
    expect(calcCardsEther(cards, 2)).toBe(20);
  });

  it('entry.card 형식 지원', () => {
    const cards = [
      { card: { rarity: 'common' } },
      { card: { rarity: 'rare' } }
    ];
    expect(calcCardsEther(cards)).toBe(35);
  });

  it('유령카드는 에테르 계산에서 제외', () => {
    const cards = [
      { rarity: 'common' },           // 10
      { rarity: 'common', isGhost: true },  // 제외
      { rarity: 'rare' }              // 25
    ];
    expect(calcCardsEther(cards)).toBe(35); // 10 + 25
  });

  it('모든 유령카드면 에테르 0', () => {
    const cards = [
      { rarity: 'common', isGhost: true },
      { rarity: 'rare', isGhost: true }
    ];
    expect(calcCardsEther(cards)).toBe(0);
  });

  it('entry.card 형식에서도 유령카드 제외', () => {
    const cards = [
      { card: { rarity: 'common' } },                    // 10
      { card: { rarity: 'common', isGhost: true } },     // 제외
      { card: { rarity: 'rare' } }                       // 25
    ];
    expect(calcCardsEther(cards)).toBe(35);
  });
});

describe('calculateComboEtherGain', () => {
  it('기본 계산 (콤보 없음)', () => {
    const result = calculateComboEtherGain({
      cards: [{ rarity: 'common' }, { rarity: 'common' }],
      comboName: null,
      comboUsageCount: {}
    });
    expect(result.baseGain).toBe(20); // 10 + 10
    expect(result.gain).toBe(20);
    expect(result.comboMult).toBe(1);
    expect(result.deflationPct).toBe(0);
  });

  it('페어 콤보 배율 적용', () => {
    const result = calculateComboEtherGain({
      cards: [{ rarity: 'common' }, { rarity: 'common' }],
      comboName: '페어',
      comboUsageCount: {}
    });
    expect(result.baseGain).toBe(20);
    expect(result.gain).toBe(40); // 20 * 2
    expect(result.comboMult).toBe(2);
  });

  it('트리플 콤보 배율 적용', () => {
    const result = calculateComboEtherGain({
      cards: [
        { rarity: 'common' },
        { rarity: 'common' },
        { rarity: 'common' }
      ],
      comboName: '트리플',
      comboUsageCount: {}
    });
    expect(result.baseGain).toBe(30);
    expect(result.gain).toBe(90); // 30 * 3
    expect(result.comboMult).toBe(3);
  });

  it('디플레이션 적용', () => {
    const result = calculateComboEtherGain({
      cards: [{ rarity: 'common' }, { rarity: 'common' }],
      comboName: '페어',
      comboUsageCount: { '페어': 1 }
    });
    expect(result.baseGain).toBe(20);
    expect(result.gain).toBe(32); // 40 * 0.8
    expect(result.deflationPct).toBe(20);
    expect(result.deflationMult).toBe(0.8);
  });

  it('extraMultiplier 적용', () => {
    const result = calculateComboEtherGain({
      cards: [{ rarity: 'common' }],
      comboName: '하이카드',
      comboUsageCount: {},
      extraMultiplier: 2
    });
    expect(result.gain).toBe(20); // 10 * 1 * 2
    expect(result.comboMult).toBe(2); // 1 * 2
  });

  it('cardCount 폴백 사용', () => {
    const result = calculateComboEtherGain({
      cards: [],
      cardCount: 3,
      comboName: null,
      comboUsageCount: {}
    });
    expect(result.baseGain).toBe(30); // 3 * 10
    expect(result.gain).toBe(30);
  });

  it('파이브카드 최대 배율', () => {
    const result = calculateComboEtherGain({
      cards: Array(5).fill({ rarity: 'common' }),
      comboName: '파이브카드',
      comboUsageCount: {}
    });
    expect(result.baseGain).toBe(50);
    expect(result.gain).toBe(250); // 50 * 5
    expect(result.comboMult).toBe(5);
  });
});

describe('calculateActionCostBonus', () => {
  it('빈 배열은 보너스 0', () => {
    expect(calculateActionCostBonus([])).toBe(0);
    expect(calculateActionCostBonus(null as any)).toBe(0);
  });

  it('1코스트 카드는 보너스 없음', () => {
    const cards = [
      { actionCost: 1 },
      { actionCost: 1 },
      { actionCost: 1 }
    ];
    expect(calculateActionCostBonus(cards)).toBe(0);
  });

  it('2코스트 카드 하나당 +0.5', () => {
    const cards = [{ actionCost: 2 }];
    expect(calculateActionCostBonus(cards)).toBe(0.5);
  });

  it('3코스트 카드 하나당 +1', () => {
    const cards = [{ actionCost: 3 }];
    expect(calculateActionCostBonus(cards)).toBe(1);
  });

  it('2코스트 3장 = +1.5', () => {
    const cards = [
      { actionCost: 2 },
      { actionCost: 2 },
      { actionCost: 2 }
    ];
    expect(calculateActionCostBonus(cards)).toBe(1.5);
  });

  it('혼합 코스트: 1+2+3 = +1.5', () => {
    const cards = [
      { actionCost: 1 },  // +0
      { actionCost: 2 },  // +0.5
      { actionCost: 3 }   // +1
    ];
    expect(calculateActionCostBonus(cards)).toBe(1.5);
  });

  it('유령카드는 보너스에서 제외', () => {
    const cards = [
      { actionCost: 2 },              // +0.5
      { actionCost: 2, isGhost: true } // 제외
    ];
    expect(calculateActionCostBonus(cards)).toBe(0.5);
  });

  it('entry.card 형식 지원', () => {
    const cards = [
      { card: { actionCost: 2 } },
      { card: { actionCost: 2 } }
    ];
    expect(calculateActionCostBonus(cards)).toBe(1);
  });
});

describe('calculateComboEtherGain - 액션코스트 보너스', () => {
  it('2코스트 페어: 2.0 + 1 = 3x', () => {
    const result = calculateComboEtherGain({
      cards: [
        { rarity: 'common', actionCost: 2 },
        { rarity: 'common', actionCost: 2 }
      ],
      comboName: '페어',
      comboUsageCount: {}
    });
    expect(result.baseGain).toBe(20);
    expect(result.actionCostBonus).toBe(1);
    expect(result.comboMult).toBe(3);
    expect(result.gain).toBe(60); // 20 * 3
  });

  it('2코스트 트리플: 3.0 + 1.5 = 4.5x', () => {
    const result = calculateComboEtherGain({
      cards: [
        { rarity: 'common', actionCost: 2 },
        { rarity: 'common', actionCost: 2 },
        { rarity: 'common', actionCost: 2 }
      ],
      comboName: '트리플',
      comboUsageCount: {}
    });
    expect(result.baseGain).toBe(30);
    expect(result.actionCostBonus).toBe(1.5);
    expect(result.comboMult).toBe(4.5);
    expect(result.gain).toBe(135); // 30 * 4.5
  });

  it('혼합 코스트 트리플: 3.0 + 1.5 = 4.5x', () => {
    const result = calculateComboEtherGain({
      cards: [
        { rarity: 'common', actionCost: 1 },  // +0
        { rarity: 'common', actionCost: 2 },  // +0.5
        { rarity: 'common', actionCost: 3 }   // +1
      ],
      comboName: '트리플',
      comboUsageCount: {}
    });
    expect(result.actionCostBonus).toBe(1.5);
    expect(result.comboMult).toBe(4.5);
  });

  it('1코스트만 사용: 보너스 없음', () => {
    const result = calculateComboEtherGain({
      cards: [
        { rarity: 'common', actionCost: 1 },
        { rarity: 'common', actionCost: 1 },
        { rarity: 'common', actionCost: 1 }
      ],
      comboName: '트리플',
      comboUsageCount: {}
    });
    expect(result.actionCostBonus).toBe(0);
    expect(result.comboMult).toBe(3);
    expect(result.gain).toBe(90); // 30 * 3
  });
});
