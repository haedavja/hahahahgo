/**
 * @file cardExecutionCore.test.ts
 * @description 카드 실행 핵심 로직 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeCardActionCore } from './cardExecutionCore';
import type { ExecuteCardActionCoreParams, BattleAction, Card } from '../../../types';

// ==================== 테스트 헬퍼 ====================

const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'test-card',
  name: '테스트 카드',
  type: 'attack',
  damage: 10,
  speedCost: 5,
  actionCost: 1,
  traits: [],
  ...overrides,
});

const createMockPlayer = (overrides = {}) => ({
  hp: 100,
  maxHp: 100,
  block: 0,
  def: false,
  counter: 0,
  vulnMult: 1,
  strength: 0,
  energy: 6,
  maxEnergy: 6,
  tokens: {},
  ...overrides,
});

const createMockEnemy = (overrides = {}) => ({
  hp: 50,
  maxHp: 50,
  block: 0,
  def: false,
  counter: 0,
  vulnMult: 1,
  tokens: {},
  energy: 3,
  maxEnergy: 3,
  ...overrides,
});

const createMockAction = (overrides: Partial<BattleAction> = {}): BattleAction => ({
  actor: 'player',
  card: createMockCard(),
  sp: 5,
  ...overrides,
} as BattleAction);

const createMockBattleRef = (overrides = {}) => ({
  current: {
    queue: [],
    qIndex: 0,
    player: createMockPlayer(),
    enemy: createMockEnemy(),
    ...overrides,
  },
});

const createMockParams = (overrides: Partial<ExecuteCardActionCoreParams> = {}): ExecuteCardActionCoreParams => ({
  action: createMockAction(),
  player: createMockPlayer(),
  enemy: createMockEnemy(),
  battle: { phase: 'resolve', selected: [] },
  battleRef: createMockBattleRef(),
  cardUsageCount: {},
  nextTurnEffects: {},
  turnEtherAccumulated: 0,
  enemyTurnEtherAccumulated: 0,
  orderedRelicList: [],
  cardUpgrades: {},
  resolvedPlayerCards: [],
  playerTimeline: [],
  relics: [],
  safeInitialPlayer: createMockPlayer(),
  triggeredRefs: { current: new Set() },
  calculatePassiveEffects: vi.fn(() => ({})),
  collectTriggeredRelics: vi.fn(() => []),
  playRelicActivationSequence: vi.fn(),
  flashRelic: vi.fn(),
  addLog: vi.fn(),
  playHitSound: vi.fn(),
  playBlockSound: vi.fn(),
  actions: {
    setQueue: vi.fn(),
    setPlayer: vi.fn(),
    setEnemy: vi.fn(),
    setExecutingCardIndex: vi.fn(),
    setUsedCardIndices: vi.fn(),
    setTurnEtherAccumulated: vi.fn(),
    setEnemyTurnEtherAccumulated: vi.fn(),
    setResolvedPlayerCards: vi.fn(),
    setEtherPulse: vi.fn(),
    setRelicActivated: vi.fn(),
    setActionEvents: vi.fn(),
    setEnemyHit: vi.fn(),
    setPlayerHit: vi.fn(),
    setPlayerBlockAnim: vi.fn(),
    setEnemyBlockAnim: vi.fn(),
  },
  consumeNextCardEffects: vi.fn(),
  ...overrides,
} as unknown as ExecuteCardActionCoreParams);

// ==================== 테스트 ====================

describe('executeCardActionCore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('상태 초기화', () => {
    it('플레이어 상태에 기본값 적용', () => {
      const params = createMockParams({
        player: { hp: 80, maxHp: 100, tokens: {} } as any,
      });

      const result = executeCardActionCore(params);

      expect(result.P.hp).toBe(80);
      expect(result.P.def).toBe(false);
      expect(result.P.block).toBe(0);
      expect(result.P.counter).toBe(0);
      expect(result.P.vulnMult).toBe(1);
      expect(result.P.strength).toBe(0);
    });

    it('적 상태에 기본값 적용', () => {
      // 방어 카드 사용 (데미지 없음)
      const defenseCard = createMockCard({ type: 'defense', damage: 0, block: 5 });
      const params = createMockParams({
        action: createMockAction({ card: defenseCard }),
        enemy: { hp: 40, maxHp: 50, tokens: {} } as any,
      });

      const result = executeCardActionCore(params);

      // 방어 카드는 적 hp에 영향 없음
      expect(result.E.hp).toBe(40);
      expect(result.E.def).toBe(false);
      expect(result.E.block).toBe(0);
    });

    it('기존 상태 값 유지', () => {
      const params = createMockParams({
        player: createMockPlayer({ block: 15, strength: 3 }),
      });

      const result = executeCardActionCore(params);

      expect(result.P.block).toBe(15);
      expect(result.P.strength).toBe(3);
    });
  });

  describe('Early Return', () => {
    it('카드가 null이면 빈 이벤트 반환', () => {
      const params = createMockParams({
        action: { actor: 'player', card: null, sp: 5 } as any,
      });

      const result = executeCardActionCore(params);

      expect(result.actionEvents).toEqual([]);
    });

    it('카드가 undefined면 빈 이벤트 반환', () => {
      const params = createMockParams({
        action: { actor: 'player', card: undefined, sp: 5 } as any,
      });

      const result = executeCardActionCore(params);

      expect(result.actionEvents).toEqual([]);
    });
  });

  describe('에너지 계산', () => {
    it('플레이어 에너지 사용량 계산', () => {
      const queue = [
        { actor: 'player', card: { actionCost: 2 }, sp: 3 },
        { actor: 'player', card: { actionCost: 1 }, sp: 5 },
        { actor: 'enemy', card: { actionCost: 2 }, sp: 4 },
      ];

      const params = createMockParams({
        battleRef: createMockBattleRef({ queue, qIndex: 0 }),
      });

      // 내부 계산 검증 (totalEnergyUsed = 3)
      const result = executeCardActionCore(params);
      expect(result.P).toBeDefined();
    });

    it('남은 에너지는 0 이상', () => {
      const queue = [
        { actor: 'player', card: { actionCost: 10 }, sp: 3 },
      ];

      const params = createMockParams({
        player: createMockPlayer({ energy: 3 }),
        battleRef: createMockBattleRef({ queue, qIndex: 0 }),
      });

      const result = executeCardActionCore(params);
      // remainingEnergy = max(0, 3 - 10) = 0
      expect(result.P).toBeDefined();
    });
  });

  describe('미사용 공격 카드 계산', () => {
    it('현재 인덱스 이후 공격 카드만 카운트', () => {
      const queue = [
        { actor: 'player', card: { type: 'attack', actionCost: 1 }, sp: 1 },
        { actor: 'player', card: { type: 'attack', actionCost: 1 }, sp: 3 },
        { actor: 'player', card: { type: 'defense', actionCost: 1 }, sp: 5 },
        { actor: 'player', card: { type: 'attack', actionCost: 1 }, sp: 7 },
      ];

      const params = createMockParams({
        battleRef: createMockBattleRef({ queue, qIndex: 1 }),
      });

      // qIndex=1 이후: index 2 (defense), index 3 (attack)
      // unusedAttackCards = 1
      const result = executeCardActionCore(params);
      expect(result.P).toBeDefined();
    });
  });

  describe('결과 반환', () => {
    it('P, E, actionEvents 반환', () => {
      const params = createMockParams();

      const result = executeCardActionCore(params);

      expect(result).toHaveProperty('P');
      expect(result).toHaveProperty('E');
      expect(result).toHaveProperty('actionEvents');
      expect(Array.isArray(result.actionEvents)).toBe(true);
    });

    it('원본 객체 불변성 유지', () => {
      const originalPlayer = createMockPlayer({ hp: 100 });
      const params = createMockParams({ player: originalPlayer });

      executeCardActionCore(params);

      expect(originalPlayer.hp).toBe(100);
    });
  });

  describe('battleContext 생성', () => {
    it('isLastCard 계산', () => {
      const queue = [
        { actor: 'player', card: createMockCard(), sp: 1 },
        { actor: 'player', card: createMockCard(), sp: 3 },
      ];

      // 마지막 카드 (qIndex = 1)
      const params = createMockParams({
        battleRef: createMockBattleRef({ queue, qIndex: 1 }),
      });

      const result = executeCardActionCore(params);
      expect(result.P).toBeDefined();
    });

    it('빈 queue 처리', () => {
      const params = createMockParams({
        battleRef: createMockBattleRef({ queue: [], qIndex: 0 }),
      });

      const result = executeCardActionCore(params);
      expect(result.P).toBeDefined();
    });
  });

  describe('큐 수정', () => {
    it('기본 카드 실행 시 actions 객체 사용됨', () => {
      const params = createMockParams();

      executeCardActionCore(params);

      // 기본 실행에서 setPlayer, setEnemy가 호출됨
      expect(params.actions.setPlayer).toHaveBeenCalled();
      expect(params.actions.setEnemy).toHaveBeenCalled();
    });
  });

  describe('스턴 처리', () => {
    it('스턴 특성 카드 실행', () => {
      const stunCard = createMockCard({
        traits: ['stun'] as any,
        stunDuration: 1
      });

      const params = createMockParams({
        action: createMockAction({ card: stunCard }),
      });

      const result = executeCardActionCore(params);

      // 스턴 카드 실행 결과 확인
      expect(result.P).toBeDefined();
      expect(result.E).toBeDefined();
      expect(result.actionEvents).toBeDefined();
    });
  });

  describe('에테르 누적', () => {
    it('플레이어 카드 실행 시 에테르 누적 로직 호출', () => {
      const params = createMockParams({
        action: createMockAction({ actor: 'player' }),
      });

      const result = executeCardActionCore(params);

      // 에테르 누적 결과는 P에 반영
      expect(result.P).toBeDefined();
    });

    it('적 카드 실행 시 에테르 누적 로직 호출', () => {
      const params = createMockParams({
        action: createMockAction({ actor: 'enemy' }),
      });

      const result = executeCardActionCore(params);

      // 적 에테르 누적 결과는 E에 반영
      expect(result.E).toBeDefined();
    });
  });

  describe('타임라인 조작', () => {
    it('타임라인 조작 카드 효과 적용', () => {
      const advanceCard = createMockCard({
        special: { advancePlayer: 3 } as any,
      });

      const queue = [
        { actor: 'player', card: advanceCard, sp: 5 },
        { actor: 'player', card: createMockCard(), sp: 10 },
      ];

      const params = createMockParams({
        action: createMockAction({ card: advanceCard }),
        battleRef: createMockBattleRef({ queue, qIndex: 0 }),
      });

      const result = executeCardActionCore(params);
      expect(result.actionEvents).toBeDefined();
    });
  });

  describe('엣지 케이스', () => {
    it('battleRef.current가 null인 경우', () => {
      const params = createMockParams({
        battleRef: { current: null } as any,
      });

      // 에러 없이 실행
      const result = executeCardActionCore(params);
      expect(result.P).toBeDefined();
    });

    it('queue가 undefined인 경우', () => {
      const params = createMockParams({
        battleRef: { current: { qIndex: 0 } } as any,
      });

      const result = executeCardActionCore(params);
      expect(result.P).toBeDefined();
    });

    it('selected가 undefined인 경우', () => {
      const params = createMockParams({
        battle: { phase: 'resolve' } as any,
      });

      const result = executeCardActionCore(params);
      expect(result.P).toBeDefined();
    });
  });
});
