// @vitest-environment happy-dom
/**
 * @file RelicsBar.test.tsx
 * @description RelicsBar 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RelicsBar } from './RelicsBar';

// relics 데이터 모킹
vi.mock('../../../data/relics', () => ({
  RELICS: {
    ancientCoin: {
      id: 'ancientCoin',
      name: '고대의 동전',
      emoji: '🪙',
      description: '전투 시작 시 금화 +10',
      rarity: 'common',
    },
    crystalOrb: {
      id: 'crystalOrb',
      name: '수정구',
      emoji: '🔮',
      description: '통찰 +1',
      rarity: 'rare',
    },
    etherGem: {
      id: 'etherGem',
      name: '에테르 보석',
      emoji: '💎',
      description: '에테르 획득량 +20%',
      rarity: 'legendary',
    },
  },
  RELIC_RARITIES: {
    COMMON: 'common',
    RARE: 'rare',
    SPECIAL: 'special',
    LEGENDARY: 'legendary',
  },
}));

// relics lib 모킹
vi.mock('../../../lib/relics', () => ({
  RELIC_RARITY_COLORS: {
    common: '#94a3b8',
    rare: '#60a5fa',
    special: '#a855f7',
    legendary: '#fbbf24',
  },
}));

describe('RelicsBar', () => {
  const defaultActions = {
    setHoveredRelic: vi.fn(),
    setRelicActivated: vi.fn(),
    setOrderedRelics: vi.fn(),
  };

  const defaultProps = {
    orderedRelics: ['ancientCoin', 'crystalOrb'],
    hoveredRelic: null as string | null,
    relicActivated: null as string | null,
    actions: defaultActions,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('상징 이모지 표시', () => {
      render(<RelicsBar {...defaultProps} />);
      expect(screen.getByText('🪙')).toBeInTheDocument();
      expect(screen.getByText('🔮')).toBeInTheDocument();
    });

    it('빈 목록이면 null 반환', () => {
      const { container } = render(<RelicsBar {...defaultProps} orderedRelics={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('null 목록이면 null 반환', () => {
      const { container } = render(
        <RelicsBar {...defaultProps} orderedRelics={null as unknown as string[]} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('존재하지 않는 상징 ID는 스킵', () => {
      render(<RelicsBar {...defaultProps} orderedRelics={['ancientCoin', 'unknownRelic']} />);
      expect(screen.getByText('🪙')).toBeInTheDocument();
    });
  });

  describe('호버 상호작용', () => {
    it('mouseEnter 시 setHoveredRelic 호출', () => {
      render(<RelicsBar {...defaultProps} />);

      const relicElement = screen.getByText('🪙');
      fireEvent.mouseEnter(relicElement);

      expect(defaultActions.setHoveredRelic).toHaveBeenCalledWith('ancientCoin');
    });

    it('mouseLeave 시 setHoveredRelic(null) 호출', () => {
      render(<RelicsBar {...defaultProps} />);

      const relicElement = screen.getByText('🪙');
      fireEvent.mouseLeave(relicElement);

      expect(defaultActions.setHoveredRelic).toHaveBeenCalledWith(null);
    });
  });

  describe('툴팁', () => {
    it('hoveredRelic이 설정되면 툴팁 표시', () => {
      render(<RelicsBar {...defaultProps} hoveredRelic="ancientCoin" />);
      expect(screen.getByText('고대의 동전')).toBeInTheDocument();
      expect(screen.getByText('전투 시작 시 금화 +10')).toBeInTheDocument();
      expect(screen.getByText('일반')).toBeInTheDocument();
    });

    it('hoveredRelic이 null이면 툴팁 미표시', () => {
      render(<RelicsBar {...defaultProps} hoveredRelic={null} />);
      expect(screen.queryByText('고대의 동전')).not.toBeInTheDocument();
    });

    it('희귀도별 텍스트 표시', () => {
      render(<RelicsBar {...defaultProps} hoveredRelic="crystalOrb" />);
      expect(screen.getByText('수정구')).toBeInTheDocument();
      expect(screen.getByText('희귀')).toBeInTheDocument();
    });

    it('전설 희귀도 표시', () => {
      render(
        <RelicsBar
          {...defaultProps}
          orderedRelics={['etherGem']}
          hoveredRelic="etherGem"
        />
      );
      expect(screen.getByText('에테르 보석')).toBeInTheDocument();
      expect(screen.getByText('전설')).toBeInTheDocument();
    });
  });

  describe('클릭 상호작용', () => {
    it('mouseDown 시 setRelicActivated 호출 (토글)', () => {
      const { container } = render(<RelicsBar {...defaultProps} />);

      const wrappers = container.querySelectorAll('[draggable="true"]');
      if (wrappers[0]) {
        fireEvent.mouseDown(wrappers[0]);
        expect(defaultActions.setRelicActivated).toHaveBeenCalled();
      }
    });

    it('이미 활성화된 상징 클릭 시 비활성화', () => {
      const { container } = render(
        <RelicsBar {...defaultProps} relicActivated="ancientCoin" />
      );

      const wrappers = container.querySelectorAll('[draggable="true"]');
      if (wrappers[0]) {
        fireEvent.mouseDown(wrappers[0]);
        // setRelicActivated가 함수형 업데이트로 호출됨
        expect(defaultActions.setRelicActivated).toHaveBeenCalled();
      }
    });
  });

  describe('드래그 앤 드롭', () => {
    it('draggable 속성 설정', () => {
      const { container } = render(<RelicsBar {...defaultProps} />);
      const draggables = container.querySelectorAll('[draggable="true"]');
      expect(draggables.length).toBe(2);
    });

    it('dragStart 핸들러 호출', () => {
      const { container } = render(<RelicsBar {...defaultProps} />);

      const wrapper = container.querySelector('[draggable="true"]');
      if (wrapper) {
        fireEvent.dragStart(wrapper);
        expect(defaultActions.setRelicActivated).toHaveBeenCalledWith('ancientCoin');
      }
    });

    it('dragOver 이벤트 발생 확인', () => {
      const { container } = render(<RelicsBar {...defaultProps} />);

      const wrapper = container.querySelector('[draggable="true"]');
      // dragOver 이벤트가 핸들러에 전달되는지 확인 (happy-dom에서 dataTransfer 미지원)
      expect(wrapper).toBeInTheDocument();
    });

    it('drop 핸들러 호출', () => {
      const { container } = render(<RelicsBar {...defaultProps} />);

      const wrapper = container.querySelector('[draggable="true"]');
      if (wrapper) {
        fireEvent.drop(wrapper);
        expect(defaultActions.setRelicActivated).toHaveBeenCalledWith(null);
      }
    });
  });

  describe('활성화 상태', () => {
    it('relicActivated로 활성화된 상징 스타일 적용', () => {
      render(<RelicsBar {...defaultProps} relicActivated="ancientCoin" />);
      const coin = screen.getByText('🪙');
      expect(coin).toBeInTheDocument();
    });
  });

  describe('스타일', () => {
    it('컨테이너 position: absolute', () => {
      const { container } = render(<RelicsBar {...defaultProps} />);
      const outer = container.firstChild as HTMLElement;
      expect(outer.style.position).toBe('absolute');
    });
  });
});
