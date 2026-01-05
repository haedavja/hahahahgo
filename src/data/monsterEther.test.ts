/**
 * @file monsterEther.test.ts
 * @description 몬스터 은총(Grace) 시스템 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  PRAYERS,
  calculateGraceSlots,
  getGraceSlotCost,
  graceSlotsToPts,
  canUsePrayer,
  useGracePrayer,
  createInitialGraceState,
  updateGraceOnTurnStart,
  gainGrace,
  checkSoulShield,
  executePrayer,
  decidePrayer,
  processAutoPrayers,
  type PrayerType,
  type MonsterGraceState,
  type PrayerAIInput,
} from './monsterEther';

describe('monsterEther', () => {
  describe('PRAYERS 정의', () => {
    it('5가지 기원이 정의되어 있다', () => {
      expect(Object.keys(PRAYERS).length).toBe(5);
    });

    it('immunity 기원', () => {
      expect(PRAYERS.immunity.id).toBe('immunity');
      expect(PRAYERS.immunity.name).toBe('면역');
      expect(PRAYERS.immunity.graceCost).toBe(2);
    });

    it('blessing 기원', () => {
      expect(PRAYERS.blessing.id).toBe('blessing');
      expect(PRAYERS.blessing.name).toBe('가호');
      expect(PRAYERS.blessing.graceCost).toBe(2);
    });

    it('healing 기원', () => {
      expect(PRAYERS.healing.id).toBe('healing');
      expect(PRAYERS.healing.name).toBe('회복');
      expect(PRAYERS.healing.graceCost).toBe(3);
    });

    it('offense 기원', () => {
      expect(PRAYERS.offense.id).toBe('offense');
      expect(PRAYERS.offense.name).toBe('공세');
      expect(PRAYERS.offense.graceCost).toBe(2);
    });

    it('veil 기원', () => {
      expect(PRAYERS.veil.id).toBe('veil');
      expect(PRAYERS.veil.name).toBe('장막');
      expect(PRAYERS.veil.graceCost).toBe(1);
    });
  });

  describe('calculateGraceSlots', () => {
    it('포인트가 0이면 슬롯 0', () => {
      expect(calculateGraceSlots(0)).toBe(0);
    });

    it('포인트가 기본 비용 미만이면 슬롯 0', () => {
      expect(calculateGraceSlots(50)).toBe(0);
      expect(calculateGraceSlots(79)).toBe(0);
    });

    it('포인트가 80이면 슬롯 1', () => {
      expect(calculateGraceSlots(80)).toBe(1);
    });

    it('포인트가 168(80+88)이면 슬롯 2', () => {
      expect(calculateGraceSlots(168)).toBe(2);
    });

    it('많은 포인트는 더 많은 슬롯', () => {
      expect(calculateGraceSlots(300)).toBeGreaterThan(2);
      expect(calculateGraceSlots(500)).toBeGreaterThan(3);
    });

    it('undefined/null 처리', () => {
      expect(calculateGraceSlots(undefined as any)).toBe(0);
    });
  });

  describe('getGraceSlotCost', () => {
    it('슬롯 0의 비용은 80', () => {
      expect(getGraceSlotCost(0)).toBe(80);
    });

    it('슬롯 1의 비용은 88 (80 * 1.1)', () => {
      expect(getGraceSlotCost(1)).toBe(88);
    });

    it('슬롯이 높을수록 비용 증가', () => {
      const cost0 = getGraceSlotCost(0);
      const cost1 = getGraceSlotCost(1);
      const cost2 = getGraceSlotCost(2);

      expect(cost1).toBeGreaterThan(cost0);
      expect(cost2).toBeGreaterThan(cost1);
    });
  });

  describe('graceSlotsToPts', () => {
    it('슬롯 0이면 포인트 0', () => {
      expect(graceSlotsToPts(0)).toBe(0);
    });

    it('음수 슬롯이면 포인트 0', () => {
      expect(graceSlotsToPts(-1)).toBe(0);
    });

    it('슬롯 1이면 80 포인트', () => {
      expect(graceSlotsToPts(1)).toBe(80);
    });

    it('슬롯 2이면 168 포인트 (80+88)', () => {
      expect(graceSlotsToPts(2)).toBe(168);
    });

    it('슬롯이 많을수록 필요 포인트 증가', () => {
      expect(graceSlotsToPts(3)).toBeGreaterThan(graceSlotsToPts(2));
      expect(graceSlotsToPts(4)).toBeGreaterThan(graceSlotsToPts(3));
    });
  });

  describe('canUsePrayer', () => {
    it('은총이 충분하면 true', () => {
      expect(canUsePrayer(80, 'veil')).toBe(true); // veil: 1슬롯 = 80pt
    });

    it('은총이 부족하면 false', () => {
      expect(canUsePrayer(50, 'veil')).toBe(false);
    });

    it('존재하지 않는 기원은 false', () => {
      expect(canUsePrayer(500, 'nonexistent' as PrayerType)).toBe(false);
    });

    it('healing은 3슬롯 필요', () => {
      // 3슬롯 필요: 80 + 88 + 96 = 264pt
      expect(canUsePrayer(264, 'healing')).toBe(true);
      expect(canUsePrayer(250, 'healing')).toBe(false);
    });
  });

  describe('useGracePrayer', () => {
    it('기원 사용 후 은총 감소', () => {
      const result = useGracePrayer(100, 'veil');
      expect(result).toBe(20); // 100 - 80 = 20
    });

    it('은총이 부족해도 0 이하로 내려가지 않음', () => {
      const result = useGracePrayer(50, 'veil');
      expect(result).toBe(0);
    });

    it('존재하지 않는 기원은 원래 값 반환', () => {
      const result = useGracePrayer(100, 'nonexistent' as PrayerType);
      expect(result).toBe(100);
    });
  });

  describe('createInitialGraceState', () => {
    it('기본 상태 생성', () => {
      const state = createInitialGraceState();

      expect(state.gracePts).toBe(0);
      expect(state.soulShield).toBe(0);
      expect(state.blessingTurns).toBe(0);
      expect(state.blessingBonus).toBe(0);
      expect(state.usedPrayersThisTurn).toEqual([]);
    });

    it('기본 사용 가능 기원', () => {
      const state = createInitialGraceState();
      expect(state.availablePrayers).toEqual(['immunity', 'healing', 'veil']);
    });

    it('커스텀 사용 가능 기원', () => {
      const state = createInitialGraceState(['blessing', 'offense']);
      expect(state.availablePrayers).toEqual(['blessing', 'offense']);
    });
  });

  describe('updateGraceOnTurnStart', () => {
    it('가호 턴 감소', () => {
      const state = createInitialGraceState();
      state.blessingTurns = 3;
      state.blessingBonus = 50;

      const updated = updateGraceOnTurnStart(state);

      expect(updated.blessingTurns).toBe(2);
      expect(updated.blessingBonus).toBe(50);
    });

    it('가호가 1턴 남았으면 보너스도 0', () => {
      const state = createInitialGraceState();
      state.blessingTurns = 1;
      state.blessingBonus = 50;

      const updated = updateGraceOnTurnStart(state);

      expect(updated.blessingTurns).toBe(0);
      expect(updated.blessingBonus).toBe(0);
    });

    it('사용 기록 초기화', () => {
      const state = createInitialGraceState();
      state.usedPrayersThisTurn = ['veil', 'immunity'];

      const updated = updateGraceOnTurnStart(state);

      expect(updated.usedPrayersThisTurn).toEqual([]);
    });
  });

  describe('gainGrace', () => {
    it('기본 은총 획득', () => {
      const state = createInitialGraceState();
      state.gracePts = 50;

      const updated = gainGrace(state, 30);

      expect(updated.gracePts).toBe(80);
    });

    it('가호 보너스 적용', () => {
      const state = createInitialGraceState();
      state.gracePts = 0;
      state.blessingTurns = 2;
      state.blessingBonus = 50; // 50% 보너스

      const updated = gainGrace(state, 100);

      expect(updated.gracePts).toBe(150); // 100 + 50
    });

    it('가호 턴이 0이면 보너스 없음', () => {
      const state = createInitialGraceState();
      state.blessingTurns = 0;
      state.blessingBonus = 50;

      const updated = gainGrace(state, 100);

      expect(updated.gracePts).toBe(100);
    });
  });

  describe('checkSoulShield', () => {
    it('영혼 보호막이 피해 무효화', () => {
      const state = createInitialGraceState();
      state.soulShield = 2;

      const [remaining, updated] = checkSoulShield(state, 1);

      expect(remaining).toBe(0);
      expect(updated.soulShield).toBe(1);
    });

    it('보호막보다 피해가 크면 나머지 피해', () => {
      const state = createInitialGraceState();
      state.soulShield = 1;

      const [remaining, updated] = checkSoulShield(state, 3);

      expect(remaining).toBe(2);
      expect(updated.soulShield).toBe(0);
    });

    it('은총으로 영혼 피해 흡수 (1:50 비율)', () => {
      const state = createInitialGraceState();
      state.gracePts = 100;

      const [remaining, updated] = checkSoulShield(state, 2);

      expect(remaining).toBe(0); // 2 영혼 피해 = 100pt로 흡수
      expect(updated.gracePts).toBe(0);
    });

    it('보호막도 은총도 없으면 피해 그대로', () => {
      const state = createInitialGraceState();

      const [remaining, updated] = checkSoulShield(state, 3);

      expect(remaining).toBe(3);
      expect(updated.gracePts).toBe(0);
    });
  });

  describe('executePrayer', () => {
    it('면역 기원 발동', () => {
      const state = createInitialGraceState();
      state.gracePts = 200;

      const result = executePrayer(state, 'immunity', 100);

      expect(result).not.toBeNull();
      expect(result?.graceState.soulShield).toBe(1);
      expect(result?.log).toContain('면역');
    });

    it('가호 기원 발동', () => {
      const state = createInitialGraceState();
      state.gracePts = 200;
      state.availablePrayers = ['blessing'];

      const result = executePrayer(state, 'blessing', 100);

      expect(result).not.toBeNull();
      expect(result?.graceState.blessingTurns).toBe(3);
      expect(result?.graceState.blessingBonus).toBe(50);
    });

    it('회복 기원 발동', () => {
      const state = createInitialGraceState();
      state.gracePts = 300;

      const result = executePrayer(state, 'healing', 100);

      expect(result).not.toBeNull();
      expect(result?.enemyChanges.healAmount).toBe(35); // 35% of 100
    });

    it('공세 기원 발동', () => {
      const state = createInitialGraceState();
      state.gracePts = 200;
      state.availablePrayers = ['offense'];

      const result = executePrayer(state, 'offense', 100);

      expect(result).not.toBeNull();
      expect(result?.enemyChanges.blockGain).toBe(1);
    });

    it('장막 기원 발동', () => {
      const state = createInitialGraceState();
      state.gracePts = 100;

      const result = executePrayer(state, 'veil', 100);

      expect(result).not.toBeNull();
      expect(result?.enemyChanges.evadeGain).toBe(1);
    });

    it('은총 부족하면 null', () => {
      const state = createInitialGraceState();
      state.gracePts = 50;

      const result = executePrayer(state, 'immunity', 100);

      expect(result).toBeNull();
    });

    it('이번 턴 이미 사용했으면 null', () => {
      const state = createInitialGraceState();
      state.gracePts = 200;
      state.usedPrayersThisTurn = ['immunity'];

      const result = executePrayer(state, 'immunity', 100);

      expect(result).toBeNull();
    });

    it('사용 가능 목록에 없으면 null', () => {
      const state = createInitialGraceState(['veil']); // immunity 없음
      state.gracePts = 200;

      const result = executePrayer(state, 'immunity', 100);

      expect(result).toBeNull();
    });

    it('존재하지 않는 기원은 null', () => {
      const state = createInitialGraceState();
      state.gracePts = 500;

      const result = executePrayer(state, 'nonexistent' as PrayerType, 100);

      expect(result).toBeNull();
    });
  });

  describe('decidePrayer', () => {
    function createAIInput(overrides: Partial<PrayerAIInput> = {}): PrayerAIInput {
      return {
        graceState: createInitialGraceState(['immunity', 'healing', 'veil', 'blessing', 'offense']),
        enemyHp: 80,
        enemyMaxHp: 100,
        enemyEtherPts: 100,
        playerEtherPts: 50,
        turnNumber: 1,
        ...overrides,
      };
    }

    it('체력 50% 이하면 회복 우선', () => {
      const input = createAIInput({ enemyHp: 40 });
      input.graceState.gracePts = 300;

      const result = decidePrayer(input);

      expect(result).toBe('healing');
    });

    it('영혼 위험 시 면역 우선', () => {
      const input = createAIInput({
        enemyEtherPts: 200,
        playerEtherPts: 50,
      });
      input.graceState.gracePts = 200;

      const result = decidePrayer(input);

      expect(result).toBe('immunity');
    });

    it('가호가 없으면 가호 선택', () => {
      const input = createAIInput();
      input.graceState.gracePts = 200;
      input.graceState.blessingTurns = 0;

      const result = decidePrayer(input);

      expect(result).toBe('blessing');
    });

    it('체력 70% 이하면 장막 선택', () => {
      const input = createAIInput({ enemyHp: 60 });
      input.graceState.gracePts = 100;
      input.graceState.blessingTurns = 3; // 가호 있음
      input.graceState.availablePrayers = ['veil', 'offense'];

      const result = decidePrayer(input);

      expect(result).toBe('veil');
    });

    it('발동 가능한 기원이 없으면 null', () => {
      const input = createAIInput();
      input.graceState.gracePts = 10; // 부족

      const result = decidePrayer(input);

      expect(result).toBeNull();
    });

    it('이미 사용한 기원은 제외', () => {
      const input = createAIInput({ enemyHp: 40 });
      input.graceState.gracePts = 300;
      input.graceState.usedPrayersThisTurn = ['healing'];

      const result = decidePrayer(input);

      expect(result).not.toBe('healing');
    });
  });

  describe('processAutoPrayers', () => {
    it('기원을 자동 발동한다', () => {
      const input: PrayerAIInput = {
        graceState: createInitialGraceState(['blessing', 'veil']),
        enemyHp: 80,
        enemyMaxHp: 100,
        enemyEtherPts: 50,
        playerEtherPts: 100,
        turnNumber: 1,
      };
      input.graceState.gracePts = 300;

      const results = processAutoPrayers(input);

      expect(results.length).toBeGreaterThan(0);
    });

    it('최대 2회까지 발동', () => {
      const input: PrayerAIInput = {
        graceState: createInitialGraceState(['blessing', 'veil', 'offense']),
        enemyHp: 60,
        enemyMaxHp: 100,
        enemyEtherPts: 50,
        playerEtherPts: 100,
        turnNumber: 1,
      };
      input.graceState.gracePts = 500;

      const results = processAutoPrayers(input);

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('발동 가능한 기원이 없으면 빈 배열', () => {
      const input: PrayerAIInput = {
        graceState: createInitialGraceState(),
        enemyHp: 80,
        enemyMaxHp: 100,
        enemyEtherPts: 50,
        playerEtherPts: 100,
        turnNumber: 1,
      };
      input.graceState.gracePts = 10;

      const results = processAutoPrayers(input);

      expect(results).toEqual([]);
    });
  });
});
