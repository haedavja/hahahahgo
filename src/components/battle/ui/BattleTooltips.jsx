/**
 * BattleTooltips.jsx
 *
 * 특성 툴팁 & 통찰 툴팁 컴포넌트
 */

import { CARDS } from '../battleData';
import { TRAITS } from '../battleData';
import { applyTraitModifiers } from '../utils/battleUtils';

export const BattleTooltips = ({
  tooltipVisible,
  hoveredCard,
  battle,
  hoveredEnemyAction,
  insightReveal,
  effectiveInsight
}) => {
  return (
    <>
      {/* 특성 툴팁 */}
      {tooltipVisible && tooltipVisible && hoveredCard && hoveredCard.card.traits && hoveredCard.card.traits.length > 0 && (
        <div
          className={`trait-tooltip ${tooltipVisible ? 'tooltip-visible' : ''}`}
          style={{
            position: 'fixed',
            left: `${hoveredCard.x}px`,
            top: `${hoveredCard.y}px`,
            background: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid #fbbf24',
            borderRadius: '12px',
            padding: '18px 24px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.9)',
            zIndex: 10000,
            pointerEvents: 'none',
            minWidth: '320px',
            maxWidth: '450px',
          }}
        >
          <div style={{ fontSize: '21px', fontWeight: 700, color: '#fbbf24', marginBottom: '12px' }}>
            특성 정보
          </div>
          {(() => {
            const baseCard = CARDS.find(c => c.id === hoveredCard.card.id);
            const enhancedCard = applyTraitModifiers(baseCard || hoveredCard.card, { usageCount: 0, isInCombo: false });
            const parts = [];
            if (baseCard?.damage && enhancedCard.damage && enhancedCard.damage !== baseCard.damage) {
              const mult = (enhancedCard.damage / baseCard.damage).toFixed(2);
              parts.push(`공격력: ${enhancedCard.damage} = ${baseCard.damage} × ${mult}`);
            }
            if (baseCard?.block && enhancedCard.block && enhancedCard.block !== baseCard.block) {
              const mult = (enhancedCard.block / baseCard.block).toFixed(2);
              parts.push(`방어력: ${enhancedCard.block} = ${baseCard.block} × ${mult}`);
            }
            return parts.length > 0 ? (
              <div style={{ marginBottom: '10px', padding: '8px', background: 'rgba(251, 191, 36, 0.12)', borderRadius: '8px', border: '1px solid rgba(251, 191, 36, 0.4)', color: '#fde68a', fontSize: '14px', fontWeight: 700 }}>
                {parts.map((p, idx) => <div key={idx}>{p}</div>)}
              </div>
            ) : null;
          })()}
          {hoveredCard.card.traits.map(traitId => {
            const trait = TRAITS[traitId];
            if (!trait) return null;
            const isPositive = trait.type === 'positive';
            return (
              <div key={traitId} style={{ marginBottom: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '19px',
                    fontWeight: 700,
                    color: isPositive ? '#22c55e' : '#ef4444'
                  }}>
                    {trait.name}
                  </span>
                  <span style={{ fontSize: '16px', color: '#fbbf24' }}>
                    {"★".repeat(trait.weight)}
                  </span>
                </div>
                <div style={{ fontSize: '18px', color: '#9fb6ff', lineHeight: 1.5 }}>
                  {trait.description}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 전역 통찰 툴팁 (뷰포트 기준) */}
      {hoveredEnemyAction && (battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve') && ((battle.phase === 'select' ? (insightReveal?.level || 0) : (effectiveInsight || 0)) >= 3) && (
        <div
          className="insight-tooltip"
          style={{
            position: 'fixed',
            left: `${hoveredEnemyAction.pageX}px`,
            top: `${hoveredEnemyAction.pageY + 24}px`,
            transform: 'translate(-50%, 0)',
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        >
          <div className="insight-tooltip-title">
            #{hoveredEnemyAction.idx + 1} {hoveredEnemyAction.action?.name || '???'}
          </div>
          <div className="insight-tooltip-desc" style={{ marginBottom: '4px' }}>
            ⏱️ {hoveredEnemyAction.action?.speedCost ?? hoveredEnemyAction.action?.speed ?? '-'}
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
};
