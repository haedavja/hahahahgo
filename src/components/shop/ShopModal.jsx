/**
 * ShopModal.jsx
 * 상점 UI 컴포넌트
 */

import { useState, useMemo } from 'react';
import { useGameStore } from '../../state/gameStore';
import { RELICS, RELIC_RARITIES } from '../../data/relics';
import { ITEMS } from '../../data/items';
import { CARDS } from '../battle/battleData';
import {
  MERCHANT_TYPES,
  generateShopInventory,
  getItemSellPrice,
  getServicePrice,
  SHOP_SERVICES,
  RELIC_PRICES,
  ITEM_PRICES,
} from '../../data/shop';

const RARITY_COLORS = {
  [RELIC_RARITIES.COMMON]: '#94a3b8',
  [RELIC_RARITIES.RARE]: '#60a5fa',
  [RELIC_RARITIES.SPECIAL]: '#a78bfa',
  [RELIC_RARITIES.LEGENDARY]: '#fbbf24',
};

const RARITY_NAMES = {
  [RELIC_RARITIES.COMMON]: '일반',
  [RELIC_RARITIES.RARE]: '희귀',
  [RELIC_RARITIES.SPECIAL]: '특별',
  [RELIC_RARITIES.LEGENDARY]: '전설',
};

export function ShopModal({ merchantType = 'shop', onClose }) {
  const gold = useGameStore((state) => state.resources?.gold || 0);
  const relics = useGameStore((state) => state.relics || []);
  const items = useGameStore((state) => state.items || []);
  const playerHp = useGameStore((state) => state.playerHp);
  const maxHp = useGameStore((state) => state.maxHp);
  const characterBuild = useGameStore((state) => state.characterBuild);
  const cardUpgrades = useGameStore((state) => state.cardUpgrades || {});
  const addResources = useGameStore((state) => state.addResources);
  const addRelic = useGameStore((state) => state.addRelic);
  const addItem = useGameStore((state) => state.addItem);
  const removeItem = useGameStore((state) => state.removeItem);
  const setPlayerHp = useGameStore((state) => state.setPlayerHp);
  const removeCardFromDeck = useGameStore((state) => state.removeCardFromDeck);
  const addOwnedCard = useGameStore((state) => state.addOwnedCard);

  const merchant = MERCHANT_TYPES[merchantType] || MERCHANT_TYPES.shop;

  // 상점 재고 (처음 열 때 생성, reroll 시 갱신)
  const [inventory, setInventory] = useState(() =>
    generateShopInventory(merchantType, relics, CARDS)
  );
  const [purchasedRelics, setPurchasedRelics] = useState(new Set());
  const [purchasedItems, setPurchasedItems] = useState(new Set());
  const [purchasedCards, setPurchasedCards] = useState(new Set());
  const [activeTab, setActiveTab] = useState('buy'); // 'buy' | 'sell' | 'service'
  const [notification, setNotification] = useState(null);
  const [showCardRemovalModal, setShowCardRemovalModal] = useState(false);
  const [cardRemovalPrice, setCardRemovalPrice] = useState(0);

  // 판매 가능한 아이템 (보유 중인 것)
  const sellableItems = useMemo(() => {
    return items
      .map((item, index) => ({ item, slotIndex: index }))
      .filter(({ item }) => item !== null);
  }, [items]);

  // 플레이어 보유 카드 목록 (특기 지정된 카드만 - 제거 서비스용)
  const allPlayerCards = useMemo(() => {
    const mainSpecials = characterBuild?.mainSpecials || [];
    const subSpecials = characterBuild?.subSpecials || [];
    const cards = [];

    mainSpecials.forEach(cardId => {
      const card = CARDS.find(c => c.id === cardId);
      if (card) {
        const rarity = cardUpgrades[cardId] || card.rarity || 'common';
        cards.push({ ...card, isMainSpecial: true, currentRarity: rarity });
      }
    });

    subSpecials.forEach(cardId => {
      const card = CARDS.find(c => c.id === cardId);
      if (card) {
        const rarity = cardUpgrades[cardId] || card.rarity || 'common';
        cards.push({ ...card, isMainSpecial: false, currentRarity: rarity });
      }
    });

    return cards;
  }, [characterBuild?.mainSpecials, characterBuild?.subSpecials, cardUpgrades]);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2000);
  };

  // 상징 구매
  const handleBuyRelic = (relicId, price) => {
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
    showNotification(`${RELICS[relicId]?.name}을(를) 구매했습니다!`, 'success');
  };

  // 아이템 구매
  const handleBuyItem = (itemId, price) => {
    if (gold < price) {
      showNotification('골드가 부족합니다!', 'error');
      return;
    }

    // 빈 슬롯 확인
    const emptySlot = items.findIndex((slot) => slot === null);
    if (emptySlot === -1) {
      showNotification('아이템 슬롯이 가득 찼습니다!', 'error');
      return;
    }

    addResources({ gold: -price });
    addItem(itemId);
    setPurchasedItems((prev) => new Set([...prev, itemId]));
    showNotification(`${ITEMS[itemId]?.name}을(를) 구매했습니다!`, 'success');
  };

  // 카드 구매 (보유 카드에 추가 - 10% 확률로 손패에 등장)
  const handleBuyCard = (cardId, price) => {
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

  // 아이템 판매
  const handleSellItem = (slotIndex) => {
    const item = items[slotIndex];
    if (!item) return;

    const sellPrice = getItemSellPrice(item, merchantType);
    addResources({ gold: sellPrice });
    removeItem(slotIndex);
    showNotification(`${item.name}을(를) ${sellPrice}G에 판매했습니다!`, 'success');
  };

  // 서비스 이용
  const handleUseService = (service) => {
    const price = getServicePrice(service.id, merchantType);

    if (gold < price) {
      showNotification('골드가 부족합니다!', 'error');
      return;
    }

    switch (service.effect.type) {
      case 'healPercent': {
        const healAmount = Math.floor(maxHp * (service.effect.value / 100));
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
        // 골드 차감 없이 모달만 열기 (카드 선택 시 차감)
        setCardRemovalPrice(price);
        setShowCardRemovalModal(true);
        break;
      }
      default:
        showNotification('아직 구현되지 않은 서비스입니다.', 'error');
    }
  };

  // 카드 제거 확정
  const handleRemoveCard = (card) => {
    addResources({ gold: -cardRemovalPrice });
    removeCardFromDeck(card.id, card.isMainSpecial);
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
            <div>
              {/* 상징 */}
              {inventory.relics.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1rem', color: '#a78bfa', marginBottom: '12px' }}>✨ 상징</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                    {inventory.relics.map(({ id, price }) => {
                      const relic = RELICS[id];
                      if (!relic) return null;
                      const sold = purchasedRelics.has(id) || relics.includes(id);
                      const canAfford = gold >= price;

                      return (
                        <div
                          key={id}
                          onClick={() => !sold && handleBuyRelic(id, price)}
                          style={{
                            padding: '12px',
                            background: sold ? 'rgba(100, 116, 139, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                            border: `2px solid ${sold ? '#475569' : RARITY_COLORS[relic.rarity]}`,
                            borderRadius: '12px',
                            cursor: sold ? 'not-allowed' : 'pointer',
                            opacity: sold ? 0.5 : 1,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.75rem' }}>{relic.emoji}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, color: RARITY_COLORS[relic.rarity] }}>{relic.name}</div>
                              <div style={{ fontSize: '0.75rem', color: RARITY_COLORS[relic.rarity], opacity: 0.8 }}>
                                {RARITY_NAMES[relic.rarity]}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '8px', lineHeight: 1.4 }}>
                            {relic.description}
                          </div>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            {sold ? (
                              <span style={{ color: '#64748b', fontWeight: 600 }}>품절</span>
                            ) : (
                              <span style={{
                                fontWeight: 700,
                                color: canAfford ? '#fbbf24' : '#ef4444',
                              }}>
                                💰 {price}G
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 아이템 */}
              {inventory.items.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1rem', color: '#60a5fa', marginBottom: '12px' }}>📦 아이템</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {inventory.items.map(({ id, price }, idx) => {
                      const item = ITEMS[id];
                      if (!item) return null;
                      const sold = purchasedItems.has(id);
                      const canAfford = gold >= price;
                      const hasEmptySlot = items.some((slot) => slot === null);

                      return (
                        <div
                          key={`${id}-${idx}`}
                          onClick={() => !sold && hasEmptySlot && handleBuyItem(id, price)}
                          style={{
                            padding: '12px',
                            background: sold ? 'rgba(100, 116, 139, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                            border: `2px solid ${sold ? '#475569' : '#60a5fa'}`,
                            borderRadius: '12px',
                            cursor: sold || !hasEmptySlot ? 'not-allowed' : 'pointer',
                            opacity: sold ? 0.5 : 1,
                            transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                            <span style={{ fontWeight: 600, color: '#93c5fd' }}>{item.name}</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>
                            {item.description}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            {sold ? (
                              <span style={{ color: '#64748b', fontWeight: 600 }}>품절</span>
                            ) : !hasEmptySlot ? (
                              <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.8rem' }}>슬롯 부족</span>
                            ) : (
                              <span style={{
                                fontWeight: 700,
                                color: canAfford ? '#fbbf24' : '#ef4444',
                              }}>
                                💰 {price}G
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 카드 */}
              {inventory.cards && inventory.cards.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '1rem', color: '#f59e0b', marginBottom: '12px' }}>🃏 카드</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                    {inventory.cards.map(({ id, price, rarity }, idx) => {
                      const card = CARDS.find(c => c.id === id);
                      if (!card) return null;
                      const sold = purchasedCards.has(id);
                      const canAfford = gold >= price;
                      const rarityColors = { common: '#94a3b8', rare: '#60a5fa', special: '#a78bfa', legendary: '#fbbf24' };
                      const rarityNames = { common: '일반', rare: '희귀', special: '특별', legendary: '전설' };

                      return (
                        <div
                          key={`${id}-${idx}`}
                          onClick={() => !sold && handleBuyCard(id, price)}
                          style={{
                            padding: '12px',
                            background: sold ? 'rgba(100, 116, 139, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                            border: `2px solid ${sold ? '#475569' : rarityColors[rarity]}`,
                            borderRadius: '12px',
                            opacity: sold ? 0.5 : 1,
                            transition: 'all 0.2s',
                            cursor: sold ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: `${rarityColors[rarity]}20`,
                              color: rarityColors[rarity],
                            }}>
                              {rarityNames[rarity]}
                            </span>
                            <span style={{
                              fontSize: '0.7rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: card.type === 'attack' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                              color: card.type === 'attack' ? '#f87171' : '#60a5fa',
                            }}>
                              {card.type === 'attack' ? '⚔️공격' : '🛡️방어'}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, color: rarityColors[rarity], marginBottom: '4px' }}>{card.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>
                            행동력 {card.actionCost} · 속도 {card.speedCost}
                            {card.damage ? ` · 피해 ${card.damage}${card.hits > 1 ? `×${card.hits}` : ''}` : ''}
                            {card.block ? ` · 방어 ${card.block}` : ''}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            {sold ? (
                              <span style={{ color: '#64748b', fontWeight: 600 }}>품절</span>
                            ) : (
                              <span style={{
                                fontWeight: 700,
                                color: canAfford ? '#fbbf24' : '#ef4444',
                              }}>
                                💰 {price}G
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'sell' && (
            <div>
              {/* 아이템 판매 */}
              <h3 style={{ fontSize: '1rem', color: '#22c55e', marginBottom: '12px' }}>📦 아이템 판매</h3>
              {sellableItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', marginBottom: '20px' }}>
                  판매할 아이템이 없습니다.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  {sellableItems.map(({ item, slotIndex }) => {
                    const sellPrice = getItemSellPrice(item, merchantType);

                    return (
                      <div
                        key={slotIndex}
                        onClick={() => handleSellItem(slotIndex)}
                        style={{
                          padding: '12px',
                          background: 'rgba(34, 197, 94, 0.1)',
                          border: '2px solid #22c55e',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                          <span style={{ fontWeight: 600, color: '#86efac' }}>{item.name}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>
                          {item.description}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <span style={{ fontWeight: 700, color: '#22c55e' }}>
                            판매가: {sellPrice}G
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {activeTab === 'service' && (
            <div>
              <h3 style={{ fontSize: '1rem', color: '#60a5fa', marginBottom: '12px' }}>🔧 서비스</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
                {SHOP_SERVICES.map((service) => {
                  const price = getServicePrice(service.id, merchantType);
                  const canAfford = gold >= price;

                  return (
                    <div
                      key={service.id}
                      onClick={() => handleUseService(service)}
                      style={{
                        padding: '16px',
                        background: 'rgba(30, 41, 59, 0.5)',
                        border: `2px solid ${canAfford ? '#60a5fa' : '#475569'}`,
                        borderRadius: '12px',
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                        opacity: canAfford ? 1 : 0.6,
                        textAlign: 'center',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{service.emoji}</div>
                      <div style={{ fontWeight: 600, color: '#93c5fd', marginBottom: '4px' }}>{service.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>
                        {service.description}
                      </div>
                      <div style={{
                        fontWeight: 700,
                        color: canAfford ? '#fbbf24' : '#ef4444',
                      }}>
                        💰 {price}G
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 카드 제거 모달 */}
      {showCardRemovalModal && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
          }}
          onClick={() => setShowCardRemovalModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '600px',
              maxHeight: '70vh',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: '16px',
              border: '2px solid #ef4444',
              boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#ef4444' }}>✂️ 제거할 카드 선택</h3>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>비용: {cardRemovalPrice}G</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {allPlayerCards.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  제거할 카드가 없습니다.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
                  {allPlayerCards.map((card, idx) => (
                    <div
                      key={`${card.id}-${idx}`}
                      onClick={() => handleRemoveCard(card)}
                      style={{
                        padding: '12px',
                        background: 'rgba(30, 41, 59, 0.8)',
                        border: `2px solid ${card.isMainSpecial ? '#fbbf24' : '#60a5fa'}`,
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: card.isMainSpecial ? 'rgba(251, 191, 36, 0.2)' : 'rgba(96, 165, 250, 0.2)',
                          color: card.isMainSpecial ? '#fbbf24' : '#60a5fa',
                        }}>
                          {card.isMainSpecial ? '⭐주특기' : '💠보조'}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px' }}>{card.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        행동력 {card.actionCost} · 속도 {card.speedCost}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCardRemovalModal(false)}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(100, 116, 139, 0.3)',
                  border: '1px solid #64748b',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShopModal;
