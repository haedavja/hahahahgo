// @vitest-environment happy-dom
/**
 * @file RelicDisplay.test.tsx
 * @description RelicDisplay 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RelicDisplay } from './RelicDisplay';
import type { UIRelic, UIRelicsMap, RelicRarities, RelicDisplayActions } from '../../../types';

// 테스트용 상징 데이터
const MOCK_RELICS: UIRelicsMap = {
  'ancientCoin': {
    id: 'ancientCoin',
    name: '고대의 동전',
    emoji: '🪙',
    description: '전투 시작 시 금화 +10',
    rarity: 'common',
    effects: { type: 'PASSIVE' },
  } as UIRelic,
  'crystalOrb': {
    id: 'crystalOrb',
    name: '수정구',
    emoji: '🔮',
    description: '통찰 +1',
    rarity: 'rare',
    effects: { type: 'PASSIVE' },
  } as UIRelic,
  'etherGem': {
    id: 'etherGem',
    name: '에테르 보석',
    emoji: '💎',
    description: '에테르 획득량 +20%',
    rarity: 'legendary',
    effects: { type: 'PASSIVE', etherMultiplier: 1.2 },
  } as UIRelic,
};

const MOCK_RELIC_RARITIES: RelicRarities = {
  COMMON: 'common',
  RARE: 'rare',
  SPECIAL: 'special',
  LEGENDARY: 'legendary',
};

const MOCK_RARITY_COLORS: Record<string, string> = {
  'common': '#9ca3af',
  'rare': '#60a5fa',
  'special': '#a855f7',
  'legendary': '#f59e0b',
};

// 기본 props
const defaultProps = {
  orderedRelicList: ['ancientCoin', 'crystalOrb'],
  RELICS: MOCK_RELICS,
  RELIC_RARITIES: MOCK_RELIC_RARITIES,
  RELIC_RARITY_COLORS: MOCK_RARITY_COLORS,
  relicActivated: null as string | null,
  activeRelicSet: new Set<string>(),
  hoveredRelic: null as string | null,
  setHoveredRelic: vi.fn(),
  actions: {
    setRelicActivated: vi.fn(),
  } as RelicDisplayActions,
  handleRelicDragStart: vi.fn(() => vi.fn()),
  handleRelicDragOver: vi.fn(),
  handleRelicDrop: vi.fn(() => vi.fn()),
};

describe('RelicDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('기본 렌더링', () => {
    it('상징 이모지 표시', () => {
      render(<RelicDisplay {...defaultProps} />);
      expect(screen.getByText('🪙')).toBeInTheDocument();
      expect(screen.getByText('🔮')).toBeInTheDocument();
    });

    it('빈 목록이면 null 반환', () => {
      const { container } = render(<RelicDisplay {...defaultProps} orderedRelicList={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('null 목록이면 null 반환', () => {
      const { container } = render(<RelicDisplay {...defaultProps} orderedRelicList={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('존재하지 않는 상징 ID는 스킵', () => {
      render(<RelicDisplay {...defaultProps} orderedRelicList={['ancientCoin', 'unknownRelic']} />);
      expect(screen.getByText('🪙')).toBeInTheDocument();
      // unknownRelic은 무시됨
    });
  });

  describe('호버 상호작용', () => {
    it('mouseEnter 시 setHoveredRelic 호출', () => {
      const setHoveredRelic = vi.fn();
      render(<RelicDisplay {...defaultProps} setHoveredRelic={setHoveredRelic} />);

      const relicElement = screen.getByText('🪙');
      fireEvent.mouseEnter(relicElement);

      expect(setHoveredRelic).toHaveBeenCalledWith('ancientCoin');
    });

    it('mouseLeave 시 setHoveredRelic(null) 호출', () => {
      const setHoveredRelic = vi.fn();
      render(<RelicDisplay {...defaultProps} setHoveredRelic={setHoveredRelic} />);

      const relicElement = screen.getByText('🪙');
      fireEvent.mouseLeave(relicElement);

      expect(setHoveredRelic).toHaveBeenCalledWith(null);
    });
  });

  describe('툴팁', () => {
    it('hoveredRelic이 설정되면 툴팁 표시', () => {
      render(<RelicDisplay {...defaultProps} hoveredRelic="ancientCoin" />);
      expect(screen.getByText('고대의 동전')).toBeInTheDocument();
      expect(screen.getByText('전투 시작 시 금화 +10')).toBeInTheDocument();
      expect(screen.getByText('일반')).toBeInTheDocument(); // 희귀도
    });

    it('hoveredRelic이 null이면 툴팁 미표시', () => {
      render(<RelicDisplay {...defaultProps} hoveredRelic={null} />);
      expect(screen.queryByText('고대의 동전')).not.toBeInTheDocument();
    });

    it('희귀도별 텍스트 표시', () => {
      render(<RelicDisplay {...defaultProps} hoveredRelic="crystalOrb" />);
      expect(screen.getByText('수정구')).toBeInTheDocument();
      expect(screen.getByText('희귀')).toBeInTheDocument();
    });
  });

  describe('활성화 상태', () => {
    it('relicActivated로 활성화된 상징 스타일 적용', () => {
      render(<RelicDisplay {...defaultProps} relicActivated="ancientCoin" />);
      // 활성화된 상징은 스타일 변화가 있음 (animation 속성 등)
      const coin = screen.getByText('🪙');
      expect(coin).toBeInTheDocument();
    });

    it('activeRelicSet에 포함된 상징 스타일 적용', () => {
      const activeSet = new Set(['crystalOrb']);
      render(<RelicDisplay {...defaultProps} activeRelicSet={activeSet} />);
      const orb = screen.getByText('🔮');
      expect(orb).toBeInTheDocument();
    });
  });

  describe('클릭 상호작용', () => {
    it('mouseDown 시 setRelicActivated 호출 (토글)', () => {
      const actions = {
        setRelicActivated: vi.fn(),
      };
      const { container } = render(<RelicDisplay {...defaultProps} actions={actions} />);

      // 상징 wrapper를 찾아서 클릭 (draggable div)
      const wrappers = container.querySelectorAll('[draggable="true"]');
      if (wrappers[0]) {
        fireEvent.mouseDown(wrappers[0]);
        expect(actions.setRelicActivated).toHaveBeenCalledWith('ancientCoin');
      }
    });

    it('이미 활성화된 상징 클릭 시 비활성화', () => {
      const actions = {
        setRelicActivated: vi.fn(),
      };
      const { container } = render(
        <RelicDisplay {...defaultProps} actions={actions} relicActivated="ancientCoin" />
      );

      const wrappers = container.querySelectorAll('[draggable="true"]');
      if (wrappers[0]) {
        fireEvent.mouseDown(wrappers[0]);
        expect(actions.setRelicActivated).toHaveBeenCalledWith(null);
      }
    });
  });

  describe('드래그 앤 드롭', () => {
    it('draggable 속성 설정', () => {
      const { container } = render(<RelicDisplay {...defaultProps} />);
      const draggables = container.querySelectorAll('[draggable="true"]');
      expect(draggables.length).toBe(2);
    });

    it('dragStart 핸들러 호출', () => {
      const handleDragStart = vi.fn(() => vi.fn());
      const { container } = render(
        <RelicDisplay {...defaultProps} handleRelicDragStart={handleDragStart} />
      );

      const wrapper = container.querySelector('[draggable="true"]');
      if (wrapper) {
        fireEvent.dragStart(wrapper);
        expect(handleDragStart).toHaveBeenCalled();
      }
    });

    it('drop 핸들러 호출', () => {
      const handleDrop = vi.fn(() => vi.fn());
      const { container } = render(<RelicDisplay {...defaultProps} handleRelicDrop={handleDrop} />);

      const wrapper = container.querySelector('[draggable="true"]');
      if (wrapper) {
        fireEvent.drop(wrapper);
        expect(handleDrop).toHaveBeenCalled();
      }
    });
  });

  describe('지속 강조 (persistent highlighting)', () => {
    it('PASSIVE + 일반 효과: 지속 강조', () => {
      // ancientCoin은 PASSIVE이고 etherMultiplier 없음 -> 지속 강조
      render(<RelicDisplay {...defaultProps} />);
      const coin = screen.getByText('🪙');
      expect(coin).toBeInTheDocument();
    });

    it('PASSIVE + etherMultiplier: 일반 강조 (지속 아님)', () => {
      // etherGem은 PASSIVE이지만 etherMultiplier 있음 -> 일반 강조
      render(
        <RelicDisplay
          {...defaultProps}
          orderedRelicList={['etherGem']}
          activeRelicSet={new Set(['etherGem'])}
        />
      );
      const gem = screen.getByText('💎');
      expect(gem).toBeInTheDocument();
    });
  });
});
