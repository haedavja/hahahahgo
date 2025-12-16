/**
 * HandArea.jsx
 *
 * 하단 고정 손패 영역 컴포넌트
 */

import { useGameStore } from '../../../state/gameStore';
import { hasTrait, applyTraitModifiers } from '../utils/battleUtils';
import { detectPokerCombo } from '../utils/comboDetection';
import { TraitBadgeList } from './TraitBadge.jsx';
import { CardStatsSidebar } from './CardStatsSidebar.jsx';
import { Sword, Shield } from './BattleIcons';

// X 아이콘 SVG 컴포넌트
const X = ({ size = 24, className = "", strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const HandArea = ({
  battle,
  player,
  enemy,
  selected,
  getSortedHand,
  toggle,
  handDisabled,
  showCardTraitTooltip,
  hideCardTraitTooltip,
  formatSpeedText,
  renderNameWithBadge,
  fixedOrder,
  moveUp,
  moveDown,
  queue,
  usedCardIndices,
  disappearingCards,
  hiddenCards,
  disabledCardIndices,
  isSimplified
}) => {
  if (!(battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0))) {
    return null;
  }

  return (
    <div className="hand-area">
      <div className="hand-flags">
        {player && player.hp <= 0 && (
          <div className="hand-flag defeat">💀 패배...</div>
        )}
      </div>

      {battle.phase === 'select' && (() => {
        // 현재 선택된 카드들의 조합 감지
        const currentCombo = detectPokerCombo(selected);
        const comboCardCosts = new Set();
        if (currentCombo?.bonusKeys) {
          currentCombo.bonusKeys.forEach(cost => comboCardCosts.add(cost));
        }
        // 플러쉬는 모든 카드가 조합 대상
        const isFlush = currentCombo?.name === '플러쉬';

        return (
          <div className="hand-cards">
            {getSortedHand().map((c, idx) => {
              const Icon = c.icon || (c.type === 'attack' ? Sword : Shield);
              const usageCount = player.comboUsageCount?.[c.id] || 0;
              // __handUid로 개별 카드 식별 (중복 카드 구별)
              const cardUid = c.__handUid || c.__uid;
              const selIndex = selected.findIndex(s => (s.__handUid || s.__uid) === cardUid);
              const sel = selIndex !== -1;
              // 카드가 조합에 포함되는지 확인
              const isInCombo = sel && (isFlush || comboCardCosts.has(c.actionCost));
              const enhancedCard = applyTraitModifiers(c, { usageCount, isInCombo });
              const disabled = handDisabled(c) && !sel;
              const currentBuild = useGameStore.getState().characterBuild;
              const isMainSpecial = currentBuild?.mainSpecials?.includes(c.id);
              const isSubSpecial = currentBuild?.subSpecials?.includes(c.id);
              const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
              const nameColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : '#fff';
              // 협동 특성이 있고 조합에 포함된 경우
              const hasCooperation = hasTrait(c, 'cooperation');
              const cooperationActive = hasCooperation && isInCombo;
              return (
                <div
                  key={c.id + idx}
                  onClick={() => !disabled && toggle(enhancedCard)}
                  onMouseEnter={(e) => {
                    const cardEl = e.currentTarget.querySelector('.game-card-large');
                    showCardTraitTooltip(c, cardEl);
                  }}
                  onMouseLeave={hideCardTraitTooltip}
                  style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative', marginLeft: idx === 0 ? '0' : '-20px' }}
                >
                  <div
                    className={`game-card-large select-phase-card ${c.type === 'attack' ? 'attack' : 'defense'} ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                    style={cooperationActive ? {
                      boxShadow: '0 0 20px 4px rgba(34, 197, 94, 0.8), 0 0 40px 8px rgba(34, 197, 94, 0.4)',
                      border: '3px solid #22c55e'
                    } : {}}
                  >
                    <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{enhancedCard.actionCost || c.actionCost}</div>
                    {sel && <div className="selection-number">{selIndex + 1}</div>}
                    <CardStatsSidebar card={enhancedCard} strengthBonus={player.strength || 0} formatSpeedText={formatSpeedText} />
                    <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                      <div className="font-black text-sm" style={{ display: 'flex', alignItems: 'center' }}>
                        {renderNameWithBadge(c, nameColor)}
                      </div>
                    </div>
                    <div className="card-icon-area">
                      <Icon size={60} className="text-white opacity-80" />
                      {disabled && (
                        <div className="card-disabled-overlay">
                          <X size={80} className="text-red-500" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                    <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                      {c.traits && c.traits.length > 0 ? <TraitBadgeList traits={c.traits} /> : null}
                      <span className="card-description">{c.description || ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {battle.phase === 'respond' && fixedOrder && (
        <div className="hand-cards" style={{ justifyContent: 'center' }}>
          {fixedOrder.filter(a => a.actor === 'player').map((action, idx, arr) => {
            const c = action.card;
            const Icon = c.icon || (c.type === 'attack' ? Sword : Shield);
            const currentBuild = useGameStore.getState().characterBuild;
            const isMainSpecial = currentBuild?.mainSpecials?.includes(c.id);
            const isSubSpecial = currentBuild?.subSpecials?.includes(c.id);
            const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
            const nameColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#7dd3fc' : '#fff';
            return (
              <div
                key={idx}
                onMouseEnter={(e) => {
                  const cardEl = e.currentTarget.querySelector('.game-card-large');
                  showCardTraitTooltip(c, cardEl);
                }}
                onMouseLeave={hideCardTraitTooltip}
                style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', position: 'relative', marginLeft: idx === 0 ? '0' : '-20px' }}
              >
                <div className={`game-card-large respond-phase-card ${c.type === 'attack' ? 'attack' : 'defense'}`}>
                  <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{c.actionCost}</div>
                  <CardStatsSidebar card={c} strengthBonus={player.strength || 0} formatSpeedText={formatSpeedText} />
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="font-black text-sm" style={{ display: 'flex', alignItems: 'center' }}>
                      {renderNameWithBadge(c, nameColor)}
                    </div>
                  </div>
                  <div className="card-icon-area">
                    <Icon size={60} className="text-white opacity-80" />
                  </div>
                  <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                    {c.traits && c.traits.length > 0 ? <TraitBadgeList traits={c.traits} /> : null}
                    <span className="card-description">{c.description || ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {idx > 0 && (
                    <button onClick={() => moveUp(idx)} className="btn-enhanced text-xs" style={{ padding: '4px 12px' }}>
                      ←
                    </button>
                  )}
                  {idx < arr.length - 1 && (
                    <button onClick={() => moveDown(idx)} className="btn-enhanced text-xs" style={{ padding: '4px 12px' }}>
                      →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {battle.phase === 'resolve' && queue && battle.queue.length > 0 && (
        <div className="hand-cards" style={{ justifyContent: 'center' }}>
          {queue.filter(a => a.actor === 'player').map((a, i) => {
            const Icon = a.card.icon || (a.card.type === 'attack' ? Sword : Shield);
            const globalIndex = queue.findIndex(q => q === a);
            const isUsed = Array.isArray(usedCardIndices) && usedCardIndices.includes(globalIndex);
            const isDisappearing = Array.isArray(disappearingCards) && disappearingCards.includes(globalIndex);
            const isHidden = Array.isArray(hiddenCards) && hiddenCards.includes(globalIndex);
            const isDisabled = Array.isArray(disabledCardIndices) && disabledCardIndices.includes(globalIndex); // 비활성화된 카드 (몬스터 사망 시)
            const currentBuild = useGameStore.getState().characterBuild;
            const isMainSpecial = currentBuild?.mainSpecials?.includes(a.card.id);
            const isSubSpecial = currentBuild?.subSpecials?.includes(a.card.id);
            const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';

            // 사용된 카드(hidden)는 사라지지 않고 빛만 잃음
            const isDimmed = isHidden || isDisabled;

            return (
              <div
                key={`resolve-${globalIndex}`}
                onMouseEnter={(e) => {
                  const cardEl = e.currentTarget.querySelector('.game-card-large');
                  showCardTraitTooltip(a.card, cardEl);
                }}
                onMouseLeave={hideCardTraitTooltip}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  alignItems: 'center',
                  position: 'relative',
                  marginLeft: i === 0 ? '0' : '-20px',
                  opacity: isDimmed ? 0.4 : 1, // 사용된/비활성화된 카드는 투명하게
                  filter: isDimmed ? 'grayscale(0.8) brightness(0.6)' : 'none', // 빛바란 효과
                  transition: 'opacity 0.3s ease, filter 0.3s ease'
                }}
              >
                <div className={`game-card-large resolve-phase-card ${a.card.type === 'attack' ? 'attack' : 'defense'} ${isUsed ? 'card-used' : ''}`}>
                  <div className="card-cost-badge-floating" style={{ color: costColor, WebkitTextStroke: '1px #000' }}>{a.card.actionCost}</div>
                  <CardStatsSidebar card={a.card} strengthBonus={player.strength || 0} showCounter={true} formatSpeedText={formatSpeedText} />
                  <div className="card-header" style={{ display: 'flex', justifyContent: 'center' }}>
                    <div className="text-white font-black text-sm" style={{ display: 'flex', alignItems: 'center' }}>
                      {renderNameWithBadge(a.card, '#fff')}
                    </div>
                  </div>
                  <div className="card-icon-area">
                    <Icon size={60} className="text-white opacity-80" />
                  </div>
                  <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                    {a.card.traits && a.card.traits.length > 0 ? <TraitBadgeList traits={a.card.traits} /> : null}
                    <span className="card-description">{a.card.description || ''}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
