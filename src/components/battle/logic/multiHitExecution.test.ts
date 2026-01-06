/**
 * @file multiHitExecution.test.ts
 * @description 다중 타격 비동기 실행 테스트
 *
 * ## 테스트 대상
 * - executeMultiHitAsync: 다중 타격 비동기 실행
 *
 * ## 주요 테스트 케이스
 * - 단일 타격 카드 처리
 * - 다중 타격 카드 처리 (hits > 1)
 * - 총기 카드 탄걸림 처리
 * - 치명타 발생 시 처리
 * - 콜백 함수 호출 검증
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeMultiHitAsync } from './multiHitExecution';

// Mock dependencies
vi.mock('./combatActions', () => ({
  prepareMultiHitAttack: vi.fn(),
  calculateSingleHit: vi.fn(),
  finalizeMultiHitAttack: vi.fn(),
  rollCritical: vi.fn()
}));

vi.mock('../utils/cardSpecialEffects', () => ({
  processPerHitRoulette: vi.fn()
}));

vi.mock('./battleConstants', () => ({
  TIMING: { MULTI_HIT_DELAY: 0 } // 테스트에서는 딜레이 0
}));

import { prepareMultiHitAttack, calculateSingleHit, finalizeMultiHitAttack, rollCritical } from './combatActions';
import { processPerHitRoulette } from '../utils/cardSpecialEffects';

describe('executeMultiHitAsync', () => {
  const createCombatant = (overrides = {}) => ({
    hp: 100,
    maxHp: 100,
    block: 0,
    def: false,
    counter: 0,
    vulnMult: 1,
    strength: 0,
    tokens: { usage: [], turn: [], permanent: [] },
    ...overrides
  });

  const createCard = (overrides = {}) => ({
    id: 'test_card',
    name: '테스트 카드',
    type: 'attack',
    damage: 10,
    hits: 1,
    speedCost: 5,
    ...overrides
  });

  const createBattleContext = (overrides = {}) => ({
    remainingEnergy: 3,
    enemyDisplayName: '테스트 적',
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // 기본 mock 설정
    (prepareMultiHitAttack as ReturnType<typeof vi.fn>).mockReturnValue({
      hits: 1,
      firstHitCritical: false,
      preProcessedResult: {},
      modifiedCard: createCard(),
      currentAttacker: createCombatant(),
      currentDefender: createCombatant({ hp: 90 }),
      attackerRemainingEnergy: 3,
      firstHitResult: {
        damage: 10,
        damageTaken: 0,
        blockDestroyed: 0,
        timelineAdvance: 0,
        events: [],
        attacker: createCombatant(),
        defender: createCombatant({ hp: 90 })
      }
    });

    (calculateSingleHit as ReturnType<typeof vi.fn>).mockReturnValue({
      damage: 10,
      damageTaken: 0,
      blockDestroyed: 0,
      timelineAdvance: 0,
      events: [],
      attacker: createCombatant(),
      defender: createCombatant({ hp: 80 })
    });

    (finalizeMultiHitAttack as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker: createCombatant(),
      defender: createCombatant({ hp: 80 }),
      events: [],
      logs: [],
      createdCards: []
    });

    (rollCritical as ReturnType<typeof vi.fn>).mockReturnValue(false);

    (processPerHitRoulette as ReturnType<typeof vi.fn>).mockReturnValue({
      updatedAttacker: createCombatant(),
      jammed: false
    });
  });

  describe('단일 타격 처리', () => {
    it('단일 타격 카드가 올바르게 처리되어야 함', async () => {
      const attacker = createCombatant();
      const defender = createCombatant();
      const card = createCard({ hits: 1 });
      const context = createBattleContext();
      const callback = vi.fn();

      const result = await executeMultiHitAsync(
        card as any,
        attacker as any,
        defender as any,
        'player',
        context as any,
        callback
      );

      expect(result.dealt).toBe(10);
      expect(result.hitsCompleted).toBe(1);
      expect(result.totalHits).toBe(1);
      expect(result.jammed).toBe(false);
    });

    it('콜백이 1회 호출되어야 함', async () => {
      const callback = vi.fn();

      await executeMultiHitAsync(
        createCard() as any,
        createCombatant() as any,
        createCombatant() as any,
        'player',
        createBattleContext() as any,
        callback
      );

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(0, 1, expect.objectContaining({ damage: 10 }));
    });
  });

  describe('다중 타격 처리', () => {
    beforeEach(() => {
      (prepareMultiHitAttack as ReturnType<typeof vi.fn>).mockReturnValue({
        hits: 3,
        firstHitCritical: false,
        preProcessedResult: {},
        modifiedCard: createCard({ hits: 3 }),
        currentAttacker: createCombatant(),
        currentDefender: createCombatant({ hp: 90 }),
        attackerRemainingEnergy: 3,
        firstHitResult: {
          damage: 10,
          damageTaken: 0,
          blockDestroyed: 0,
          timelineAdvance: 0,
          events: [],
          attacker: createCombatant(),
          defender: createCombatant({ hp: 90 })
        }
      });
    });

    it('3회 타격 카드의 총 피해가 올바르게 계산되어야 함', async () => {
      const result = await executeMultiHitAsync(
        createCard({ hits: 3 }) as any,
        createCombatant() as any,
        createCombatant() as any,
        'player',
        createBattleContext() as any,
        vi.fn()
      );

      expect(result.dealt).toBe(30); // 10 x 3
      expect(result.hitsCompleted).toBe(3);
      expect(result.totalHits).toBe(3);
    });

    it('콜백이 각 타격마다 호출되어야 함', async () => {
      const callback = vi.fn();

      await executeMultiHitAsync(
        createCard({ hits: 3 }) as any,
        createCombatant() as any,
        createCombatant() as any,
        'player',
        createBattleContext() as any,
        callback
      );

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, 0, 3, expect.any(Object));
      expect(callback).toHaveBeenNthCalledWith(2, 1, 3, expect.any(Object));
      expect(callback).toHaveBeenNthCalledWith(3, 2, 3, expect.any(Object));
    });

    it('다중 타격 시 로그가 생성되어야 함', async () => {
      const result = await executeMultiHitAsync(
        createCard({ hits: 3 }) as any,
        createCombatant() as any,
        createCombatant() as any,
        'player',
        createBattleContext() as any,
        vi.fn()
      );

      expect(result.events.some(e => e.type === 'multihit')).toBe(true);
    });
  });

  describe('총기 카드 탄걸림', () => {
    beforeEach(() => {
      (prepareMultiHitAttack as ReturnType<typeof vi.fn>).mockReturnValue({
        hits: 5,
        firstHitCritical: false,
        preProcessedResult: {},
        modifiedCard: createCard({ hits: 5, cardCategory: 'gun', type: 'attack' }),
        currentAttacker: createCombatant(),
        currentDefender: createCombatant({ hp: 90 }),
        attackerRemainingEnergy: 3,
        firstHitResult: {
          damage: 10,
          damageTaken: 0,
          blockDestroyed: 0,
          timelineAdvance: 0,
          events: [],
          attacker: createCombatant(),
          defender: createCombatant({ hp: 90 })
        }
      });
    });

    it('첫 타격 후 탄걸림 시 jammed=true 반환', async () => {
      (processPerHitRoulette as ReturnType<typeof vi.fn>).mockReturnValue({
        updatedAttacker: createCombatant(),
        jammed: true
      });

      const result = await executeMultiHitAsync(
        createCard({ hits: 5, cardCategory: 'gun', type: 'attack' }) as any,
        createCombatant() as any,
        createCombatant() as any,
        'player',
        createBattleContext() as any,
        vi.fn()
      );

      expect(result.jammed).toBe(true);
      expect(result.hitsCompleted).toBe(1);
      expect(result.totalHits).toBe(5);
    });

    it('중간 타격에서 탄걸림 시 남은 타격 취소', async () => {
      // 첫 타격은 성공, 두 번째 타격 후 탄걸림
      (processPerHitRoulette as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ updatedAttacker: createCombatant(), jammed: false })
        .mockReturnValueOnce({ updatedAttacker: createCombatant(), jammed: true });

      const result = await executeMultiHitAsync(
        createCard({ hits: 5, cardCategory: 'gun', type: 'attack' }) as any,
        createCombatant() as any,
        createCombatant() as any,
        'player',
        createBattleContext() as any,
        vi.fn()
      );

      expect(result.jammed).toBe(true);
      expect(result.hitsCompleted).toBe(2);
    });
  });

  describe('치명타 처리', () => {
    it('첫 타격 치명타 시 isCritical=true', async () => {
      (prepareMultiHitAttack as ReturnType<typeof vi.fn>).mockReturnValue({
        hits: 1,
        firstHitCritical: true,
        preProcessedResult: {},
        modifiedCard: createCard(),
        currentAttacker: createCombatant(),
        currentDefender: createCombatant({ hp: 85 }),
        attackerRemainingEnergy: 3,
        firstHitResult: {
          damage: 15, // 치명타 피해
          damageTaken: 0,
          blockDestroyed: 0,
          timelineAdvance: 0,
          events: [],
          attacker: createCombatant(),
          defender: createCombatant({ hp: 85 })
        }
      });

      const result = await executeMultiHitAsync(
        createCard() as any,
        createCombatant() as any,
        createCombatant() as any,
        'player',
        createBattleContext() as any,
        vi.fn()
      );

      expect(result.isCritical).toBe(true);
      expect(result.criticalHits).toBe(1);
    });

    it('다중 타격 중 일부 치명타 시 criticalHits 카운트', async () => {
      (prepareMultiHitAttack as ReturnType<typeof vi.fn>).mockReturnValue({
        hits: 3,
        firstHitCritical: true,
        preProcessedResult: {},
        modifiedCard: createCard({ hits: 3 }),
        currentAttacker: createCombatant(),
        currentDefender: createCombatant({ hp: 85 }),
        attackerRemainingEnergy: 3,
        firstHitResult: {
          damage: 15,
          damageTaken: 0,
          blockDestroyed: 0,
          timelineAdvance: 0,
          events: [],
          attacker: createCombatant(),
          defender: createCombatant({ hp: 85 })
        }
      });

      // 두 번째 타격도 치명타
      (rollCritical as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const result = await executeMultiHitAsync(
        createCard({ hits: 3 }) as any,
        createCombatant() as any,
        createCombatant() as any,
        'player',
        createBattleContext() as any,
        vi.fn()
      );

      expect(result.isCritical).toBe(true);
      expect(result.criticalHits).toBe(2); // 첫 타격 + 두 번째 타격
    });
  });

  describe('적 공격 처리', () => {
    it('적 공격자일 때 올바르게 처리되어야 함', async () => {
      const result = await executeMultiHitAsync(
        createCard() as any,
        createCombatant() as any,
        createCombatant() as any,
        'enemy',
        createBattleContext() as any,
        vi.fn()
      );

      expect(result.dealt).toBeGreaterThanOrEqual(0);
      expect(prepareMultiHitAttack).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        'enemy',
        expect.any(Object)
      );
    });
  });
});
