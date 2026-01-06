/**
 * @file runAllCore.test.ts
 * @description 전투 큐 실행 핵심 로직 테스트
 *
 * ## 테스트 대상
 * - runAllCore: 타임라인 큐 순차 실행
 *
 * ## 주요 테스트 케이스
 * - 빈 큐 처리
 * - 단일 액션 실행
 * - 다중 액션 순차 실행
 * - 적 처치 감지
 * - 플레이어 패배 감지
 * - 상태 업데이트 검증
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAllCore } from './runAllCore';

// Mock dependencies
vi.mock('./combatActions', () => ({
  applyAction: vi.fn()
}));

vi.mock('../utils/etherCalculations', () => ({
  getCardEtherGain: vi.fn().mockReturnValue(10)
}));

vi.mock('../../../lib/relicEffects', () => ({
  calculatePassiveEffects: () => ({
    etherMultiplier: 1,
    damageBonus: 0,
    defenseBonus: 0
  })
}));

vi.mock('../../../lib/tokenUtils', () => ({
  getAllTokens: vi.fn(() => [])
}));

vi.mock('../../../state/battleHelpers', () => ({
  createBattleEnemyData: vi.fn()
}));

vi.mock('../battleData', () => ({
  BASE_PLAYER_ENERGY: 3,
  ENEMIES: {}
}));

import { applyAction } from './combatActions';

describe('runAllCore', () => {
  const createPlayer = (overrides = {}) => ({
    hp: 100,
    maxHp: 100,
    block: 0,
    def: false,
    counter: 0,
    vulnMult: 1,
    strength: 0,
    energy: 3,
    maxEnergy: 3,
    tokens: { usage: [], turn: [], permanent: [] },
    etherPts: 0,
    ...overrides
  });

  const createEnemy = (overrides = {}) => ({
    hp: 50,
    maxHp: 50,
    block: 0,
    def: false,
    counter: 0,
    vulnMult: 1,
    energy: 3,
    maxEnergy: 3,
    tokens: { usage: [], turn: [], permanent: [] },
    etherPts: 0,
    ...overrides
  });

  const createCard = (overrides = {}) => ({
    id: 'test_card',
    name: '테스트 카드',
    type: 'attack',
    damage: 10,
    speedCost: 5,
    actionCost: 1,
    ...overrides
  });

  const createActions = () => ({
    setTurnEtherAccumulated: vi.fn(),
    setEnemyTurnEtherAccumulated: vi.fn(),
    setPlayer: vi.fn(),
    setEnemy: vi.fn(),
    setActionEvents: vi.fn(),
    setQIndex: vi.fn(),
    setPostCombatOptions: vi.fn(),
    setPhase: vi.fn(),
    setEnemyHit: vi.fn()
  });

  const createBattle = (queue: any[] = [], overrides = {}) => ({
    queue,
    qIndex: 0,
    actionEvents: {},
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // 기본 mock 설정
    (applyAction as ReturnType<typeof vi.fn>).mockImplementation((state, actor, card) => {
      const damage = card?.damage || 0;
      return {
        events: [{ actor, card: card?.name, type: 'attack', msg: `${actor} attacks for ${damage}` }],
        updatedState: {
          player: { ...state.player },
          enemy: { ...state.enemy, hp: state.enemy.hp - (actor === 'player' ? damage : 0) }
        }
      };
    });
  });

  describe('빈 큐 처리', () => {
    it('큐가 없으면 completed=false 반환', () => {
      const params = {
        battle: { queue: undefined, qIndex: 0 } as any,
        player: createPlayer() as any,
        enemy: createEnemy() as any,
        qIndex: 0,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [],
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions: createActions()
      };

      const result = runAllCore(params);

      expect(result.completed).toBe(false);
    });

    it('qIndex가 큐 길이보다 크면 completed=false 반환', () => {
      const params = {
        battle: createBattle([{ actor: 'player', card: createCard() }], { qIndex: 5 }) as any,
        player: createPlayer() as any,
        enemy: createEnemy() as any,
        qIndex: 5,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [],
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions: createActions()
      };

      const result = runAllCore(params);

      expect(result.completed).toBe(false);
    });
  });

  describe('단일 액션 실행', () => {
    it('플레이어 공격 액션이 실행되어야 함', () => {
      const card = createCard({ damage: 10 });
      const queue = [{ actor: 'player', card, sp: 5 }];
      const actions = createActions();

      const params = {
        battle: createBattle(queue) as any,
        player: createPlayer() as any,
        enemy: createEnemy({ hp: 50 }) as any,
        qIndex: 0,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [card],
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions
      };

      const result = runAllCore(params);

      expect(result.completed).toBe(true);
      expect(applyAction).toHaveBeenCalled();
      expect(actions.setPlayer).toHaveBeenCalled();
      expect(actions.setEnemy).toHaveBeenCalled();
    });

    it('적 공격 액션이 실행되어야 함', () => {
      const card = createCard({ damage: 5 });
      const queue = [{ actor: 'enemy', card, sp: 3 }];

      (applyAction as ReturnType<typeof vi.fn>).mockImplementation((state, actor, card) => ({
        events: [{ actor, card: card?.name, type: 'attack', msg: 'Enemy attacks' }],
        updatedState: {
          player: { ...state.player, hp: state.player.hp - (actor === 'enemy' ? (card?.damage || 0) : 0) },
          enemy: { ...state.enemy }
        }
      }));

      const params = {
        battle: createBattle(queue) as any,
        player: createPlayer({ hp: 100 }) as any,
        enemy: createEnemy() as any,
        qIndex: 0,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [],
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions: createActions()
      };

      const result = runAllCore(params);

      expect(result.completed).toBe(true);
    });
  });

  describe('적 처치 감지', () => {
    it('적 HP가 0이 되면 enemyDefeated 결과 반환', () => {
      const card = createCard({ damage: 100 });
      const queue = [{ actor: 'player', card, sp: 5 }];

      (applyAction as ReturnType<typeof vi.fn>).mockImplementation((state) => ({
        events: [{ actor: 'player', type: 'attack', msg: 'Lethal hit' }],
        updatedState: {
          player: { ...state.player },
          enemy: { ...state.enemy, hp: 0 }
        }
      }));

      const params = {
        battle: createBattle(queue) as any,
        player: createPlayer() as any,
        enemy: createEnemy({ hp: 50 }) as any,
        qIndex: 0,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [card],
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions: createActions()
      };

      const result = runAllCore(params);

      expect(result.completed).toBe(true);
      expect(result.result).toBe('enemyDefeated');
    });

    it('적 처치 후 남은 적 행동은 건너뛰어야 함', () => {
      const playerCard = createCard({ id: 'player_atk', damage: 100 });
      const enemyCard = createCard({ id: 'enemy_atk', damage: 20 });
      const queue = [
        { actor: 'player', card: playerCard, sp: 5 },
        { actor: 'enemy', card: enemyCard, sp: 7 }
      ];

      let callCount = 0;
      (applyAction as ReturnType<typeof vi.fn>).mockImplementation((state, actor) => {
        callCount++;
        if (actor === 'player') {
          return {
            events: [{ actor: 'player', type: 'attack', msg: 'Lethal hit' }],
            updatedState: {
              player: { ...state.player },
              enemy: { ...state.enemy, hp: 0 }
            }
          };
        }
        return {
          events: [],
          updatedState: state
        };
      });

      const params = {
        battle: createBattle(queue) as any,
        player: createPlayer() as any,
        enemy: createEnemy({ hp: 50 }) as any,
        qIndex: 0,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [playerCard],
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions: createActions()
      };

      runAllCore(params);

      // 적 카드는 실행되지 않아야 함 (applyAction은 1번만 호출)
      expect(callCount).toBe(1);
    });
  });

  describe('플레이어 패배 감지', () => {
    it('플레이어 HP가 0이 되면 defeat 결과 반환', () => {
      const enemyCard = createCard({ damage: 200 });
      const queue = [{ actor: 'enemy', card: enemyCard, sp: 3 }];

      (applyAction as ReturnType<typeof vi.fn>).mockImplementation((state) => ({
        events: [{ actor: 'enemy', type: 'attack', msg: 'Fatal hit' }],
        updatedState: {
          player: { ...state.player, hp: 0 },
          enemy: { ...state.enemy }
        }
      }));

      const actions = createActions();
      const params = {
        battle: createBattle(queue) as any,
        player: createPlayer({ hp: 100 }) as any,
        enemy: createEnemy() as any,
        qIndex: 0,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [],
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions
      };

      const result = runAllCore(params);

      expect(result.completed).toBe(true);
      expect(result.result).toBe('defeat');
      expect(actions.setPostCombatOptions).toHaveBeenCalledWith({ type: 'defeat' });
      expect(actions.setPhase).toHaveBeenCalledWith('post');
    });
  });

  describe('상태 업데이트', () => {
    it('실행 후 setPlayer가 호출되어야 함', () => {
      const card = createCard();
      const queue = [{ actor: 'player', card, sp: 5 }];
      const actions = createActions();

      const params = {
        battle: createBattle(queue) as any,
        player: createPlayer() as any,
        enemy: createEnemy() as any,
        qIndex: 0,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [card],
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions
      };

      runAllCore(params);

      expect(actions.setPlayer).toHaveBeenCalledWith(
        expect.objectContaining({ hp: expect.any(Number) })
      );
    });

    it('실행 후 setEnemy가 호출되어야 함', () => {
      const card = createCard();
      const queue = [{ actor: 'player', card, sp: 5 }];
      const actions = createActions();

      const params = {
        battle: createBattle(queue) as any,
        player: createPlayer() as any,
        enemy: createEnemy() as any,
        qIndex: 0,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [card],
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions
      };

      runAllCore(params);

      expect(actions.setEnemy).toHaveBeenCalledWith(
        expect.objectContaining({ hp: expect.any(Number) })
      );
    });

    it('실행 후 setQIndex가 큐 길이로 설정되어야 함', () => {
      const card = createCard();
      const queue = [
        { actor: 'player', card, sp: 5 },
        { actor: 'enemy', card, sp: 7 }
      ];
      const actions = createActions();

      const params = {
        battle: createBattle(queue) as any,
        player: createPlayer() as any,
        enemy: createEnemy() as any,
        qIndex: 0,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [card],
        addLog: vi.fn(),
        playSound: vi.fn(),
        actions
      };

      runAllCore(params);

      expect(actions.setQIndex).toHaveBeenCalledWith(2);
    });
  });

  describe('로그 기록', () => {
    it('각 액션의 이벤트가 addLog로 기록되어야 함', () => {
      const card = createCard();
      const queue = [{ actor: 'player', card, sp: 5 }];
      const addLog = vi.fn();

      const params = {
        battle: createBattle(queue) as any,
        player: createPlayer() as any,
        enemy: createEnemy() as any,
        qIndex: 0,
        turnEtherAccumulated: 0,
        enemyTurnEtherAccumulated: 0,
        orderedRelicList: [],
        selected: [card],
        addLog,
        playSound: vi.fn(),
        actions: createActions()
      };

      runAllCore(params);

      expect(addLog).toHaveBeenCalled();
    });
  });
});
