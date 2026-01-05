/**
 * CardGrowthModal.tsx
 * 카드 승급 전용 모달
 *
 * UI 흐름:
 * 1. 보유 카드 중 선택 + 강화/특화 버튼 선택
 * 2. 선택한 모드로 진입 (취소 불가)
 * 3. 강화: 전투 화면 스타일 카드로 현재/미리보기 표시
 * 4. 특화: 5개 옵션 중 선택
 *
 * 리팩토링: 컴포넌트 분리 (EnhanceModeContent, SpecializeModeContent, etc.)
 */

import { useState, useMemo, memo, useCallback } from 'react';
import { CARDS, TRAITS } from '../../battle/battleData';
import { generateSpecializationOptions, type SpecializationOption, type CardType } from '../../../lib/specializationUtils';
import type { CardGrowthState } from '../../../state/slices/types';
import { isEnhanceable } from '../../../lib/cardEnhancementUtils';
import type { CardData } from '../../common/card';
import { useGameStore } from '../../../state/gameStore';
import {
  MODAL_OVERLAY,
  MODAL_CONTAINER,
  getHeaderBackground,
  getHeaderColor,
} from './cardGrowth';
import { TraitTooltip } from './cardGrowth/TraitTooltip';
import { CardSelectionGrid } from './cardGrowth/CardSelectionGrid';
import { EnhanceModeContent } from './cardGrowth/EnhanceModeContent';
import { SpecializeModeContent } from './cardGrowth/SpecializeModeContent';

interface CardGrowthModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardGrowth: Record<string, CardGrowthState>;
  onEnhance: (cardId: string) => void;
  onSpecialize: (cardId: string, selectedTraits: string[]) => void;
  ownedCards?: string[];
  isRestNode?: boolean;
}

type Mode = 'select' | 'enhance' | 'specialize';

export const CardGrowthModal = memo(function CardGrowthModal({
  isOpen,
  onClose,
  cardGrowth,
  onEnhance,
  onSpecialize,
  ownedCards = [],
  isRestNode = false,
}: CardGrowthModalProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('select');
  const [previewLevel, setPreviewLevel] = useState<number | null>(null);
  const [specOptions, setSpecOptions] = useState<SpecializationOption[]>([]);
  const [selectedSpecOption, setSelectedSpecOption] = useState<SpecializationOption | null>(null);
  const [hoveredTrait, setHoveredTrait] = useState<{ traitId: string; x: number; y: number } | null>(null);
  const [useStoredTraitId, setUseStoredTraitId] = useState<string | null>(null);

  // 보유 특성 조회
  const storedTraits = useGameStore((state) => state.storedTraits ?? []);
  const useStoredTraitAction = useGameStore((state) => state.useStoredTrait);

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

  const getCardGrowthState = useCallback((cardId: string): CardGrowthState => {
    return cardGrowth[cardId] || { rarity: 'common', growthCount: 0, enhancementLevel: 0, specializationCount: 0, traits: [] };
  }, [cardGrowth]);

  const selectedCard = CARDS.find((c: { id: string }) => c.id === selectedCardId) as CardData | undefined;
  const selectedGrowth = selectedCardId ? getCardGrowthState(selectedCardId) : null;
  const currentLevel = selectedGrowth?.enhancementLevel || 0;

  // 카드 선택
  const handleSelectCard = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
    setPreviewLevel(null);
  }, []);

  // 강화 모드 진입
  const enterEnhanceMode = useCallback(() => {
    if (!selectedCardId) return;
    const growth = getCardGrowthState(selectedCardId);
    setMode('enhance');
    setPreviewLevel(Math.min((growth.enhancementLevel || 0) + 1, 5));
  }, [selectedCardId, getCardGrowthState]);

  // 특화 모드 진입
  const enterSpecializeMode = useCallback(() => {
    if (!selectedCardId || !selectedCard) return;
    const growth = getCardGrowthState(selectedCardId);
    const cardType: CardType = selectedCard.type === 'attack' ? 'attack' :
                               selectedCard.type === 'defense' ? 'defense' : 'general';
    const options = generateSpecializationOptions(growth.traits, cardType);

    // 보유 특성을 선택지 맨 앞에 추가 (이미 카드에 있는 특성은 제외)
    const storedTraitOptions: SpecializationOption[] = storedTraits
      .filter(traitId => !growth.traits.includes(traitId))
      .map(traitId => {
        const trait = TRAITS[traitId as keyof typeof TRAITS];
        if (!trait) return null;
        return {
          id: `stored_${traitId}`,
          traits: [trait as { id: string; name: string; type: 'positive' | 'negative'; weight: number; description: string }],
          totalWeight: trait.weight,
          description: `[보유] ${trait.name}: ${trait.description}`,
          isStored: true, // 마커
        };
      })
      .filter((opt): opt is SpecializationOption & { isStored: boolean } => opt !== null);

    setSpecOptions([...storedTraitOptions, ...options].slice(0, 8)); // 최대 8개까지 표시
    setSelectedSpecOption(null);
    setUseStoredTraitId(null);
    setMode('specialize');
  }, [selectedCardId, selectedCard, getCardGrowthState, storedTraits]);

  // 모달 닫기 핸들러
  const handleClose = useCallback(() => {
    setMode('select');
    setSelectedCardId(null);
    setPreviewLevel(null);
    setSelectedSpecOption(null);
    setSpecOptions([]);
    onClose();
  }, [onClose]);

  // 강화 실행
  const handleEnhance = useCallback(() => {
    if (!selectedCardId) return;
    const growth = getCardGrowthState(selectedCardId);
    if (growth.enhancementLevel >= 5) return;
    onEnhance(selectedCardId);
    handleClose();
  }, [selectedCardId, getCardGrowthState, onEnhance, handleClose]);

  // 특화 실행
  const handleSpecialize = useCallback(() => {
    if (!selectedCardId || !selectedSpecOption) return;
    const traitIds = selectedSpecOption.traits.map(t => t.id);

    // 보유 특성을 사용한 경우 해당 특성을 소모
    if (selectedSpecOption.id.startsWith('stored_')) {
      traitIds.forEach(traitId => {
        if (storedTraits.includes(traitId)) {
          useStoredTraitAction(traitId);
        }
      });
    }

    onSpecialize(selectedCardId, traitIds);
    handleClose();
  }, [selectedCardId, selectedSpecOption, onSpecialize, handleClose, storedTraits, useStoredTraitAction]);

  // 특성 호버 핸들러
  const handleTraitHover = useCallback((traitId: string | null, x: number, y: number) => {
    setHoveredTrait(traitId ? { traitId, x, y } : null);
  }, []);

  if (!isOpen) return null;

  const canEnhance = selectedCardId && isEnhanceable(selectedCardId) && currentLevel < 5;
  const canSpecialize = selectedCardId && selectedGrowth?.rarity !== 'legendary';

  return (
    <div
      style={MODAL_OVERLAY}
      onClick={mode === 'select' ? handleClose : undefined}
    >
      <div
        style={MODAL_CONTAINER}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: getHeaderBackground(mode),
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: getHeaderColor(mode),
              fontSize: '1.5rem'
            }}>
              {mode === 'select' ? '🎴 카드 승급' : mode === 'enhance' ? '⚔️ 강화' : '✨ 특화'}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.875rem' }}>
              {mode === 'select'
                ? isRestNode
                  ? '강화 또는 특화 중 1회만 선택 가능'
                  : '카드를 선택하고 강화 또는 특화를 진행하세요'
                : mode === 'enhance'
                  ? `${selectedCard?.name} 강화 (현재 +${currentLevel})`
                  : `${selectedCard?.name} 특화`}
            </p>
          </div>
          {mode === 'select' && (
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
          )}
        </div>

        {/* 메인 컨텐츠 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>

          {/* 선택 모드 */}
          {mode === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <CardSelectionGrid
                cards={displayedCards}
                selectedCardId={selectedCardId}
                getCardGrowthState={getCardGrowthState}
                onSelectCard={handleSelectCard}
              />

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
            </div>
          )}

          {/* 강화 모드 */}
          {mode === 'enhance' && selectedCard && selectedGrowth && (
            <EnhanceModeContent
              selectedCard={selectedCard}
              selectedGrowth={selectedGrowth}
              currentLevel={currentLevel}
              previewLevel={previewLevel}
              setPreviewLevel={setPreviewLevel}
              onEnhance={handleEnhance}
              onTraitHover={handleTraitHover}
            />
          )}

          {/* 특화 모드 */}
          {mode === 'specialize' && selectedCard && selectedGrowth && (
            <SpecializeModeContent
              selectedCard={selectedCard}
              selectedGrowth={selectedGrowth}
              currentLevel={currentLevel}
              specOptions={specOptions}
              selectedSpecOption={selectedSpecOption}
              setSelectedSpecOption={setSelectedSpecOption}
              onSpecialize={handleSpecialize}
              onTraitHover={handleTraitHover}
            />
          )}
        </div>
      </div>

      {/* 특성 툴팁 */}
      {hoveredTrait && (
        <TraitTooltip
          traitId={hoveredTrait.traitId}
          x={hoveredTrait.x}
          y={hoveredTrait.y}
        />
      )}
    </div>
  );
});
