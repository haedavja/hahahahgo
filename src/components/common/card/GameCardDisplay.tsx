/**
 * @file GameCardDisplay.tsx
 * @description 전투 화면 스타일 카드 디스플레이 (game-card-large CSS 사용)
 */

import { memo } from 'react';
import { TRAITS } from '../../battle/battleData';
import {
  getEnhancementColor,
  getEnhancementLabel,
  getEnhancedCard,
  calculateEnhancedStats,
} from '../../../lib/cardEnhancementUtils';
import { Sword, Shield } from '../../battle/ui/BattleIcons';
import type { CardGrowthState } from '../../../state/slices/types';

export interface CardData {
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

interface GameCardDisplayProps {
  card: CardData;
  growth: CardGrowthState;
  stats: ReturnType<typeof calculateEnhancedStats> | null;
  enhancementLevel: number;
  isPreview?: boolean;
  overrideTraits?: string[];
  previewBorderColor?: string;
  onTraitHover?: (traitId: string | null, x: number, y: number) => void;
}

export const GameCardDisplay = memo(function GameCardDisplay({
  card,
  growth,
  stats,
  enhancementLevel,
  isPreview = false,
  overrideTraits,
  previewBorderColor,
  onTraitHover,
}: GameCardDisplayProps) {
  const Icon = card.icon || (card.type === 'attack' ? Sword : Shield);
  const damage = (card.damage || 0) + (stats?.damageBonus || 0);
  const block = (card.block || 0) + (stats?.blockBonus || 0);
  const speed = Math.max(0, card.speedCost - (stats?.speedCostReduction || 0));
  const action = Math.max(0, card.actionCost - (stats?.actionCostReduction || 0));
  const hits = (card.hits || 1) + (stats?.hitsBonus || 0);

  // 강화 레벨에 따른 설명 텍스트
  const description = enhancementLevel > 0
    ? getEnhancedCard(card as Parameters<typeof getEnhancedCard>[0], enhancementLevel).description || card.description
    : card.description;

  // 특성 계산
  const displayTraits = calculateDisplayTraits(growth, stats, overrideTraits);
  const borderColor = previewBorderColor || '#60a5fa';

  return (
    <div
      className={`game-card-large no-hover ${card.type === 'attack' ? 'attack' : 'defense'}`}
      style={{
        boxShadow: isPreview
          ? `0 0 20px ${borderColor}80`
          : '0 2px 12px rgba(0, 0, 0, 0.4)',
        border: isPreview
          ? `3px solid ${borderColor}`
          : '2px solid #334155',
        transition: 'all 0.15s',
        pointerEvents: 'none',
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
        <EnhancementBadge level={enhancementLevel} />
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
        {displayTraits && displayTraits.length > 0 && (
          <TraitList traits={displayTraits} onTraitHover={onTraitHover} />
        )}
        <span className="card-description">{description || ''}</span>
      </div>
    </div>
  );
});

// ========================================
// 헬퍼 컴포넌트
// ========================================

const EnhancementBadge = memo(function EnhancementBadge({ level }: { level: number }) {
  return (
    <div style={{
      position: 'absolute',
      top: '4px',
      right: '8px',
      padding: '2px 8px',
      background: getEnhancementColor(level),
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 700,
      color: '#0f172a',
      zIndex: 10,
    }}>
      {getEnhancementLabel(level)}
    </div>
  );
});

interface TraitListProps {
  traits: string[];
  onTraitHover?: (traitId: string | null, x: number, y: number) => void;
}

const TraitList = memo(function TraitList({ traits, onTraitHover }: TraitListProps) {
  return (
    <div style={{ pointerEvents: 'auto', display: 'flex', gap: '4px', flexWrap: 'wrap', fontWeight: 600 }}>
      {traits.map((traitId: string) => {
        const trait = TRAITS[traitId as keyof typeof TRAITS];
        if (!trait) return null;
        const isPositive = trait.type === 'positive';
        const color = isPositive ? '#22c55e' : '#ef4444';
        const background = isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';

        return (
          <span
            key={traitId}
            onMouseEnter={(e) => {
              if (onTraitHover) {
                const rect = e.currentTarget.getBoundingClientRect();
                onTraitHover(traitId, rect.left + rect.width / 2, rect.top);
              }
            }}
            onMouseLeave={() => onTraitHover?.(null, 0, 0)}
            style={{
              color,
              background,
              padding: '2px 6px',
              borderRadius: '4px',
              border: `1px solid ${color}`,
              cursor: 'pointer',
            }}
          >
            {trait.name}
          </span>
        );
      })}
    </div>
  );
});

// ========================================
// 헬퍼 함수
// ========================================

function calculateDisplayTraits(
  growth: CardGrowthState,
  stats: ReturnType<typeof calculateEnhancedStats> | null,
  overrideTraits?: string[]
): string[] {
  if (overrideTraits) {
    return overrideTraits;
  }

  // 기본 특성에서 시작
  const baseTraits = [...(growth.traits || [])];
  // 강화로 제거되는 특성 제외
  const afterRemoval = baseTraits.filter(t => !stats?.removedTraits?.includes(t));
  // 강화로 추가되는 특성 추가 (중복 방지)
  const addedTraits = stats?.addedTraits || [];
  return [...afterRemoval, ...addedTraits.filter(t => !afterRemoval.includes(t))];
}

export default GameCardDisplay;
