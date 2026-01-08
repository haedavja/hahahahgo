// @vitest-environment happy-dom
/**
 * @file ItemSlots.test.tsx
 * @description ItemSlots 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemSlots } from './ItemSlots';
import type { Item } from '../../../types';

// 게임 스토어 모킹
const mockItems: (Item | null)[] = [null, null, null];
const mockItemBuffs: Record<string, number> = {};
const mockUseItem = vi.fn();
const mockRemoveItem = vi.fn();

vi.mock('../../../state/gameStore', () => ({
  useGameStore: vi.fn((selector) => {
    const state = {
      items: mockItems,
      itemBuffs: mockItemBuffs,
      useItem: mockUseItem,
      removeItem: mockRemoveItem,
    };
    return selector(state);
  }),
}));

// 사운드 유틸 모킹
vi.mock('../../../lib/soundUtils', () => ({
  playCardDestroySound: vi.fn(),
  playFreezeSound: vi.fn(),
}));

// 토큰 유틸 모킹
vi.mock('../../../lib/tokenUtils', () => ({
  addToken: vi.fn((player, tokenId, stacks) => ({
    tokens: [...(player.tokens || []), { id: tokenId, stacks }],
    logs: [`${tokenId} 획득`],
  })),
}));

describe('ItemSlots', () => {
  const defaultPlayer = {
    hp: 100,
    maxHp: 100,
    block: 0,
    energy: 3,
    maxEnergy: 6,
    strength: 0,
    etherPts: 50,
    tokens: [],
  };

  const defaultEnemy = {
    hp: 100,
    maxHp: 100,
    etherPts: 30,
  };

  const defaultBattleActions = {
    setPlayer: vi.fn(),
    setEnemy: vi.fn(),
    setEnemyPlan: vi.fn(),
    addLog: vi.fn(),
    setDestroyingEnemyCards: vi.fn(),
    setFreezingEnemyCards: vi.fn(),
    setFrozenOrder: vi.fn(),
    setFixedOrder: vi.fn(),
  };

  const defaultBattleRef = { current: { phase: 'select' } };

  const defaultProps = {
    phase: 'select',
    battleActions: defaultBattleActions,
    player: defaultPlayer,
    enemy: defaultEnemy,
    enemyPlan: null,
    battleRef: defaultBattleRef,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockItems.length = 0;
    mockItems.push(null, null, null);
    Object.keys(mockItemBuffs).forEach(key => delete mockItemBuffs[key]);
  });

  describe('기본 렌더링', () => {
    it('빈 슬롯 3개 표시', () => {
      const { container } = render(<ItemSlots {...defaultProps} />);
      const slots = container.querySelectorAll('.battle-item-slot');
      expect(slots.length).toBe(3);
    });

    it('빈 슬롯에 - 표시', () => {
      render(<ItemSlots {...defaultProps} />);
      const emptyIcons = screen.getAllByText('-');
      expect(emptyIcons.length).toBe(3);
    });
  });

  describe('아이템 표시', () => {
    it('아이템 아이콘 표시', () => {
      mockItems[0] = {
        id: 'potion',
        name: '회복 포션',
        icon: '🧪',
        description: 'HP 회복',
        usableIn: 'any',
      } as Item;

      render(<ItemSlots {...defaultProps} />);
      expect(screen.getByText('🧪')).toBeInTheDocument();
    });

    it('전투용 아이템 표시', () => {
      mockItems[0] = {
        id: 'bomb',
        name: '폭탄',
        icon: '💣',
        description: '적에게 피해',
        usableIn: 'combat',
        effect: { type: 'damage', value: 30 },
      } as Item;

      render(<ItemSlots {...defaultProps} />);
      expect(screen.getByText('💣')).toBeInTheDocument();
    });
  });

  describe('아이템 사용', () => {
    it('범용 아이템 클릭 시 useItem 호출', () => {
      mockItems[0] = {
        id: 'potion',
        name: '회복 포션',
        icon: '🧪',
        description: 'HP 회복',
        usableIn: 'any',
      } as Item;

      const { container } = render(<ItemSlots {...defaultProps} />);
      const slot = container.querySelector('.battle-item-slot');
      if (slot) fireEvent.click(slot);

      expect(mockUseItem).toHaveBeenCalledWith(0);
    });

    it('전투용 아이템 select 단계에서 사용 가능', () => {
      mockItems[0] = {
        id: 'bomb',
        name: '폭탄',
        icon: '💣',
        description: '적에게 30 피해',
        usableIn: 'combat',
        effect: { type: 'damage', value: 30 },
      } as Item;

      const { container } = render(<ItemSlots {...defaultProps} phase="select" />);
      const slot = container.querySelector('.battle-item-slot');
      if (slot) fireEvent.click(slot);

      expect(defaultBattleActions.setEnemy).toHaveBeenCalled();
    });

    it('전투용 아이템 resolve 단계에서 사용 불가 (UI 비활성화)', () => {
      mockItems[0] = {
        id: 'bomb',
        name: '폭탄',
        icon: '💣',
        description: '적에게 30 피해',
        usableIn: 'combat',
        effect: { type: 'damage', value: 30 },
      } as Item;

      const { container } = render(
        <ItemSlots
          {...defaultProps}
          phase="resolve"
          battleRef={{ current: { phase: 'resolve' } }}
        />
      );
      const slot = container.querySelector('.battle-item-slot') as HTMLElement;

      // resolve 단계에서 전투용 아이템 슬롯은 opacity 0.6 + cursor default
      expect(slot.style.opacity).toBe('0.6');
      expect(slot.style.cursor).toBe('default');

      // 클릭해도 효과 적용 안됨
      fireEvent.click(slot);
      expect(defaultBattleActions.setEnemy).not.toHaveBeenCalled();
    });
  });

  describe('전투용 아이템 효과', () => {
    it('damage 효과', () => {
      mockItems[0] = {
        id: 'bomb',
        name: '폭탄',
        icon: '💣',
        description: '적에게 30 피해',
        usableIn: 'combat',
        effect: { type: 'damage', value: 30 },
      } as Item;

      const { container } = render(<ItemSlots {...defaultProps} />);
      const slot = container.querySelector('.battle-item-slot');
      if (slot) fireEvent.click(slot);

      expect(defaultBattleActions.setEnemy).toHaveBeenCalledWith(
        expect.objectContaining({ hp: 70 })
      );
    });

    it('defense 효과', () => {
      mockItems[0] = {
        id: 'shield',
        name: '방패',
        icon: '🛡️',
        description: '방어력 획득',
        usableIn: 'combat',
        effect: { type: 'defense', value: 10 },
      } as Item;

      const { container } = render(<ItemSlots {...defaultProps} />);
      const slot = container.querySelector('.battle-item-slot');
      if (slot) fireEvent.click(slot);

      expect(defaultBattleActions.setPlayer).toHaveBeenCalledWith(
        expect.objectContaining({ block: 10 })
      );
    });

    it('turnEnergy 효과', () => {
      mockItems[0] = {
        id: 'energyDrink',
        name: '에너지 드링크',
        icon: '⚡',
        description: '에너지 획득',
        usableIn: 'combat',
        effect: { type: 'turnEnergy', value: 2 },
      } as Item;

      const { container } = render(<ItemSlots {...defaultProps} />);
      const slot = container.querySelector('.battle-item-slot');
      if (slot) fireEvent.click(slot);

      expect(defaultBattleActions.setPlayer).toHaveBeenCalledWith(
        expect.objectContaining({ energy: 5 })
      );
    });
  });

  describe('아이템 버프 표시', () => {
    it('버프가 있으면 표시', () => {
      mockItemBuffs.strength = 3;

      render(<ItemSlots {...defaultProps} />);
      expect(screen.getByText('힘 +3')).toBeInTheDocument();
    });

    it('여러 버프 표시', () => {
      mockItemBuffs.strength = 2;
      mockItemBuffs.agility = 1;

      render(<ItemSlots {...defaultProps} />);
      expect(screen.getByText('힘 +2')).toBeInTheDocument();
      expect(screen.getByText('민첩 +1')).toBeInTheDocument();
    });
  });

  describe('resolve 단계 UI', () => {
    it('resolve 단계에서 전투용 아이템에 일시정지 배지', () => {
      mockItems[0] = {
        id: 'bomb',
        name: '폭탄',
        icon: '💣',
        description: '적에게 피해',
        usableIn: 'combat',
        effect: { type: 'damage', value: 30 },
      } as Item;

      render(<ItemSlots {...defaultProps} phase="resolve" />);
      expect(screen.getByText('⏸')).toBeInTheDocument();
    });
  });

  describe('스타일', () => {
    it('컨테이너 position: fixed', () => {
      const { container } = render(<ItemSlots {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.position).toBe('fixed');
    });
  });
});
