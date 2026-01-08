// @vitest-environment happy-dom
/**
 * @file EnemyHpBar.test.tsx
 * @description EnemyHpBar 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnemyHpBar } from './EnemyHpBar';
import type { HpBarEnemy, PhaseBattle, PreviewDamage, GroupedEnemyMember } from '../../../types';

// TokenDisplay 모킹
vi.mock('./TokenDisplay', () => ({
  TokenDisplay: vi.fn(() => <div data-testid="token-display" />),
}));

// useBlockOverlay 모킹
vi.mock('../hooks/useBlockOverlay', () => ({
  useBlockOverlay: vi.fn(() => ({})),
}));

// monsterEther 모킹
vi.mock('../../../data/monsterEther', () => ({
  calculateGraceSlots: vi.fn((pts) => Math.floor(pts / 100)),
  PRAYERS: {},
}));

// 테스트용 적 생성
function createMockEnemy(overrides = {}): HpBarEnemy {
  return {
    hp: 50,
    maxHp: 50,
    block: 0,
    etherCapacity: 100,
    tokens: null,
    ...overrides,
  } as HpBarEnemy;
}

// 테스트용 전투 상태
function createMockBattle(overrides = {}): PhaseBattle {
  return {
    phase: 'select',
    ...overrides,
  } as PhaseBattle;
}

// 기본 props
const defaultProps = {
  battle: createMockBattle(),
  previewDamage: { value: 0, lethal: false, overkill: false } as PreviewDamage,
  dulledLevel: 0,
  enemy: createMockEnemy(),
  enemyHit: false,
  enemyBlockAnim: false,
  soulShatter: false,
  groupedEnemyMembers: [{ name: '고블린', emoji: '👹', count: 1 }] as GroupedEnemyMember[],
  enemyOverdriveFlash: false,
  enemyEtherValue: 50,
  enemyTransferPulse: false,
  enemySoulScale: 1,
  formatCompactValue: (v: number) => v.toString(),
  frozenOrder: 0,
};

describe('EnemyHpBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('컨테이너 렌더링', () => {
      render(<EnemyHpBar {...defaultProps} />);
      expect(screen.getByTestId('enemy-hp-bar-container')).toBeInTheDocument();
    });

    it('HP 텍스트 표시', () => {
      render(<EnemyHpBar {...defaultProps} enemy={createMockEnemy({ hp: 30, maxHp: 50 })} />);
      expect(screen.getByText(/30\/50/)).toBeInTheDocument();
    });

    it('적 이모지 표시', () => {
      render(<EnemyHpBar {...defaultProps} />);
      expect(screen.getByText('👹')).toBeInTheDocument();
    });

    it('적 이름 표시', () => {
      render(<EnemyHpBar {...defaultProps} />);
      expect(screen.getByText('고블린')).toBeInTheDocument();
    });

    it('TokenDisplay 렌더링', () => {
      render(<EnemyHpBar {...defaultProps} />);
      expect(screen.getByTestId('token-display')).toBeInTheDocument();
    });
  });

  describe('둔화 레벨 (dulledLevel)', () => {
    it('dulledLevel >= 3이면 체력 숨김', () => {
      render(<EnemyHpBar {...defaultProps} dulledLevel={3} />);
      expect(screen.getByText('??')).toBeInTheDocument();
    });

    it('dulledLevel < 3이면 체력 표시', () => {
      render(<EnemyHpBar {...defaultProps} dulledLevel={2} />);
      expect(screen.getByText(/50\/50/)).toBeInTheDocument();
    });

    it('dulledLevel >= 3이면 에테르 숨김', () => {
      render(<EnemyHpBar {...defaultProps} dulledLevel={3} />);
      const soulOrb = screen.getByRole('meter', { name: /적 에테르/ });
      expect(soulOrb).toHaveAttribute('title', '?? / ??');
    });
  });

  describe('방어력 표시', () => {
    it('방어력 0이면 미표시', () => {
      render(<EnemyHpBar {...defaultProps} enemy={createMockEnemy({ block: 0 })} />);
      expect(screen.queryByText(/🛡️/)).not.toBeInTheDocument();
    });

    it('방어력 양수면 표시', () => {
      render(<EnemyHpBar {...defaultProps} enemy={createMockEnemy({ block: 10 })} />);
      expect(screen.getByText(/🛡️10/)).toBeInTheDocument();
    });
  });

  describe('데미지 미리보기', () => {
    it('previewDamage.value > 0이면 표시', () => {
      render(
        <EnemyHpBar
          {...defaultProps}
          previewDamage={{ value: 15, lethal: false, overkill: false }}
        />
      );
      expect(screen.getByText(/🗡️-15/)).toBeInTheDocument();
    });

    it('치명타 표시', () => {
      render(
        <EnemyHpBar
          {...defaultProps}
          previewDamage={{ value: 50, lethal: true, overkill: false }}
        />
      );
      expect(screen.getByText(/💀/)).toBeInTheDocument();
    });

    it('오버킬 표시', () => {
      render(
        <EnemyHpBar
          {...defaultProps}
          previewDamage={{ value: 100, lethal: true, overkill: true }}
        />
      );
      expect(screen.getByText(/☠️/)).toBeInTheDocument();
    });

    it('respond 페이즈에서도 표시', () => {
      render(
        <EnemyHpBar
          {...defaultProps}
          battle={createMockBattle({ phase: 'respond' })}
          previewDamage={{ value: 20, lethal: false, overkill: false }}
        />
      );
      expect(screen.getByText(/🗡️-20/)).toBeInTheDocument();
    });
  });

  describe('빙결 상태', () => {
    it('frozenOrder > 0이면 빙결 표시', () => {
      render(<EnemyHpBar {...defaultProps} frozenOrder={2} />);
      expect(screen.getByText('❄️')).toBeInTheDocument();
      expect(screen.getByText('x2')).toBeInTheDocument();
    });

    it('frozenOrder = 0이면 미표시', () => {
      render(<EnemyHpBar {...defaultProps} frozenOrder={0} />);
      expect(screen.queryByText('❄️')).not.toBeInTheDocument();
    });
  });

  describe('그룹화된 적', () => {
    it('여러 적 표시', () => {
      render(
        <EnemyHpBar
          {...defaultProps}
          groupedEnemyMembers={[
            { name: '고블린', emoji: '👹', count: 2 },
            { name: '오크', emoji: '👺', count: 1 },
          ]}
        />
      );
      expect(screen.getByText('고블린 x2')).toBeInTheDocument();
      expect(screen.getByText('오크')).toBeInTheDocument();
    });
  });

  describe('애니메이션 클래스', () => {
    it('enemyHit=true일 때 hit-animation 클래스', () => {
      render(<EnemyHpBar {...defaultProps} enemyHit={true} />);
      expect(screen.getByTestId('enemy-hp-text')).toHaveClass('hit-animation');
    });
  });

  describe('소울 오브', () => {
    it('에테르 값 표시', () => {
      render(<EnemyHpBar {...defaultProps} enemyEtherValue={75} />);
      expect(screen.getByText('75')).toBeInTheDocument();
    });

    it('SOUL 라벨 표시', () => {
      render(<EnemyHpBar {...defaultProps} />);
      expect(screen.getByText('SOUL')).toBeInTheDocument();
    });
  });

  describe('은총 오브 (graceState)', () => {
    it('graceState 있으면 GRACE 표시', () => {
      render(
        <EnemyHpBar
          {...defaultProps}
          graceState={{
            gracePts: 150,
            soulShield: 0,
            blessingTurns: 0,
            blessingBonus: 0,
          }}
        />
      );
      expect(screen.getByText('GRACE')).toBeInTheDocument();
    });

    it('soulShield > 0이면 보호막 표시', () => {
      render(
        <EnemyHpBar
          {...defaultProps}
          graceState={{
            gracePts: 100,
            soulShield: 2,
            blessingTurns: 0,
            blessingBonus: 0,
          }}
        />
      );
      expect(screen.getByText('🛡️ x2')).toBeInTheDocument();
    });

    it('blessingTurns > 0이면 가호 표시', () => {
      render(
        <EnemyHpBar
          {...defaultProps}
          graceState={{
            gracePts: 100,
            soulShield: 0,
            blessingTurns: 3,
            blessingBonus: 50,
          }}
        />
      );
      expect(screen.getByText('✨ 3턴')).toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    it('region role 설정', () => {
      render(<EnemyHpBar {...defaultProps} />);
      expect(screen.getByRole('region', { name: /적 상태/ })).toBeInTheDocument();
    });

    it('progressbar role 설정', () => {
      render(<EnemyHpBar {...defaultProps} enemy={createMockEnemy({ hp: 30, maxHp: 50 })} />);
      const progressbar = screen.getByRole('progressbar', { name: /적 체력 바/ });
      expect(progressbar).toHaveAttribute('aria-valuenow', '30');
    });

    it('meter role (에테르)', () => {
      render(<EnemyHpBar {...defaultProps} />);
      expect(screen.getByRole('meter', { name: /적 에테르/ })).toBeInTheDocument();
    });
  });
});
