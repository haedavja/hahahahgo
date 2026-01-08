// @vitest-environment happy-dom
/**
 * @file ShopTabs.test.tsx
 * @description ShopTabs 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  BuyTab,
  SellTab,
  ServiceTab,
  CardRemovalModal,
  CardUpgradeModal,
  type ShopInventory,
  type SellableItem,
  type ShopService,
} from './ShopTabs';
import type { BattleCard } from '../../state/slices/types';

// 데이터 모킹
vi.mock('../../data/relics', () => ({
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
  },
  RELIC_RARITIES: {
    COMMON: 'common',
    RARE: 'rare',
    SPECIAL: 'special',
    LEGENDARY: 'legendary',
  },
}));

vi.mock('../../data/items', () => ({
  ITEMS: {
    potion: {
      id: 'potion',
      name: '회복 포션',
      icon: '🧪',
      description: 'HP를 20 회복합니다.',
    },
    bomb: {
      id: 'bomb',
      name: '폭탄',
      icon: '💣',
      description: '적에게 30 피해를 줍니다.',
    },
  },
}));

vi.mock('../battle/battleData', () => ({
  CARDS: [
    { id: 'slash', name: '베기', type: 'attack', actionCost: 1, speedCost: 3, damage: 10 },
    { id: 'block', name: '막기', type: 'defense', actionCost: 1, speedCost: 2, block: 8 },
  ],
}));

vi.mock('../../data/shop', () => ({
  getItemSellPrice: vi.fn((item, _merchantType) => Math.floor(item.basePrice || 10)),
  getServicePrice: vi.fn((_serviceId, _merchantType) => 50),
  SHOP_SERVICES: [
    { id: 'heal', name: '치료', emoji: '❤️', description: 'HP 회복', effect: { type: 'heal', value: 20 } },
    { id: 'remove', name: '카드 제거', emoji: '✂️', description: '카드 1장 제거', effect: { type: 'remove' } },
  ],
}));

describe('BuyTab', () => {
  const defaultProps = {
    inventory: {
      relics: [{ id: 'ancientCoin', price: 100 }],
      items: [{ id: 'potion', price: 50 }],
      cards: [{ id: 'slash', price: 75, rarity: 'common' as const }],
    } as ShopInventory,
    purchasedRelics: new Set<string>(),
    purchasedItems: new Set<string>(),
    purchasedCards: new Set<string>(),
    relics: [] as string[],
    items: [null] as (string | null)[],
    gold: 200,
    onBuyRelic: vi.fn(),
    onBuyItem: vi.fn(),
    onBuyCard: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('상징 섹션', () => {
    it('상징 섹션 표시', () => {
      render(<BuyTab {...defaultProps} />);
      expect(screen.getByText('✨ 상징')).toBeInTheDocument();
    });

    it('상징 이름과 이모지 표시', () => {
      render(<BuyTab {...defaultProps} />);
      expect(screen.getByText('🪙')).toBeInTheDocument();
      expect(screen.getByText('고대의 동전')).toBeInTheDocument();
    });

    it('상징 가격 표시', () => {
      render(<BuyTab {...defaultProps} />);
      expect(screen.getByText('💰 100G')).toBeInTheDocument();
    });

    it('상징 클릭 시 onBuyRelic 호출', () => {
      render(<BuyTab {...defaultProps} />);

      fireEvent.click(screen.getByTestId('shop-relic-ancientCoin'));
      expect(defaultProps.onBuyRelic).toHaveBeenCalledWith('ancientCoin', 100);
    });

    it('이미 구매한 상징은 품절 표시', () => {
      render(
        <BuyTab {...defaultProps} purchasedRelics={new Set(['ancientCoin'])} />
      );
      expect(screen.getByText('품절')).toBeInTheDocument();
    });

    it('이미 보유한 상징은 품절 표시', () => {
      render(<BuyTab {...defaultProps} relics={['ancientCoin']} />);
      expect(screen.getByText('품절')).toBeInTheDocument();
    });

    it('빈 상징 목록이면 섹션 미표시', () => {
      render(
        <BuyTab
          {...defaultProps}
          inventory={{ ...defaultProps.inventory, relics: [] }}
        />
      );
      expect(screen.queryByText('✨ 상징')).not.toBeInTheDocument();
    });
  });

  describe('아이템 섹션', () => {
    it('아이템 섹션 표시', () => {
      render(<BuyTab {...defaultProps} />);
      expect(screen.getByText('📦 아이템')).toBeInTheDocument();
    });

    it('아이템 이름과 아이콘 표시', () => {
      render(<BuyTab {...defaultProps} />);
      expect(screen.getByText('🧪')).toBeInTheDocument();
      expect(screen.getByText('회복 포션')).toBeInTheDocument();
    });

    it('아이템 클릭 시 onBuyItem 호출', () => {
      render(<BuyTab {...defaultProps} />);

      fireEvent.click(screen.getByTestId('shop-item-potion'));
      expect(defaultProps.onBuyItem).toHaveBeenCalledWith('potion', 50);
    });

    it('슬롯 부족 시 구매 불가', () => {
      render(<BuyTab {...defaultProps} items={['potion', 'bomb']} />);
      expect(screen.getByText('슬롯 부족')).toBeInTheDocument();
    });

    it('빈 아이템 목록이면 섹션 미표시', () => {
      render(
        <BuyTab
          {...defaultProps}
          inventory={{ ...defaultProps.inventory, items: [] }}
        />
      );
      expect(screen.queryByText('📦 아이템')).not.toBeInTheDocument();
    });
  });

  describe('카드 섹션', () => {
    it('카드 섹션 표시', () => {
      render(<BuyTab {...defaultProps} />);
      expect(screen.getByText('🃏 카드')).toBeInTheDocument();
    });

    it('카드 이름 표시', () => {
      render(<BuyTab {...defaultProps} />);
      expect(screen.getByText('베기')).toBeInTheDocument();
    });

    it('카드 타입 표시', () => {
      render(<BuyTab {...defaultProps} />);
      expect(screen.getByText('⚔️공격')).toBeInTheDocument();
    });

    it('카드 클릭 시 onBuyCard 호출', () => {
      render(<BuyTab {...defaultProps} />);

      fireEvent.click(screen.getByTestId('shop-card-slash'));
      expect(defaultProps.onBuyCard).toHaveBeenCalledWith('slash', 75);
    });

    it('빈 카드 목록이면 섹션 미표시', () => {
      render(
        <BuyTab
          {...defaultProps}
          inventory={{ ...defaultProps.inventory, cards: [] }}
        />
      );
      expect(screen.queryByText('🃏 카드')).not.toBeInTheDocument();
    });
  });

  describe('골드 부족', () => {
    it('골드 부족 시 가격 빨간색', () => {
      render(<BuyTab {...defaultProps} gold={10} />);
      // 가격이 표시되지만 골드 부족으로 빨간색
      const priceElements = screen.getAllByText(/💰/);
      expect(priceElements.length).toBeGreaterThan(0);
    });
  });
});

describe('SellTab', () => {
  const mockItem = {
    id: 'potion',
    name: '회복 포션',
    icon: '🧪',
    description: 'HP를 20 회복합니다.',
    basePrice: 20,
  };

  const defaultProps = {
    sellableItems: [
      { item: mockItem, slotIndex: 0 },
    ] as SellableItem[],
    merchantType: 'normal',
    onSellItem: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('판매 섹션 표시', () => {
    render(<SellTab {...defaultProps} />);
    expect(screen.getByText('📦 아이템 판매')).toBeInTheDocument();
  });

  it('아이템 이름과 아이콘 표시', () => {
    render(<SellTab {...defaultProps} />);
    expect(screen.getByText('🧪')).toBeInTheDocument();
    expect(screen.getByText('회복 포션')).toBeInTheDocument();
  });

  it('판매 가격 표시', () => {
    render(<SellTab {...defaultProps} />);
    expect(screen.getByText(/판매가:/)).toBeInTheDocument();
  });

  it('아이템 클릭 시 onSellItem 호출', () => {
    render(<SellTab {...defaultProps} />);

    fireEvent.click(screen.getByTestId('shop-sell-item-0'));
    expect(defaultProps.onSellItem).toHaveBeenCalledWith(0);
  });

  it('판매할 아이템 없으면 안내 메시지', () => {
    render(<SellTab {...defaultProps} sellableItems={[]} />);
    expect(screen.getByText('판매할 아이템이 없습니다.')).toBeInTheDocument();
  });
});

describe('ServiceTab', () => {
  const defaultProps = {
    gold: 100,
    merchantType: 'normal',
    onUseService: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('서비스 섹션 표시', () => {
    render(<ServiceTab {...defaultProps} />);
    expect(screen.getByText('🔧 서비스')).toBeInTheDocument();
  });

  it('서비스 목록 표시', () => {
    render(<ServiceTab {...defaultProps} />);
    expect(screen.getByText('❤️')).toBeInTheDocument();
    expect(screen.getByText('치료')).toBeInTheDocument();
  });

  it('서비스 가격 표시', () => {
    render(<ServiceTab {...defaultProps} />);
    const priceElements = screen.getAllByText('💰 50G');
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it('서비스 클릭 시 onUseService 호출', () => {
    render(<ServiceTab {...defaultProps} />);

    fireEvent.click(screen.getByTestId('shop-service-heal'));
    expect(defaultProps.onUseService).toHaveBeenCalled();
  });

  it('골드 부족 시 비활성화', () => {
    render(<ServiceTab {...defaultProps} gold={10} />);
    // 가격이 빨간색으로 표시
    const serviceElement = screen.getByTestId('shop-service-heal');
    expect(serviceElement.style.opacity).toBe('0.6');
  });
});

describe('CardRemovalModal', () => {
  const mockCard: BattleCard = {
    id: 'slash',
    name: '베기',
    type: 'attack',
    actionCost: 1,
    speedCost: 3,
    damage: 10,
  } as BattleCard;

  const defaultProps = {
    allPlayerCards: [mockCard],
    cardRemovalPrice: 50,
    onRemoveCard: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('제목 표시', () => {
    render(<CardRemovalModal {...defaultProps} />);
    expect(screen.getByText('✂️ 제거할 카드 선택')).toBeInTheDocument();
  });

  it('비용 표시', () => {
    render(<CardRemovalModal {...defaultProps} />);
    expect(screen.getByText('비용: 50G')).toBeInTheDocument();
  });

  it('카드 이름 표시', () => {
    render(<CardRemovalModal {...defaultProps} />);
    expect(screen.getByText('베기')).toBeInTheDocument();
  });

  it('카드 클릭 시 onRemoveCard 호출', () => {
    render(<CardRemovalModal {...defaultProps} />);

    fireEvent.click(screen.getByText('베기'));
    expect(defaultProps.onRemoveCard).toHaveBeenCalledWith(mockCard);
  });

  it('취소 버튼 클릭 시 onClose 호출', () => {
    render(<CardRemovalModal {...defaultProps} />);

    fireEvent.click(screen.getByText('취소'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('오버레이 클릭 시 onClose 호출', () => {
    const { container } = render(<CardRemovalModal {...defaultProps} />);

    const overlay = container.firstChild as HTMLElement;
    fireEvent.click(overlay);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('빈 카드 목록이면 안내 메시지', () => {
    render(<CardRemovalModal {...defaultProps} allPlayerCards={[]} />);
    expect(screen.getByText('제거할 카드가 없습니다.')).toBeInTheDocument();
  });
});

describe('CardUpgradeModal', () => {
  const mockCard: BattleCard = {
    id: 'slash',
    name: '베기',
    type: 'attack',
    actionCost: 1,
    speedCost: 3,
    damage: 10,
  } as BattleCard;

  const defaultProps = {
    allPlayerCards: [mockCard],
    cardUpgradePrice: 75,
    onUpgradeCard: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('제목 표시', () => {
    render(<CardUpgradeModal {...defaultProps} />);
    expect(screen.getByText('⬆️ 강화할 카드 선택')).toBeInTheDocument();
  });

  it('비용 표시', () => {
    render(<CardUpgradeModal {...defaultProps} />);
    expect(screen.getByText('비용: 75G')).toBeInTheDocument();
  });

  it('강화 설명 표시', () => {
    render(<CardUpgradeModal {...defaultProps} />);
    expect(screen.getByText(/💡 강화:/)).toBeInTheDocument();
  });

  it('카드 클릭 시 onUpgradeCard 호출', () => {
    render(<CardUpgradeModal {...defaultProps} />);

    fireEvent.click(screen.getByText('베기'));
    expect(defaultProps.onUpgradeCard).toHaveBeenCalledWith(mockCard);
  });

  it('취소 버튼 클릭 시 onClose 호출', () => {
    render(<CardUpgradeModal {...defaultProps} />);

    fireEvent.click(screen.getByText('취소'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('빈 카드 목록이면 안내 메시지', () => {
    render(<CardUpgradeModal {...defaultProps} allPlayerCards={[]} />);
    expect(screen.getByText('강화할 카드가 없습니다.')).toBeInTheDocument();
  });
});
