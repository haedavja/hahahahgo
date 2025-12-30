/**
 * CardGrowthModal.tsx
 * 카드 성장 전용 모달 (강화/특화를 한 화면에서 확인 가능)
 */

import { useState, useMemo } from 'react';
import { CARDS, TRAITS } from '../../battle/battleData';
import { CARD_ETHER_BY_RARITY } from '../../battle/utils/etherCalculations';
import { generateSpecializationOptions, type SpecializationOption } from '../../../lib/specializationUtils';
import type { CardGrowthState } from '../../../state/slices/types';
import {
  getNextEnhancementPreview,
  getAllEnhancementLevels,
  getEnhancementColor,
  getEnhancementLabel,
  isEnhanceable,
  calculateEnhancedStats,
  getEnhancedCard,
} from '../../../lib/cardEnhancementUtils';

interface CardGrowthModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardGrowth: Record<string, CardGrowthState>;
  onEnhance: (cardId: string) => void;
  onSpecialize: (cardId: string, selectedTraits: string[]) => void;
}

const rarityColors: Record<string, string> = {
  common: '#94a3b8',
  rare: '#60a5fa',
  special: '#a78bfa',
  legendary: '#fbbf24',
};

const rarityLabels: Record<string, string> = {
  common: '일반',
  rare: '희귀',
  special: '특별',
  legendary: '전설',
};

export function CardGrowthModal({
  isOpen,
  onClose,
  cardGrowth,
  onEnhance,
  onSpecialize,
}: CardGrowthModalProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [specOptions, setSpecOptions] = useState<SpecializationOption[]>([]);
  const [selectedSpecOption, setSelectedSpecOption] = useState<SpecializationOption | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const cards = CARDS || [];

  // 검색 필터링
  const filteredCards = useMemo(() => {
    return (cards as { id: string; name: string; description?: string; type?: string }[]).filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cards, searchTerm]);

  const getCardGrowthState = (cardId: string): CardGrowthState => {
    return cardGrowth[cardId] || { rarity: 'common', growthCount: 0, enhancementLevel: 0, specializationCount: 0, traits: [] };
  };

  const selectedCard = cards.find((c: { id: string }) => c.id === selectedCardId) as { id: string; name: string; description?: string; type?: string; damage?: number; block?: number; speedCost: number; actionCost: number } | undefined;
  const selectedGrowth = selectedCardId ? getCardGrowthState(selectedCardId) : null;

  // 카드 선택 시 특화 옵션 생성
  const handleSelectCard = (cardId: string) => {
    setSelectedCardId(cardId);
    const growth = getCardGrowthState(cardId);
    const options = generateSpecializationOptions(growth.traits);
    setSpecOptions(options);
    setSelectedSpecOption(null);
  };

  // 알림 표시
  const showNotification = (message: string, type: string) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2500);
  };

  // 강화 실행
  const handleEnhance = () => {
    if (!selectedCardId) return;
    const growth = getCardGrowthState(selectedCardId);
    if (growth.enhancementLevel >= 5) return;

    onEnhance(selectedCardId);
    showNotification(`${selectedCard?.name} +${(growth.enhancementLevel || 0) + 1} 강화 성공!`, 'enhance');

    // 강화는 특화 옵션에 영향을 주지 않음 (특성이 바뀌지 않으므로)
    // 특화 후에만 옵션이 새로고침됨
  };

  // 특화 실행
  const handleSpecialize = () => {
    if (!selectedCardId || !selectedSpecOption) return;

    const traitIds = selectedSpecOption.traits.map(t => t.id);
    onSpecialize(selectedCardId, traitIds);

    const traitNames = selectedSpecOption.traits.map(t => t.name).join(', ');
    showNotification(`${selectedCard?.name} 특화 성공! [${traitNames}]`, 'specialize');

    // 특화 옵션 새로고침
    const growth = getCardGrowthState(selectedCardId);
    const newTraits = [...(growth.traits || []), ...traitIds];
    setSpecOptions(generateSpecializationOptions(newTraits));
    setSelectedSpecOption(null);
  };

  if (!isOpen) return null;

  const canEnhance = selectedCardId && isEnhanceable(selectedCardId) && (selectedGrowth?.enhancementLevel || 0) < 5;
  const canSpecialize = selectedCardId && selectedGrowth?.rarity !== 'legendary';
  const nextEnhancement = selectedCardId ? getNextEnhancementPreview(selectedCardId, selectedGrowth?.enhancementLevel || 0) : null;
  const allLevels = selectedCardId ? getAllEnhancementLevels(selectedCardId) : [];
  const nextStats = selectedCardId && canEnhance ? calculateEnhancedStats(selectedCardId, (selectedGrowth?.enhancementLevel || 0) + 1) : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '95%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          border: '2px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, color: '#fbbf24', fontSize: '1.5rem' }}>⚔️ 카드 성장</h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
              카드를 선택하여 강화 또는 특화를 진행하세요 (무료)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.5rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* 알림 */}
        {notification && (
          <div style={{
            padding: '12px 24px',
            background: notification.type === 'enhance' ? 'rgba(96, 165, 250, 0.2)' : 'rgba(134, 239, 172, 0.2)',
            borderBottom: `2px solid ${notification.type === 'enhance' ? '#60a5fa' : '#86efac'}`,
            color: notification.type === 'enhance' ? '#93c5fd' : '#86efac',
            fontWeight: 600,
            textAlign: 'center',
            fontSize: '1rem',
          }}>
            {notification.type === 'enhance' ? '⚔️' : '✨'} {notification.message}
          </div>
        )}

        {/* 메인 컨텐츠 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr 1fr',
          gap: '16px',
          padding: '16px',
          flex: 1,
          overflow: 'hidden',
        }}>
          {/* 왼쪽: 카드 목록 */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <input
              type="text"
              placeholder="카드 검색..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#e2e8f0',
                fontSize: '0.875rem',
                marginBottom: '12px',
              }}
            />
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredCards.map((card) => {
                const growth = getCardGrowthState(card.id);
                const isSelected = card.id === selectedCardId;
                const isMaxLevel = growth.rarity === 'legendary' && growth.enhancementLevel >= 5;

                return (
                  <div
                    key={card.id}
                    onClick={() => !isMaxLevel && handleSelectCard(card.id)}
                    style={{
                      padding: '10px 12px',
                      marginBottom: '6px',
                      background: isSelected ? 'rgba(251, 191, 36, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                      border: isSelected ? '2px solid #fbbf24' : '1px solid #334155',
                      borderRadius: '8px',
                      cursor: isMaxLevel ? 'not-allowed' : 'pointer',
                      opacity: isMaxLevel ? 0.5 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{card.name}</span>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {(growth.enhancementLevel || 0) > 0 && (
                          <span style={{
                            fontSize: '10px',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            background: getEnhancementColor(growth.enhancementLevel || 0),
                            color: '#0f172a',
                            fontWeight: 700,
                          }}>
                            {getEnhancementLabel(growth.enhancementLevel || 0)}
                          </span>
                        )}
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: rarityColors[growth.rarity],
                          color: '#0f172a',
                          fontWeight: 700,
                        }}>
                          {rarityLabels[growth.rarity]}
                        </span>
                      </div>
                    </div>
                    {growth.traits.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#86efac', marginTop: '4px' }}>
                        {growth.traits.slice(0, 2).map(tid => {
                          const t = TRAITS[tid as keyof typeof TRAITS];
                          return t?.name || tid;
                        }).join(', ')}{growth.traits.length > 2 ? ` +${growth.traits.length - 2}` : ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 가운데: 강화 패널 */}
          <div style={{
            background: 'rgba(96, 165, 250, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(96, 165, 250, 0.2)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h3 style={{ color: '#60a5fa', margin: '0 0 16px', fontSize: '1.125rem' }}>⚔️ 강화</h3>

            {!selectedCard ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                왼쪽에서 카드를 선택하세요
              </div>
            ) : !canEnhance ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                {(selectedGrowth?.enhancementLevel || 0) >= 5 ? '최대 강화 레벨입니다' : '이 카드는 강화할 수 없습니다'}
              </div>
            ) : (
              <>
                {/* 현재 카드 정보 */}
                <div style={{
                  padding: '12px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}>
                  <div style={{ fontSize: '1.125rem', color: '#e2e8f0', fontWeight: 700, marginBottom: '4px' }}>
                    {selectedCard.name}
                    {(selectedGrowth?.enhancementLevel || 0) > 0 && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.875rem',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: getEnhancementColor(selectedGrowth?.enhancementLevel || 0),
                        color: '#0f172a',
                      }}>
                        {getEnhancementLabel(selectedGrowth?.enhancementLevel || 0)}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {(() => {
                      const enhLevel = selectedGrowth?.enhancementLevel || 0;
                      if (enhLevel > 0) {
                        const enhanced = getEnhancedCard(selectedCard as Parameters<typeof getEnhancedCard>[0], enhLevel);
                        return enhanced.description || selectedCard.description;
                      }
                      return selectedCard.description;
                    })()}
                  </div>
                </div>

                {/* 강화 진행률 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>강화 진행</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {allLevels.map((level) => (
                      <div
                        key={level.level}
                        style={{
                          flex: 1,
                          height: '36px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          background: level.level <= (selectedGrowth?.enhancementLevel || 0)
                            ? getEnhancementColor(level.level)
                            : level.level === (selectedGrowth?.enhancementLevel || 0) + 1
                              ? 'rgba(96, 165, 250, 0.3)'
                              : 'rgba(71, 85, 105, 0.3)',
                          color: level.level <= (selectedGrowth?.enhancementLevel || 0) ? '#0f172a' : '#9ca3af',
                          border: level.isMilestone
                            ? '2px solid rgba(251, 191, 36, 0.7)'
                            : '1px solid rgba(71, 85, 105, 0.5)',
                        }}
                        title={level.description}
                      >
                        {level.level}{level.isMilestone ? '★' : ''}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 다음 강화 효과 */}
                {nextEnhancement && (
                  <div style={{
                    padding: '12px',
                    background: nextEnhancement.isMilestone ? 'rgba(251, 191, 36, 0.1)' : 'rgba(96, 165, 250, 0.1)',
                    borderRadius: '8px',
                    border: nextEnhancement.isMilestone ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(96, 165, 250, 0.2)',
                    marginBottom: '16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                        다음: {getEnhancementLabel(nextEnhancement.level)}
                      </span>
                      {nextEnhancement.isMilestone && (
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(251, 191, 36, 0.2)',
                          color: '#fbbf24',
                        }}>
                          ★ 마일스톤
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      color: getEnhancementColor(nextEnhancement.level),
                      fontWeight: 600,
                    }}>
                      {nextEnhancement.description}
                    </div>
                  </div>
                )}

                {/* 누적 스탯 */}
                {nextStats && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>누적 효과</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {nextStats.damageBonus > 0 && <StatBadge label="피해" value={`+${nextStats.damageBonus}`} color="#f87171" />}
                      {nextStats.blockBonus > 0 && <StatBadge label="방어" value={`+${nextStats.blockBonus}`} color="#60a5fa" />}
                      {nextStats.speedCostReduction > 0 && <StatBadge label="속도" value={`-${nextStats.speedCostReduction}`} color="#4ade80" />}
                      {nextStats.actionCostReduction > 0 && <StatBadge label="행동력" value={`-${nextStats.actionCostReduction}`} color="#fbbf24" />}
                      {nextStats.hitsBonus > 0 && <StatBadge label="타격" value={`+${nextStats.hitsBonus}`} color="#f472b6" />}
                    </div>
                  </div>
                )}

                {/* 강화 버튼 */}
                <div style={{ marginTop: 'auto' }}>
                  <button
                    onClick={handleEnhance}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⚔️ 강화하기 (무료)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* 오른쪽: 특화 패널 */}
          <div style={{
            background: 'rgba(134, 239, 172, 0.05)',
            borderRadius: '12px',
            border: '1px solid rgba(134, 239, 172, 0.2)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h3 style={{ color: '#86efac', margin: '0 0 16px', fontSize: '1.125rem' }}>✨ 특화</h3>

            {!selectedCard ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                왼쪽에서 카드를 선택하세요
              </div>
            ) : !canSpecialize ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                전설 등급은 더 이상 특화할 수 없습니다
              </div>
            ) : (
              <>
                {/* 현재 특성 */}
                {selectedGrowth && selectedGrowth.traits.length > 0 && (
                  <div style={{
                    padding: '10px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '8px',
                    marginBottom: '12px',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>보유 특성</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedGrowth.traits.map(tid => {
                        const t = TRAITS[tid as keyof typeof TRAITS];
                        if (!t) return null;
                        return (
                          <span
                            key={tid}
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: t.type === 'positive' ? 'rgba(134, 239, 172, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                              color: t.type === 'positive' ? '#86efac' : '#f87171',
                            }}
                          >
                            {t.type === 'positive' ? '+' : '-'}{t.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 특화 옵션 */}
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>특성 선택 (5개 중 1개)</div>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
                  {specOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setSelectedSpecOption(option)}
                      style={{
                        padding: '10px 12px',
                        marginBottom: '8px',
                        background: selectedSpecOption?.id === option.id ? 'rgba(134, 239, 172, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                        border: selectedSpecOption?.id === option.id ? '2px solid #86efac' : '1px solid #334155',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                        {option.traits.map(trait => (
                          <span
                            key={trait.id}
                            style={{
                              fontSize: '0.75rem',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: trait.type === 'positive' ? 'rgba(134, 239, 172, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                              color: trait.type === 'positive' ? '#86efac' : '#f87171',
                              border: `1px solid ${trait.type === 'positive' ? 'rgba(134, 239, 172, 0.4)' : 'rgba(248, 113, 113, 0.4)'}`,
                            }}
                          >
                            {trait.type === 'positive' ? '+' : '-'}{trait.name} ({'★'.repeat(trait.weight)})
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {option.traits.map(t => t.description).join(' / ')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 특화 버튼 */}
                <button
                  onClick={handleSpecialize}
                  disabled={!selectedSpecOption}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: selectedSpecOption
                      ? 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)'
                      : '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: selectedSpecOption ? 'pointer' : 'not-allowed',
                    opacity: selectedSpecOption ? 1 : 0.5,
                  }}
                >
                  ✨ 특화하기 (무료)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 스탯 뱃지 */
function StatBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span style={{
      fontSize: '0.75rem',
      padding: '4px 10px',
      borderRadius: '6px',
      background: `${color}20`,
      color: color,
      border: `1px solid ${color}40`,
      fontWeight: 600,
    }}>
      {label}: {value}
    </span>
  );
}
