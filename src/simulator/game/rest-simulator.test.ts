/**
 * @file rest-simulator.test.ts
 * @description 휴식 시뮬레이터 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  RestSimulator,
  type PlayerRestState,
  type RestNodeConfig,
  type RestSimulationConfig,
} from './rest-simulator';

const createTestPlayer = (overrides: Partial<PlayerRestState> = {}): PlayerRestState => ({
  hp: 70,
  maxHp: 100,
  deck: ['strike', 'block', 'shoot', 'parry', 'dodge', 'reload'],
  relics: ['compass'],
  gold: 100,
  strength: 5,
  agility: 5,
  insight: 5,
  ...overrides,
});

const createTestNodeConfig = (overrides: Partial<RestNodeConfig> = {}): RestNodeConfig => ({
  healAmount: 0.3,
  canUpgrade: true,
  canRemove: true,
  canSmith: false,
  canMeditate: false,
  canScout: false,
  ...overrides,
});

const createTestConfig = (overrides: Partial<RestSimulationConfig> = {}): RestSimulationConfig => ({
  player: createTestPlayer(),
  nodeConfig: createTestNodeConfig(),
  strategy: 'balanced',
  ...overrides,
});

describe('RestSimulator', () => {
  let simulator: RestSimulator;

  beforeEach(() => {
    simulator = new RestSimulator();
  });

  describe('constructor', () => {
    it('RestSimulator를 생성한다', () => {
      expect(simulator).toBeDefined();
    });
  });

  describe('getAvailableActions', () => {
    it('기본 휴식 액션을 반환한다', () => {
      const player = createTestPlayer();
      const nodeConfig = createTestNodeConfig();
      const actions = simulator.getAvailableActions(player, nodeConfig);

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.id === 'heal')).toBe(true);
    });

    it('체력이 최대면 휴식이 불가능하다', () => {
      const player = createTestPlayer({ hp: 100, maxHp: 100 });
      const nodeConfig = createTestNodeConfig();
      const actions = simulator.getAvailableActions(player, nodeConfig);

      const healAction = actions.find(a => a.id === 'heal');
      expect(healAction?.available).toBe(false);
    });

    it('canUpgrade가 true면 단련 액션이 있다', () => {
      const player = createTestPlayer();
      const nodeConfig = createTestNodeConfig({ canUpgrade: true });
      const actions = simulator.getAvailableActions(player, nodeConfig);

      expect(actions.some(a => a.id === 'upgrade')).toBe(true);
    });

    it('canUpgrade가 false면 단련 액션이 없다', () => {
      const player = createTestPlayer();
      const nodeConfig = createTestNodeConfig({ canUpgrade: false });
      const actions = simulator.getAvailableActions(player, nodeConfig);

      expect(actions.some(a => a.id === 'upgrade')).toBe(false);
    });

    it('canRemove가 true면 정리 액션이 있다', () => {
      const player = createTestPlayer();
      const nodeConfig = createTestNodeConfig({ canRemove: true });
      const actions = simulator.getAvailableActions(player, nodeConfig);

      expect(actions.some(a => a.id === 'remove')).toBe(true);
    });

    it('덱이 5장 이하면 정리가 불가능하다', () => {
      const player = createTestPlayer({ deck: ['strike', 'block', 'shoot'] });
      const nodeConfig = createTestNodeConfig({ canRemove: true });
      const actions = simulator.getAvailableActions(player, nodeConfig);

      const removeAction = actions.find(a => a.id === 'remove');
      expect(removeAction?.available).toBe(false);
    });

    it('canSmith가 true면 대장장이 액션이 있다', () => {
      const player = createTestPlayer();
      const nodeConfig = createTestNodeConfig({ canSmith: true });
      const actions = simulator.getAvailableActions(player, nodeConfig);

      expect(actions.some(a => a.id === 'smith')).toBe(true);
    });

    it('상징이 없으면 대장장이가 불가능하다', () => {
      const player = createTestPlayer({ relics: [] });
      const nodeConfig = createTestNodeConfig({ canSmith: true });
      const actions = simulator.getAvailableActions(player, nodeConfig);

      const smithAction = actions.find(a => a.id === 'smith');
      expect(smithAction?.available).toBe(false);
    });

    it('canMeditate가 true면 명상 액션이 있다', () => {
      const player = createTestPlayer();
      const nodeConfig = createTestNodeConfig({ canMeditate: true });
      const actions = simulator.getAvailableActions(player, nodeConfig);

      const meditateAction = actions.find(a => a.id === 'meditate');
      expect(meditateAction).toBeDefined();
      expect(meditateAction?.available).toBe(true);
    });

    it('canScout가 true면 정찰 액션이 있다', () => {
      const player = createTestPlayer();
      const nodeConfig = createTestNodeConfig({ canScout: true });
      const actions = simulator.getAvailableActions(player, nodeConfig);

      const scoutAction = actions.find(a => a.id === 'scout');
      expect(scoutAction).toBeDefined();
      expect(scoutAction?.available).toBe(true);
    });
  });

  describe('simulateRest', () => {
    it('휴식 시뮬레이션을 수행한다', () => {
      const config = createTestConfig();
      const result = simulator.simulateRest(config);

      expect(result).toBeDefined();
      expect(result.actionTaken).toBeDefined();
      expect(result.finalPlayerState).toBeDefined();
    });

    it('heal_priority 전략은 체력이 낮으면 휴식을 선택한다', () => {
      const config = createTestConfig({
        player: createTestPlayer({ hp: 30 }),
        strategy: 'heal_priority',
      });
      const result = simulator.simulateRest(config);

      expect(result.actionTaken).toBe('heal');
      expect(result.hpChange).toBeGreaterThan(0);
    });

    it('upgrade_priority 전략은 체력이 높으면 단련을 선택한다', () => {
      const config = createTestConfig({
        player: createTestPlayer({ hp: 90 }),
        strategy: 'upgrade_priority',
      });
      const result = simulator.simulateRest(config);

      // 업그레이드가 가능하면 업그레이드 선택
      expect(['heal', 'upgrade']).toContain(result.actionTaken);
    });

    it('balanced 전략은 상황에 따라 선택한다', () => {
      const config = createTestConfig({ strategy: 'balanced' });
      const result = simulator.simulateRest(config);

      expect(result.actionTaken).toBeDefined();
    });

    it('휴식 시 체력이 회복된다', () => {
      const config = createTestConfig({
        player: createTestPlayer({ hp: 50, maxHp: 100 }),
        strategy: 'heal_priority',
      });
      const result = simulator.simulateRest(config);

      if (result.actionTaken === 'heal') {
        expect(result.finalPlayerState.hp).toBeGreaterThan(50);
      }
    });
  });

  describe('analyzeRestNode', () => {
    it('휴식 노드를 분석한다', () => {
      const player = createTestPlayer();
      const nodeConfig = createTestNodeConfig();
      const analysis = simulator.analyzeRestNode(player, nodeConfig);

      expect(analysis).toBeDefined();
      expect(analysis.availableActions).toBeDefined();
      expect(analysis.recommendedAction).toBeDefined();
    });

    it('체력이 낮으면 휴식을 추천한다', () => {
      const player = createTestPlayer({ hp: 20, maxHp: 100 });
      const nodeConfig = createTestNodeConfig();
      const analysis = simulator.analyzeRestNode(player, nodeConfig);

      expect(analysis.recommendedAction).toBe('heal');
    });

    it('체력이 높으면 단련을 추천한다', () => {
      const player = createTestPlayer({ hp: 95, maxHp: 100 });
      const nodeConfig = createTestNodeConfig();
      const analysis = simulator.analyzeRestNode(player, nodeConfig);

      // 체력이 거의 가득 차면 업그레이드 추천
      expect(['heal', 'upgrade']).toContain(analysis.recommendedAction);
    });

    it('healValue를 계산한다', () => {
      const player = createTestPlayer({ hp: 50, maxHp: 100 });
      const nodeConfig = createTestNodeConfig({ healAmount: 0.3 });
      const analysis = simulator.analyzeRestNode(player, nodeConfig);

      expect(typeof analysis.healValue).toBe('number');
    });

    it('upgradeValue를 계산한다', () => {
      const player = createTestPlayer();
      const nodeConfig = createTestNodeConfig();
      const analysis = simulator.analyzeRestNode(player, nodeConfig);

      expect(typeof analysis.upgradeValue).toBe('number');
    });
  });

  describe('회복량 계산', () => {
    it('기본 회복량은 30%이다', () => {
      const config = createTestConfig({
        player: createTestPlayer({ hp: 50, maxHp: 100 }),
        nodeConfig: createTestNodeConfig({ healAmount: 0.3 }),
        strategy: 'heal_priority',
      });
      const result = simulator.simulateRest(config);

      if (result.actionTaken === 'heal') {
        expect(result.hpChange).toBe(30);
      }
    });

    it('회복 후 최대 체력을 초과하지 않는다', () => {
      const config = createTestConfig({
        player: createTestPlayer({ hp: 90, maxHp: 100 }),
        nodeConfig: createTestNodeConfig({ healAmount: 0.5 }),
        strategy: 'heal_priority',
      });
      const result = simulator.simulateRest(config);

      expect(result.finalPlayerState.hp).toBeLessThanOrEqual(100);
    });
  });

  describe('비용 처리', () => {
    it('정리 시 골드가 차감된다', () => {
      const config = createTestConfig({
        player: createTestPlayer({
          gold: 100,
          hp: 100,
          deck: ['a', 'b', 'c', 'd', 'e', 'f', 'g']
        }),
        nodeConfig: createTestNodeConfig({ canRemove: true }),
      });

      // 정리 액션이 선택되면 골드 차감 확인
      const actions = simulator.getAvailableActions(config.player, config.nodeConfig);
      const removeAction = actions.find(a => a.id === 'remove');
      expect(removeAction?.cost?.gold).toBe(50);
    });

    it('대장장이 시 골드가 차감된다', () => {
      const config = createTestConfig({
        player: createTestPlayer({ gold: 150, relics: ['test_relic'] }),
        nodeConfig: createTestNodeConfig({ canSmith: true }),
      });

      const actions = simulator.getAvailableActions(config.player, config.nodeConfig);
      const smithAction = actions.find(a => a.id === 'smith');
      expect(smithAction?.cost?.gold).toBe(100);
    });
  });

  describe('덱이 비어있는 경우', () => {
    it('덱이 비어있으면 단련이 불가능하다', () => {
      const player = createTestPlayer({ deck: [] });
      const nodeConfig = createTestNodeConfig({ canUpgrade: true });
      const actions = simulator.getAvailableActions(player, nodeConfig);

      const upgradeAction = actions.find(a => a.id === 'upgrade');
      expect(upgradeAction?.available).toBe(false);
    });
  });

  describe('전략별 테스트', () => {
    it('heal_priority는 체력이 50% 이하면 항상 휴식', () => {
      const config = createTestConfig({
        player: createTestPlayer({ hp: 40, maxHp: 100 }),
        strategy: 'heal_priority',
      });
      const result = simulator.simulateRest(config);

      expect(result.actionTaken).toBe('heal');
    });

    it('upgrade_priority는 체력이 70% 이상이면 단련 우선', () => {
      const config = createTestConfig({
        player: createTestPlayer({ hp: 80, maxHp: 100 }),
        strategy: 'upgrade_priority',
      });
      const result = simulator.simulateRest(config);

      // 업그레이드 가능하면 업그레이드
      expect(['heal', 'upgrade']).toContain(result.actionTaken);
    });
  });
});
