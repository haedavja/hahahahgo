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

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { executeMultiHitAsync } from './multiHitExecution';
import {
  createMultiHitContext,
  createMultiHitCombatant,
  createMultiHitCard,
  createHitResult,
  createPrepareMultiHitResult,
} from '../../../test/factories';

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
  beforeEach(() => {
    vi.clearAllMocks();

    // 기본 mock 설정
    (prepareMultiHitAttack as Mock).mockReturnValue(createPrepareMultiHitResult());

    (calculateSingleHit as Mock).mockReturnValue(createHitResult({
      defender: createMultiHitCombatant({ hp: 80 })
    }));

    (finalizeMultiHitAttack as Mock).mockReturnValue({
      attacker: createMultiHitCombatant(),
      defender: createMultiHitCombatant({ hp: 80 }),
      events: [],
      logs: [],
      createdCards: []
    });

    (rollCritical as Mock).mockReturnValue(false);

    (processPerHitRoulette as Mock).mockReturnValue({
      updatedAttacker: createMultiHitCombatant(),
      jammed: false
    });
  });

  describe('단일 타격 처리', () => {
    it('단일 타격 카드가 올바르게 처리되어야 함', async () => {
      const attacker = createMultiHitCombatant();
      const defender = createMultiHitCombatant();
      const card = createMultiHitCard({ hits: 1 });
      const context = createMultiHitContext();
      const callback = vi.fn();

      const result = await executeMultiHitAsync(
        card,
        attacker,
        defender,
        'player',
        context,
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
        createMultiHitCard(),
        createMultiHitCombatant(),
        createMultiHitCombatant(),
        'player',
        createMultiHitContext(),
        callback
      );

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(0, 1, expect.objectContaining({ damage: 10 }));
    });
  });

  describe('다중 타격 처리', () => {
    beforeEach(() => {
      (prepareMultiHitAttack as Mock).mockReturnValue(createPrepareMultiHitResult({
        hits: 3,
        modifiedCard: createMultiHitCard({ hits: 3 }),
      }));
    });

    it('3회 타격 카드의 총 피해가 올바르게 계산되어야 함', async () => {
      const result = await executeMultiHitAsync(
        createMultiHitCard({ hits: 3 }),
        createMultiHitCombatant(),
        createMultiHitCombatant(),
        'player',
        createMultiHitContext(),
        vi.fn()
      );

      expect(result.dealt).toBe(30); // 10 x 3
      expect(result.hitsCompleted).toBe(3);
      expect(result.totalHits).toBe(3);
    });

    it('콜백이 각 타격마다 호출되어야 함', async () => {
      const callback = vi.fn();

      await executeMultiHitAsync(
        createMultiHitCard({ hits: 3 }),
        createMultiHitCombatant(),
        createMultiHitCombatant(),
        'player',
        createMultiHitContext(),
        callback
      );

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, 0, 3, expect.any(Object));
      expect(callback).toHaveBeenNthCalledWith(2, 1, 3, expect.any(Object));
      expect(callback).toHaveBeenNthCalledWith(3, 2, 3, expect.any(Object));
    });

    it('다중 타격 시 로그가 생성되어야 함', async () => {
      const result = await executeMultiHitAsync(
        createMultiHitCard({ hits: 3 }),
        createMultiHitCombatant(),
        createMultiHitCombatant(),
        'player',
        createMultiHitContext(),
        vi.fn()
      );

      expect(result.events.some(e => e.type === 'multihit')).toBe(true);
    });
  });

  describe('총기 카드 탄걸림', () => {
    beforeEach(() => {
      (prepareMultiHitAttack as Mock).mockReturnValue(createPrepareMultiHitResult({
        hits: 5,
        modifiedCard: createMultiHitCard({ hits: 5, cardCategory: 'gun', type: 'attack' }),
      }));
    });

    it('첫 타격 후 탄걸림 시 jammed=true 반환', async () => {
      (processPerHitRoulette as Mock).mockReturnValue({
        updatedAttacker: createMultiHitCombatant(),
        jammed: true
      });

      const result = await executeMultiHitAsync(
        createMultiHitCard({ hits: 5, cardCategory: 'gun', type: 'attack' }),
        createMultiHitCombatant(),
        createMultiHitCombatant(),
        'player',
        createMultiHitContext(),
        vi.fn()
      );

      expect(result.jammed).toBe(true);
      expect(result.hitsCompleted).toBe(1);
      expect(result.totalHits).toBe(5);
    });

    it('중간 타격에서 탄걸림 시 남은 타격 취소', async () => {
      // 첫 타격은 성공, 두 번째 타격 후 탄걸림
      (processPerHitRoulette as Mock)
        .mockReturnValueOnce({ updatedAttacker: createMultiHitCombatant(), jammed: false })
        .mockReturnValueOnce({ updatedAttacker: createMultiHitCombatant(), jammed: true });

      const result = await executeMultiHitAsync(
        createMultiHitCard({ hits: 5, cardCategory: 'gun', type: 'attack' }),
        createMultiHitCombatant(),
        createMultiHitCombatant(),
        'player',
        createMultiHitContext(),
        vi.fn()
      );

      expect(result.jammed).toBe(true);
      expect(result.hitsCompleted).toBe(2);
    });
  });

  describe('치명타 처리', () => {
    it('첫 타격 치명타 시 isCritical=true', async () => {
      (prepareMultiHitAttack as Mock).mockReturnValue(createPrepareMultiHitResult({
        firstHitCritical: true,
        currentDefender: createMultiHitCombatant({ hp: 85 }),
        firstHitResult: createHitResult({
          damage: 15, // 치명타 피해
          defender: createMultiHitCombatant({ hp: 85 })
        }),
      }));

      const result = await executeMultiHitAsync(
        createMultiHitCard(),
        createMultiHitCombatant(),
        createMultiHitCombatant(),
        'player',
        createMultiHitContext(),
        vi.fn()
      );

      expect(result.isCritical).toBe(true);
      expect(result.criticalHits).toBe(1);
    });

    it('다중 타격 중 일부 치명타 시 criticalHits 카운트', async () => {
      (prepareMultiHitAttack as Mock).mockReturnValue(createPrepareMultiHitResult({
        hits: 3,
        firstHitCritical: true,
        modifiedCard: createMultiHitCard({ hits: 3 }),
        currentDefender: createMultiHitCombatant({ hp: 85 }),
        firstHitResult: createHitResult({
          damage: 15,
          defender: createMultiHitCombatant({ hp: 85 })
        }),
      }));

      // 두 번째 타격도 치명타
      (rollCritical as Mock)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const result = await executeMultiHitAsync(
        createMultiHitCard({ hits: 3 }),
        createMultiHitCombatant(),
        createMultiHitCombatant(),
        'player',
        createMultiHitContext(),
        vi.fn()
      );

      expect(result.isCritical).toBe(true);
      expect(result.criticalHits).toBe(2); // 첫 타격 + 두 번째 타격
    });
  });

  describe('적 공격 처리', () => {
    it('적 공격자일 때 올바르게 처리되어야 함', async () => {
      const result = await executeMultiHitAsync(
        createMultiHitCard(),
        createMultiHitCombatant(),
        createMultiHitCombatant(),
        'enemy',
        createMultiHitContext(),
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
