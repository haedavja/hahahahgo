/**
 * @file monsterEther.test.ts
 * @description 몬스터 은총(Grace) 시스템 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  calculateGraceSlots,
  getGraceSlotCost,
  graceSlotsToPts,
  canUsePrayer,
  useGracePrayer,
  createInitialGraceState,
  updateGraceOnTurnStart,
  gainGrace,
  checkSoulShield,
  PRAYERS,
} from './monsterEther';

// ==================== 은총 슬롯 계산 테스트 ====================

describe('calculateGraceSlots', () => {
  it('은총 0일 때 슬롯 0 반환', () => {
    expect(calculateGraceSlots(0)).toBe(0);
  });

  it('기본 비용(80) 미만일 때 슬롯 0 반환', () => {
    expect(calculateGraceSlots(79)).toBe(0);
  });

  it('기본 비용(80) 이상일 때 슬롯 1 반환', () => {
    expect(calculateGraceSlots(80)).toBe(1);
  });

  it('인플레이션에 따라 슬롯 증가', () => {
    expect(calculateGraceSlots(168)).toBe(2);
  });

  it('높은 은총에서 여러 슬롯 반환', () => {
    expect(calculateGraceSlots(264)).toBe(3);
  });
});

describe('getGraceSlotCost', () => {
  it('첫 번째 슬롯 비용은 80', () => {
    expect(getGraceSlotCost(0)).toBe(80);
  });

  it('두 번째 슬롯 비용은 인플레이션 적용 (88)', () => {
    expect(getGraceSlotCost(1)).toBe(88);
  });

  it('세 번째 슬롯 비용 계산', () => {
    expect(getGraceSlotCost(2)).toBe(96);
  });
});

describe('graceSlotsToPts', () => {
  it('0 슬롯은 0 포인트', () => {
    expect(graceSlotsToPts(0)).toBe(0);
  });

  it('1 슬롯은 80 포인트', () => {
    expect(graceSlotsToPts(1)).toBe(80);
  });

  it('2 슬롯은 168 포인트', () => {
    expect(graceSlotsToPts(2)).toBe(168);
  });
});

// ==================== 기원 사용 테스트 ====================

describe('canUsePrayer', () => {
  it('은총 부족 시 기원 사용 불가', () => {
    expect(canUsePrayer(79, 'veil')).toBe(false);
  });

  it('은총 충분 시 기원 사용 가능', () => {
    expect(canUsePrayer(80, 'veil')).toBe(true);
  });

  it('2슬롯 기원 검사 (면역)', () => {
    expect(canUsePrayer(167, 'immunity')).toBe(false);
    expect(canUsePrayer(168, 'immunity')).toBe(true);
  });
});

describe('useGracePrayer', () => {
  it('기원 사용 시 은총 차감', () => {
    expect(useGracePrayer(100, 'veil')).toBe(20);
  });

  it('은총이 부족해도 0 미만으로 내려가지 않음', () => {
    expect(useGracePrayer(50, 'immunity')).toBe(0);
  });
});

// ==================== 은총 상태 관리 테스트 ====================

describe('createInitialGraceState', () => {
  it('기본 상태 생성', () => {
    const state = createInitialGraceState();
    expect(state.gracePts).toBe(0);
    expect(state.soulShield).toBe(0);
    expect(state.blessingTurns).toBe(0);
  });

  it('기본 기원 목록 포함', () => {
    const state = createInitialGraceState();
    expect(state.availablePrayers).toContain('immunity');
  });
});

describe('updateGraceOnTurnStart', () => {
  it('가호 턴 감소', () => {
    const state = createInitialGraceState();
    state.blessingTurns = 3;
    state.blessingBonus = 50;

    const updated = updateGraceOnTurnStart(state);
    expect(updated.blessingTurns).toBe(2);
  });

  it('턴 사용 기록 초기화', () => {
    const state = createInitialGraceState();
    state.usedPrayersThisTurn = ['immunity', 'veil'];

    const updated = updateGraceOnTurnStart(state);
    expect(updated.usedPrayersThisTurn).toEqual([]);
  });
});

describe('gainGrace', () => {
  it('기본 은총 획득', () => {
    const state = createInitialGraceState();
    const updated = gainGrace(state, 50);
    expect(updated.gracePts).toBe(50);
  });

  it('가호 보너스 적용', () => {
    const state = createInitialGraceState();
    state.blessingTurns = 2;
    state.blessingBonus = 50;

    const updated = gainGrace(state, 100);
    expect(updated.gracePts).toBe(150);
  });
});

// ==================== 영혼 피해 체크 테스트 ====================

describe('checkSoulShield', () => {
  it('보호막이 있으면 피해 무효화', () => {
    const state = createInitialGraceState();
    state.soulShield = 2;

    const [remainingDamage, updated] = checkSoulShield(state, 1);
    expect(remainingDamage).toBe(0);
    expect(updated.soulShield).toBe(1);
  });

  it('보호막 초과 피해는 통과', () => {
    const state = createInitialGraceState();
    state.soulShield = 1;

    const [remainingDamage, updated] = checkSoulShield(state, 3);
    expect(remainingDamage).toBe(2);
    expect(updated.soulShield).toBe(0);
  });

  it('보호막도 은총도 없으면 피해 그대로', () => {
    const state = createInitialGraceState();
    const [remainingDamage] = checkSoulShield(state, 5);
    expect(remainingDamage).toBe(5);
  });
});

// ==================== 기원 정의 검증 ====================

describe('PRAYERS', () => {
  it('모든 기원이 정의됨', () => {
    expect(PRAYERS.immunity).toBeDefined();
    expect(PRAYERS.blessing).toBeDefined();
    expect(PRAYERS.healing).toBeDefined();
    expect(PRAYERS.offense).toBeDefined();
    expect(PRAYERS.veil).toBeDefined();
  });

  it('기원 비용이 올바름', () => {
    expect(PRAYERS.veil.graceCost).toBe(1);
    expect(PRAYERS.immunity.graceCost).toBe(2);
    expect(PRAYERS.healing.graceCost).toBe(3);
  });
});
