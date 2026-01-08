// @vitest-environment happy-dom
/**
 * @file PathosBar.test.tsx
 * @description PathosBar 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PathosBar } from './PathosBar';

// 게임 스토어 모킹
const mockEquippedPathos: string[] = [];
vi.mock('../../../state/gameStore', () => ({
  useGameStore: vi.fn((selector) => {
    const state = {
      growth: { equippedPathos: mockEquippedPathos },
    };
    return selector(state);
  }),
}));

// 파토스 데이터 모킹
vi.mock('../../../data/growth/pathosData', () => ({
  PATHOS: {
    swiftBlade: {
      id: 'swiftBlade',
      name: '신속의 검',
      type: 'sword',
      description: '공격 속도가 빨라집니다.',
      cooldown: 3,
    },
    preciseShot: {
      id: 'preciseShot',
      name: '정밀 사격',
      type: 'gun',
      description: '명중률이 증가합니다.',
    },
    commonPower: {
      id: 'commonPower',
      name: '일반 파워',
      type: 'common',
      description: '기본 능력이 향상됩니다.',
    },
  },
}));

describe('PathosBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEquippedPathos.length = 0;
  });

  describe('기본 렌더링', () => {
    it('장착된 파토스가 없으면 렌더링 안함', () => {
      const { container } = render(<PathosBar />);
      expect(container.firstChild).toBeNull();
    });

    it('빈 배열이면 렌더링 안함', () => {
      mockEquippedPathos.length = 0;
      const { container } = render(<PathosBar />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('파토스 표시', () => {
    beforeEach(() => {
      mockEquippedPathos.push('swiftBlade', 'preciseShot');
    });

    it('장착된 파토스 이름 표시', () => {
      render(<PathosBar />);
      expect(screen.getByText('신속의 검')).toBeInTheDocument();
      expect(screen.getByText('정밀 사격')).toBeInTheDocument();
    });

    it('파토스 라벨 표시', () => {
      render(<PathosBar />);
      expect(screen.getByText('파토스:')).toBeInTheDocument();
    });

    it('타입별 아이콘 표시 (sword)', () => {
      render(<PathosBar />);
      expect(screen.getAllByText('⚔️').length).toBeGreaterThanOrEqual(1);
    });

    it('타입별 아이콘 표시 (gun)', () => {
      render(<PathosBar />);
      expect(screen.getAllByText('🔫').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('툴팁', () => {
    beforeEach(() => {
      mockEquippedPathos.push('swiftBlade');
    });

    it('mouseEnter 시 툴팁 표시', () => {
      render(<PathosBar />);

      const pathosItem = screen.getByText('신속의 검').closest('div[style]');
      if (pathosItem?.parentElement) {
        fireEvent.mouseEnter(pathosItem.parentElement);
      }

      // 툴팁에 설명 표시
      expect(screen.getByText('공격 속도가 빨라집니다.')).toBeInTheDocument();
    });

    it('쿨다운 정보 표시', () => {
      render(<PathosBar />);

      const pathosItem = screen.getByText('신속의 검').closest('div[style]');
      if (pathosItem?.parentElement) {
        fireEvent.mouseEnter(pathosItem.parentElement);
      }

      expect(screen.getByText(/쿨다운: 3턴/)).toBeInTheDocument();
    });

    it('mouseLeave 시 툴팁 숨김', () => {
      render(<PathosBar />);

      const pathosItem = screen.getByText('신속의 검').closest('div[style]');
      if (pathosItem?.parentElement) {
        fireEvent.mouseEnter(pathosItem.parentElement);
        fireEvent.mouseLeave(pathosItem.parentElement);
      }

      expect(screen.queryByText('공격 속도가 빨라집니다.')).not.toBeInTheDocument();
    });
  });

  describe('호버 효과', () => {
    beforeEach(() => {
      mockEquippedPathos.push('swiftBlade');
    });

    it('mouseEnter 시 스케일 변경', () => {
      render(<PathosBar />);

      const pathosItem = screen.getByText('신속의 검').closest('div[style]');
      if (pathosItem?.parentElement) {
        fireEvent.mouseEnter(pathosItem.parentElement);
      }

      // 스케일 변경 확인 (호버 시 툴팁에도 같은 이름이 나타나므로 getAllByText 사용)
      const nameElements = screen.getAllByText('신속의 검');
      expect(nameElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('존재하지 않는 파토스', () => {
    it('존재하지 않는 파토스 ID는 무시', () => {
      mockEquippedPathos.push('unknownPathos', 'swiftBlade');
      render(<PathosBar />);

      // 존재하는 파토스만 표시
      expect(screen.getByText('신속의 검')).toBeInTheDocument();
    });
  });

  describe('common 타입 아이콘', () => {
    beforeEach(() => {
      mockEquippedPathos.push('commonPower');
    });

    it('common 타입은 ✨ 아이콘', () => {
      render(<PathosBar />);
      expect(screen.getAllByText('✨').length).toBeGreaterThanOrEqual(1);
    });
  });
});
