/**
 * ShopModal.jsx
 *
 * 상점 UI 컴포넌트
 * 분리된 모듈: ShopTabs
 */

import { useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../state/gameStore';
import { RELICS } from '../../data/relics';
import { ITEMS } from '../../data/items';
import { CARDS } from '../battle/battleData';
import {
  MERCHANT_TYPES,
  generateShopInventory,
  getItemSellPrice,
  getServicePrice,
  type MerchantTypeKey,
} from '../../data/shop';
import { BuyTab, SellTab, ServiceTab, CardRemovalModal, type ShopService } from './ShopTabs';
import type { BattleCard, GameItem } from '../../state/slices/types';

// 플레이어 카드는 BattleCard 타입 사용 (CardRemovalModal과 호환)

interface ShopModalProps {
  merchantType?: MerchantTypeKey;
  onClose: () => void;
}

export function ShopModal({ merchantType = 'shop', onClose }: ShopModalProps) {
  // 상태 셀렉터 (shallow 비교로 최적화)
  const { gold, relics, items, playerHp, maxHp, characterBuild, cardUpgrades } = useGameStore(
    useShallow((state) => ({
      gold: state.resources?.gold || 0,
      relics: state.relics || [],
      items: state.items || [],
      playerHp: state.playerHp,
      maxHp: state.maxHp,
      characterBuild: state.characterBuild,
      cardUpgrades: state.cardUpgrades || {},
    }))
  );

  // 액션 셀렉터 (shallow 비교로 최적화)
  const { addResources, addRelic, addItem, removeItem, setPlayerHp, removeCardFromDeck, addOwnedCard } = useGameStore(
    useShallow((state) => ({
      addResources: state.addResources,
      addRelic: state.addRelic,
      addItem: state.addItem,
      removeItem: state.removeItem,
      setPlayerHp: state.setPlayerHp,
      removeCardFromDeck: state.removeCardFromDeck,
      addOwnedCard: state.addOwnedCard,
    }))
  );

  const merchant = MERCHANT_TYPES[merchantType] ?? MERCHANT_TYPES.shop;

  const [inventory, setInventory] = useState(() =>
    generateShopInventory(merchantType, relics, CARDS)
  );
  const [purchasedRelics, setPurchasedRelics] = useState<Set<string>>(new Set());
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [purchasedCards, setPurchasedCards] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('buy');
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);
  const [showCardRemovalModal, setShowCardRemovalModal] = useState(false);
  const [cardRemovalPrice, setCardRemovalPrice] = useState(0);

  const sellableItems = useMemo(() => {
    return items
      .map((item, index) => ({ item, slotIndex: index }))
      .filter((entry): entry is { item: GameItem; slotIndex: number } => entry.item !== null);
  }, [items]);

  const allPlayerCards = useMemo(() => {
    const mainSpecials = characterBuild?.mainSpecials || [];
    const subSpecials = characterBuild?.subSpecials || [];
    const cards: BattleCard[] = [];

    mainSpecials.forEach(cardId => {
      const card = CARDS.find(c => c.id === cardId);
      if (card) {
        const rarity = cardUpgrades[cardId] || (card as { rarity?: string }).rarity || 'common';
        cards.push({ ...card, __isMainSpecial: true, rarity } as BattleCard);
      }
    });

    subSpecials.forEach(cardId => {
      const card = CARDS.find(c => c.id === cardId);
      if (card) {
        const rarity = cardUpgrades[cardId] || (card as { rarity?: string }).rarity || 'common';
        cards.push({ ...card, __isMainSpecial: false, rarity } as BattleCard);
      }
    });

    return cards;
  }, [characterBuild?.mainSpecials, characterBuild?.subSpecials, cardUpgrades]);

  const showNotification = (message: string, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2000);
  };

  const handleBuyRelic = (relicId: string, price: number) => {
    if (gold < price) {
      showNotification('골드가 부족합니다!', 'error');
      return;
    }
    if (relics.includes(relicId)) {
      showNotification('이미 보유한 상징입니다!', 'error');
      return;
    }

    addResources({ gold: -price });
    addRelic(relicId);
    setPurchasedRelics((prev) => new Set([...prev, relicId]));
    showNotification(`${RELICS[relicId as keyof typeof RELICS]?.name}을(를) 구매했습니다!`, 'success');
  };

  const handleBuyItem = (itemId: string, price: number) => {
    if (gold < price) {
      showNotification('골드가 부족합니다!', 'error');
      return;
    }

    const emptySlot = items.findIndex((slot) => slot === null);
    if (emptySlot === -1) {
      showNotification('아이템 슬롯이 가득 찼습니다!', 'error');
      return;
    }

    addResources({ gold: -price });
    addItem(itemId);
    setPurchasedItems((prev) => new Set([...prev, itemId]));
    showNotification(`${ITEMS[itemId as keyof typeof ITEMS]?.name}을(를) 구매했습니다!`, 'success');
  };

  const handleBuyCard = (cardId: string, price: number) => {
    if (gold < price) {
      showNotification('골드가 부족합니다!', 'error');
      return;
    }

    addResources({ gold: -price });
    addOwnedCard(cardId);
    setPurchasedCards((prev) => new Set([...prev, cardId]));
    const card = CARDS.find(c => c.id === cardId);
    showNotification(`${card?.name || cardId}을(를) 구매했습니다!`, 'success');
  };

  const handleSellItem = (slotIndex: number) => {
    const item = items[slotIndex];
    if (!item) return;

    const sellPrice = getItemSellPrice(item, merchantType);
    addResources({ gold: sellPrice });
    removeItem(slotIndex);
    showNotification(`${item.name}을(를) ${sellPrice}G에 판매했습니다!`, 'success');
  };

  const handleUseService = (service: ShopService) => {
    const price = getServicePrice(service.id, merchantType);

    if (gold < price) {
      showNotification('골드가 부족합니다!', 'error');
      return;
    }

    switch (service.effect.type) {
      case 'healPercent': {
        const healAmount = Math.floor(maxHp * ((service.effect.value ?? 0) / 100));
        const newHp = Math.min(maxHp, playerHp + healAmount);
        if (newHp === playerHp) {
          showNotification('이미 체력이 가득 찼습니다!', 'error');
          return;
        }
        addResources({ gold: -price });
        setPlayerHp(newHp);
        showNotification(`체력을 ${healAmount} 회복했습니다!`, 'success');
        break;
      }
      case 'healFull': {
        if (playerHp === maxHp) {
          showNotification('이미 체력이 가득 찼습니다!', 'error');
          return;
        }
        addResources({ gold: -price });
        setPlayerHp(maxHp);
        showNotification('체력을 전부 회복했습니다!', 'success');
        break;
      }
      case 'reroll': {
        addResources({ gold: -price });
        setInventory(generateShopInventory(merchantType, relics, CARDS));
        setPurchasedRelics(new Set());
        setPurchasedItems(new Set());
        setPurchasedCards(new Set());
        showNotification('상품이 교체되었습니다!', 'success');
        break;
      }
      case 'removeCard': {
        if (allPlayerCards.length === 0) {
          showNotification('제거할 카드가 없습니다!', 'error');
          return;
        }
        setCardRemovalPrice(price);
        setShowCardRemovalModal(true);
        break;
      }
      default:
        showNotification('아직 구현되지 않은 서비스입니다.', 'error');
    }
  };

  const handleRemoveCard = (card: BattleCard) => {
    addResources({ gold: -cardRemovalPrice });
    removeCardFromDeck(card.id, card.__isMainSpecial);
    setShowCardRemovalModal(false);
    showNotification(`${card.name} 카드를 제거했습니다!`, 'success');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '800px',
          maxHeight: '85vh',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          border: '2px solid #fbbf24',
          boxShadow: '0 0 40px rgba(251, 191, 36, 0.3)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '2rem' }}>{merchant.emoji}</span>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#fbbf24' }}>{merchant.name}</h2>
              <p style={{ fontSize: '0.875rem', margin: '4px 0 0', color: '#94a3b8', fontStyle: 'italic' }}>
                "{merchant.greeting}"
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              padding: '8px 16px',
              background: 'rgba(251, 191, 36, 0.2)',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '1.25rem' }}>💰</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24' }}>{gold}G</span>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                color: '#fca5a5',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              나가기
            </button>
          </div>
        </div>

        {/* 알림 */}
        {notification && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '12px',
            borderRadius: '8px',
            background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
            border: `1px solid ${notification.type === 'error' ? '#ef4444' : '#22c55e'}`,
            color: notification.type === 'error' ? '#fca5a5' : '#86efac',
            fontWeight: 600,
            textAlign: 'center',
          }}>
            {notification.message}
          </div>
        )}

        {/* 탭 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            onClick={() => setActiveTab('buy')}
            style={{
              flex: 1,
              padding: '12px',
              background: activeTab === 'buy' ? 'rgba(251, 191, 36, 0.3)' : 'rgba(30, 41, 59, 0.5)',
              border: `2px solid ${activeTab === 'buy' ? '#fbbf24' : '#334155'}`,
              borderRadius: '8px',
              color: activeTab === 'buy' ? '#fbbf24' : '#94a3b8',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1rem',
            }}
          >
            🛒 구매
          </button>
          {merchant.canSell && (
            <button
              onClick={() => setActiveTab('sell')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'sell' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(30, 41, 59, 0.5)',
                border: `2px solid ${activeTab === 'sell' ? '#22c55e' : '#334155'}`,
                borderRadius: '8px',
                color: activeTab === 'sell' ? '#22c55e' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              💰 판매
            </button>
          )}
          {merchant.hasServices && (
            <button
              onClick={() => setActiveTab('service')}
              style={{
                flex: 1,
                padding: '12px',
                background: activeTab === 'service' ? 'rgba(96, 165, 250, 0.3)' : 'rgba(30, 41, 59, 0.5)',
                border: `2px solid ${activeTab === 'service' ? '#60a5fa' : '#334155'}`,
                borderRadius: '8px',
                color: activeTab === 'service' ? '#60a5fa' : '#94a3b8',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '1rem',
              }}
            >
              🔧 서비스
            </button>
          )}
        </div>

        {/* 콘텐츠 */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'buy' && (
            <BuyTab
              inventory={inventory}
              purchasedRelics={purchasedRelics}
              purchasedItems={purchasedItems}
              purchasedCards={purchasedCards}
              relics={relics}
              items={items as (string | null)[]}
              gold={gold}
              onBuyRelic={handleBuyRelic}
              onBuyItem={handleBuyItem}
              onBuyCard={handleBuyCard}
            />
          )}

          {activeTab === 'sell' && (
            <SellTab
              sellableItems={sellableItems}
              merchantType={merchantType}
              onSellItem={handleSellItem}
            />
          )}

          {activeTab === 'service' && (
            <ServiceTab
              gold={gold}
              merchantType={merchantType}
              onUseService={handleUseService}
            />
          )}
        </div>
      </div>

      {/* 카드 제거 모달 */}
      {showCardRemovalModal && (
        <CardRemovalModal
          allPlayerCards={allPlayerCards}
          cardRemovalPrice={cardRemovalPrice}
          onRemoveCard={handleRemoveCard}
          onClose={() => setShowCardRemovalModal(false)}
        />
      )}
    </div>
  );
}

export default ShopModal;
