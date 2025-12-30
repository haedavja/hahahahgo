/**
 * CardGrowthModal.tsx
 * 카드 성장 전용 모달 (강화/특화를 한 화면에서 확인 가능)
 */

import { useState, useMemo } from 'react';
import { CARDS, TRAITS } from '../../battle/battleData';
import { generateSpecializationOptions, type SpecializationOption } from '../../../lib/specializationUtils';
import type { CardGrowthState } from '../../../state/slices/types';
import {
  getAllEnhancementLevels,
  getEnhancementColor,
  getEnhancementLabel,
  isEnhanceable,
  calculateEnhancedStats,
} from '../../../lib/cardEnhancementUtils';

interface CardGrowthModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardGrowth: Record<string, CardGrowthState>;
  onEnhance: (cardId: string) => void;
  onSpecialize: (cardId: string, selectedTraits: string[]) => void;
}

interface CardData {
  id: string;
  name: string;
  description?: string;
  type?: string;
  damage?: number;
  block?: number;
  speedCost: number;
  actionCost: number;
  hits?: number;
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
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const [showSpecOptions, setShowSpecOptions] = useState(false);
  const [specOptions, setSpecOptions] = useState<SpecializationOption[]>([]);
  const [selectedSpecOption, setSelectedSpecOption] = useState<SpecializationOption | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  const cards = CARDS || [];

  // 검색 필터링
  const filteredCards = useMemo(() => {
    return (cards as CardData[]).filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [cards, searchTerm]);

  const getCardGrowthState = (cardId: string): CardGrowthState => {
    return cardGrowth[cardId] || { rarity: 'common', growthCount: 0, enhancementLevel: 0, specializationCount: 0, traits: [] };
  };

  const selectedCard = cards.find((c: { id: string }) => c.id === selectedCardId) as CardData | undefined;
  const selectedGrowth = selectedCardId ? getCardGrowthState(selectedCardId) : null;
  const currentLevel = selectedGrowth?.enhancementLevel || 0;

  // 카드 선택 시
  const handleSelectCard = (cardId: string) => {
    setSelectedCardId(cardId);
    setPreviewLevel(null);
    setShowSpecOptions(false);
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
    setPreviewLevel(null);
  };

  // 특화 버튼 클릭
  const handleOpenSpecialize = () => {
    if (!selectedCardId) return;
    const growth = getCardGrowthState(selectedCardId);
    const options = generateSpecializationOptions(growth.traits);
    setSpecOptions(options);
    setShowSpecOptions(true);
    setSelectedSpecOption(null);
  };

  // 특화 실행
  const handleSpecialize = () => {
    if (!selectedCardId || !selectedSpecOption) return;

    const traitIds = selectedSpecOption.traits.map(t => t.id);
    onSpecialize(selectedCardId, traitIds);

    const traitNames = selectedSpecOption.traits.map(t => t.name).join(', ');
    showNotification(`${selectedCard?.name} 특화 성공! [${traitNames}]`, 'specialize');

    setShowSpecOptions(false);
    setSelectedSpecOption(null);
  };

  if (!isOpen) return null;

  const canEnhance = selectedCardId && isEnhanceable(selectedCardId) && currentLevel < 5;
  const canSpecialize = selectedCardId && selectedGrowth?.rarity !== 'legendary';
  const allLevels = selectedCardId ? getAllEnhancementLevels(selectedCardId) : [];

  // 현재 스탯과 미리보기 스탯
  const currentStats = selectedCardId && currentLevel > 0 ? calculateEnhancedStats(selectedCardId, currentLevel) : null;
  const previewStats = selectedCardId && previewLevel ? calculateEnhancedStats(selectedCardId, previewLevel) : null;

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
            <h2 style={{ margin: 0, color: '#fbbf24', fontSize: '1.5rem' }}>카드 성장</h2>
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
            overflow: 'auto',
          }}>
            <h3 style={{ color: '#60a5fa', margin: '0 0 16px', fontSize: '1.125rem' }}>강화</h3>

            {!selectedCard ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                왼쪽에서 카드를 선택하세요
              </div>
            ) : !canEnhance ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                {currentLevel >= 5 ? '최대 강화 레벨입니다' : '이 카드는 강화할 수 없습니다'}
              </div>
            ) : (
              <>
                {/* 강화 단계 버튼 */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>강화 단계 (클릭하여 미리보기)</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {allLevels.map((level) => {
                      const isCompleted = level.level <= currentLevel;
                      const isNext = level.level === currentLevel + 1;
                      const isPreviewing = previewLevel === level.level;

                      return (
                        <button
                          key={level.level}
                          onClick={() => setPreviewLevel(isPreviewing ? null : level.level)}
                          style={{
                            flex: 1,
                            height: '40px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            background: isCompleted
                              ? getEnhancementColor(level.level)
                              : isPreviewing
                                ? 'rgba(96, 165, 250, 0.4)'
                                : isNext
                                  ? 'rgba(96, 165, 250, 0.2)'
                                  : 'rgba(71, 85, 105, 0.3)',
                            color: isCompleted ? '#0f172a' : isPreviewing ? '#fff' : '#9ca3af',
                            border: level.isMilestone
                              ? '2px solid rgba(251, 191, 36, 0.7)'
                              : isPreviewing
                                ? '2px solid #60a5fa'
                                : '1px solid rgba(71, 85, 105, 0.5)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {level.level}{level.isMilestone ? '★' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 현재 vs 미리보기 비교 */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                }}>
                  {/* 현재 상태 */}
                  <div style={{
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '6px' }}>현재</div>
                    <div style={{ fontSize: '1rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '8px' }}>
                      {selectedCard.name}
                      {currentLevel > 0 && (
                        <span style={{
                          marginLeft: '6px',
                          fontSize: '0.75rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: getEnhancementColor(currentLevel),
                          color: '#0f172a',
                        }}>
                          {getEnhancementLabel(currentLevel)}
                        </span>
                      )}
                    </div>
                    <CardStatDisplay card={selectedCard} stats={currentStats} />
                  </div>

                  {/* 미리보기 상태 */}
                  <div style={{
                    padding: '12px',
                    background: previewLevel ? 'rgba(96, 165, 250, 0.1)' : 'rgba(15, 23, 42, 0.3)',
                    borderRadius: '8px',
                    border: previewLevel ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid #334155',
                  }}>
                    <div style={{ fontSize: '0.7rem', color: previewLevel ? '#60a5fa' : '#64748b', marginBottom: '6px' }}>
                      {previewLevel ? `+${previewLevel} 강화 시` : '미리보기'}
                    </div>
                    {previewLevel ? (
                      <>
                        <div style={{ fontSize: '1rem', color: '#e2e8f0', fontWeight: 600, marginBottom: '8px' }}>
                          {selectedCard.name}
                          <span style={{
                            marginLeft: '6px',
                            fontSize: '0.75rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: getEnhancementColor(previewLevel),
                            color: '#0f172a',
                          }}>
                            {getEnhancementLabel(previewLevel)}
                          </span>
                        </div>
                        <CardStatDisplay card={selectedCard} stats={previewStats} />
                      </>
                    ) : (
                      <div style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        위 버튼을 클릭하세요
                      </div>
                    )}
                  </div>
                </div>

                {/* 변경 사항 요약 */}
                {previewLevel && previewStats && (
                  <div style={{
                    padding: '10px 12px',
                    background: 'rgba(96, 165, 250, 0.1)',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '0.8rem',
                  }}>
                    <span style={{ color: '#94a3b8' }}>변경: </span>
                    <span style={{ color: '#60a5fa' }}>
                      {getChangeSummary(currentStats, previewStats)}
                    </span>
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
                    +{currentLevel + 1} 강화하기 (무료)
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
            overflow: 'auto',
          }}>
            <h3 style={{ color: '#86efac', margin: '0 0 16px', fontSize: '1.125rem' }}>특화</h3>

            {!selectedCard ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                왼쪽에서 카드를 선택하세요
              </div>
            ) : !canSpecialize ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                전설 등급은 더 이상 특화할 수 없습니다
              </div>
            ) : !showSpecOptions ? (
              /* 특화 버튼만 표시 */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* 현재 특성 */}
                {selectedGrowth && selectedGrowth.traits.length > 0 && (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>현재 보유 특성</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedGrowth.traits.map(tid => {
                        const t = TRAITS[tid as keyof typeof TRAITS];
                        if (!t) return null;
                        return (
                          <span
                            key={tid}
                            style={{
                              fontSize: '0.8rem',
                              padding: '4px 10px',
                              borderRadius: '6px',
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

                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '12px' }}>
                      랜덤 특성 5개 중 1개를 선택하여 부여합니다
                    </div>
                    <button
                      onClick={handleOpenSpecialize}
                      style={{
                        padding: '14px 32px',
                        background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      특화 진행하기
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* 특화 옵션 표시 */
              <>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
                  5개 중 1개 선택
                </div>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
                  {specOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => setSelectedSpecOption(option)}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        background: selectedSpecOption?.id === option.id ? 'rgba(134, 239, 172, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                        border: selectedSpecOption?.id === option.id ? '2px solid #86efac' : '1px solid #334155',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                        {option.traits.map(trait => (
                          <span
                            key={trait.id}
                            style={{
                              fontSize: '0.85rem',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: trait.type === 'positive' ? 'rgba(134, 239, 172, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                              color: trait.type === 'positive' ? '#86efac' : '#f87171',
                              border: `1px solid ${trait.type === 'positive' ? 'rgba(134, 239, 172, 0.4)' : 'rgba(248, 113, 113, 0.4)'}`,
                              fontWeight: 600,
                            }}
                          >
                            {trait.type === 'positive' ? '+' : '-'}{trait.name}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {option.traits.map(t => t.description).join(' / ')}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setShowSpecOptions(false);
                      setSelectedSpecOption(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#334155',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSpecialize}
                    disabled={!selectedSpecOption}
                    style={{
                      flex: 2,
                      padding: '12px',
                      background: selectedSpecOption
                        ? 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)'
                        : '#334155',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: selectedSpecOption ? 'pointer' : 'not-allowed',
                      opacity: selectedSpecOption ? 1 : 0.5,
                    }}
                  >
                    특화 적용
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 카드 스탯 표시 컴포넌트 */
function CardStatDisplay({ card, stats }: { card: CardData; stats: ReturnType<typeof calculateEnhancedStats> | null }) {
  const damage = (card.damage || 0) + (stats?.damageBonus || 0);
  const block = (card.block || 0) + (stats?.blockBonus || 0);
  const speed = Math.max(0, card.speedCost - (stats?.speedCostReduction || 0));
  const action = Math.max(0, card.actionCost - (stats?.actionCostReduction || 0));
  const hits = (card.hits || 1) + (stats?.hitsBonus || 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem' }}>
      {card.damage !== undefined && card.damage > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>피해</span>
          <span style={{ color: stats?.damageBonus ? '#f87171' : '#e2e8f0', fontWeight: 600 }}>
            {damage}{hits > 1 ? ` x${hits}` : ''}
          </span>
        </div>
      )}
      {card.block !== undefined && card.block > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#94a3b8' }}>방어</span>
          <span style={{ color: stats?.blockBonus ? '#60a5fa' : '#e2e8f0', fontWeight: 600 }}>{block}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8' }}>속도</span>
        <span style={{ color: stats?.speedCostReduction ? '#4ade80' : '#e2e8f0', fontWeight: 600 }}>{speed}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#94a3b8' }}>행동력</span>
        <span style={{ color: stats?.actionCostReduction ? '#fbbf24' : '#e2e8f0', fontWeight: 600 }}>{action}</span>
      </div>
    </div>
  );
}

/** 변경 사항 요약 생성 */
function getChangeSummary(
  current: ReturnType<typeof calculateEnhancedStats> | null,
  preview: ReturnType<typeof calculateEnhancedStats> | null
): string {
  if (!preview) return '';

  const changes: string[] = [];
  const currDamage = current?.damageBonus || 0;
  const currBlock = current?.blockBonus || 0;
  const currSpeed = current?.speedCostReduction || 0;
  const currAction = current?.actionCostReduction || 0;
  const currHits = current?.hitsBonus || 0;

  if (preview.damageBonus > currDamage) changes.push(`피해 +${preview.damageBonus - currDamage}`);
  if (preview.blockBonus > currBlock) changes.push(`방어 +${preview.blockBonus - currBlock}`);
  if (preview.speedCostReduction > currSpeed) changes.push(`속도 -${preview.speedCostReduction - currSpeed}`);
  if (preview.actionCostReduction > currAction) changes.push(`행동력 -${preview.actionCostReduction - currAction}`);
  if (preview.hitsBonus > currHits) changes.push(`타격 +${preview.hitsBonus - currHits}`);

  return changes.length > 0 ? changes.join(', ') : '변경 없음';
}
