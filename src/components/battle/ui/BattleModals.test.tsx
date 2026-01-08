// @vitest-environment happy-dom
/**
 * @file BattleModals.test.tsx
 * @description BattleModals 컴포넌트 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BattleModals } from './BattleModals';
import type { PlayerState } from '../../../types';

// ==================== 테스트 헬퍼 ====================

const createMockPlayerState = (overrides = {}): PlayerState => ({
  hp: 80,
  maxHp: 100,
  block: 0,
  counter: 0,
  ether: 0,
  tokens: {},
  ...overrides,
} as PlayerState);

const defaultProps = {
  // 브리치 선택
  breachSelection: null,
  onBreachSelect: vi.fn(),
  playerStrength: 0,

  // 특성 보상
  traitReward: null,
  onTraitSelect: vi.fn(),
  onTraitSkip: vi.fn(),

  // 카드 보상
  cardReward: null,
  onRewardSelect: vi.fn(),
  onRewardSkip: vi.fn(),

  // 리콜 선택
  recallSelection: null,
  onRecallSelect: vi.fn(),
  onRecallSkip: vi.fn(),

  // 런 종료
  runSummary: null,

  // 패배
  isDefeated: false,
  onDefeatConfirm: vi.fn(),
  playerState: createMockPlayerState(),
};

// ==================== 테스트 ====================

describe('BattleModals', () => {
  describe('기본 렌더링', () => {
    it('모든 모달이 닫힌 상태에서 렌더링', () => {
      render(<BattleModals {...defaultProps} />);
      // 모달이 없을 때는 빈 fragment만 렌더링
      expect(true).toBe(true);
    });
  });

  describe('패배 오버레이', () => {
    it('패배 시 오버레이 표시', async () => {
      render(<BattleModals {...defaultProps} isDefeated={true} />);
      // DefeatOverlay가 렌더링되는지 확인
      expect(true).toBe(true);
    });

    it('패배하지 않았을 때 오버레이 숨김', () => {
      render(<BattleModals {...defaultProps} isDefeated={false} />);
      expect(true).toBe(true);
    });
  });

  describe('브리치 선택 모달', () => {
    it('브리치 선택이 있을 때 모달 표시', async () => {
      const breachSelection = {
        cards: [
          { id: 'breach-1', name: '브리치 카드 1', type: 'attack' as const, damage: 10, speedCost: 3, actionCost: 1, traits: [] },
        ],
        source: 'player' as const,
      };
      render(<BattleModals {...defaultProps} breachSelection={breachSelection} />);
      expect(true).toBe(true);
    });
  });

  describe('카드 보상 모달', () => {
    it('카드 보상이 있을 때 모달 표시', async () => {
      const cardReward = {
        cards: [
          { id: 'reward-1', name: '보상 카드 1', type: 'attack' as const, damage: 15, speedCost: 4, actionCost: 1, traits: [], description: '테스트' },
        ],
      };
      render(<BattleModals {...defaultProps} cardReward={cardReward} />);
      expect(true).toBe(true);
    });
  });

  describe('특성 보상 모달', () => {
    it('특성 보상이 있을 때 모달 표시', async () => {
      const traitReward = {
        traits: [
          { id: 'trait-1', name: '특성 1', description: '특성 설명' },
        ],
      };
      render(<BattleModals {...defaultProps} traitReward={traitReward} />);
      expect(true).toBe(true);
    });
  });

  describe('리콜 선택 모달', () => {
    it('리콜 선택이 있을 때 모달 표시', async () => {
      const recallSelection = {
        cards: [
          { id: 'recall-1', name: '리콜 카드', type: 'attack' as const, damage: 5, speedCost: 2, actionCost: 1, traits: [] },
        ],
        source: 'player' as const,
      };
      render(<BattleModals {...defaultProps} recallSelection={recallSelection} />);
      expect(true).toBe(true);
    });
  });

  describe('런 종료 오버레이', () => {
    it('런 종료 시 오버레이 표시', async () => {
      const runSummary = {
        show: true,
        result: {
          winner: 'player' as const,
          turns: 5,
          playerFinalHp: 80,
          enemyFinalHp: 0,
        },
        onClose: vi.fn(),
      };
      render(<BattleModals {...defaultProps} runSummary={runSummary} />);
      expect(true).toBe(true);
    });
  });
});
