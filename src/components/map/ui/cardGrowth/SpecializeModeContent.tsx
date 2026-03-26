/**
 * @file SpecializeModeContent.tsx
 * @description 특화 모드 UI 컴포넌트
 */

import { memo } from 'react';
import type { FC } from 'react';
import { GameCardDisplay, type CardData } from '../../../common/card';
import { calculateEnhancedStats } from '../../../../lib/cardEnhancementUtils';
import type { SpecializationOption } from '../../../../lib/specializationUtils';
import { CARD_COMPARISON_GRID, ARROW_STYLE, EMPTY_CARD_PLACEHOLDER, SPEC_OPTION_STYLE, TRAIT_BADGE_STYLE } from './cardGrowthStyles';
import type { CardGrowthState } from '../../../../state/slices/types';

interface SpecializeModeContentProps {
  selectedCard: CardData;
  selectedGrowth: CardGrowthState;
  currentLevel: number;
  specOptions: SpecializationOption[];
  selectedSpecOption: SpecializationOption | null;
  setSelectedSpecOption: (option: SpecializationOption) => void;
  onSpecialize: () => void;
  onTraitHover: (traitId: string | null, x: number, y: number) => void;
}

export const SpecializeModeContent: FC<SpecializeModeContentProps> = memo(function SpecializeModeContent({
  selectedCard,
  selectedGrowth,
  currentLevel,
  specOptions,
  selectedSpecOption,
  setSelectedSpecOption,
  onSpecialize,
  onTraitHover,
}) {
  const currentStats = currentLevel > 0 ? calculateEnhancedStats(selectedCard.id, currentLevel) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 카드 비교 */}
      <div style={CARD_COMPARISON_GRID}>
        {/* 현재 카드 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            현재
          </div>
          <GameCardDisplay
            card={selectedCard}
            growth={selectedGrowth}
            stats={currentStats}
            enhancementLevel={currentLevel}
            onTraitHover={(traitId, x, y) => onTraitHover(traitId, x, y)}
          />
        </div>

        {/* 화살표 */}
        <div style={{
          ...ARROW_STYLE,
          color: selectedSpecOption ? '#86efac' : '#475569',
        }}>
          →
        </div>

        {/* 미리보기 카드 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '0.875rem', color: selectedSpecOption ? '#86efac' : '#64748b' }}>
            {selectedSpecOption ? '특화 적용 시' : '옵션 선택'}
          </div>
          {selectedSpecOption ? (
            <GameCardDisplay
              card={selectedCard}
              growth={selectedGrowth}
              stats={currentStats}
              enhancementLevel={currentLevel}
              isPreview
              overrideTraits={[
                ...(selectedGrowth.traits || []),
                ...selectedSpecOption.traits.map(t => t.id)
              ]}
              previewBorderColor="#86efac"
              onTraitHover={(traitId, x, y) => onTraitHover(traitId, x, y)}
            />
          ) : (
            <div style={EMPTY_CARD_PLACEHOLDER}>
              아래에서 특화<br/>옵션을 선택하세요
            </div>
          )}
        </div>
      </div>

      {/* 특화 옵션 */}
      <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '4px' }}>
        {specOptions.length}개 중 1개를 선택하세요
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {specOptions.map((option) => {
          const isStoredTrait = option.id.startsWith('stored_');
          const isSelected = selectedSpecOption?.id === option.id;

          return (
            <div
              key={option.id}
              onClick={() => setSelectedSpecOption(option)}
              style={{
                ...SPEC_OPTION_STYLE(isSelected),
                ...(isStoredTrait && !isSelected ? {
                  background: 'rgba(134, 239, 172, 0.08)',
                  borderColor: '#86efac',
                } : {}),
              }}
            >
              {/* 보유 특성 라벨 */}
              {isStoredTrait && (
                <div style={{
                  fontSize: '0.75rem',
                  color: '#86efac',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}>
                  📦 보유 특성 (사용 시 소모됨)
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                {option.traits.map(trait => (
                  <span
                    key={trait.id}
                    style={{
                      ...TRAIT_BADGE_STYLE(trait.type === 'positive'),
                      ...(isStoredTrait && trait.type === 'positive' ? {
                        background: 'rgba(134, 239, 172, 0.3)',
                        borderColor: '#86efac',
                      } : {}),
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
          );
        })}
      </div>

      {/* 특화 버튼 */}
      <button
        onClick={onSpecialize}
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
  );
});
