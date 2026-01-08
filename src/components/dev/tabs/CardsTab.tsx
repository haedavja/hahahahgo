/**
 * CardsTab.tsx
 * 카드 관리 탭
 */

import { useState, useCallback, useMemo, memo, ChangeEvent, lazy, Suspense, useEffect, useRef } from 'react';
import { CARDS, TRAITS } from '../../battle/battleData';
import type { CardsTabCard as Card, CardsTabCharacterBuild as CharacterBuild } from '../../../types';
import type { CardGrowthState } from '../../../state/slices/types';

// Lazy loading for heavy modal
const CardGrowthModal = lazy(() => import('../../map/ui/CardGrowthModal').then(m => ({ default: m.CardGrowthModal })));

// 특성 목록 (긍정/부정 분리 후 가나다 순 정렬)
const ALL_TRAITS = Object.entries(TRAITS)
  .map(([traitId, trait]) => ({ ...trait, id: traitId }))
  .sort((a, b) => {
    // 긍정 먼저, 그 다음 가나다 순
    if (a.type !== b.type) return a.type === 'positive' ? -1 : 1;
    return a.name.localeCompare(b.name, 'ko');
  });

// 카드 목록 (가나다 순 정렬)
const SORTED_CARDS = (CARDS as Card[]).slice().sort((a, b) => a.name.localeCompare(b.name, 'ko'));

// 스타일 상수
const RARITY_COLORS: Record<string, string> = { common: '#94a3b8', rare: '#60a5fa', special: '#a78bfa', legendary: '#fbbf24' };

const CARD_BADGE_STYLE = {
  main: { padding: '4px 10px', background: 'rgba(245, 215, 110, 0.15)', border: '1px solid #f5d76e', borderRadius: '6px', color: '#f5d76e', fontSize: '0.75rem', cursor: 'pointer' },
  sub: { padding: '4px 10px', background: 'rgba(125, 211, 252, 0.15)', border: '1px solid #7dd3fc', borderRadius: '6px', color: '#7dd3fc', fontSize: '0.75rem', cursor: 'pointer' },
  owned: { padding: '4px 10px', background: 'rgba(167, 139, 250, 0.15)', border: '1px solid #a78bfa', borderRadius: '6px', color: '#a78bfa', fontSize: '0.75rem', cursor: 'pointer' },
} as const;

interface CardsTabProps {
  cardUpgrades?: Record<string, string>;
  upgradeCardRarity: (cardId: string) => void;
  characterBuild: CharacterBuild | null;
  updateCharacterBuild: (mainSpecials: string[], subSpecials: string[]) => void;
  addOwnedCard: (cardId: string) => void;
  removeOwnedCard: (cardId: string) => void;
  clearOwnedCards: () => void;
  showAllCards: boolean;
  setShowAllCards: (show: boolean) => void;
  cardGrowth: Record<string, CardGrowthState>;
  enhanceCard: (cardId: string) => void;
  specializeCard: (cardId: string, selectedTraits: string[]) => void;
}

export const CardsTab = memo(function CardsTab({ cardUpgrades, upgradeCardRarity, characterBuild, updateCharacterBuild, addOwnedCard, removeOwnedCard, clearOwnedCards, showAllCards, setShowAllCards, cardGrowth, enhanceCard, specializeCard }: CardsTabProps) {
  const [selectedCardId, setSelectedCardId] = useState<string>((CARDS as Card[])[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [specialMode, setSpecialMode] = useState<'main' | 'sub' | 'owned'>('main');
  const [showCardGrowthModal, setShowCardGrowthModal] = useState(false);
  // 직접 특성 부여
  const [traitTargetCardId, setTraitTargetCardId] = useState<string>((CARDS as Card[])[0]?.id || '');
  const [selectedTraitId, setSelectedTraitId] = useState<string>(ALL_TRAITS[0]?.id || '');

  // 알림 시스템 (alert 대체)
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'warning' } | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    };
  }, []);

  const showNotification = useCallback((message: string, type: 'info' | 'warning' = 'info') => {
    setNotification({ message, type });
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => setNotification(null), 2500);
  }, []);

  const mainSpecials = useMemo(() => characterBuild?.mainSpecials || [], [characterBuild?.mainSpecials]);
  const subSpecials = useMemo(() => characterBuild?.subSpecials || [], [characterBuild?.subSpecials]);
  const ownedCards = useMemo(() => characterBuild?.ownedCards || [], [characterBuild?.ownedCards]);

  // 카드 맵 메모이제이션 (빠른 lookup)
  const cardMap = useMemo(() => {
    const map = new Map<string, Card>();
    (CARDS as Card[]).forEach(c => map.set(c.id, c));
    return map;
  }, []);

  // 고유 카드 목록 메모이제이션
  const uniqueMainSpecials = useMemo(() => [...new Set(mainSpecials)], [mainSpecials]);
  const uniqueSubSpecials = useMemo(() => [...new Set(subSpecials)], [subSpecials]);
  const uniqueOwnedCards = useMemo(() => [...new Set(ownedCards)], [ownedCards]);

  // 카드 추가
  const addCard = useCallback((cardId: string) => {
    if (specialMode === 'main') {
      updateCharacterBuild([...mainSpecials, cardId], subSpecials);
    } else if (specialMode === 'sub') {
      updateCharacterBuild(mainSpecials, [...subSpecials, cardId]);
    } else {
      addOwnedCard(cardId);
    }
  }, [specialMode, mainSpecials, subSpecials, updateCharacterBuild, addOwnedCard]);

  // 카드 제거 (마지막 하나)
  const removeCard = useCallback((cardId: string, fromMain: boolean) => {
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
  }, [mainSpecials, subSpecials, updateCharacterBuild]);

  // 전체 초기화
  const clearAll = useCallback(() => {
    if (specialMode === 'main') {
      updateCharacterBuild([], subSpecials);
    } else if (specialMode === 'sub') {
      updateCharacterBuild(mainSpecials, []);
    } else {
      clearOwnedCards();
    }
  }, [specialMode, mainSpecials, subSpecials, updateCharacterBuild, clearOwnedCards]);

  // 검색 필터 (가나다 순 정렬)
  const filteredCards = useMemo(() =>
    (CARDS as Card[])
      .filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'ko')), [searchTerm]);

  // 카드 개수 카운트
  const getCount = useCallback((cardId: string, list: string[]): number => list.filter(id => id === cardId).length, []);

  // 핸들러
  const handleOpenCardGrowthModal = useCallback(() => setShowCardGrowthModal(true), []);
  const handleCloseCardGrowthModal = useCallback(() => setShowCardGrowthModal(false), []);
  const handleUpgradeCard = useCallback(() => upgradeCardRarity(selectedCardId), [selectedCardId, upgradeCardRarity]);

  // 직접 특성 부여 핸들러
  const handleDirectTraitAssign = useCallback(() => {
    if (!traitTargetCardId || !selectedTraitId) return;
    // 기존 특성에 새 특성 추가
    let currentTraits = cardGrowth[traitTargetCardId]?.traits || [];
    if (currentTraits.includes(selectedTraitId)) {
      showNotification(`이미 '${TRAITS[selectedTraitId as keyof typeof TRAITS]?.name}' 특성이 있습니다.`, 'warning');
      return;
    }

    // 여유/무리 상극 처리: 둘 중 하나만 가질 수 있음
    if (selectedTraitId === 'leisure' && currentTraits.includes('strain')) {
      currentTraits = currentTraits.filter(t => t !== 'strain');
      showNotification("'무리' 특성이 제거되었습니다. (여유/무리는 상극)", 'info');
    } else if (selectedTraitId === 'strain' && currentTraits.includes('leisure')) {
      currentTraits = currentTraits.filter(t => t !== 'leisure');
      showNotification("'여유' 특성이 제거되었습니다. (여유/무리는 상극)", 'info');
    }

    specializeCard(traitTargetCardId, [...currentTraits, selectedTraitId]);
  }, [traitTargetCardId, selectedTraitId, cardGrowth, specializeCard, showNotification]);

  // 특성 제거 핸들러
  const handleRemoveTrait = useCallback((cardId: string, traitId: string) => {
    const currentTraits = cardGrowth[cardId]?.traits || [];
    const newTraits = currentTraits.filter(t => t !== traitId);
    specializeCard(cardId, newTraits);
  }, [cardGrowth, specializeCard]);

  // 특성 전체 제거 핸들러
  const handleClearTraits = useCallback((cardId: string) => {
    specializeCard(cardId, []);
  }, [specializeCard]);

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>카드 관리</h3>

      {/* 알림 표시 */}
      {notification && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          background: notification.type === 'warning' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(34, 197, 94, 0.15)',
          border: `1px solid ${notification.type === 'warning' ? '#fbbf24' : '#22c55e'}`,
          color: notification.type === 'warning' ? '#fcd34d' : '#86efac',
        }}>
          {notification.message}
        </div>
      )}

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
            uniqueMainSpecials.map(cardId => {
              const card = cardMap.get(cardId);
              const count = getCount(cardId, mainSpecials);
              return (
                <div
                  key={cardId}
                  onClick={() => removeCard(cardId, true)}
                  style={CARD_BADGE_STYLE.main}
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
            uniqueSubSpecials.map(cardId => {
              const card = cardMap.get(cardId);
              const count = getCount(cardId, subSpecials);
              return (
                <div
                  key={cardId}
                  onClick={() => removeCard(cardId, false)}
                  style={CARD_BADGE_STYLE.sub}
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
            uniqueOwnedCards.map(cardId => {
              const card = cardMap.get(cardId);
              const count = getCount(cardId, ownedCards);
              return (
                <div
                  key={cardId}
                  onClick={() => removeOwnedCard(cardId)}
                  style={CARD_BADGE_STYLE.owned}
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
        onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
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
                  <span style={{ fontWeight: 600, color: RARITY_COLORS[rarity], marginRight: '8px' }}>
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setShowAllCards(e.target.checked)}
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

      {/* 카드 등급 올리기 */}
      <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px' }}>카드 등급 업그레이드</h4>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selectedCardId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedCardId(e.target.value)}
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
          {SORTED_CARDS.map((c) => {
            const rarity = cardUpgrades?.[c.id] || c.rarity || 'common';
            return (
              <option key={c.id} value={c.id}>
                {c.name} ({rarity})
              </option>
            );
          })}
        </select>
        <button
          onClick={handleUpgradeCard}
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

      {/* 카드 성장 (강화/특화) */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginTop: '16px',
        border: '1px solid rgba(96, 165, 250, 0.3)',
      }}>
        <h4 style={{ color: '#60a5fa', fontSize: '0.875rem', marginBottom: '8px', marginTop: 0 }}>🎴 카드 승급 (강화/특화)</h4>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px' }}>
          강화로 카드 스탯을 높이고, 특화로 특성을 부여하세요.
        </p>
        <button
          onClick={handleOpenCardGrowthModal}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #22c55e 100%)',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          🎴 카드 승급 창 열기
        </button>
      </div>

      {/* 직접 특성 부여 (개발자 전용) */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginTop: '16px',
        border: '1px solid rgba(249, 115, 22, 0.3)',
      }}>
        <h4 style={{ color: '#f97316', fontSize: '0.875rem', marginBottom: '8px', marginTop: 0 }}>🔧 직접 특성 부여 (개발자용)</h4>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px' }}>
          원하는 카드에 원하는 특성을 확정적으로 부여합니다.
        </p>

        {/* 카드 선택 */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>대상 카드</label>
          <select
            value={traitTargetCardId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setTraitTargetCardId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontSize: '0.8rem',
            }}
          >
            {SORTED_CARDS.map((c) => {
              const growth = cardGrowth[c.id];
              const traits = growth?.traits || [];
              return (
                <option key={c.id} value={c.id}>
                  {c.name} {traits.length > 0 ? `[${traits.map(t => TRAITS[t as keyof typeof TRAITS]?.name || t).join(', ')}]` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* 현재 특성 표시 및 제거 */}
        {cardGrowth[traitTargetCardId]?.traits && cardGrowth[traitTargetCardId].traits.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>현재 특성 (클릭하여 제거)</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {cardGrowth[traitTargetCardId].traits.map(traitId => {
                const trait = TRAITS[traitId as keyof typeof TRAITS];
                if (!trait) return null;
                const isPositive = trait.type === 'positive';
                return (
                  <span
                    key={traitId}
                    onClick={() => handleRemoveTrait(traitTargetCardId, traitId)}
                    style={{
                      padding: '4px 8px',
                      background: isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      border: `1px solid ${isPositive ? '#22c55e' : '#ef4444'}`,
                      borderRadius: '6px',
                      color: isPositive ? '#22c55e' : '#ef4444',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                    title="클릭하여 제거"
                  >
                    {trait.name} ✕
                  </span>
                );
              })}
              <button
                onClick={() => handleClearTraits(traitTargetCardId)}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                전체 제거
              </button>
            </div>
          </div>
        )}

        {/* 특성 선택 */}
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>부여할 특성</label>
          <select
            value={selectedTraitId}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedTraitId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontSize: '0.8rem',
            }}
          >
            {ALL_TRAITS.map((trait) => (
              <option key={trait.id} value={trait.id} style={{ color: trait.type === 'positive' ? '#22c55e' : '#ef4444' }}>
                {trait.type === 'positive' ? '+' : '-'}{trait.name} (★{trait.weight}) - {trait.description}
              </option>
            ))}
          </select>
        </div>

        {/* 부여 버튼 */}
        <button
          onClick={handleDirectTraitAssign}
          style={{
            width: '100%',
            padding: '10px',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ✨ 특성 부여
        </button>
      </div>

      {/* 카드 승급 모달 */}
      {showCardGrowthModal && (
        <Suspense fallback={null}>
          <CardGrowthModal
            isOpen={showCardGrowthModal}
            onClose={handleCloseCardGrowthModal}
            cardGrowth={cardGrowth}
            onEnhance={enhanceCard}
            onSpecialize={specializeCard}
            ownedCards={ownedCards}
          />
        </Suspense>
      )}
    </div>
  );
});
