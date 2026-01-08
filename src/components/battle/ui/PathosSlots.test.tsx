// @vitest-environment happy-dom
/**
 * @file PathosSlots.test.tsx
 * @description PathosSlots 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PathosSlots } from './PathosSlots';
import type { PathosCooldowns, PathosUseResult } from '../../../lib/pathosEffects';
import type { Combatant } from '../../../types';

// pathosEffects 모킹
const mockEquippedPathos = [
  { id: 'swiftBlade', name: '신속의 검', type: 'sword', description: '빠른 공격', cooldown: 3 },
  { id: 'preciseShot', name: '정밀 사격', type: 'gun', description: '정확한 공격', cooldown: 2 },
];

vi.mock('../../../lib/pathosEffects', () => ({
  getEquippedPathos: vi.fn(() => mockEquippedPathos),
  canUsePathos: vi.fn((pathosId: string, cooldowns: PathosCooldowns) => {
    return !cooldowns[pathosId] || cooldowns[pathosId] <= 0;
  }),
  usePathos: vi.fn((pathosId: string, player: Combatant, enemy: Combatant, cooldowns: PathosCooldowns) => {
    const pathos = mockEquippedPathos.find(p => p.id === pathosId);
    if (pathos) {
      cooldowns[pathosId] = pathos.cooldown;
    }
    return {
      success: true,
      newPlayer: player,
      newEnemy: enemy,
      logs: [`${pathosId} 사용!`],
    } as PathosUseResult;
  }),
}));

// PATHOS 데이터 모킹
vi.mock('../../../data/growth/pathosData', () => ({
  PATHOS: {
    swiftBlade: { id: 'swiftBlade', name: '신속의 검', type: 'sword', description: '빠른 공격', cooldown: 3 },
    preciseShot: { id: 'preciseShot', name: '정밀 사격', type: 'gun', description: '정확한 공격', cooldown: 2 },
  },
}));

describe('PathosSlots', () => {
  const defaultPlayer: Combatant = {
    hp: 100,
    maxHp: 100,
    block: 0,
    energy: 3,
    maxEnergy: 6,
    etherPts: 50,
    tokens: [],
  } as Combatant;

  const defaultEnemy: Combatant = {
    hp: 100,
    maxHp: 100,
    etherPts: 30,
    tokens: [],
  } as Combatant;

  const onPathosUsed = vi.fn();
  const defaultBattleRef = { current: { phase: 'select' } };

  const defaultProps = {
    phase: 'select',
    player: defaultPlayer,
    enemy: defaultEnemy,
    cooldowns: {} as PathosCooldowns,
    onPathosUsed,
    battleRef: defaultBattleRef,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEquippedPathos.length = 0;
    mockEquippedPathos.push(
      { id: 'swiftBlade', name: '신속의 검', type: 'sword', description: '빠른 공격', cooldown: 3 },
      { id: 'preciseShot', name: '정밀 사격', type: 'gun', description: '정확한 공격', cooldown: 2 }
    );
  });

  describe('기본 렌더링', () => {
    it('장착된 파토스가 없으면 null 반환', () => {
      mockEquippedPathos.length = 0;
      const { container } = render(<PathosSlots {...defaultProps} />);
      expect(container.firstChild).toBeNull();
    });

    it('파토스 슬롯 표시', () => {
      const { container } = render(<PathosSlots {...defaultProps} />);
      const slots = container.querySelectorAll('.battle-pathos-slot');
      expect(slots.length).toBe(2);
    });

    it('타입별 아이콘 표시 (sword)', () => {
      render(<PathosSlots {...defaultProps} />);
      expect(screen.getByText('⚔️')).toBeInTheDocument();
    });

    it('타입별 아이콘 표시 (gun)', () => {
      render(<PathosSlots {...defaultProps} />);
      expect(screen.getByText('🔫')).toBeInTheDocument();
    });
  });

  describe('파토스 사용', () => {
    it('select 단계에서 파토스 사용 가능', () => {
      const { container } = render(<PathosSlots {...defaultProps} phase="select" />);
      const slot = container.querySelector('.battle-pathos-slot');
      if (slot) fireEvent.click(slot);

      expect(onPathosUsed).toHaveBeenCalled();
    });

    it('respond 단계에서 파토스 사용 가능', () => {
      const { container } = render(
        <PathosSlots
          {...defaultProps}
          phase="respond"
          battleRef={{ current: { phase: 'respond' } }}
        />
      );
      const slot = container.querySelector('.battle-pathos-slot');
      if (slot) fireEvent.click(slot);

      expect(onPathosUsed).toHaveBeenCalled();
    });

    it('resolve 단계에서 파토스 사용 불가', () => {
      const { container } = render(
        <PathosSlots
          {...defaultProps}
          phase="resolve"
          battleRef={{ current: { phase: 'resolve' } }}
        />
      );
      const slot = container.querySelector('.battle-pathos-slot');
      if (slot) fireEvent.click(slot);

      expect(onPathosUsed).not.toHaveBeenCalled();
    });
  });

  describe('쿨다운', () => {
    it('쿨다운 중인 파토스 표시', () => {
      render(
        <PathosSlots
          {...defaultProps}
          cooldowns={{ swiftBlade: 2 }}
        />
      );
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('쿨다운 중인 파토스 클릭 불가', () => {
      const { container } = render(
        <PathosSlots
          {...defaultProps}
          cooldowns={{ swiftBlade: 2 }}
        />
      );
      const slots = container.querySelectorAll('.battle-pathos-slot');
      if (slots[0]) fireEvent.click(slots[0]);

      expect(onPathosUsed).not.toHaveBeenCalled();
    });

    it('쿨다운이 0이면 사용 가능', () => {
      const { container } = render(
        <PathosSlots
          {...defaultProps}
          cooldowns={{ swiftBlade: 0 }}
        />
      );
      const slot = container.querySelector('.battle-pathos-slot');
      if (slot) fireEvent.click(slot);

      expect(onPathosUsed).toHaveBeenCalled();
    });
  });

  describe('common 타입', () => {
    it('common 타입 아이콘 표시', () => {
      mockEquippedPathos.length = 0;
      mockEquippedPathos.push({
        id: 'commonSkill',
        name: '공통 스킬',
        type: 'common',
        description: '공통 효과',
        cooldown: 1,
      });

      render(<PathosSlots {...defaultProps} />);
      expect(screen.getByText('✨')).toBeInTheDocument();
    });
  });

  describe('스타일', () => {
    it('컨테이너 position: fixed', () => {
      const { container } = render(<PathosSlots {...defaultProps} />);
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.position).toBe('fixed');
    });

    it('사용 가능한 슬롯 스타일', () => {
      const { container } = render(<PathosSlots {...defaultProps} />);
      const slot = container.querySelector('.battle-pathos-slot') as HTMLElement;
      expect(slot.style.cursor).toBe('pointer');
    });

    it('사용 불가능한 슬롯 스타일', () => {
      const { container } = render(
        <PathosSlots
          {...defaultProps}
          cooldowns={{ swiftBlade: 2 }}
        />
      );
      const slot = container.querySelector('.battle-pathos-slot') as HTMLElement;
      expect(slot.style.cursor).toBe('default');
    });
  });
});
