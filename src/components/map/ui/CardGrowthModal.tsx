/**
 * CardGrowthModal.tsx
 * 카드 승급 전용 모달
 *
 * UI 흐름:
 * 1. 보유 카드 중 선택 + 강화/특화 버튼 선택
 * 2. 선택한 모드로 진입 (취소 불가)
 * 3. 강화: 전투 화면 스타일 카드로 현재/미리보기 표시
 * 4. 특화: 5개 옵션 중 선택
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
import { TraitBadgeList } from '../../battle/ui/TraitBadge';
import { Sword, Shield } from '../../battle/ui/BattleIcons';

interface CardGrowthModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardGrowth: Record<string, CardGrowthState>;
  onEnhance: (cardId: string) => void;
  onSpecialize: (cardId: string, selectedTraits: string[]) => void;
  ownedCards?: string[];
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
  traits?: string[];
  icon?: React.ComponentType<{ size: number; className?: string }>;
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

type Mode = 'select' | 'enhance' | 'specialize';

export function CardGrowthModal({
  isOpen,
  onClose,
  cardGrowth,
  onEnhance,
  onSpecialize,
  ownedCards = [],
}: CardGrowthModalProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('select');
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const [specOptions, setSpecOptions] = useState<SpecializationOption[]>([]);
  const [selectedSpecOption, setSelectedSpecOption] = useState<SpecializationOption | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  // 보유 카드만 표시 (중복 제거)
  const uniqueOwnedCardIds = useMemo(() => {
    return [...new Set(ownedCards)];
  }, [ownedCards]);

  const displayedCards = useMemo((): CardData[] => {
    const result: CardData[] = [];
    for (const cardId of uniqueOwnedCardIds) {
      const card = CARDS.find((c: { id: string }) => c.id === cardId);
      if (card) {
        result.push(card as CardData);
      }
    }
    return result;
  }, [uniqueOwnedCardIds]);

  const getCardGrowthState = (cardId: string): CardGrowthState => {
    return cardGrowth[cardId] || { rarity: 'common', growthCount: 0, enhancementLevel: 0, specializationCount: 0, traits: [] };
  };

  const selectedCard = CARDS.find((c: { id: string }) => c.id === selectedCardId) as CardData | undefined;
  const selectedGrowth = selectedCardId ? getCardGrowthState(selectedCardId) : null;
  const currentLevel = selectedGrowth?.enhancementLevel || 0;

  // 카드 선택
  const handleSelectCard = (cardId: string) => {
    setSelectedCardId(cardId);
    setPreviewLevel(null);
  };

  // 알림
  const showNotification = (message: string, type: string) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 2500);
  };

  // 강화 모드 진입
  const enterEnhanceMode = () => {
    if (!selectedCardId) return;
    const growth = getCardGrowthState(selectedCardId);
    setMode('enhance');
    // 자동으로 다음 강화 단계 미리보기 표시
    setPreviewLevel(Math.min((growth.enhancementLevel || 0) + 1, 5));
  };

  // 특화 모드 진입
  const enterSpecializeMode = () => {
    if (!selectedCardId) return;
    const growth = getCardGrowthState(selectedCardId);
    const options = generateSpecializationOptions(growth.traits);
    setSpecOptions(options);
    setSelectedSpecOption(null);
    setMode('specialize');
  };

  // 강화 실행
  const handleEnhance = () => {
    if (!selectedCardId) return;
    const growth = getCardGrowthState(selectedCardId);
    if (growth.enhancementLevel >= 5) return;

    onEnhance(selectedCardId);
    showNotification(`${selectedCard?.name} +${(growth.enhancementLevel || 0) + 1} 강화 완료!`, 'enhance');

    // 완료 후 선택 모드로
    setTimeout(() => {
      setMode('select');
      setPreviewLevel(null);
    }, 1000);
  };

  // 특화 실행
  const handleSpecialize = () => {
    if (!selectedCardId || !selectedSpecOption) return;

    const traitIds = selectedSpecOption.traits.map(t => t.id);
    onSpecialize(selectedCardId, traitIds);

    const traitNames = selectedSpecOption.traits.map(t => t.name).join(', ');
    showNotification(`${selectedCard?.name} 특화 완료! [${traitNames}]`, 'specialize');

    // 완료 후 선택 모드로
    setTimeout(() => {
      setMode('select');
      setSelectedSpecOption(null);
      setSpecOptions([]);
    }, 1000);
  };

  // 모달 닫기 핸들러
  const handleClose = () => {
    setMode('select');
    setSelectedCardId(null);
    setPreviewLevel(null);
    setSelectedSpecOption(null);
    setSpecOptions([]);
    onClose();
  };

  if (!isOpen) return null;

  const canEnhance = selectedCardId && isEnhanceable(selectedCardId) && currentLevel < 5;
  const canSpecialize = selectedCardId && selectedGrowth?.rarity !== 'legendary';
  const allLevels = selectedCardId ? getAllEnhancementLevels(selectedCardId) : [];
  const currentStats = selectedCardId && currentLevel > 0 ? calculateEnhancedStats(selectedCardId, currentLevel) : null;
  const previewStats = selectedCardId && previewLevel ? calculateEnhancedStats(selectedCardId, previewLevel) : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: mode === 'select' ? '900px' : '900px',
          maxHeight: '90vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          border: '2px solid #fbbf24',
          boxShadow: '0 0 40px rgba(251, 191, 36, 0.3)',
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
          background: mode === 'enhance'
            ? 'linear-gradient(135deg, rgba(96, 165, 250, 0.1), transparent)'
            : mode === 'specialize'
              ? 'linear-gradient(135deg, rgba(134, 239, 172, 0.1), transparent)'
              : 'transparent',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: mode === 'enhance' ? '#60a5fa' : mode === 'specialize' ? '#86efac' : '#fbbf24',
              fontSize: '1.5rem'
            }}>
              {mode === 'select' ? '🎴 카드 승급' : mode === 'enhance' ? '⚔️ 강화' : '✨ 특화'}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
              {mode === 'select'
                ? '카드를 선택하고 강화 또는 특화를 진행하세요'
                : mode === 'enhance'
                  ? `${selectedCard?.name} 강화 (현재 +${currentLevel})`
                  : `${selectedCard?.name} 특화`}
            </p>
          </div>
          <button
            onClick={handleClose}
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
            fontSize: '1.1rem',
          }}>
            {notification.type === 'enhance' ? '⚔️' : '✨'} {notification.message}
          </div>
        )}

        {/* 메인 컨텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

          {/* 선택 모드 */}
          {mode === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 보유 카드 없음 */}
              {displayedCards.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#64748b',
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🃏</div>
                  <div style={{ fontSize: '1.1rem' }}>보유한 카드가 없습니다</div>
                </div>
              ) : (
                <>
                  {/* 카드 목록 (캐릭터창 스타일) */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    justifyContent: 'center',
                  }}>
                    {displayedCards.map((card) => {
                      const growth = getCardGrowthState(card.id);
                      const isSelected = card.id === selectedCardId;
                      const isMaxed = growth.rarity === 'legendary' && growth.enhancementLevel >= 5;
                      const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);

                      return (
                        <div
                          key={card.id}
                          onClick={() => !isMaxed && handleSelectCard(card.id)}
                          style={{
                            transform: 'scale(1)',
                            cursor: isMaxed ? 'not-allowed' : 'pointer',
                            opacity: isMaxed ? 0.5 : 1,
                          }}
                        >
                          <div
                            className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
                            style={{
                              boxShadow: isSelected
                                ? '0 0 20px rgba(251, 191, 36, 0.6)'
                                : '0 2px 12px rgba(0, 0, 0, 0.4)',
                              border: isSelected
                                ? '3px solid #fbbf24'
                                : '2px solid #334155',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div className="card-cost-badge-floating" style={{
                              color: '#fff',
                              WebkitTextStroke: '1px #000'
                            }}>
                              {card.actionCost}
                            </div>
                            {/* 강화 레벨 배지 */}
                            {(growth.enhancementLevel || 0) > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                right: '8px',
                                padding: '2px 8px',
                                background: getEnhancementColor(growth.enhancementLevel || 0),
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#0f172a',
                                zIndex: 10,
                              }}>
                                {getEnhancementLabel(growth.enhancementLevel || 0)}
                              </div>
                            )}
                            {/* 희귀도 배지 */}
                            {growth.rarity !== 'common' && (
                              <div style={{
                                position: 'absolute',
                                bottom: '4px',
                                right: '4px',
                                padding: '2px 6px',
                                background: rarityColors[growth.rarity],
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#0f172a',
                                zIndex: 10,
                              }}>
                                {rarityLabels[growth.rarity]}
                              </div>
                            )}
                            <div className="card-stats-sidebar">
                              {card.damage != null && card.damage > 0 && (
                                <div className="card-stat-item attack">
                                  ⚔️{card.damage}{card.hits ? `×${card.hits}` : ''}
                                </div>
                              )}
                              {card.block != null && card.block > 0 && (
                                <div className="card-stat-item defense">🛡️{card.block}</div>
                              )}
                              <div className="card-stat-item speed">⏱️{card.speedCost}</div>
                            </div>
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                              <div className="font-black text-sm" style={{ color: '#fff' }}>
                                {card.name}
                              </div>
                            </div>
                            <div className="card-icon-area">
                              <Icon size={50} className="text-white opacity-80" />
                            </div>
                            <div className="card-footer">
                              {growth.traits && growth.traits.length > 0 && (
                                <TraitBadgeList traits={growth.traits} />
                              )}
                              <span className="card-description">{card.description || ''}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 강화/특화 버튼 */}
                  {selectedCard && (
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '16px',
                      background: 'rgba(15, 23, 42, 0.6)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                    }}>
                      <button
                        onClick={enterEnhanceMode}
                        disabled={!canEnhance}
                        style={{
                          flex: 1,
                          padding: '18px',
                          background: canEnhance
                            ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                            : '#334155',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          cursor: canEnhance ? 'pointer' : 'not-allowed',
                          opacity: canEnhance ? 1 : 0.5,
                        }}
                      >
                        ⚔️ 강화
                        {canEnhance && <span style={{ display: 'block', fontSize: '0.85rem', marginTop: '4px', opacity: 0.8 }}>
                          +{currentLevel} → +{currentLevel + 1}
                        </span>}
                        {!canEnhance && currentLevel >= 5 && <span style={{ display: 'block', fontSize: '0.85rem', marginTop: '4px' }}>최대 레벨</span>}
                      </button>
                      <button
                        onClick={enterSpecializeMode}
                        disabled={!canSpecialize}
                        style={{
                          flex: 1,
                          padding: '18px',
                          background: canSpecialize
                            ? 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)'
                            : '#334155',
                          border: 'none',
                          borderRadius: '10px',
                          color: '#fff',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          cursor: canSpecialize ? 'pointer' : 'not-allowed',
                          opacity: canSpecialize ? 1 : 0.5,
                        }}
                      >
                        ✨ 특화
                        {!canSpecialize && <span style={{ display: 'block', fontSize: '0.85rem', marginTop: '4px' }}>전설 등급</span>}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 강화 모드 */}
          {mode === 'enhance' && selectedCard && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 강화 단계 버튼 */}
              <div>
                <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '10px' }}>
                  강화 단계 선택 (클릭하여 미리보기)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
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
                          height: '48px',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
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
                            ? '3px solid rgba(251, 191, 36, 0.8)'
                            : isPreviewing
                              ? '2px solid #60a5fa'
                              : '1px solid rgba(71, 85, 105, 0.5)',
                          cursor: 'pointer',
                        }}
                      >
                        <span>+{level.level}</span>
                        {(level.level === 1 || level.level === 3 || level.level === 5) && (
                          <span style={{ fontSize: '10px' }}>
                            {level.level === 1 ? '희귀' : level.level === 3 ? '특별' : '전설'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 카드 비교 (전투 화면 스타일) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '24px',
                alignItems: 'start',
              }}>
                {/* 현재 카드 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    현재 {currentLevel > 0 ? `(+${currentLevel})` : ''}
                  </div>
                  <GameCardDisplay
                    card={selectedCard}
                    growth={selectedGrowth!}
                    stats={currentStats}
                    enhancementLevel={currentLevel}
                  />
                </div>

                {/* 화살표 */}
                <div style={{
                  fontSize: '2.5rem',
                  color: previewLevel ? '#60a5fa' : '#475569',
                  transition: 'color 0.2s',
                  marginTop: '100px',
                }}>
                  →
                </div>

                {/* 미리보기 카드 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: previewLevel ? '#60a5fa' : '#64748b' }}>
                    {previewLevel ? `+${previewLevel} 강화 시` : '레벨 선택'}
                  </div>
                  {previewLevel ? (
                    <GameCardDisplay
                      card={selectedCard}
                      growth={selectedGrowth!}
                      stats={previewStats}
                      enhancementLevel={previewLevel}
                      isPreview
                    />
                  ) : (
                    <div style={{
                      width: '155px',
                      height: '200px',
                      background: 'rgba(30, 41, 59, 0.5)',
                      borderRadius: '12px',
                      border: '2px dashed #475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      fontSize: '0.875rem',
                      textAlign: 'center',
                      padding: '16px',
                    }}>
                      위에서 강화 단계를<br/>선택하세요
                    </div>
                  )}
                </div>
              </div>

              {/* 강화 효과 설명 */}
              {previewLevel && allLevels[previewLevel - 1] && (
                <div style={{
                  padding: '14px 18px',
                  background: 'rgba(96, 165, 250, 0.15)',
                  borderRadius: '10px',
                  border: '1px solid rgba(96, 165, 250, 0.3)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#60a5fa', marginBottom: '6px', fontWeight: 600 }}>
                    +{previewLevel} 강화 효과
                  </div>
                  <div style={{ color: '#93c5fd', fontSize: '1rem' }}>
                    {allLevels[previewLevel - 1].description}
                  </div>
                </div>
              )}

              {/* 강화 버튼 */}
              <button
                onClick={handleEnhance}
                style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⚔️ +{currentLevel + 1} 강화하기 (무료)
              </button>
            </div>
          )}

          {/* 특화 모드 */}
          {mode === 'specialize' && selectedCard && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 현재 특성 */}
              {selectedGrowth && selectedGrowth.traits.length > 0 && (
                <div style={{
                  padding: '14px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '10px' }}>현재 보유 특성</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedGrowth.traits.map(tid => {
                      const t = TRAITS[tid as keyof typeof TRAITS];
                      if (!t) return null;
                      return (
                        <span
                          key={tid}
                          style={{
                            fontSize: '0.9rem',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: t.type === 'positive' ? 'rgba(134, 239, 172, 0.2)' : 'rgba(248, 113, 113, 0.2)',
                            color: t.type === 'positive' ? '#86efac' : '#f87171',
                            border: `1px solid ${t.type === 'positive' ? 'rgba(134, 239, 172, 0.4)' : 'rgba(248, 113, 113, 0.4)'}`,
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
              <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '4px' }}>
                5개 중 1개를 선택하세요
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {specOptions.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => setSelectedSpecOption(option)}
                    style={{
                      padding: '14px 18px',
                      background: selectedSpecOption?.id === option.id ? 'rgba(134, 239, 172, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                      border: selectedSpecOption?.id === option.id ? '2px solid #86efac' : '1px solid #334155',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      {option.traits.map(trait => (
                        <span
                          key={trait.id}
                          style={{
                            fontSize: '0.95rem',
                            padding: '5px 12px',
                            borderRadius: '8px',
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
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
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
                  padding: '16px',
                  background: selectedSpecOption
                    ? 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)'
                    : '#334155',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  cursor: selectedSpecOption ? 'pointer' : 'not-allowed',
                  opacity: selectedSpecOption ? 1 : 0.5,
                  marginTop: '8px',
                }}
              >
                ✨ 특화 적용 (무료)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 전투 화면 스타일 카드 디스플레이 (game-card-large CSS 사용) */
function GameCardDisplay({
  card,
  growth,
  stats,
  enhancementLevel,
  isPreview = false,
}: {
  card: CardData;
  growth: CardGrowthState;
  stats: ReturnType<typeof calculateEnhancedStats> | null;
  enhancementLevel: number;
  isPreview?: boolean;
}) {
  const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);
  const damage = (card.damage || 0) + (stats?.damageBonus || 0);
  const block = (card.block || 0) + (stats?.blockBonus || 0);
  const speed = Math.max(0, card.speedCost - (stats?.speedCostReduction || 0));
  const action = Math.max(0, card.actionCost - (stats?.actionCostReduction || 0));
  const hits = (card.hits || 1) + (stats?.hitsBonus || 0);

  return (
    <div
      className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
      style={{
        boxShadow: isPreview
          ? '0 0 20px rgba(96, 165, 250, 0.5)'
          : '0 2px 12px rgba(0, 0, 0, 0.4)',
        border: isPreview
          ? '3px solid #60a5fa'
          : '2px solid #334155',
        transition: 'all 0.15s',
      }}
    >
      {/* 행동력 배지 */}
      <div className="card-cost-badge-floating" style={{
        color: '#fff',
        WebkitTextStroke: '1px #000'
      }}>
        {action}
      </div>

      {/* 강화 레벨 배지 */}
      {enhancementLevel > 0 && (
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '8px',
          padding: '2px 8px',
          background: getEnhancementColor(enhancementLevel),
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: 700,
          color: '#0f172a',
          zIndex: 10,
        }}>
          {getEnhancementLabel(enhancementLevel)}
        </div>
      )}

      {/* 스탯 사이드바 */}
      <div className="card-stats-sidebar">
        {card.damage != null && card.damage > 0 && (
          <div className="card-stat-item attack" style={{
            color: stats?.damageBonus ? '#fca5a5' : undefined,
          }}>
            ⚔️{damage}{hits > 1 ? `×${hits}` : ''}
          </div>
        )}
        {card.block != null && card.block > 0 && (
          <div className="card-stat-item defense" style={{
            color: stats?.blockBonus ? '#93c5fd' : undefined,
          }}>
            🛡️{block}
          </div>
        )}
        <div className="card-stat-item speed" style={{
          color: stats?.speedCostReduction ? '#86efac' : undefined,
        }}>
          ⏱️{speed}
        </div>
      </div>

      {/* 카드 헤더 */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="font-black text-sm" style={{ color: '#fff' }}>
          {card.name}
        </div>
      </div>

      {/* 아이콘 영역 */}
      <div className="card-icon-area">
        <Icon size={50} className="text-white opacity-80" />
      </div>

      {/* 푸터 영역 */}
      <div className="card-footer">
        {growth.traits && growth.traits.length > 0 && (
          <TraitBadgeList traits={growth.traits} />
        )}
        <span className="card-description">{card.description || ''}</span>
      </div>
    </div>
  );
}

