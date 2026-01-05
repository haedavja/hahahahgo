/**
 * BattleTooltips.tsx
 *
 * 특성 툴팁 & 통찰 툴팁 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출 + useMemo
 */

import { FC, memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { CARDS } from '../battleData';
import { TRAITS } from '../battleData';
import { applyTraitModifiers } from '../utils/battleUtils';
import { TOKENS, TOKEN_CATEGORIES } from '../../../data/tokens';
import { getEnhancementColor, getEnhancementLabel } from '../../../lib/cardEnhancementUtils';
import type { Card as FullCard } from '../../../types';
import type {
  HoveredEnemyAction,
  InsightReveal,
  TooltipCard as Card,
  HoveredCard,
  TooltipBattle as Battle,
} from '../../../types';
import type { EnhancedCardStats } from '../../../lib/cardEnhancementUtils';

// =====================
// 스타일 상수
// =====================

const TOOLTIP_BASE_STYLE: CSSProperties = {
  background: 'rgba(0, 0, 0, 0.95)',
  border: '2px solid #fbbf24',
  borderRadius: '12px',
  padding: '18px 24px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.9)',
  zIndex: 10000,
  pointerEvents: 'none',
  minWidth: '320px',
  maxWidth: '450px'
};

const TOOLTIP_TITLE_STYLE: CSSProperties = {
  fontSize: '21px',
  fontWeight: 700,
  color: '#fbbf24',
  marginBottom: '12px'
};

const ENHANCEMENT_CONTAINER_STYLE: CSSProperties = {
  marginBottom: '14px',
  padding: '10px',
  borderRadius: '8px'
};

const ENHANCEMENT_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px'
};

const ENHANCEMENT_STATS_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
};

const TRAIT_MODIFIER_STYLE: CSSProperties = {
  marginBottom: '10px',
  padding: '8px',
  background: 'rgba(251, 191, 36, 0.12)',
  borderRadius: '8px',
  border: '1px solid rgba(251, 191, 36, 0.4)',
  color: '#fde68a',
  fontSize: '14px',
  fontWeight: 700
};

const TRAIT_ITEM_STYLE: CSSProperties = {
  marginBottom: '12px'
};

const TRAIT_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px'
};

const TRAIT_DESC_STYLE: CSSProperties = {
  fontSize: '18px',
  color: '#9fb6ff',
  lineHeight: 1.5
};

const TOKEN_SECTION_STYLE: CSSProperties = {
  borderTop: '1px solid rgba(255,255,255,0.2)',
  margin: '12px 0',
  paddingTop: '12px'
};

const TOKEN_TITLE_STYLE: CSSProperties = {
  fontSize: '17px',
  fontWeight: 700,
  color: '#a78bfa',
  marginBottom: '8px'
};

const TOKEN_ITEM_STYLE: CSSProperties = {
  marginBottom: '12px'
};

const TOKEN_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '4px'
};

const TOKEN_EMOJI_STYLE: CSSProperties = {
  fontSize: '18px'
};

const TOKEN_TARGET_STYLE: CSSProperties = {
  fontSize: '13px',
  color: '#94a3b8',
  background: 'rgba(148, 163, 184, 0.2)',
  padding: '2px 6px',
  borderRadius: '4px'
};

const TOKEN_DESC_STYLE: CSSProperties = {
  fontSize: '16px',
  color: '#9fb6ff',
  lineHeight: 1.5
};

interface BattleTooltipsProps {
  tooltipVisible: boolean;
  hoveredCard: HoveredCard | null;
  battle: Battle;
  hoveredEnemyAction: HoveredEnemyAction | null;
  insightReveal: InsightReveal | null;
  effectiveInsight: number | null;
}

export const BattleTooltips: FC<BattleTooltipsProps> = memo(({
  tooltipVisible,
  hoveredCard,
  battle,
  hoveredEnemyAction,
  insightReveal,
  effectiveInsight
}) => {
  // 툴팁 표시 여부 계산 메모이제이션
  const showTraitTooltip = useMemo(() => {
    if (!tooltipVisible || !hoveredCard || !hoveredCard.card) return false;
    const card = hoveredCard.card as Card & { enhancementLevel?: number };
    return (card.traits && card.traits.length > 0) ||
           (card.appliedTokens && card.appliedTokens.length > 0) ||
           card.enhancementLevel;
  }, [tooltipVisible, hoveredCard]);

  // 통찰 툴팁 표시 조건 메모이제이션
  const showInsightTooltip = useMemo(() => {
    if (!hoveredEnemyAction) return false;
    const validPhase = battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve';
    if (!validPhase) return false;
    const levelForTooltip = battle.phase === 'select' ? (insightReveal?.level || 0) : (effectiveInsight || 0);
    return levelForTooltip >= 3;
  }, [hoveredEnemyAction, battle.phase, insightReveal?.level, effectiveInsight]);

  // 툴팁 위치 스타일 메모이제이션
  const tooltipPositionStyle = useMemo((): CSSProperties | null => {
    if (!hoveredCard) return null;
    return {
      ...TOOLTIP_BASE_STYLE,
      position: 'fixed',
      left: `${hoveredCard.x}px`,
      top: `${hoveredCard.y}px`
    };
  }, [hoveredCard?.x, hoveredCard?.y]);

  // 툴팁 제목 계산 메모이제이션
  const tooltipTitle = useMemo(() => {
    if (!hoveredCard || !hoveredCard.card) return '';
    const card = hoveredCard.card as Card & { enhancementLevel?: number };
    if (card.enhancementLevel) return '강화 정보';
    if (card.traits && card.traits.length > 0) return '특성 정보';
    return '토큰 효과';
  }, [hoveredCard]);

  // 통찰 툴팁 위치 스타일 메모이제이션
  const insightTooltipStyle = useMemo((): CSSProperties | null => {
    if (!hoveredEnemyAction) return null;
    return {
      position: 'fixed',
      left: `${hoveredEnemyAction.pageX}px`,
      top: `${hoveredEnemyAction.pageY + 24}px`,
      transform: 'translate(-50%, 0)',
      pointerEvents: 'none',
      zIndex: 10000
    };
  }, [hoveredEnemyAction?.pageX, hoveredEnemyAction?.pageY]);

  return (
    <>
      {/* 특성/토큰/강화 툴팁 */}
      {showTraitTooltip && hoveredCard && tooltipPositionStyle && (
        <div
          className={`trait-tooltip ${tooltipVisible ? 'tooltip-visible' : ''}`}
          style={tooltipPositionStyle}
        >
          <div style={TOOLTIP_TITLE_STYLE}>
            {tooltipTitle}
          </div>

          {/* 강화 효과 섹션 */}
          {(() => {
            const enhancedCard = hoveredCard.card as Card & {
              enhancementLevel?: number;
              enhancedStats?: EnhancedCardStats;
            };
            if (!enhancedCard.enhancementLevel || enhancedCard.enhancementLevel <= 0) return null;

            const level = enhancedCard.enhancementLevel;
            const stats = enhancedCard.enhancedStats;
            const color = getEnhancementColor(level);

            const containerStyle: CSSProperties = {
              ...ENHANCEMENT_CONTAINER_STYLE,
              background: `${color}15`,
              border: `1px solid ${color}40`
            };

            const labelStyle: CSSProperties = {
              fontSize: '17px',
              fontWeight: 700,
              color: color
            };

            return (
              <div style={containerStyle}>
                <div style={ENHANCEMENT_HEADER_STYLE}>
                  <span style={{ fontSize: '16px' }}>⚔️</span>
                  <span style={labelStyle}>
                    강화 {getEnhancementLabel(level)}
                  </span>
                </div>
                {stats && (
                  <div style={ENHANCEMENT_STATS_STYLE}>
                    {stats.damageBonus > 0 && (
                      <div style={{ fontSize: '14px', color: '#f87171' }}>
                        💥 피해 +{stats.damageBonus}
                      </div>
                    )}
                    {stats.blockBonus > 0 && (
                      <div style={{ fontSize: '14px', color: '#60a5fa' }}>
                        🛡️ 방어 +{stats.blockBonus}
                      </div>
                    )}
                    {stats.speedCostReduction > 0 && (
                      <div style={{ fontSize: '14px', color: '#4ade80' }}>
                        ⏱️ 속도 -{stats.speedCostReduction}
                      </div>
                    )}
                    {stats.actionCostReduction > 0 && (
                      <div style={{ fontSize: '14px', color: '#fbbf24' }}>
                        ⚡ 행동력 -{stats.actionCostReduction}
                      </div>
                    )}
                    {stats.hitsBonus > 0 && (
                      <div style={{ fontSize: '14px', color: '#f472b6' }}>
                        🎯 타격 +{stats.hitsBonus}
                      </div>
                    )}
                    {stats.specialEffects && stats.specialEffects.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#a78bfa', marginTop: '4px' }}>
                        ✨ {stats.specialEffects.map((e: { type: string }) => e.type).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          {(() => {
            if (!hoveredCard.card) return null;
            const hCard = hoveredCard.card;
            const baseCard = CARDS.find(c => c.id === hCard.id);
            const enhancedCard = applyTraitModifiers((baseCard || hCard) as FullCard, { usageCount: 0, isInCombo: false });
            const parts: string[] = [];
            if (baseCard?.damage && enhancedCard.damage && enhancedCard.damage !== baseCard.damage) {
              const mult = (enhancedCard.damage / baseCard.damage).toFixed(2);
              parts.push(`공격력: ${enhancedCard.damage} = ${baseCard.damage} × ${mult}`);
            }
            if (baseCard?.block && enhancedCard.block && enhancedCard.block !== baseCard.block) {
              const mult = (enhancedCard.block / baseCard.block).toFixed(2);
              parts.push(`방어력: ${enhancedCard.block} = ${baseCard.block} × ${mult}`);
            }
            return parts.length > 0 ? (
              <div style={TRAIT_MODIFIER_STYLE}>
                {parts.map((p, idx) => <div key={idx}>{p}</div>)}
              </div>
            ) : null;
          })()}
          {/* 특성 섹션 */}
          {hoveredCard.card?.traits && hoveredCard.card.traits.length > 0 && hoveredCard.card.traits.map((traitId: string) => {
            const trait = TRAITS[traitId as keyof typeof TRAITS];
            if (!trait) return null;
            const isPositive = trait.type === 'positive';
            const nameStyle: CSSProperties = {
              fontSize: '19px',
              fontWeight: 700,
              color: isPositive ? '#22c55e' : '#ef4444'
            };
            return (
              <div key={traitId} style={TRAIT_ITEM_STYLE}>
                <div style={TRAIT_HEADER_STYLE}>
                  <span style={nameStyle}>
                    {trait.name}
                  </span>
                  <span style={{ fontSize: '16px', color: '#fbbf24' }}>
                    {"★".repeat(trait.weight)}
                  </span>
                </div>
                <div style={TRAIT_DESC_STYLE}>
                  {trait.description}
                </div>
              </div>
            );
          })}
          {/* 적용 토큰 섹션 */}
          {hoveredCard.card?.appliedTokens && hoveredCard.card.appliedTokens.length > 0 && (
            <>
              {hoveredCard.card?.traits && hoveredCard.card.traits.length > 0 && (
                <div style={TOKEN_SECTION_STYLE}>
                  <div style={TOKEN_TITLE_STYLE}>
                    부여 토큰
                  </div>
                </div>
              )}
              {hoveredCard.card?.appliedTokens?.map((tokenInfo: { id: string; target: 'player' | 'enemy' }, idx: number) => {
                const token = TOKENS[tokenInfo.id];
                if (!token) return null;
                const isPositive = token.category === TOKEN_CATEGORIES.POSITIVE;
                const isNegative = token.category === TOKEN_CATEGORIES.NEGATIVE;
                const targetLabel = tokenInfo.target === 'player' ? '자신' : '적';
                const tokenNameStyle: CSSProperties = {
                  fontSize: '19px',
                  fontWeight: 700,
                  color: isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#94a3b8'
                };
                return (
                  <div key={`${tokenInfo.id}-${idx}`} style={TOKEN_ITEM_STYLE}>
                    <div style={TOKEN_HEADER_STYLE}>
                      <span style={TOKEN_EMOJI_STYLE}>{token.emoji}</span>
                      <span style={tokenNameStyle}>
                        {token.name}
                      </span>
                      <span style={TOKEN_TARGET_STYLE}>
                        → {targetLabel}
                      </span>
                    </div>
                    <div style={TOKEN_DESC_STYLE}>
                      {token.description}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* 전역 통찰 툴팁 (뷰포트 기준) */}
      {showInsightTooltip && hoveredEnemyAction && insightTooltipStyle && (
        <div
          className="insight-tooltip"
          style={insightTooltipStyle}
        >
          <div className="insight-tooltip-title">
            #{hoveredEnemyAction.idx + 1} {hoveredEnemyAction.action?.name || '???'}
          </div>
          <div className="insight-tooltip-desc" style={{ marginBottom: '4px' }}>
            ⏱️ {hoveredEnemyAction.action?.speedCost ?? (hoveredEnemyAction.action as { speed?: number })?.speed ?? '-'}
          </div>
          {(hoveredEnemyAction.action?.damage || hoveredEnemyAction.action?.block) && (
            <div className="insight-tooltip-desc" style={{ marginBottom: '4px' }}>
              {hoveredEnemyAction.action.damage ? `⚔️ ${hoveredEnemyAction.action.damage}${hoveredEnemyAction.action.hits ? ` x${hoveredEnemyAction.action.hits}` : ''}` : ''}
              {hoveredEnemyAction.action.damage && hoveredEnemyAction.action.block ? ' / ' : ''}
              {hoveredEnemyAction.action.block ? `🛡️ ${hoveredEnemyAction.action.block}` : ''}
            </div>
          )}
          {hoveredEnemyAction.action?.traits && hoveredEnemyAction.action.traits.length > 0 && (
            <div className="insight-tooltip-desc" style={{ color: '#a78bfa' }}>
              특성: {hoveredEnemyAction.action.traits.join(', ')}
            </div>
          )}
          {!hoveredEnemyAction.action?.damage && !hoveredEnemyAction.action?.block && !hoveredEnemyAction.action?.traits?.length && (
            <div className="insight-tooltip-desc">상세 정보가 없습니다.</div>
          )}
        </div>
      )}
    </>
  );
});
