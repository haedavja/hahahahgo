/**
 * @file comboScoring.test.js
 * @description 적 AI 콤보 점수 계산 테스트
 *
 * ## 테스트 대상
 * - COMBO_SCORE_WEIGHTS: 콤보별 AI 점수 가중치
 * - ENEMY_COMBO_TENDENCIES: 적 종류별 콤보 성향
 * - calculateComboScore: 카드 조합 점수 계산
 * - analyzePotentialCombos: 가능한 콤보 분석
 * - filterCardsForCombo: 콤보용 카드 필터링
 * - decideComboStrategy: 콤보 전략 결정
 *
 * ## 주요 테스트 케이스
 * - 콤보 점수 순서 (하이카드 < 페어 < 트리플 < 포카드)
 * - 적 종류별 콤보 성향 (슬러심=0, 탈영병=높음)
 * - 행동력 제한 내 최적 콤보 선택
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import {
  COMBO_SCORE_WEIGHTS,
  ENEMY_COMBO_TENDENCIES,
  calculateComboScore,
  analyzePotentialCombos,
  filterCardsForCombo,
  decideComboStrategy,
  scoreWithCombo
} from './comboScoring';
import {
  createComboCard,
  createComboStrategy,
  createComboStrategyOptions,
  type TestComboCard,
} from '../../../test/factories';

describe('COMBO_SCORE_WEIGHTS', () => {
  it('모든 콤보에 점수가 정의됨', () => {
    expect(COMBO_SCORE_WEIGHTS['하이카드']).toBe(0);
    expect(COMBO_SCORE_WEIGHTS['페어']).toBe(100);
    expect(COMBO_SCORE_WEIGHTS['투페어']).toBe(150);
    expect(COMBO_SCORE_WEIGHTS['트리플']).toBe(200);
    expect(COMBO_SCORE_WEIGHTS['플러쉬']).toBe(225);
    expect(COMBO_SCORE_WEIGHTS['풀하우스']).toBe(300);
    expect(COMBO_SCORE_WEIGHTS['포카드']).toBe(400);
    expect(COMBO_SCORE_WEIGHTS['파이브카드']).toBe(500);
  });

  it('콤보 점수는 배율에 비례', () => {
    expect(COMBO_SCORE_WEIGHTS['페어']).toBeLessThan(COMBO_SCORE_WEIGHTS['트리플']);
    expect(COMBO_SCORE_WEIGHTS['트리플']).toBeLessThan(COMBO_SCORE_WEIGHTS['포카드']);
    expect(COMBO_SCORE_WEIGHTS['포카드']).toBeLessThan(COMBO_SCORE_WEIGHTS['파이브카드']);
  });
});

describe('ENEMY_COMBO_TENDENCIES', () => {
  it('모든 기본 몬스터에 성향이 정의됨', () => {
    expect(ENEMY_COMBO_TENDENCIES['ghoul']).toBeDefined();
    expect(ENEMY_COMBO_TENDENCIES['marauder']).toBeDefined();
    expect(ENEMY_COMBO_TENDENCIES['slurthim']).toBeDefined();
    expect(ENEMY_COMBO_TENDENCIES['deserter']).toBeDefined();
    expect(ENEMY_COMBO_TENDENCIES['slaughterer']).toBeDefined();
  });

  it('성향 값은 0~1 범위', () => {
    Object.values(ENEMY_COMBO_TENDENCIES).forEach(tendency => {
      expect(tendency).toBeGreaterThanOrEqual(0);
      expect(tendency).toBeLessThanOrEqual(1);
    });
  });

  it('슬러심은 콤보 무시 (디버프 전용)', () => {
    expect(ENEMY_COMBO_TENDENCIES['slurthim']).toBe(0);
  });

  it('탈영병은 높은 콤보 성향 (전술적)', () => {
    expect(ENEMY_COMBO_TENDENCIES['deserter']).toBeGreaterThan(0.5);
  });
});

describe('calculateComboScore', () => {
  it('빈 배열은 점수 0', () => {
    expect(calculateComboScore([]).score).toBe(0);
    expect(calculateComboScore(null as unknown as TestComboCard[]).score).toBe(0);
  });

  it('하이카드 점수 0', () => {
    const cards = [createComboCard(1), createComboCard(2), createComboCard(3)];
    const result = calculateComboScore(cards);
    expect(result.comboName).toBe('하이카드');
    expect(result.score).toBe(0);
    expect(result.multiplier).toBe(1);
  });

  it('페어 점수 100', () => {
    const cards = [createComboCard(1), createComboCard(1)];
    const result = calculateComboScore(cards);
    expect(result.comboName).toBe('페어');
    expect(result.score).toBe(100);
    expect(result.multiplier).toBe(2);
  });

  it('트리플 점수 200', () => {
    const cards = [createComboCard(2), createComboCard(2), createComboCard(2)];
    const result = calculateComboScore(cards);
    expect(result.comboName).toBe('트리플');
    expect(result.score).toBe(200);
    expect(result.multiplier).toBe(3);
  });

  it('플러쉬 점수 225 (공격 4장)', () => {
    const cards = [
      createComboCard(1, 'attack'),
      createComboCard(2, 'attack'),
      createComboCard(3, 'attack'),
      createComboCard(4, 'attack')
    ];
    const result = calculateComboScore(cards);
    expect(result.comboName).toBe('플러쉬');
    expect(result.score).toBe(225);
  });

  it('플러쉬 점수 225 (방어 4장)', () => {
    const cards = [
      createComboCard(1, 'general'),
      createComboCard(2, 'general'),
      createComboCard(3, 'defense'),
      createComboCard(4, 'general')
    ];
    const result = calculateComboScore(cards);
    expect(result.comboName).toBe('플러쉬');
    expect(result.score).toBe(225);
  });

  it('포카드 점수 400', () => {
    const cards = [
      createComboCard(3, 'attack'),
      createComboCard(3, 'defense'),
      createComboCard(3, 'attack'),
      createComboCard(3, 'general')
    ];
    const result = calculateComboScore(cards);
    expect(result.comboName).toBe('포카드');
    expect(result.score).toBe(400);
  });
});

describe('analyzePotentialCombos', () => {
  it('빈 덱은 기본값 반환', () => {
    const result = analyzePotentialCombos([]);
    expect(result.maxSameCost).toBe(0);
    expect(result.canFlush).toBe(false);
  });

  it('동일 코스트 카드 수 계산', () => {
    const deck = [
      createComboCard(1), createComboCard(1), createComboCard(1),
      createComboCard(2), createComboCard(2)
    ];
    const result = analyzePotentialCombos(deck);
    expect(result.maxSameCost).toBe(3);
    expect(result.pairCosts).toContain(1);
    expect(result.pairCosts).toContain(2);
  });

  it('플러쉬 가능 여부 판단', () => {
    const attackDeck = [
      createComboCard(1, 'attack'),
      createComboCard(2, 'attack'),
      createComboCard(3, 'attack'),
      createComboCard(4, 'attack')
    ];
    expect(analyzePotentialCombos(attackDeck).canFlush).toBe(true);
    expect(analyzePotentialCombos(attackDeck).flushType).toBe('attack');

    const mixedDeck = [
      createComboCard(1, 'attack'),
      createComboCard(2, 'defense'),
      createComboCard(3, 'attack')
    ];
    expect(analyzePotentialCombos(mixedDeck).canFlush).toBe(false);
  });

  it('최고 잠재 콤보 판단', () => {
    const tripleReady = [
      createComboCard(1), createComboCard(1), createComboCard(1)
    ];
    expect(analyzePotentialCombos(tripleReady).bestPotentialCombo).toBe('트리플');

    const fullHouseReady = [
      createComboCard(1), createComboCard(1), createComboCard(1),
      createComboCard(2), createComboCard(2)
    ];
    expect(analyzePotentialCombos(fullHouseReady).bestPotentialCombo).toBe('풀하우스');
  });
});

describe('filterCardsForCombo', () => {
  it('플러쉬 필터: 동일 타입 카드만', () => {
    const deck = [
      createComboCard(1, 'attack'),
      createComboCard(2, 'attack'),
      createComboCard(3, 'defense'),
      createComboCard(4, 'attack'),
      createComboCard(5, 'attack')
    ];
    const filtered = filterCardsForCombo(deck, '플러쉬');
    expect(filtered.every(c => c.type === 'attack')).toBe(true);
  });

  it('트리플 필터: 가장 많은 코스트 카드', () => {
    const deck = [
      createComboCard(1), createComboCard(1), createComboCard(1),
      createComboCard(2), createComboCard(2)
    ];
    const filtered = filterCardsForCombo(deck, '트리플');
    expect(filtered.every(c => c.actionCost === 1)).toBe(true);
  });

  it('투페어 필터: 페어 가능 코스트', () => {
    const deck = [
      createComboCard(1), createComboCard(1),
      createComboCard(2), createComboCard(2),
      createComboCard(3)
    ];
    const filtered = filterCardsForCombo(deck, '투페어');
    expect(filtered.every(c => c.actionCost === 1 || c.actionCost === 2)).toBe(true);
    expect(filtered.some(c => c.actionCost === 3)).toBe(false);
  });
});

describe('decideComboStrategy', () => {
  it('HP 낮으면 콤보 가중치 감소', () => {
    const lowHpEnemy = { id: 'deserter', hp: 10, maxHp: 100, ether: 0 };
    const result = decideComboStrategy(lowHpEnemy, 0);
    expect(result.comboWeight).toBeLessThan(ENEMY_COMBO_TENDENCIES['deserter']);
  });

  it('플레이어 에테르 우세 시 콤보 가중치 증가', () => {
    const enemy = { id: 'marauder', hp: 50, maxHp: 100, ether: 0 };
    const result = decideComboStrategy(enemy, 500); // 플레이어 에테르 500
    expect(result.comboWeight).toBeGreaterThan(ENEMY_COMBO_TENDENCIES['marauder']);
    expect(result.etherPriority).toBe(true);
  });

  it('슬러심은 항상 콤보 가중치 0', () => {
    const slurthim = { id: 'slurthim', hp: 60, maxHp: 60, ether: 0 };
    const result = decideComboStrategy(slurthim, 0);
    expect(result.baseTendency).toBe(0);
  });
});

describe('scoreWithCombo', () => {
  it('카드 없으면 점수 0', () => {
    expect(scoreWithCombo(createComboStrategy('aggro'), [])).toBe(0);
    expect(scoreWithCombo(createComboStrategy('aggro'), null as unknown as TestComboCard[])).toBe(0);
  });

  it('공격 모드: 공격 카드 우대', () => {
    const attackCards = [
      createComboCard(1, 'attack', { damage: 20 }),
      createComboCard(1, 'attack', { damage: 20 })
    ];
    const defenseCards = [
      createComboCard(1, 'general', { block: 10 }),
      createComboCard(1, 'general', { block: 10 })
    ];

    const attackScore = scoreWithCombo(createComboStrategy('aggro'), attackCards);
    const defenseScore = scoreWithCombo(createComboStrategy('aggro'), defenseCards);
    expect(attackScore).toBeGreaterThan(defenseScore);
  });

  it('방어 모드: 방어 카드 우대', () => {
    const attackCards = [
      createComboCard(1, 'attack', { damage: 20 }),
      createComboCard(1, 'attack', { damage: 20 })
    ];
    const defenseCards = [
      createComboCard(1, 'general', { block: 10 }),
      createComboCard(1, 'general', { block: 10 })
    ];

    const attackScore = scoreWithCombo(createComboStrategy('turtle'), attackCards);
    const defenseScore = scoreWithCombo(createComboStrategy('turtle'), defenseCards);
    expect(defenseScore).toBeGreaterThan(attackScore);
  });

  it('콤보 가중치 반영', () => {
    const pairCards = [createComboCard(1), createComboCard(1)];

    const noCombo = scoreWithCombo(createComboStrategy('balanced'), pairCards, createComboStrategyOptions({ comboWeight: 0 }));
    const withCombo = scoreWithCombo(createComboStrategy('balanced'), pairCards, createComboStrategyOptions({ comboWeight: 1 }));

    expect(withCombo).toBeGreaterThan(noCombo);
  });

  it('에테르 우선 모드: 높은 배율 콤보 우대', () => {
    // 페어 (2배)
    const pairCards = [createComboCard(1), createComboCard(1)];
    // 트리플 (3배)
    const tripleCards = [createComboCard(2), createComboCard(2), createComboCard(2)];

    const pairScore = scoreWithCombo(
      createComboStrategy('balanced'),
      pairCards,
      createComboStrategyOptions({ etherPriority: true, comboWeight: 1 })
    );
    const tripleScore = scoreWithCombo(
      createComboStrategy('balanced'),
      tripleCards,
      createComboStrategyOptions({ etherPriority: true, comboWeight: 1 })
    );

    // 트리플이 카드 수도 많고 배율도 높음
    expect(tripleScore).toBeGreaterThan(pairScore);
  });
});
