/**
 * @file EnhanceModeContent.tsx
 * @description 강화 모드 UI 컴포넌트
 */

import { memo } from 'react';
import type { FC } from 'react';
import { GameCardDisplay, type CardData } from '../../../common/card';
import {
  getAllEnhancementLevels,
  getEnhancementColor,
  calculateEnhancedStats,
  getEnhancementDifference,
} from '../../../../lib/cardEnhancementUtils';
import { CARD_COMPARISON_GRID, ARROW_STYLE, EMPTY_CARD_PLACEHOLDER, ENHANCEMENT_INFO_BOX } from './cardGrowthStyles';
import type { CardGrowthState } from '../../../../state/slices/types';

interface EnhanceModeContentProps {
  selectedCard: CardData;
  selectedGrowth: CardGrowthState;
  currentLevel: number;
  previewLevel: number | null;
  setPreviewLevel: (level: number | null) => void;
  onEnhance: () => void;
  onTraitHover: (traitId: string | null, x: number, y: number) => void;
}

export const EnhanceModeContent: FC<EnhanceModeContentProps> = memo(function EnhanceModeContent({
  selectedCard,
  selectedGrowth,
  currentLevel,
  previewLevel,
  setPreviewLevel,
  onEnhance,
  onTraitHover,
}) {
  const allLevels = getAllEnhancementLevels(selectedCard.id);
  const currentStats = currentLevel > 0 ? calculateEnhancedStats(selectedCard.id, currentLevel) : null;
  const previewStats = previewLevel ? calculateEnhancedStats(selectedCard.id, previewLevel) : null;

  return (
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

      {/* 카드 비교 */}
      <div style={CARD_COMPARISON_GRID}>
        {/* 현재 카드 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            현재 {currentLevel > 0 ? `(+${currentLevel})` : ''}
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
          color: previewLevel ? '#60a5fa' : '#475569',
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
              growth={selectedGrowth}
              stats={previewStats}
              enhancementLevel={previewLevel}
              isPreview
              onTraitHover={(traitId, x, y) => onTraitHover(traitId, x, y)}
            />
          ) : (
            <div style={EMPTY_CARD_PLACEHOLDER}>
              위에서 강화 단계를<br/>선택하세요
            </div>
          )}
        </div>
      </div>

      {/* 강화 효과 설명 */}
      {previewLevel && (
        <div style={ENHANCEMENT_INFO_BOX}>
          <div style={{ fontSize: '0.9rem', color: '#60a5fa', marginBottom: '6px', fontWeight: 600 }}>
            {currentLevel > 0 ? `+${currentLevel} → +${previewLevel}` : `+${previewLevel}`} 강화 효과
          </div>
          <div style={{ color: '#93c5fd', fontSize: '1rem' }}>
            {getEnhancementDifference(selectedCard.id, currentLevel, previewLevel) || '변경 없음'}
          </div>
        </div>
      )}

      {/* 강화 버튼 */}
      <button
        onClick={onEnhance}
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
  );
});
