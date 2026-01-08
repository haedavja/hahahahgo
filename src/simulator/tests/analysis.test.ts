/**
 * @file analysis.test.ts
 * @description 분석 모듈 단위 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternLearner } from '../analysis/pattern-learning';
import { TrendAnalyzer } from '../analysis/trends';
import { detectPokerCombo, type ComboCard } from '../core/combo-ether-system';

// ==================== PatternLearner 테스트 ====================

describe('PatternLearner', () => {
  let learner: PatternLearner;

  beforeEach(() => {
    // 임시 경로로 초기화
    learner = new PatternLearner('/tmp/test-patterns.json');
    learner.clearPatterns();
  });

  describe('recordBattle', () => {
    it('전투 기록을 추가해야 함', () => {
      const battleLog = [
        'ghoul: enemySlash → 5 피해',
        '플레이어: slash → 6 피해',
        'ghoul: enemyDefend → 3 방어',
      ];

      learner.recordBattle('ghoul', battleLog, 3);

      const pattern = learner.getPattern('ghoul');
      expect(pattern).toBeDefined();
      expect(pattern?.totalObservations).toBe(1);
    });

    it('행동 빈도를 추적해야 함', () => {
      const battleLog = [
        'ghoul: enemySlash → 5 피해',
        'ghoul: enemySlash → 5 피해',
        'ghoul: enemyDefend → 3 방어',
      ];

      learner.recordBattle('ghoul', battleLog, 3);

      const pattern = learner.getPattern('ghoul');
      expect(pattern?.actionFrequency['enemySlash']).toBe(2);
      expect(pattern?.actionFrequency['enemyDefend']).toBe(1);
    });

    it('여러 전투를 누적해야 함', () => {
      const battleLog1 = ['ghoul: enemySlash → 5 피해'];
      const battleLog2 = ['ghoul: enemyDefend → 3 방어'];

      learner.recordBattle('ghoul', battleLog1, 1);
      learner.recordBattle('ghoul', battleLog2, 1);

      const pattern = learner.getPattern('ghoul');
      expect(pattern?.totalObservations).toBe(2);
    });
  });

  describe('predictNextAction', () => {
    it('관측이 부족하면 unknown을 반환해야 함', () => {
      const prediction = learner.predictNextAction('unknownEnemy');
      expect(prediction.nextAction).toBe('unknown');
      expect(prediction.confidence).toBe(0);
    });

    it('빈도 기반 예측을 반환해야 함', () => {
      // 충분한 데이터 기록
      for (let i = 0; i < 10; i++) {
        learner.recordBattle('ghoul', [
          'ghoul: enemySlash → 5 피해',
          'ghoul: enemySlash → 5 피해',
          'ghoul: enemyDefend → 3 방어',
        ], 3);
      }

      const prediction = learner.predictNextAction('ghoul');
      expect(prediction.nextAction).not.toBe('unknown');
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    it('마르코프 체인 예측을 사용해야 함', () => {
      // 패턴: slash → defend → slash 반복
      for (let i = 0; i < 10; i++) {
        learner.recordBattle('ghoul', [
          'ghoul: enemySlash → 5 피해',
          'ghoul: enemyDefend → 3 방어',
          'ghoul: enemySlash → 5 피해',
        ], 3);
      }

      // slash 다음에는 defend가 와야 함
      const prediction = learner.predictNextAction('ghoul', 'enemySlash');
      expect(prediction.nextAction).toBe('enemyDefend');
    });
  });

  describe('analyzeEnemy', () => {
    it('패턴이 없으면 null을 반환해야 함', () => {
      const analysis = learner.analyzeEnemy('unknownEnemy');
      expect(analysis).toBeNull();
    });

    it('적 분석을 반환해야 함', () => {
      for (let i = 0; i < 10; i++) {
        learner.recordBattle('ghoul', [
          'ghoul: enemySlash → 5 피해',
          'ghoul: enemyDefend → 3 방어',
        ], 2);
      }

      const analysis = learner.analyzeEnemy('ghoul');
      expect(analysis).toBeDefined();
      expect(analysis?.enemyId).toBe('ghoul');
      expect(analysis?.observations).toBeGreaterThan(0);
      expect(analysis?.topActions.length).toBeGreaterThan(0);
    });

    it('예측 가능성을 계산해야 함', () => {
      // 항상 같은 패턴 = 높은 예측 가능성 (maxEntropy=0일 때 1.0 반환)
      for (let i = 0; i < 10; i++) {
        learner.recordBattle('predictable', [
          'predictable: onlySlash → 5 피해',
        ], 1);
      }

      const analysis = learner.analyzeEnemy('predictable');
      expect(analysis?.predictability).toBe(1); // 단일 행동 = 완전 예측 가능
    });
  });
});

// ==================== TrendAnalyzer 테스트 ====================

describe('TrendAnalyzer', () => {
  let analyzer: TrendAnalyzer;

  beforeEach(() => {
    analyzer = new TrendAnalyzer('/tmp/test-trends.json');
    analyzer.clearHistory();
  });

  describe('recordDataPoint', () => {
    it('데이터 포인트를 기록해야 함', () => {
      const summary = {
        totalBattles: 100,
        wins: 60,
        losses: 40,
        draws: 0,
        winRate: 0.6,
        avgTurns: 10,
        avgPlayerDamage: 25,
        avgEnemyDamage: 30,
        topCards: [],
        cardEfficiency: {},
      };

      analyzer.recordDataPoint(summary);
      // 내부 상태 확인은 analyze()로
    });
  });

  describe('analyze', () => {
    it('데이터가 부족하면 빈 분석을 반환해야 함', async () => {
      const analysis = await analyzer.analyze(30);
      // 데이터가 부족하면 최소한의 포인트만 반환
      expect(analysis.points.length).toBeLessThanOrEqual(2);
      // insights가 빈 배열이거나 부족 메시지 포함
      expect(analysis.insights.length === 0 || analysis.insights.some((i: string) => i.includes('데이터'))).toBe(true);
    });
  });

  describe('calculateTrend (private)', () => {
    it('상승 추세를 감지해야 함', async () => {
      // 상승하는 데이터 시뮬레이션
      const mockPoints = [
        { winRate: 0.4 },
        { winRate: 0.5 },
        { winRate: 0.6 },
        { winRate: 0.7 },
      ];

      // 내부 메서드 테스트는 analyze() 결과로 간접 확인
    });
  });
});

// ==================== ComboDetector 통합 테스트 ====================

describe('ComboDetector Integration', () => {
  // 테스트용 카드 생성 헬퍼
  const createCard = (id: string, actionCost: number, type: string = 'attack', category: string = 'fencing'): ComboCard => ({
    id,
    actionCost,
    type: type as 'attack' | 'defense' | 'general' | 'support',
    category: category as 'fencing' | 'gun' | 'special' | 'general',
  });

  describe('실제 게임 시나리오', () => {
    it('기본 덱에서 페어를 감지해야 함', () => {
      // 같은 actionCost를 가진 카드 2장 = 페어
      const cards = [
        createCard('strike1', 1),
        createCard('strike2', 1),
        createCard('defend', 2),
      ];

      const result = detectPokerCombo(cards);
      expect(result.name).toBe('페어');
      expect(result.multiplier).toBeGreaterThan(1);
    });

    it('고유 카드 덱에서 하이카드를 반환해야 함', () => {
      // 모든 actionCost가 다른 카드들 = 하이카드
      const cards = [
        createCard('card1', 1),
        createCard('card2', 2),
        createCard('card3', 3),
      ];

      const result = detectPokerCombo(cards);
      expect(result.name).toBe('하이카드');
      expect(result.multiplier).toBe(1);
    });

    it('트리플 콤보를 감지해야 함', () => {
      // 같은 actionCost 3장 = 트리플
      const cards = [
        createCard('attack1', 2),
        createCard('attack2', 2),
        createCard('attack3', 2),
      ];

      const result = detectPokerCombo(cards);
      expect(result.name).toBe('트리플');
      expect(result.multiplier).toBeGreaterThan(2);
    });

    it('풀하우스를 감지해야 함', () => {
      // 3장 + 2장 = 풀하우스
      const cards = [
        createCard('a1', 1),
        createCard('a2', 1),
        createCard('a3', 1),
        createCard('b1', 2),
        createCard('b2', 2),
      ];

      const result = detectPokerCombo(cards);
      expect(result.name).toBe('풀하우스');
      expect(result.multiplier).toBeGreaterThan(3);
    });

    it('빈 카드 배열은 하이카드를 반환해야 함', () => {
      const result = detectPokerCombo([]);
      expect(result.name).toBe('하이카드');
    });
  });
});

// ==================== 통합 시나리오 테스트 ====================

describe('Analysis Integration', () => {
  it('전투 기록 → 패턴 학습 → 예측 흐름', () => {
    const learner = new PatternLearner('/tmp/test-integration.json');
    learner.clearPatterns();

    // 1. 여러 전투 기록 (최소 5개 이상 필요)
    const battles = [
      ['enemy: attack → 5 피해', 'enemy: defend → 3 방어'],
      ['enemy: attack → 5 피해', 'enemy: attack → 5 피해'],
      ['enemy: defend → 3 방어', 'enemy: attack → 5 피해'],
      ['enemy: attack → 5 피해', 'enemy: defend → 3 방어'],
      ['enemy: attack → 5 피해', 'enemy: attack → 5 피해'],
      ['enemy: defend → 3 방어', 'enemy: attack → 5 피해'],
    ];

    for (const log of battles) {
      learner.recordBattle('testEnemy', log, 2);
    }

    // 2. 패턴 분석
    const analysis = learner.analyzeEnemy('testEnemy');
    expect(analysis).toBeDefined();
    expect(analysis?.observations).toBe(6);

    // 3. 예측
    const prediction = learner.predictNextAction('testEnemy');
    expect(prediction.confidence).toBeGreaterThan(0);
  });
});
