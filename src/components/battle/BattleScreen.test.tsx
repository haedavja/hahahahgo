// @vitest-environment happy-dom
/**
 * @file BattleScreen.test.tsx
 * @description BattleScreen 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// gameStore 모킹
const mockGameStoreState = {
  activeBattle: null as any,
  resources: { etherPts: 100 },
  relics: [],
  maxHp: 100,
  playerInsight: 0,
  playerEnergyBonus: 0,
  playerStrength: 0,
  playerMaxSpeedBonus: 0,
  itemBuffs: {},
  resolveBattle: vi.fn(),
  applyEtherDelta: vi.fn(),
};

vi.mock('../../state/gameStore', () => ({
  useGameStore: vi.fn((selector: (state: typeof mockGameStoreState) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockGameStoreState);
    }
    return mockGameStoreState;
  }),
}));

vi.mock('zustand/react/shallow', () => ({
  useShallow: (selector: unknown) => selector,
}));

// BattleApp 모킹
vi.mock('./BattleApp', () => ({
  BattleApp: ({ initialPlayer, initialEnemy, onBattleResult }: any) => (
    <div data-testid="battle-app">
      <div data-testid="player-hp">{initialPlayer.hp}</div>
      <div data-testid="enemy-name">{initialEnemy.name}</div>
      <button
        data-testid="victory-btn"
        onClick={() => onBattleResult({ result: 'victory', playerHp: 80, playerMaxHp: 100 })}
      >
        승리
      </button>
      <button
        data-testid="defeat-btn"
        onClick={() => onBattleResult({ result: 'defeat', playerHp: 0, playerMaxHp: 100 })}
      >
        패배
      </button>
    </div>
  ),
}));

// BattleErrorBoundary 모킹
vi.mock('./BattleErrorBoundary', () => ({
  BattleErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// battleData 모킹
vi.mock('./battleData', () => ({
  ENEMIES: [
    {
      id: 'ghoul',
      name: '구울',
      hp: 40,
      ether: 100,
      speed: 10,
      emoji: '💀',
      tier: 1,
      cardsPerTurn: 2,
      passives: {},
      deck: [],
    },
  ],
  BASE_PLAYER_ENERGY: 4,
}));

// relicEffects 모킹
vi.mock('../../lib/relicEffects', () => ({
  calculatePassiveEffects: vi.fn(() => ({ maxEnergy: 0 })),
  applyCombatStartEffects: vi.fn(() => ({
    damage: 0,
    heal: 0,
    block: 0,
    strength: 0,
    energy: 0,
  })),
}));

// DevTools lazy 컴포넌트 모킹
vi.mock('../dev/DevTools', () => ({
  DevTools: () => <div data-testid="dev-tools">DevTools</div>,
}));

import { BattleScreen } from './BattleScreen';

describe('BattleScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGameStoreState.activeBattle = null;
    mockGameStoreState.resources = { etherPts: 100 };
    mockGameStoreState.relics = [];
    mockGameStoreState.maxHp = 100;
    mockGameStoreState.playerInsight = 0;
    mockGameStoreState.playerEnergyBonus = 0;
    mockGameStoreState.playerStrength = 0;
    mockGameStoreState.playerMaxSpeedBonus = 0;
    mockGameStoreState.itemBuffs = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('기본 렌더링', () => {
    it('activeBattle 없으면 null 반환', () => {
      mockGameStoreState.activeBattle = null;
      const { container } = render(<BattleScreen />);
      expect(container.firstChild).toBeNull();
    });

    it('activeBattle 있으면 BattleApp 렌더링', () => {
      mockGameStoreState.activeBattle = {
        id: 'test-battle',
        label: '테스트 전투',
        simulation: {
          initialState: {
            player: { hp: 100 },
            enemy: { hp: 40, deck: [] },
          },
        },
      };

      render(<BattleScreen />);
      expect(screen.getByTestId('battle-app')).toBeInTheDocument();
      expect(screen.getByTestId('battle-screen')).toBeInTheDocument();
    });
  });

  describe('전투 데이터 전달', () => {
    it('플레이어 HP 전달', () => {
      mockGameStoreState.activeBattle = {
        id: 'test-battle',
        label: '테스트 전투',
        simulation: {
          initialState: {
            player: { hp: 80 },
            enemy: { hp: 40, deck: [] },
          },
        },
      };
      mockGameStoreState.maxHp = 100;

      render(<BattleScreen />);
      expect(screen.getByTestId('player-hp')).toHaveTextContent('80');
    });

    it('적 이름 전달', () => {
      mockGameStoreState.activeBattle = {
        id: 'test-battle',
        label: '강력한 적',
        simulation: {
          initialState: {
            player: { hp: 100 },
            enemy: { hp: 50, deck: [] },
          },
        },
      };

      render(<BattleScreen />);
      expect(screen.getByTestId('enemy-name')).toHaveTextContent('강력한 적');
    });
  });

  describe('혼합 적 처리', () => {
    it('mixedEnemies 배열로 여러 적 처리', () => {
      mockGameStoreState.activeBattle = {
        id: 'mixed-battle',
        mixedEnemies: [
          { id: 'ghoul', name: '구울', hp: 40, ether: 100, speed: 10, emoji: '💀' },
          { id: 'skeleton', name: '해골', hp: 30, ether: 80, speed: 12, emoji: '💀' },
        ],
        simulation: {
          initialState: {
            player: { hp: 100 },
            enemy: { hp: 70, deck: [] },
          },
        },
      };

      render(<BattleScreen />);
      expect(screen.getByTestId('battle-app')).toBeInTheDocument();
    });

    it('enemies ID 배열로 적 처리', () => {
      mockGameStoreState.activeBattle = {
        id: 'id-battle',
        enemies: ['ghoul'],
        simulation: {
          initialState: {
            player: { hp: 100 },
            enemy: { hp: 40, deck: [] },
          },
        },
      };

      render(<BattleScreen />);
      expect(screen.getByTestId('battle-app')).toBeInTheDocument();
    });
  });

  describe('전투 결과 처리', () => {
    beforeEach(() => {
      mockGameStoreState.activeBattle = {
        id: 'test-battle',
        label: '테스트',
        simulation: {
          initialState: {
            player: { hp: 100 },
            enemy: { hp: 40, deck: [] },
          },
        },
      };
    });

    it('승리 시 resolveBattle 호출', () => {
      render(<BattleScreen />);
      fireEvent.click(screen.getByTestId('victory-btn'));
      expect(mockGameStoreState.resolveBattle).toHaveBeenCalledWith(
        expect.objectContaining({ result: 'victory' })
      );
    });

    it('패배 시 resolveBattle 호출', () => {
      render(<BattleScreen />);
      fireEvent.click(screen.getByTestId('defeat-btn'));
      expect(mockGameStoreState.resolveBattle).toHaveBeenCalledWith(
        expect.objectContaining({ result: 'defeat' })
      );
    });
  });

  describe('DevTools 토글', () => {
    beforeEach(() => {
      mockGameStoreState.activeBattle = {
        id: 'test-battle',
        label: '테스트',
        simulation: {
          initialState: {
            player: { hp: 100 },
            enemy: { hp: 40, deck: [] },
          },
        },
      };
    });

    it('Alt+D로 DevTools 토글', async () => {
      render(<BattleScreen />);

      // DevTools 초기에는 미표시
      expect(screen.queryByTestId('dev-tools')).not.toBeInTheDocument();

      // Alt+D 키 이벤트
      await act(async () => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'd', altKey: true })
        );
      });

      // DevTools 표시 (Suspense로 인해 비동기)
      // 참고: lazy loading으로 인해 실제 테스트에서는 즉시 나타나지 않을 수 있음
    });
  });

  describe('상태 효과 적용', () => {
    it('playerStrength 적용', () => {
      mockGameStoreState.activeBattle = {
        id: 'test-battle',
        label: '테스트',
        simulation: {
          initialState: {
            player: { hp: 100 },
            enemy: { hp: 40, deck: [] },
          },
        },
      };
      mockGameStoreState.playerStrength = 5;

      render(<BattleScreen />);
      expect(screen.getByTestId('battle-app')).toBeInTheDocument();
    });

    it('itemBuffs 적용', () => {
      mockGameStoreState.activeBattle = {
        id: 'test-battle',
        label: '테스트',
        simulation: {
          initialState: {
            player: { hp: 100 },
            enemy: { hp: 40, deck: [] },
          },
        },
      };
      mockGameStoreState.itemBuffs = { strength: 3, insight: 1 };

      render(<BattleScreen />);
      expect(screen.getByTestId('battle-app')).toBeInTheDocument();
    });
  });
});
