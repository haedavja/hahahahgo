/**
 * TimelineDisplay.tsx
 *
 * 타임라인 및 타임라인 숫자 오버레이 컴포넌트
 */

import { FC, memo } from 'react';
import { hasSpecial } from '../utils/cardSpecialEffects';
import type {
  IconProps,
  Card,
  UITimelineAction,
  OrderItem,
  TimelineCard,
  ParryState,
  HoveredEnemyAction,
  TimelineDisplayActions as Actions,
  InsightReveal,
  TimelinePlayer as Player,
  TimelineEnemy as Enemy,
  TimelineBattle as Battle
} from '../../../types';

// Lucide icons as simple SVG components
const Sword: FC<IconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2" />
  </svg>
);

const Shield: FC<IconProps> = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

/** 타임라인 액션 타입 (UITimelineAction 또는 OrderItem) */
type TimelineAction = UITimelineAction | OrderItem;

interface TimelineDisplayProps {
  player: Player;
  enemy: Enemy;
  DEFAULT_PLAYER_MAX_SPEED: number;
  DEFAULT_ENEMY_MAX_SPEED: number;
  generateSpeedTicks: (max: number) => number[];
  battle: Battle;
  timelineProgress: number;
  timelineIndicatorVisible: boolean;
  insightAnimLevel: number;
  insightAnimPulseKey: number;
  enemyOverdriveVisible: boolean;
  enemyOverdriveLabel: string;
  dulledLevel: number;
  playerTimeline: TimelineAction[];
  queue: TimelineAction[] | null;
  executingCardIndex: number;
  usedCardIndices: number[];
  qIndex: number;
  enemyTimeline: TimelineAction[];
  effectiveInsight: number | null;
  insightReveal: InsightReveal | null;
  actions: Actions;
  destroyingEnemyCards?: number[];
  freezingEnemyCards?: number[];
  frozenOrder?: number;
  parryReadyStates?: ParryState[];
}

export const TimelineDisplay: FC<TimelineDisplayProps> = memo(({
  player,
  enemy,
  DEFAULT_PLAYER_MAX_SPEED,
  DEFAULT_ENEMY_MAX_SPEED,
  generateSpeedTicks,
  battle,
  timelineProgress,
  timelineIndicatorVisible,
  insightAnimLevel,
  insightAnimPulseKey,
  enemyOverdriveVisible,
  enemyOverdriveLabel,
  dulledLevel,
  playerTimeline,
  queue,
  executingCardIndex,
  usedCardIndices,
  qIndex,
  enemyTimeline,
  effectiveInsight,
  insightReveal,
  actions,
  destroyingEnemyCards = [],
  freezingEnemyCards = [],
  frozenOrder = 0,
  parryReadyStates = []
}) => {
  const commonMax = Math.max(player.maxSpeed || DEFAULT_PLAYER_MAX_SPEED, enemy.maxSpeed || DEFAULT_ENEMY_MAX_SPEED);
  const ticks = generateSpeedTicks(commonMax);
  const playerMax = player.maxSpeed || DEFAULT_PLAYER_MAX_SPEED;
  const enemyMax = enemy.maxSpeed || DEFAULT_ENEMY_MAX_SPEED;
  const playerRatio = playerMax / commonMax;
  const enemyRatio = enemyMax / commonMax;
  const hideEnemyTimeline =
    (dulledLevel >= 2 && battle.phase === 'resolve') ||
    (dulledLevel >= 1 && battle.phase === 'respond');

  return (
    <>
      {/* 타임라인 숫자 오버레이 (고정) */}
      <div style={{ position: 'fixed', top: '155px', left: '240px', right: '360px', width: 'auto', maxWidth: '1400px', zIndex: 3600, pointerEvents: 'none' }}>
        <div style={{ position: 'relative', height: '28px', color: '#ffb366', textShadow: '0 0 8px rgba(255, 179, 102, 0.9), 0 0 14px rgba(0, 0, 0, 0.8)', fontWeight: 800, fontSize: '15px' }}>
          {ticks.map((tick) => {
            const label = tick.toString().split('').join(' ');
            const left = (tick / commonMax) * 100;
            return (
              <span
                key={tick}
                style={{
                  position: 'absolute',
                  left: `${left}%`,
                  transform: 'translate(-50%, 0)',
                  whiteSpace: 'nowrap'
                }}
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Timeline - 1줄 길게 (화면 가득) */}
      <div style={{ marginBottom: '32px', position: 'fixed', top: '70px', left: '240px', right: '360px', width: 'auto', maxWidth: '1400px', zIndex: 3500, background: 'transparent' }}>
        <div className="panel-enhanced timeline-panel" style={{ minHeight: '130px', background: 'transparent', border: 'none', boxShadow: 'none', padding: '0', margin: '0' }}>
          <div className="timeline-body" style={{ marginTop: '0', padding: '14px 0 0 0', background: 'transparent', borderRadius: '0', border: 'none', boxShadow: 'none', position: 'relative' }}>
            {/* 타임라인 progress indicator (시곗바늘) */}
            {battle.phase === 'resolve' && (
              <div
                className="timeline-progress-indicator"
                style={{
                  left: `${timelineProgress}%`,
                  opacity: timelineIndicatorVisible ? 1 : 0,
                  transition: 'opacity 0.3s ease-out'
                }}
              />
            )}
            <div className="timeline-lanes" style={{ position: 'relative' }}>
              {insightAnimLevel === 1 && (
                <div className="insight-overlay insight-glitch" aria-hidden="true" />
              )}
              {insightAnimLevel === 2 && (
                <div className="insight-overlay insight-scan" aria-hidden="true">
                  <div className="insight-scan-beam" />
                </div>
              )}
              {insightAnimLevel === 3 && (
                <div className="insight-overlay insight-beam" aria-hidden="true" key={insightAnimPulseKey} />
              )}
              {enemyOverdriveVisible && (
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '-18px',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, rgba(244, 114, 182, 0.15), rgba(99, 102, 241, 0.2))',
                  border: '1.5px solid rgba(147, 197, 253, 0.6)',
                  color: '#c4d4ff',
                  fontWeight: '800',
                  letterSpacing: '0.08em',
                  boxShadow: '0 6px 16px rgba(79, 70, 229, 0.35)',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <span role="img" aria-label="overdrive">✨</span> {enemyOverdriveLabel}
                </div>
              )}
              <div className="timeline-lane player-lane" style={{ width: `${playerRatio * 100}%` }}>
                {Array.from({ length: playerMax + 1 }).map((_, i) => (
                  <div key={`p-grid-${i}`} className="timeline-gridline" style={{ left: `${(i / playerMax) * 100}%` }} />
                ))}
                {/* 패리 범위 표시 (여러 개 지원) */}
                {(Array.isArray(parryReadyStates) ? parryReadyStates : []).map((parryState, parryIdx) => {
                  if (!parryState?.active) return null;
                  const parryMaxPercent = (parryState.maxSp / playerMax) * 100;
                  const isExpired = timelineProgress > parryMaxPercent;
                  // 여러 패리 범위에 다른 색상 적용
                  const colors = [
                    { start: '#22d3ee', end: '#a855f7', shadow: 'rgba(34, 211, 238, 0.8)' },
                    { start: '#34d399', end: '#fbbf24', shadow: 'rgba(52, 211, 153, 0.8)' },
                    { start: '#f472b6', end: '#60a5fa', shadow: 'rgba(244, 114, 182, 0.8)' }
                  ];
                  const color = colors[parryIdx % colors.length];
                  return (
                    <div
                      key={`parry-${parryIdx}`}
                      className="parry-range-indicator"
                      style={{
                        position: 'absolute',
                        left: `${(parryState.centerSp / playerMax) * 100}%`,
                        width: `${((parryState.maxSp - parryState.centerSp) / playerMax) * 100}%`,
                        top: `${50 + parryIdx * 8}%`,
                        transform: 'translateY(-50%)',
                        height: '4px',
                        background: isExpired
                          ? 'linear-gradient(90deg, #6b7280, #9ca3af)'
                          : `linear-gradient(90deg, ${color.start}, ${color.end})`,
                        borderRadius: '2px',
                        boxShadow: isExpired
                          ? 'none'
                          : `0 0 8px ${color.shadow}, 0 0 16px ${color.shadow}`,
                        opacity: isExpired ? 0.4 : 1,
                        zIndex: 10 + parryIdx,
                        pointerEvents: 'none',
                        transition: 'opacity 0.3s, background 0.3s, box-shadow 0.3s'
                      }}
                    >
                      {/* 시작점 마커 */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '8px',
                        height: '16px',
                        background: isExpired ? '#6b7280' : color.start,
                        borderRadius: '2px',
                        boxShadow: isExpired ? 'none' : `0 0 6px ${color.shadow}`,
                        transition: 'background 0.3s, box-shadow 0.3s'
                      }} />
                      {/* 끝점 마커 */}
                      <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '50%',
                        transform: 'translate(50%, -50%)',
                        width: '8px',
                        height: '16px',
                        background: isExpired ? '#9ca3af' : color.end,
                        borderRadius: '2px',
                        boxShadow: isExpired ? 'none' : `0 0 6px ${color.shadow}`,
                        transition: 'background 0.3s, box-shadow 0.3s'
                      }} />
                    </div>
                  );
                })}
                {playerTimeline.map((a, idx) => {
                  const Icon = a.card.icon || (a.card.type === 'attack' ? Sword : Shield);
                  const sameCount = playerTimeline.filter((q, i) => i < idx && q.sp === a.sp).length;
                  const offset = sameCount * 28;
                  const strengthBonus = player.strength || 0;
                  // growingDefense 특성 (방어자세): 타임라인 진행에 따라 방어력 실시간 증가
                  const hasGrowingDef = hasSpecial(a.card , 'growingDefense');
                  const currentTimelineSp = battle.phase === 'resolve'
                    ? Math.floor((timelineProgress / 100) * playerMax)
                    : 0;
                  // 카드가 이미 발동되었는지 확인
                  const globalIdx = battle.phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                  const cardAlreadyUsed = globalIdx !== -1 && globalIdx < qIndex;
                  // 발동 전: 0
                  // 발동 후: 타임라인이 진행할수록 계속 증가 (currentTimelineSp - cardSp)
                  const growingDefenseBonus = hasGrowingDef
                    ? (cardAlreadyUsed
                        ? Math.max(0, currentTimelineSp - (a.sp || 0))  // 발동 후: 0부터 시작해서 계속 증가
                        : 0)  // 발동 전: 0
                    : 0;
                  // ignoreStrength 특성: 힘 보너스 무시
                  const effectiveStrengthBonus = a.card.ignoreStrength ? 0 : strengthBonus;
                  const num = a.card.type === 'attack'
                    ? ((a.card.damage ?? 0) + strengthBonus) * (a.card.hits || 1)
                    : (a.card.type === 'general' || a.card.type === 'defense')
                      ? (a.card.block || 0) + effectiveStrengthBonus + growingDefenseBonus
                      : 0;
                  const globalIndex = battle.phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                  const isExecuting = executingCardIndex === globalIndex;
                  const isUsed = Array.isArray(usedCardIndices) && usedCardIndices.includes(globalIndex) && globalIndex < qIndex;
                  const normalizedPosition = (a.sp / playerMax) * 100;
                  return (
                    <div key={idx}
                      className={`timeline-marker marker-player ${isExecuting ? 'timeline-active' : ''} ${isUsed ? 'timeline-used' : ''}`}
                      style={{ left: `${normalizedPosition}%`, top: `${6 + offset}px` }}>
                      <Icon size={14} className="text-white" />
                      <span className="text-white text-xs font-bold">{num > 0 ? num : ''}</span>
                    </div>
                  );
                })}
              </div>

              <div className="timeline-lane enemy-lane" style={{ width: `${enemyRatio * 100}%` }}>
                {!hideEnemyTimeline && (
                  <>
                    {Array.from({ length: enemyMax + 1 }).map((_, i) => (
                      <div key={`e-grid-${i}`} className="timeline-gridline" style={{ left: `${(i / enemyMax) * 100}%` }} />
                    ))}
                    {enemyTimeline.map((a, idx) => {
                      const Icon = a.card.icon || (a.card.type === 'attack' ? Sword : Shield);
                      const sameCount = enemyTimeline.filter((q, i) => i < idx && q.sp === a.sp).length;
                      const offset = sameCount * 28;
                      const num = a.card.type === 'attack' ? ((a.card.damage ?? 0) * (a.card.hits || 1)) : (a.card.block || 0);
                      const globalIndex = battle.phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                      const isExecuting = executingCardIndex === globalIndex;
                      const isUsed = Array.isArray(usedCardIndices) && usedCardIndices.includes(globalIndex) && globalIndex < qIndex;
                      const isDestroying = destroyingEnemyCards.includes(idx);
                      const isFreezing = freezingEnemyCards.includes(idx);
                      const isFrozen = frozenOrder > 0 && !isFreezing; // 빙결 상태 지속 (애니메이션 중이 아닐 때)
                      const normalizedPosition = (a.sp / enemyMax) * 100;
                      const levelForTooltip = battle.phase === 'select' ? (insightReveal?.level || 0) : (effectiveInsight || 0);
                      const canShowTooltip = levelForTooltip >= 3;
                      const markerCls = [
                        'timeline-marker',
                        'marker-enemy',
                        isExecuting ? 'timeline-active' : '',
                        isUsed ? 'timeline-used' : '',
                        canShowTooltip ? 'insight-lv3-glow' : '',
                        isDestroying ? 'timeline-destroying' : '',
                        isFreezing ? 'timeline-freezing' : '',
                        isFrozen ? 'timeline-frozen' : ''
                      ].join(' ');
                      return (
                        <div key={idx}
                          className={markerCls}
                          style={{ left: `${normalizedPosition}%`, top: `${6 + offset}px` }}
                          onMouseEnter={(e) => {
                            if (!canShowTooltip) return;
                            actions.setHoveredEnemyAction({
                              action: a.card,
                              idx,
                              left: normalizedPosition,
                              top: 6 + offset,
                              pageX: e.clientX,
                              pageY: e.clientY,
                            });
                          }}
                          onMouseLeave={() => actions.setHoveredEnemyAction(null)}
                        >
                          <div className="marker-content">
                            <Icon size={14} className="text-white" />
                            {canShowTooltip && <span className="insight-eye-badge">👁️</span>}
                            <span className="text-white text-xs font-bold">{num > 0 ? num : ''}</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* 고정된 타임라인 공간 확보용 여백 */}
      <div style={{ height: '220px' }} />
    </>
  );
});
