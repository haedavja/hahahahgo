/**
 * ShopTabs.jsx
 *
 * 상점 탭 컴포넌트들
 * ShopModal.jsx에서 분리됨
 */

import { RELICS, RELIC_RARITIES } from '../../data/relics';
import { ITEMS } from '../../data/items';
import { CARDS } from '../battle/battleData';
import { getItemSellPrice, getServicePrice, SHOP_SERVICES } from '../../data/shop';

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

/**
 * 구매 탭 - 상징 섹션
 */
function RelicsSection({ inventory, purchasedRelics, relics, gold, onBuyRelic }) {
  if (inventory.relics.length === 0) return null;

  return (
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
              onClick={() => !sold && onBuyRelic(id, price)}
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                {sold ? (
                  <span style={{ color: '#64748b', fontWeight: 600 }}>품절</span>
                ) : (
                  <span style={{ fontWeight: 700, color: canAfford ? '#fbbf24' : '#ef4444' }}>
                    💰 {price}G
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 구매 탭 - 아이템 섹션
 */
function ItemsSection({ inventory, purchasedItems, items, gold, onBuyItem }) {
  if (inventory.items.length === 0) return null;

  return (
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
              onClick={() => !sold && hasEmptySlot && onBuyItem(id, price)}
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
                  <span style={{ fontWeight: 700, color: canAfford ? '#fbbf24' : '#ef4444' }}>
                    💰 {price}G
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 구매 탭 - 카드 섹션
 */
function CardsSection({ inventory, purchasedCards, gold, onBuyCard }) {
  if (!inventory.cards || inventory.cards.length === 0) return null;

  const rarityColors = { common: '#94a3b8', rare: '#60a5fa', special: '#a78bfa', legendary: '#fbbf24' };
  const rarityNames = { common: '일반', rare: '희귀', special: '특별', legendary: '전설' };

  return (
    <div>
      <h3 style={{ fontSize: '1rem', color: '#f59e0b', marginBottom: '12px' }}>🃏 카드</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {inventory.cards.map(({ id, price, rarity }, idx) => {
          const card = CARDS.find(c => c.id === id);
          if (!card) return null;
          const sold = purchasedCards.has(id);
          const canAfford = gold >= price;

          return (
            <div
              key={`${id}-${idx}`}
              onClick={() => !sold && onBuyCard(id, price)}
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
                {card.damage ? ` · 피해 ${card.damage}${(card.hits ?? 1) > 1 ? `×${card.hits}` : ''}` : ''}
                {card.block ? ` · 방어 ${card.block}` : ''}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {sold ? (
                  <span style={{ color: '#64748b', fontWeight: 600 }}>품절</span>
                ) : (
                  <span style={{ fontWeight: 700, color: canAfford ? '#fbbf24' : '#ef4444' }}>
                    💰 {price}G
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 구매 탭
 */
export function BuyTab({ inventory, purchasedRelics, purchasedItems, purchasedCards, relics, items, gold, onBuyRelic, onBuyItem, onBuyCard }) {
  return (
    <div>
      <RelicsSection
        inventory={inventory}
        purchasedRelics={purchasedRelics}
        relics={relics}
        gold={gold}
        onBuyRelic={onBuyRelic}
      />
      <ItemsSection
        inventory={inventory}
        purchasedItems={purchasedItems}
        items={items}
        gold={gold}
        onBuyItem={onBuyItem}
      />
      <CardsSection
        inventory={inventory}
        purchasedCards={purchasedCards}
        gold={gold}
        onBuyCard={onBuyCard}
      />
    </div>
  );
}

/**
 * 판매 탭
 */
export function SellTab({ sellableItems, merchantType, onSellItem }) {
  return (
    <div>
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
                onClick={() => onSellItem(slotIndex)}
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
  );
}

/**
 * 서비스 탭
 */
export function ServiceTab({ gold, merchantType, onUseService }) {
  return (
    <div>
      <h3 style={{ fontSize: '1rem', color: '#60a5fa', marginBottom: '12px' }}>🔧 서비스</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {SHOP_SERVICES.map((service) => {
          const price = getServicePrice(service.id, merchantType);
          const canAfford = gold >= price;

          return (
            <div
              key={service.id}
              onClick={() => onUseService(service)}
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
              <div style={{ fontWeight: 700, color: canAfford ? '#fbbf24' : '#ef4444' }}>
                💰 {price}G
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 카드 제거 모달
 */
export function CardRemovalModal({ allPlayerCards, cardRemovalPrice, onRemoveCard, onClose }) {
  return (
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
      onClick={onClose}
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
                  onClick={() => onRemoveCard(card)}
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
            onClick={onClose}
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
  );
}
