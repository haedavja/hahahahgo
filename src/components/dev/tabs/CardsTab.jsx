/**
 * CardsTab.jsx
 * 카드 관리 탭
 */

import { useState, useMemo } from 'react';
import { CARDS } from '../../battle/battleData';

export function CardsTab({ cardUpgrades, upgradeCardRarity, characterBuild, updateCharacterBuild, addOwnedCard, removeOwnedCard, clearOwnedCards, showAllCards, setShowAllCards }) {
  const [selectedCardId, setSelectedCardId] = useState(CARDS[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [specialMode, setSpecialMode] = useState('main'); // 'main', 'sub', or 'owned'

  const mainSpecials = characterBuild?.mainSpecials || [];
  const subSpecials = characterBuild?.subSpecials || [];
  const ownedCards = characterBuild?.ownedCards || [];

  // 카드 추가
  const addCard = (cardId) => {
    if (specialMode === 'main') {
      updateCharacterBuild([...mainSpecials, cardId], subSpecials);
    } else if (specialMode === 'sub') {
      updateCharacterBuild(mainSpecials, [...subSpecials, cardId]);
    } else {
      addOwnedCard(cardId);
    }
  };

  // 카드 제거 (마지막 하나)
  const removeCard = (cardId, fromMain) => {
    if (fromMain) {
      const idx = mainSpecials.lastIndexOf(cardId);
      if (idx !== -1) {
        const newMain = [...mainSpecials.slice(0, idx), ...mainSpecials.slice(idx + 1)];
        updateCharacterBuild(newMain, subSpecials);
      }
    } else {
      const idx = subSpecials.lastIndexOf(cardId);
      if (idx !== -1) {
        const newSub = [...subSpecials.slice(0, idx), ...subSpecials.slice(idx + 1)];
        updateCharacterBuild(mainSpecials, newSub);
      }
    }
  };

  // 전체 초기화
  const clearAll = () => {
    if (specialMode === 'main') {
      updateCharacterBuild([], subSpecials);
    } else if (specialMode === 'sub') {
      updateCharacterBuild(mainSpecials, []);
    } else {
      clearOwnedCards();
    }
  };

  // 검색 필터
  const filteredCards = CARDS.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 카드 개수 카운트
  const getCount = (cardId, list) => list.filter(id => id === cardId).length;

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>카드 관리</h3>

      {/* 현재 보유 카드 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
          주특기 ({mainSpecials.length}개)
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {mainSpecials.length === 0 ? (
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>없음</span>
          ) : (
            // 중복 카운트로 표시
            [...new Set(mainSpecials)].map(cardId => {
              const card = CARDS.find(c => c.id === cardId);
              const count = getCount(cardId, mainSpecials);
              return (
                <div
                  key={cardId}
                  onClick={() => removeCard(cardId, true)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(245, 215, 110, 0.15)',
                    border: '1px solid #f5d76e',
                    borderRadius: '6px',
                    color: '#f5d76e',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  title="클릭하여 제거"
                >
                  {card?.name || cardId}{count > 1 ? ` x${count}` : ''} ✕
                </div>
              );
            })
          )}
        </div>

        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
          보조특기 ({subSpecials.length}개)
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {subSpecials.length === 0 ? (
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>없음</span>
          ) : (
            [...new Set(subSpecials)].map(cardId => {
              const card = CARDS.find(c => c.id === cardId);
              const count = getCount(cardId, subSpecials);
              return (
                <div
                  key={cardId}
                  onClick={() => removeCard(cardId, false)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(125, 211, 252, 0.15)',
                    border: '1px solid #7dd3fc',
                    borderRadius: '6px',
                    color: '#7dd3fc',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  title="클릭하여 제거"
                >
                  {card?.name || cardId}{count > 1 ? ` x${count}` : ''} ✕
                </div>
              );
            })
          )}
        </div>

        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px', marginTop: '12px' }}>
          대기카드 ({ownedCards.length}개) - 10% 손패
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ownedCards.length === 0 ? (
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>없음</span>
          ) : (
            [...new Set(ownedCards)].map(cardId => {
              const card = CARDS.find(c => c.id === cardId);
              const count = getCount(cardId, ownedCards);
              return (
                <div
                  key={cardId}
                  onClick={() => removeOwnedCard(cardId)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(167, 139, 250, 0.15)',
                    border: '1px solid #a78bfa',
                    borderRadius: '6px',
                    color: '#a78bfa',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  title="클릭하여 제거"
                >
                  {card?.name || cardId}{count > 1 ? ` x${count}` : ''} ✕
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 모드 선택 & 초기화 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={() => setSpecialMode('main')}
          style={{
            flex: 1,
            padding: '8px',
            background: specialMode === 'main' ? 'linear-gradient(135deg, #f5d76e, #c9a64a)' : '#1e293b',
            border: specialMode === 'main' ? 'none' : '1px solid #334155',
            borderRadius: '6px',
            color: specialMode === 'main' ? '#000' : '#94a3b8',
            fontWeight: specialMode === 'main' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          주특기 추가
        </button>
        <button
          onClick={() => setSpecialMode('sub')}
          style={{
            flex: 1,
            padding: '8px',
            background: specialMode === 'sub' ? 'linear-gradient(135deg, #7dd3fc, #2b6fbf)' : '#1e293b',
            border: specialMode === 'sub' ? 'none' : '1px solid #334155',
            borderRadius: '6px',
            color: specialMode === 'sub' ? '#000' : '#94a3b8',
            fontWeight: specialMode === 'sub' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          보조특기 추가
        </button>
        <button
          onClick={() => setSpecialMode('owned')}
          style={{
            flex: 1,
            padding: '8px',
            background: specialMode === 'owned' ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : '#1e293b',
            border: specialMode === 'owned' ? 'none' : '1px solid #334155',
            borderRadius: '6px',
            color: specialMode === 'owned' ? '#fff' : '#94a3b8',
            fontWeight: specialMode === 'owned' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          대기카드 추가
        </button>
        <button
          onClick={clearAll}
          style={{
            padding: '8px 12px',
            background: '#ef4444',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          초기화
        </button>
      </div>

      {/* 검색 */}
      <input
        type="text"
        placeholder="카드 이름 또는 ID 검색..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          color: '#e2e8f0',
          fontSize: '0.875rem',
          marginBottom: '12px',
          boxSizing: 'border-box',
        }}
      />

      {/* 카드 목록 */}
      <div style={{
        maxHeight: '250px',
        overflowY: 'auto',
        padding: '8px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        {filteredCards.map(card => {
          const mainCount = getCount(card.id, mainSpecials);
          const subCount = getCount(card.id, subSpecials);
          const rarity = cardUpgrades?.[card.id] || card.rarity || 'common';
          const rarityColors = { common: '#94a3b8', rare: '#60a5fa', special: '#a78bfa', legendary: '#fbbf24' };

          return (
            <div
              key={card.id}
              onClick={() => addCard(card.id)}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                background: (mainCount > 0 || subCount > 0) ? 'rgba(34, 197, 94, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                border: `1px solid ${mainCount > 0 ? '#f5d76e' : subCount > 0 ? '#7dd3fc' : '#334155'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, color: rarityColors[rarity], marginRight: '8px' }}>
                    {card.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    ({card.id})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {mainCount > 0 && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      background: 'rgba(245, 215, 110, 0.2)',
                      border: '1px solid #f5d76e',
                      borderRadius: '4px',
                      color: '#f5d76e',
                    }}>
                      주특기 {mainCount > 1 ? `x${mainCount}` : ''}
                    </span>
                  )}
                  {subCount > 0 && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      background: 'rgba(125, 211, 252, 0.2)',
                      border: '1px solid #7dd3fc',
                      borderRadius: '4px',
                      color: '#7dd3fc',
                    }}>
                      보조 {subCount > 1 ? `x${subCount}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                {card.type === 'attack' ? '⚔️ 공격' : '🛡️ 방어'} | AP {card.actionCost} | 속도 {card.speedCost}
                {card.damage ? ` | 데미지 ${card.damage}${card.hits ? ` x${card.hits}` : ''}` : ''}
                {card.block ? ` | 방어 ${card.block}` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* 캐릭터 창 설정 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
        border: '1px solid #334155',
      }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px', marginTop: 0 }}>🃏 캐릭터 창 설정</h4>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={showAllCards || false}
            onChange={(e) => setShowAllCards(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ color: showAllCards ? '#22c55e' : '#94a3b8', fontSize: '0.875rem' }}>
            전체 카드 표시 (덱빌딩 모드)
          </span>
        </label>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
          {showAllCards
            ? '✅ 캐릭터 창에서 모든 카드를 표시합니다'
            : '캐릭터 창에서 보유 카드만 표시합니다'}
        </div>
      </div>

      {/* 카드 등급 올리기 (기존 기능) */}
      <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px' }}>카드 등급 업그레이드</h4>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selectedCardId}
          onChange={(e) => setSelectedCardId(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '8px 10px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '0.8rem',
          }}
        >
          {CARDS.map((c) => {
            const rarity = cardUpgrades?.[c.id] || c.rarity || 'common';
            return (
              <option key={c.id} value={c.id}>
                {c.name} ({rarity})
              </option>
            );
          })}
        </select>
        <button
          onClick={() => upgradeCardRarity(selectedCardId)}
          style={{
            padding: '8px 12px',
            background: '#10b981',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          등급 올리기
        </button>
      </div>
    </div>
  );
}
