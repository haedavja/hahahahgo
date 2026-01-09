/**
 * @file turnEndCore.test.ts
 * @description 턴 종료 핵심 로직 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { finishTurnCore } from './turnEndCore';
import type { FinishTurnCoreParams, Card, EnemyPlan } from '../../../types';

// ==================== Mock 설정 ====================

vi.mock('../utils/comboDetection', () => ({
  detectPokerCombo: vi.fn(() => null),
}));

vi.mock('../utils/cardTraitEffects', () => ({
  processCardTraitEffects: vi.fn(() => ({})),
}));

vi.mock('../utils/turnEndEtherCalculation', () => ({
  calculateTurnEndEther: vi.fn(() => ({
    player: { finalEther: 10, appliedEther: 10, overflow: 0 },
    enemy: { finalEther: 5, appliedEther: 5 },
  })),
  formatPlayerEtherLog: vi.fn(() => '플레이어 에테르 로그'),
  formatEnemyEtherLog: vi.fn(() => '적 에테르 로그'),
}));

vi.mock('../utils/turnEndStateUpdate', () => ({
  updateComboUsageCount: vi.fn((count) => count || {}),
  createTurnEndPlayerState: vi.fn((player, updates) => ({ ...player, ...updates })),
  createTurnEndEnemyState: vi.fn((enemy, updates) => ({ ...enemy, ...updates })),
  checkVictoryCondition: vi.fn(() => null),
}));

vi.mock('../utils/turnEndRelicEffectsProcessing', () => ({
  playTurnEndRelicAnimations: vi.fn(),
  applyTurnEndRelicEffectsToNextTurn: vi.fn(() => ({})),
}));

vi.mock('../utils/enemyEtherAnimation', () => ({
  startEnemyEtherAnimation: vi.fn(),
}));

vi.mock('../utils/etherTransferProcessing', () => ({
  processEtherTransfer: vi.fn(() => ({
    nextPlayerPts: 10,
    nextEnemyPts: 5,
    enemyGraceGain: 0,
    updatedGraceState: null,
  })),
}));

vi.mock('../utils/victoryDefeatTransition', () => ({
  processVictoryDefeatTransition: vi.fn(() => ({ shouldReturn: false })),
}));

vi.mock('../../../data/monsterEther', () => ({
  gainGrace: vi.fn((grace) => grace),
  createInitialGraceState: vi.fn(() => ({ gracePts: 0, shield: 0 })),
}));

vi.mock('../../../lib/relicEffects', () => ({
  applyTurnEndEffects: vi.fn(() => ({})),
  calculatePassiveEffects: vi.fn(() => ({ hpLossPerTurn: 0 })),
}));

// ==================== 테스트 헬퍼 ====================

const createMockCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'test-card',
  name: '테스트 카드',
  type: 'attack',
  damage: 10,
  speedCost: 5,
  actionCost: 1,
  description: '테스트용 카드',
  ...overrides,
});

const createMockPlayer = (overrides = {}) => ({
  hp: 100,
  maxHp: 100,
  block: 0,
  energy: 6,
  maxEnergy: 6,
  etherPts: 0,
  etherOverflow: 0,
  etherMultiplier: 1,
  etherBan: false,
  comboUsageCount: {},
  tokens: {},
  ...overrides,
});

const createMockEnemy = (overrides = {}) => ({
  hp: 50,
  maxHp: 50,
  block: 0,
  energy: 3,
  maxEnergy: 3,
  etherPts: 0,
  comboUsageCount: {},
  tokens: {},
  grace: null,
  ...overrides,
});

const createMockEnemyPlan = (overrides: Partial<EnemyPlan> = {}): EnemyPlan => ({
  actions: [],
  mode: 'normal',
  ...overrides,
});

const createMockActions = () => ({
  clearPlayerTurnTokens: vi.fn(),
  clearEnemyTurnTokens: vi.fn(),
  setNextTurnEffects: vi.fn(),
  setEtherFinalValue: vi.fn(),
  setEnemyEtherFinalValue: vi.fn(),
  setPlayer: vi.fn(),
  setEnemy: vi.fn(),
  setTurnEtherAccumulated: vi.fn(),
  setEnemyTurnEtherAccumulated: vi.fn(),
  setSelected: vi.fn(),
  setQueue: vi.fn(),
  setQIndex: vi.fn(),
  setFixedOrder: vi.fn(),
  setUsedCardIndices: vi.fn(),
  setDisappearingCards: vi.fn(),
  setHiddenCards: vi.fn(),
  setTurnNumber: vi.fn(),
  setNetEtherDelta: vi.fn(),
  setPhase: vi.fn(),
});

const createMockParams = (overrides: Partial<FinishTurnCoreParams> = {}): FinishTurnCoreParams => {
  const actions = createMockActions();
  return {
    reason: '테스트',
    player: createMockPlayer(),
    enemy: createMockEnemy(),
    battle: { phase: 'resolve', selected: [] },
    battleRef: { current: { player: createMockPlayer(), enemy: createMockEnemy() } },
    selected: [],
    enemyPlan: createMockEnemyPlan(),
    queue: [],
    turnEtherAccumulated: 0,
    enemyTurnEtherAccumulated: 0,
    finalComboMultiplier: 1,
    relics: [],
    nextTurnEffects: null,
    escapeBanRef: { current: new Set() },
    escapeUsedThisTurnRef: { current: new Set() },
    RELICS: {},
    calculateEtherTransfer: vi.fn((amount) => amount),
    addLog: vi.fn(),
    playSound: vi.fn(),
    actions,
    ...overrides,
  } as FinishTurnCoreParams;
};

// ==================== 테스트 ====================

describe('finishTurnCore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 동작', () => {
    it('턴 종료 시 shouldReturn: false를 반환해야 함', () => {
      const params = createMockParams();
      const result = finishTurnCore(params);

      expect(result.shouldReturn).toBe(false);
    });

    it('턴 종료 로그를 추가해야 함', () => {
      const params = createMockParams({ reason: '수동 종료' });
      finishTurnCore(params);

      expect(params.addLog).toHaveBeenCalledWith('턴 종료: 수동 종료');
    });
  });

  describe('토큰 정리', () => {
    it('플레이어 턴소모 토큰을 제거해야 함', () => {
      const params = createMockParams();
      finishTurnCore(params);

      expect(params.actions.clearPlayerTurnTokens).toHaveBeenCalled();
    });

    it('적 턴소모 토큰을 제거해야 함', () => {
      const params = createMockParams();
      finishTurnCore(params);

      expect(params.actions.clearEnemyTurnTokens).toHaveBeenCalled();
    });
  });

  describe('탈주 카드 차단', () => {
    it('사용된 탈주 카드를 차단 목록에 추가해야 함', () => {
      const escapeBanRef = { current: new Set<string>() };
      const escapeUsedThisTurnRef = { current: new Set(['escape-card-1', 'escape-card-2']) };

      const params = createMockParams({ escapeBanRef, escapeUsedThisTurnRef });
      finishTurnCore(params);

      expect(escapeBanRef.current.has('escape-card-1')).toBe(true);
      expect(escapeBanRef.current.has('escape-card-2')).toBe(true);
    });

    it('사용된 탈주 카드 목록을 초기화해야 함', () => {
      const escapeUsedThisTurnRef = { current: new Set(['escape-card']) };

      const params = createMockParams({ escapeUsedThisTurnRef });
      finishTurnCore(params);

      expect(escapeUsedThisTurnRef.current.size).toBe(0);
    });
  });

  describe('상태 초기화', () => {
    it('턴 에테르 누적을 0으로 초기화해야 함', () => {
      const params = createMockParams();
      finishTurnCore(params);

      expect(params.actions.setTurnEtherAccumulated).toHaveBeenCalledWith(0);
      expect(params.actions.setEnemyTurnEtherAccumulated).toHaveBeenCalledWith(0);
    });

    it('선택된 카드를 비워야 함', () => {
      const params = createMockParams();
      finishTurnCore(params);

      expect(params.actions.setSelected).toHaveBeenCalledWith([]);
    });

    it('큐를 비워야 함', () => {
      const params = createMockParams();
      finishTurnCore(params);

      expect(params.actions.setQueue).toHaveBeenCalledWith([]);
      expect(params.actions.setQIndex).toHaveBeenCalledWith(0);
    });

    it('사용된 카드 인덱스를 비워야 함', () => {
      const params = createMockParams();
      finishTurnCore(params);

      expect(params.actions.setUsedCardIndices).toHaveBeenCalledWith([]);
      expect(params.actions.setDisappearingCards).toHaveBeenCalledWith([]);
      expect(params.actions.setHiddenCards).toHaveBeenCalledWith([]);
    });
  });

  describe('다음 턴 전환', () => {
    it('턴 번호를 증가시켜야 함', () => {
      const params = createMockParams();
      finishTurnCore(params);

      expect(params.actions.setTurnNumber).toHaveBeenCalled();
    });

    it('페이즈를 select로 변경해야 함', () => {
      const params = createMockParams();
      finishTurnCore(params);

      expect(params.actions.setPhase).toHaveBeenCalledWith('select');
    });

    it('넷 에테르 델타를 null로 초기화해야 함', () => {
      const params = createMockParams();
      finishTurnCore(params);

      expect(params.actions.setNetEtherDelta).toHaveBeenCalledWith(null);
    });
  });

  describe('에테르 차단 (etherBan)', () => {
    it('etherBan이 true면 에테르 획득 차단 로그를 남겨야 함', async () => {
      const { calculateTurnEndEther } = await import('../utils/turnEndEtherCalculation');
      vi.mocked(calculateTurnEndEther).mockReturnValue({
        player: { finalEther: 20, appliedEther: 20, overflow: 0 },
        enemy: { finalEther: 0, appliedEther: 0 },
      });

      const params = createMockParams({
        player: createMockPlayer({ etherBan: true }),
      });
      finishTurnCore(params);

      expect(params.addLog).toHaveBeenCalledWith(
        expect.stringContaining('디플레이션의 저주')
      );
    });
  });

  describe('승리/패배 조건', () => {
    it('승리 조건 충족 시 shouldReturn: true를 반환해야 함', async () => {
      const { processVictoryDefeatTransition } = await import('../utils/victoryDefeatTransition');
      vi.mocked(processVictoryDefeatTransition).mockReturnValue({ shouldReturn: true });

      const params = createMockParams();
      const result = finishTurnCore(params);

      expect(result.shouldReturn).toBe(true);
    });

    it('승리 시 페이즈 변경이 호출되지 않아야 함', async () => {
      const { processVictoryDefeatTransition } = await import('../utils/victoryDefeatTransition');
      vi.mocked(processVictoryDefeatTransition).mockReturnValue({ shouldReturn: true });

      const params = createMockParams();
      finishTurnCore(params);

      expect(params.actions.setPhase).not.toHaveBeenCalled();
    });
  });

  describe('카드가 있는 경우', () => {
    it('선택된 카드로 에테르를 계산해야 함', async () => {
      const { calculateTurnEndEther } = await import('../utils/turnEndEtherCalculation');

      const selectedCards = [createMockCard(), createMockCard()];
      const params = createMockParams({
        selected: selectedCards,
        turnEtherAccumulated: 15,
      });

      finishTurnCore(params);

      expect(calculateTurnEndEther).toHaveBeenCalled();
    });
  });

  describe('상징 효과', () => {
    it('턴 종료 상징 애니메이션을 재생해야 함', async () => {
      const { playTurnEndRelicAnimations } = await import('../utils/turnEndRelicEffectsProcessing');

      const params = createMockParams({
        relics: [{ id: 'relic-1' }, { id: 'relic-2' }],
      });

      finishTurnCore(params);

      expect(playTurnEndRelicAnimations).toHaveBeenCalled();
    });

    it('다음 턴 상징 효과를 적용해야 함', async () => {
      const { applyTurnEndRelicEffectsToNextTurn } = await import('../utils/turnEndRelicEffectsProcessing');

      const params = createMockParams();
      finishTurnCore(params);

      expect(applyTurnEndRelicEffectsToNextTurn).toHaveBeenCalled();
      expect(params.actions.setNextTurnEffects).toHaveBeenCalled();
    });
  });

  describe('플레이어 상태 업데이트', () => {
    it('플레이어 에테르 포인트를 업데이트해야 함', async () => {
      const { createTurnEndPlayerState } = await import('../utils/turnEndStateUpdate');

      const params = createMockParams();
      finishTurnCore(params);

      expect(createTurnEndPlayerState).toHaveBeenCalled();
      expect(params.actions.setPlayer).toHaveBeenCalled();
    });
  });

  describe('적 상태 업데이트', () => {
    it('적 에테르 포인트를 업데이트해야 함', async () => {
      const { createTurnEndEnemyState } = await import('../utils/turnEndStateUpdate');

      const params = createMockParams();
      finishTurnCore(params);

      expect(createTurnEndEnemyState).toHaveBeenCalled();
      expect(params.actions.setEnemy).toHaveBeenCalled();
    });

    it('적 에테르 포인트는 0 미만이 되지 않아야 함', async () => {
      const { processEtherTransfer } = await import('../utils/etherTransferProcessing');
      vi.mocked(processEtherTransfer).mockReturnValue({
        nextPlayerPts: 10,
        nextEnemyPts: -5, // 음수
        enemyGraceGain: 0,
        updatedGraceState: null,
      });

      const { createTurnEndEnemyState } = await import('../utils/turnEndStateUpdate');

      const params = createMockParams();
      finishTurnCore(params);

      // createTurnEndEnemyState에 전달되는 etherPts가 0 이상인지 확인
      expect(createTurnEndEnemyState).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ etherPts: 0 })
      );
    });
  });
});
