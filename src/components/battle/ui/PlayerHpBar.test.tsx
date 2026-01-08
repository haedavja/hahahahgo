// @vitest-environment happy-dom
/**
 * @file PlayerHpBar.test.tsx
 * @description PlayerHpBar 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerHpBar } from './PlayerHpBar';
import type { HpBarPlayer } from '../../../types';

// TokenDisplay 모킹
vi.mock('./TokenDisplay', () => ({
  TokenDisplay: vi.fn(() => <div data-testid="token-display" />),
}));

// useBlockOverlay 모킹
vi.mock('../hooks/useBlockOverlay', () => ({
  useBlockOverlay: vi.fn(() => ({})),
}));

// 테스트용 플레이어 생성
function createMockPlayer(overrides = {}): HpBarPlayer {
  return {
    hp: 100,
    maxHp: 100,
    block: 0,
    strength: 0,
    etherMultiplier: 1,
    etherOverflow: 0,
    tokens: null,
    ...overrides,
  } as HpBarPlayer;
}

describe('PlayerHpBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('컨테이너 렌더링', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByTestId('player-hp-bar-container')).toBeInTheDocument();
    });

    it('HP 텍스트 표시', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer({ hp: 75, maxHp: 100 })}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByText(/75\/100/)).toBeInTheDocument();
    });

    it('캐릭터 이모지 표시', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByTestId('player-character-display')).toHaveTextContent('🧙‍♂️');
    });

    it('TokenDisplay 렌더링', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByTestId('token-display')).toBeInTheDocument();
    });
  });

  describe('방어력 표시', () => {
    it('방어력 0이면 미표시', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer({ block: 0 })}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.queryByText(/🛡️/)).not.toBeInTheDocument();
    });

    it('방어력 양수면 표시', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer({ block: 15 })}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByText(/🛡️15/)).toBeInTheDocument();
    });
  });

  describe('스탯 표시', () => {
    it('힘이 0이 아니면 표시', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer({ strength: 3 })}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByText(/💪 힘 3/)).toBeInTheDocument();
    });

    it('에테르 증폭 1초과면 표시', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer({ etherMultiplier: 2 })}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByText(/💎 x2/)).toBeInTheDocument();
    });

    it('민첩이 0이 아니면 표시', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={2}
          dulledLevel={0}
        />
      );
      expect(screen.getByText(/⚡ 민첩 2/)).toBeInTheDocument();
    });

    it('에테르 범람 표시', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer({ etherOverflow: 50 })}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByText(/🌊 범람 50 PT/)).toBeInTheDocument();
    });
  });

  describe('통찰 레벨', () => {
    it('통찰 레벨 0이면 미표시', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
          insightLevel={0}
        />
      );
      expect(screen.queryByText(/평온/)).not.toBeInTheDocument();
    });

    it('통찰 레벨 양수 (예측)', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
          insightLevel={1}
        />
      );
      expect(screen.getByText(/🔮 lv1 예측/)).toBeInTheDocument();
    });

    it('통찰 레벨 음수 (우둔)', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
          insightLevel={-1}
        />
      );
      expect(screen.getByText(/🌫️ lv-1 우둔/)).toBeInTheDocument();
    });

    it('dulledLevel에서 통찰 레벨 파생', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={2}
        />
      );
      expect(screen.getByText(/🌘 lv-2 미련/)).toBeInTheDocument();
    });
  });

  describe('애니메이션 클래스', () => {
    it('playerHit=true일 때 hit-animation 클래스', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={true}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByTestId('player-hp-text')).toHaveClass('hit-animation');
    });

    it('playerOverdriveFlash=true일 때 overdrive-burst 클래스', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={true}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByTestId('player-character-display')).toHaveClass('overdrive-burst');
    });
  });

  describe('접근성', () => {
    it('region role 설정', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer()}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      expect(screen.getByRole('region')).toBeInTheDocument();
    });

    it('progressbar role 설정', () => {
      render(
        <PlayerHpBar
          player={createMockPlayer({ hp: 50, maxHp: 100 })}
          playerHit={false}
          playerBlockAnim={false}
          playerOverdriveFlash={false}
          effectiveAgility={0}
          dulledLevel={0}
        />
      );
      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '50');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });
});
