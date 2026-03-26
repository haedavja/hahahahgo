/**
 * @file tokenConsumptionProcessing.test.ts
 * @description 토큰 소모/화상 피해 처리 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processBurnDamage } from './tokenConsumptionProcessing';

// getAllTokens mock 설정
vi.mock('../../../lib/tokenUtils', () => ({
  getAllTokens: vi.fn(() => []),
  removeToken: vi.fn((entity) => entity),
  getTokenStacks: vi.fn(() => 0),
  setTokenStacks: vi.fn((entity) => entity),
}));

import { getAllTokens } from '../../../lib/tokenUtils';

// ==================== 테스트 헬퍼 ====================

const createMockPlayerState = (overrides: Record<string, unknown> = {}) => ({
  hp: 100,
  maxHp: 100,
  tokens: { usage: [], turn: [], permanent: [] },
  ...overrides,
});

const createMockEnemyState = (overrides: Record<string, unknown> = {}) => ({
  hp: 100,
  maxHp: 100,
  tokens: { usage: [], turn: [], permanent: [] },
  ...overrides,
});

const createMockCard = () => ({
  id: 'test-card',
  name: '테스트 카드',
  type: 'attack',
  speedCost: 5,
  actionCost: 1,
  damage: 10,
  description: '테스트',
});

// ==================== 테스트 ====================

describe('processBurnDamage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('플레이어 화상 피해', () => {
    it('화상 토큰이 없으면 피해 없음', () => {
      const addLog = vi.fn();
      vi.mocked(getAllTokens).mockReturnValue([]);

      const result = processBurnDamage({
        actor: 'player',
        card: createMockCard(),
        playerState: createMockPlayerState(),
        enemyState: createMockEnemyState(),
        addLog,
      });

      expect(result.playerState.hp).toBe(100);
      expect(result.burnEvents).toHaveLength(0);
      expect(addLog).not.toHaveBeenCalled();
    });

    it('화상 토큰 1스택 → 기본 피해 3', () => {
      const addLog = vi.fn();
      const burnToken = {
        id: 'burn',
        name: '화상',
        icon: '🔥',
        stacks: 1,
        effect: { type: 'BURN', value: 3 },
      };
      vi.mocked(getAllTokens).mockReturnValue([burnToken]);

      const result = processBurnDamage({
        actor: 'player',
        card: createMockCard(),
        playerState: createMockPlayerState(),
        enemyState: createMockEnemyState(),
        addLog,
      });

      expect(result.playerState.hp).toBe(97); // 100 - 3
      expect(result.burnEvents).toHaveLength(1);
      expect(result.burnEvents[0].dmg).toBe(3);
      expect(addLog).toHaveBeenCalledWith(expect.stringContaining('화상'));
    });

    it('화상 토큰 다중 스택 → 스택 × 값 피해', () => {
      const addLog = vi.fn();
      const burnToken = {
        id: 'burn',
        name: '화상',
        icon: '🔥',
        stacks: 3,
        effect: { type: 'BURN', value: 5 },
      };
      vi.mocked(getAllTokens).mockReturnValue([burnToken]);

      const result = processBurnDamage({
        actor: 'player',
        card: createMockCard(),
        playerState: createMockPlayerState(),
        enemyState: createMockEnemyState(),
        addLog,
      });

      expect(result.playerState.hp).toBe(85); // 100 - (5 × 3)
      expect(result.burnEvents[0].dmg).toBe(15);
    });

    it('HP가 0 미만으로 내려가지 않음', () => {
      const addLog = vi.fn();
      const burnToken = {
        id: 'burn',
        name: '화상',
        icon: '🔥',
        stacks: 3,
        effect: { type: 'BURN', value: 50 },
      };
      vi.mocked(getAllTokens).mockReturnValue([burnToken]);

      const result = processBurnDamage({
        actor: 'player',
        card: createMockCard(),
        playerState: createMockPlayerState({ hp: 10 }),
        enemyState: createMockEnemyState(),
        addLog,
      });

      expect(result.playerState.hp).toBe(0); // Math.max(0, 10 - 150)
    });
  });

  describe('적 화상 피해', () => {
    it('화상 토큰이 없으면 피해 없음', () => {
      const addLog = vi.fn();
      vi.mocked(getAllTokens).mockReturnValue([]);

      const result = processBurnDamage({
        actor: 'enemy',
        card: createMockCard(),
        playerState: createMockPlayerState(),
        enemyState: createMockEnemyState(),
        addLog,
      });

      expect(result.enemyState.hp).toBe(100);
      expect(result.burnEvents).toHaveLength(0);
    });

    it('적에게 화상 토큰이 있으면 적 HP 감소', () => {
      const addLog = vi.fn();
      const burnToken = {
        id: 'burn',
        name: '화상',
        icon: '🔥',
        stacks: 2,
        effect: { type: 'BURN', value: 4 },
      };
      vi.mocked(getAllTokens).mockReturnValue([burnToken]);

      const result = processBurnDamage({
        actor: 'enemy',
        card: createMockCard(),
        playerState: createMockPlayerState(),
        enemyState: createMockEnemyState(),
        addLog,
      });

      expect(result.enemyState.hp).toBe(92); // 100 - (4 × 2)
      expect(result.burnEvents).toHaveLength(1);
      expect(result.burnEvents[0].actor).toBe('enemy');
      expect(result.burnEvents[0].dmg).toBe(8);
    });
  });

  describe('상태 불변성', () => {
    it('원본 playerState 변경 없음', () => {
      const addLog = vi.fn();
      const burnToken = {
        id: 'burn',
        name: '화상',
        icon: '🔥',
        stacks: 1,
        effect: { type: 'BURN', value: 10 },
      };
      vi.mocked(getAllTokens).mockReturnValue([burnToken]);
      const originalPlayerState = createMockPlayerState();
      const originalHp = originalPlayerState.hp;

      processBurnDamage({
        actor: 'player',
        card: createMockCard(),
        playerState: originalPlayerState,
        enemyState: createMockEnemyState(),
        addLog,
      });

      expect(originalPlayerState.hp).toBe(originalHp); // 원본 변경 없음
    });

    it('원본 enemyState 변경 없음', () => {
      const addLog = vi.fn();
      const burnToken = {
        id: 'burn',
        name: '화상',
        icon: '🔥',
        stacks: 1,
        effect: { type: 'BURN', value: 10 },
      };
      vi.mocked(getAllTokens).mockReturnValue([burnToken]);
      const originalEnemyState = createMockEnemyState();
      const originalHp = originalEnemyState.hp;

      processBurnDamage({
        actor: 'enemy',
        card: createMockCard(),
        playerState: createMockPlayerState(),
        enemyState: originalEnemyState,
        addLog,
      });

      expect(originalEnemyState.hp).toBe(originalHp); // 원본 변경 없음
    });
  });

  describe('burnEvents 구조', () => {
    it('burnEvents에 필요한 필드가 모두 포함됨', () => {
      const addLog = vi.fn();
      const burnToken = {
        id: 'burn',
        name: '화상',
        icon: '🔥',
        stacks: 1,
        effect: { type: 'BURN', value: 5 },
      };
      vi.mocked(getAllTokens).mockReturnValue([burnToken]);

      const result = processBurnDamage({
        actor: 'player',
        card: createMockCard(),
        playerState: createMockPlayerState(),
        enemyState: createMockEnemyState(),
        addLog,
      });

      expect(result.burnEvents[0]).toEqual({
        actor: 'player',
        card: '테스트 카드',
        type: 'burn',
        dmg: 5,
        msg: expect.stringContaining('화상'),
      });
    });
  });
});
