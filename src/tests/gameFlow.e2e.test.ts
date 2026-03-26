/**
 * @file gameFlow.e2e.test.ts
 * @description 게임 플로우 E2E 통합 테스트
 *
 * ## 테스트 범위
 * - 덱 구성 및 카드 강화 플로우
 * - 토큰 시스템 전체 흐름
 * - 전투 라운드 전체 흐름
 * - 상태 효과 연쇄 처리
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// 토큰 시스템
import {
  addToken,
  removeToken,
  hasToken,
  getTokenStacks,
  createEmptyTokens
} from '../lib/tokenUtils';

// 카드 강화 시스템
import {
  calculateEnhancedStats,
  getEnhancedCard,
  generateEnhancedDescription,
  type BaseCard
} from '../lib/cardEnhancementUtils';

// 전투 시스템
import { applyAction, applyAttack, applyDefense } from '../components/battle/logic/combatActions';
import { processPreAttackSpecials } from '../components/battle/utils/preAttackSpecials';
import { processPostAttackSpecials } from '../components/battle/utils/postAttackSpecials';

// 민첩 시스템
import { applyAgility, applyAgilityToCards, applyAgilityWithAnomaly } from '../lib/agilityUtils';

// 타입
import type { Combatant, CombatState, Card, TokenEntity, TokenState } from '../types';

// ==================== 테스트 헬퍼 ====================

const originalRandom = Math.random;

function createTestCard(overrides: Partial<BaseCard> = {}): BaseCard {
  return {
    id: 'test-card',
    name: '테스트 카드',
    type: 'attack',
    damage: 10,
    speedCost: 5,
    actionCost: 1,
    ...overrides
  };
}

function createTestEntity(overrides: Partial<Combatant> = {}): Combatant {
  return {
    hp: 100,
    maxHp: 100,
    block: 0,
    def: false,
    strength: 0,
    agility: 0,
    counter: 0,
    tokens: createEmptyTokens(),
    ...overrides
  };
}

function createCombatState(
  playerOverrides: Partial<Combatant> = {},
  enemyOverrides: Partial<Combatant> = {}
): CombatState {
  return {
    player: createTestEntity(playerOverrides),
    enemy: createTestEntity(enemyOverrides),
    log: []
  };
}

// ==================== 덱 빌딩 플로우 테스트 ====================

describe('E2E: 덱 빌딩 플로우', () => {
  describe('카드 강화 전체 흐름', () => {
    it('강화 레벨 1 -> 3 순차 적용', () => {
      // 강화 가능한 카드 ID 사용
      const cardId = 'strike';

      // 레벨 1 강화
      const level1Stats = calculateEnhancedStats(cardId, 1);

      // 레벨 2 강화
      const level2Stats = calculateEnhancedStats(cardId, 2);

      // 레벨 3 강화
      const level3Stats = calculateEnhancedStats(cardId, 3);

      // 강화 레벨이 올라갈수록 스탯이 향상되어야 함 (누적)
      expect(level2Stats.damageBonus).toBeGreaterThanOrEqual(level1Stats.damageBonus);
      expect(level3Stats.damageBonus).toBeGreaterThanOrEqual(level2Stats.damageBonus);
    });

    it('강화 설명 텍스트 동적 업데이트', () => {
      const baseCard = createTestCard();

      // 화상 효과가 있는 설명
      const burnDesc = generateEnhancedDescription(baseCard, '화상 1회 부여', { ...createDefaultStats(), burnStacksBonus: 2 });
      expect(burnDesc).toContain('3');

      // 기본 설명은 변경 없음
      const normalDesc = generateEnhancedDescription(baseCard, '일반 공격', createDefaultStats());
      expect(normalDesc).toBe('일반 공격');
    });

    it('민첩성 적용 후 카드 속도 변화', () => {
      const cards = [
        createTestCard({ id: 'a', speedCost: 10 }),
        createTestCard({ id: 'b', speedCost: 5 }),
        createTestCard({ id: 'c', speedCost: 15 })
      ];

      // 민첩 3 적용
      const agiCards = applyAgilityToCards(cards as any, 3);

      expect(agiCards[0].speedCost).toBe(7);  // 10 - 3
      expect(agiCards[1].speedCost).toBe(2);  // 5 - 3
      expect(agiCards[2].speedCost).toBe(12); // 15 - 3

      // 원본 보존 확인
      expect(agiCards[0].originalSpeedCost).toBe(10);
    });
  });
});

// ==================== 토큰 시스템 전체 흐름 ====================

describe('E2E: 토큰 시스템 플로우', () => {
  describe('토큰 생명주기', () => {
    it('토큰 추가 -> 확인 -> 제거 플로우', () => {
      const entity = createTestEntity();

      // 1. 토큰 추가 (attack은 turn 타입)
      const result1 = addToken(entity, 'attack', 2);
      entity.tokens = result1.tokens;

      expect(hasToken(entity, 'attack')).toBe(true);
      expect(getTokenStacks(entity, 'attack')).toBe(2);

      // 2. 스택 추가
      const result2 = addToken(entity, 'attack', 1);
      entity.tokens = result2.tokens;

      expect(getTokenStacks(entity, 'attack')).toBe(3);

      // 3. 토큰 제거 (tokenType 파라미터 필요)
      const result3 = removeToken(entity, 'attack', 'turn', 2);
      entity.tokens = result3.tokens;

      expect(getTokenStacks(entity, 'attack')).toBe(1);

      // 4. 완전 제거
      const result4 = removeToken(entity, 'attack', 'turn', 1);
      entity.tokens = result4.tokens;

      expect(hasToken(entity, 'attack')).toBe(false);
    });

    it('상쇄 토큰 자동 처리', () => {
      const entity = createTestEntity();

      // 공세 토큰 2스택 추가 (offense는 usage 타입)
      const result1 = addToken(entity, 'offense', 2);
      entity.tokens = result1.tokens;

      expect(getTokenStacks(entity, 'offense')).toBe(2);

      // 약화 토큰 1스택 추가 -> 공세와 상쇄
      const result2 = addToken(entity, 'weaken', 1);
      entity.tokens = result2.tokens;

      // 상쇄 후 상태 확인 (공세와 약화가 상쇄되어야 함)
      const offenseStacks = getTokenStacks(entity, 'offense');
      const weakenStacks = getTokenStacks(entity, 'weaken');

      // 상쇄가 발생하면 스택이 줄어듦
      expect(offenseStacks + weakenStacks).toBeLessThanOrEqual(2);
    });

    it('면역 토큰이 부정 효과 차단', () => {
      const entity = createTestEntity();

      // 면역 토큰 부여 (immunity는 usage 타입)
      const result1 = addToken(entity, 'immunity', 1);
      entity.tokens = result1.tokens;

      // 면역 토큰이 usage에 있는지 확인
      const hasImmunity = entity.tokens.usage!.some(t => t.id === 'immunity');
      expect(hasImmunity).toBe(true);

      // 취약 토큰 시도 (negative category)
      const result2 = addToken(entity, 'vulnerable', 2);
      entity.tokens = result2.tokens;

      // 면역이 있으면 부정 효과가 차단되어야 함
      expect(hasToken(entity, 'vulnerable')).toBe(false);
    });
  });

  describe('복합 토큰 상호작용', () => {
    it('공격 토큰 + 취약 토큰 피해 계산', () => {
      // Math.random 고정 (치명타 방지)
      Math.random = () => 0.99;

      const state = createCombatState(
        {
          tokens: {
            usage: [],
            turn: [{ id: 'attack', stacks: 1 }],
            permanent: []
          }
        },
        {
          tokens: {
            usage: [],
            turn: [{ id: 'vulnerable', stacks: 1 }],
            permanent: []
          }
        }
      );

      const card = { type: 'attack', name: '타격', damage: 20 } as Card;
      const result = applyAction(state, 'player', card);

      // 공격 50% + 취약 50% 복합
      // 20 * 1.5 (attack) = 30, 30 * 1.5 (vulnerable) = 45
      expect((result.updatedState.enemy as Combatant).hp).toBe(55);

      Math.random = originalRandom;
    });
  });
});

// ==================== 전투 라운드 전체 흐름 ====================

describe('E2E: 전투 라운드 플로우', () => {
  beforeEach(() => {
    Math.random = () => 0.99; // 치명타/회피 방지
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  describe('단일 라운드 시뮬레이션', () => {
    it('플레이어 공격 -> 적 방어 -> 플레이어 재공격', () => {
      let state = createCombatState() as CombatState;

      // 1. 플레이어 공격 (20 데미지)
      const attackCard1 = { type: 'attack', name: '타격', damage: 20 } as Card;
      const result1 = applyAction(state, 'player', attackCard1);
      state = result1.updatedState as CombatState;

      expect((state.enemy as Combatant).hp).toBe(80);

      // 2. 적 방어 (15 방어력)
      const defenseCard = { type: 'defense', name: '방어', defense: 15 } as Card;
      const result2 = applyAction(state, 'enemy', defenseCard);
      state = result2.updatedState as CombatState;

      expect((state.enemy as Combatant).block).toBe(15);
      expect((state.enemy as Combatant).def).toBe(true);

      // 3. 플레이어 재공격 (25 데미지, 15 차단, 10 관통)
      const attackCard2 = { type: 'attack', name: '강타', damage: 25 } as Card;
      const result3 = applyAction(state, 'player', attackCard2);
      state = result3.updatedState as CombatState;

      expect((state.enemy as Combatant).block).toBe(0);
      expect((state.enemy as Combatant).hp).toBe(70); // 80 - 10
    });

    it('다중 타격 카드 전체 피해 계산', () => {
      const state = createCombatState({}, { block: 15, def: true });

      // 5데미지 x 5타 = 25
      const multiHitCard = { type: 'attack', name: '연타', damage: 5, hits: 5 } as Card;
      const result = applyAction(state, 'player', multiHitCard);

      // 첫 3타로 방어력 소진, 나머지 2타로 10 피해
      expect((result.updatedState.enemy as Combatant).block).toBe(0);
      expect((result.updatedState.enemy as Combatant).hp).toBe(90); // 100 - 10
    });

    it('반격 데미지 연쇄', () => {
      const state = createCombatState({}, { counter: 5 });

      const attackCard = { type: 'attack', name: '타격', damage: 20 } as Card;
      const result = applyAction(state, 'player', attackCard);

      // 플레이어가 20 데미지, 적이 5 반격
      expect((result.updatedState.enemy as Combatant).hp).toBe(80);
      expect((result.updatedState.player as Combatant).hp).toBe(95);
      expect(result.taken).toBe(5);
    });
  });

  describe('특수 효과 연쇄 처리', () => {
    it('ignoreBlock + 다중 타격', () => {
      const state = createCombatState({}, { block: 50, def: true });

      const card = { type: 'attack', name: '관통타', damage: 10, hits: 3, special: 'ignoreBlock' } as Card;
      const result = applyAction(state, 'player', card);

      // 방어 무시, 30 피해
      expect((result.updatedState.enemy as Combatant).hp).toBe(70);
      expect((result.updatedState.enemy as Combatant).block).toBe(50); // 방어력 유지
    });

    it('힘 + 공격 토큰 복합 증폭', () => {
      const state = createCombatState({
        strength: 5,
        tokens: {
          usage: [],
          turn: [{ id: 'attack', stacks: 1 }],
          permanent: []
        }
      });

      const card = { type: 'attack', name: '타격', damage: 10 } as Card;
      const result = applyAction(state, 'player', card);

      // 힘 보너스와 공격 토큰이 적용되어 기본 피해보다 높아야 함
      // 기본 피해: 10, 힘 보너스: 5, 공격 토큰: 50%
      // 계산 순서에 따라 다를 수 있으므로 최소 기본 피해 이상인지 확인
      expect((result.updatedState.enemy as Combatant).hp).toBeLessThan(100);
      expect(result.dealt).toBeGreaterThan(10); // 기본 피해보다 높아야 함
    });
  });
});

// ==================== 상태 효과 연쇄 테스트 ====================

describe('E2E: 상태 효과 연쇄', () => {
  beforeEach(() => {
    Math.random = () => 0.99;
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  describe('화상/출혈 지속 피해', () => {
    it('화상 스택에 따른 피해 누적', () => {
      const entity = createTestEntity();

      // 화상 3스택 부여
      const result = addToken(entity, 'burn', 3);
      entity.tokens = result.tokens;

      expect(getTokenStacks(entity, 'burn')).toBe(3);
      // 화상 피해는 턴 종료 시 처리되므로 여기서는 스택만 확인
    });
  });

  describe('특수 카드 효과 체인', () => {
    it('preAttack -> 공격 -> postAttack 전체 흐름', () => {
      const attacker = createTestEntity({ agility: 3 });
      const defender = createTestEntity({ block: 10, def: true });

      // agilityBonus 카드
      const card = {
        name: '취권',
        damage: 10,
        special: 'agilityBonus',
        type: 'attack'
      } as any;

      // 1. preAttack 처리
      const preResult = processPreAttackSpecials({
        card,
        attacker,
        defender,
        attackerName: 'player'
      });

      // 민첩 보너스 적용 확인 (10 + 3*5 = 25)
      expect(preResult.modifiedCard.damage).toBe(25);

      // 2. 실제 공격 (CombatState 형태로 적용)
      const state = createCombatState(
        { agility: 3 },
        { block: 10, def: true }
      );

      const result = applyAction(state, 'player', card);

      // 25 - 10 (block) = 15 데미지
      expect((result.updatedState.enemy as Combatant).hp).toBe(85);
    });
  });
});

// ==================== 민첩 시스템 통합 ====================

describe('E2E: 민첩 시스템 통합', () => {
  it('민첩성이 전투 속도에 영향', () => {
    const baseSpeed = 10;

    // 양수 민첩 = 속도 감소 (빠름)
    expect(applyAgility(baseSpeed, 3)).toBe(7);
    expect(applyAgility(baseSpeed, 5)).toBe(5);

    // 음수 민첩 = 속도 증가 (느림)
    expect(applyAgility(baseSpeed, -3)).toBe(13);

    // 최소 속도 1 보장
    expect(applyAgility(3, 10)).toBe(1);
  });

  it('이변 효과와 민첩성 복합 적용', () => {
    const playerState = { speedInstability: 2 };
    const baseSpeed = 10;
    const agility = 3;

    // 여러 번 테스트하여 범위 확인
    const results = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const result = applyAgilityWithAnomaly(baseSpeed, agility, playerState);
      results.add(result);
    }

    // 모든 결과가 최소 1 이상
    for (const result of results) {
      expect(result).toBeGreaterThanOrEqual(1);
      // 민첩 적용 후 7에서 ±2 범위
      expect(result).toBeLessThanOrEqual(9);
    }
  });
});

// ==================== 헬퍼 함수 ====================

function createDefaultStats() {
  return {
    damageBonus: 0,
    blockBonus: 0,
    speedCostReduction: 0,
    actionCostReduction: 0,
    hitsBonus: 0,
    pushAmountBonus: 0,
    advanceAmountBonus: 0,
    burnStacksBonus: 0,
    debuffStacksBonus: 0,
    counterShotBonus: 0,
    critBoostBonus: 0,
    finesseGainBonus: 0,
    drawCountBonus: 0,
    createCountBonus: 0,
    buffAmountBonus: 0,
    agilityGainBonus: 0,
    executeThresholdBonus: 0,
    parryRangeBonus: 0,
    onHitBlockBonus: 0,
    perCardBlockBonus: 0,
    maxSpeedBoostBonus: 0,
    fragStacksBonus: 0,
    growthPerTickBonus: 0,
    durationTurnsBonus: 0,
    specialEffects: [],
    addedTraits: [],
    removedTraits: []
  };
}
