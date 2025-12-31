/**
 * TimelineDisplay.tsx
 *
 * 타임라인 및 타임라인 숫자 오버레이 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출 + useMemo
 */

import { FC, memo, useMemo, useCallback, useState, useRef } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react';
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

// =====================
// 스타일 상수
// =====================

const NUMBER_OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  top: '155px',
  left: '240px',
  right: '360px',
  width: 'auto',
  maxWidth: '1400px',
  zIndex: 3600,
  pointerEvents: 'none'
};

const NUMBER_INNER_STYLE: CSSProperties = {
  position: 'relative',
  height: '28px',
  color: '#ffb366',
  textShadow: '0 0 8px rgba(255, 179, 102, 0.9), 0 0 14px rgba(0, 0, 0, 0.8)',
  fontWeight: 800,
  fontSize: '15px'
};

const TIMELINE_CONTAINER_STYLE: CSSProperties = {
  marginBottom: '32px',
  position: 'fixed',
  top: '70px',
  left: '240px',
  right: '360px',
  width: 'auto',
  maxWidth: '1400px',
  zIndex: 3500,
  background: 'transparent'
};

const TIMELINE_PANEL_STYLE: CSSProperties = {
  minHeight: '130px',
  background: 'transparent',
  border: 'none',
  boxShadow: 'none',
  padding: '0',
  margin: '0'
};

const TIMELINE_BODY_STYLE: CSSProperties = {
  marginTop: '0',
  padding: '14px 0 0 0',
  background: 'transparent',
  borderRadius: '0',
  border: 'none',
  boxShadow: 'none',
  position: 'relative'
};

const TIMELINE_LANES_STYLE: CSSProperties = {
  position: 'relative'
};

const OVERDRIVE_BADGE_STYLE: CSSProperties = {
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
};

const SPACER_STYLE: CSSProperties = {
  height: '220px'
};

// 패리 색상 팔레트
const PARRY_COLORS = [
  { start: '#22d3ee', end: '#a855f7', shadow: 'rgba(34, 211, 238, 0.8)' },
  { start: '#34d399', end: '#fbbf24', shadow: 'rgba(52, 211, 153, 0.8)' },
  { start: '#f472b6', end: '#60a5fa', shadow: 'rgba(244, 114, 182, 0.8)' }
];

// 여유 특성 색상
const LEISURE_COLOR = {
  start: '#facc15', // 노란색
  end: '#f59e0b',   // 주황색
  shadow: 'rgba(250, 204, 21, 0.6)',
  bg: 'rgba(250, 204, 21, 0.15)'
};

// 여유 특성 기본 범위 (4~8)
const LEISURE_MIN_SPEED = 4;
const LEISURE_MAX_SPEED = 8;

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
  // 여유 특성 드래그 상태
  const [draggingCardUid, setDraggingCardUid] = useState<string | null>(null);
  const playerLaneRef = useRef<HTMLDivElement>(null);
  // 기본 계산값 메모이제이션
  const { commonMax, ticks, playerMax, enemyMax, playerRatio, enemyRatio } = useMemo(() => {
    const pMax = player.maxSpeed || DEFAULT_PLAYER_MAX_SPEED;
    const eMax = enemy.maxSpeed || DEFAULT_ENEMY_MAX_SPEED;
    const cMax = Math.max(pMax, eMax);
    return {
      commonMax: cMax,
      ticks: generateSpeedTicks(cMax),
      playerMax: pMax,
      enemyMax: eMax,
      playerRatio: pMax / cMax,
      enemyRatio: eMax / cMax
    };
  }, [player.maxSpeed, enemy.maxSpeed, DEFAULT_PLAYER_MAX_SPEED, DEFAULT_ENEMY_MAX_SPEED, generateSpeedTicks]);

  // 적 타임라인 숨김 조건 메모이제이션
  const hideEnemyTimeline = useMemo(() =>
    (dulledLevel >= 2 && battle.phase === 'resolve') ||
    (dulledLevel >= 1 && battle.phase === 'respond'),
    [dulledLevel, battle.phase]
  );

  // 플레이어 레인 너비 스타일 메모이제이션
  const playerLaneStyle = useMemo((): CSSProperties => ({
    width: `${playerRatio * 100}%`,
    overflow: 'hidden'
  }), [playerRatio]);

  // 적 레인 너비 스타일 메모이제이션
  const enemyLaneStyle = useMemo((): CSSProperties => ({
    width: `${enemyRatio * 100}%`,
    overflow: 'hidden'
  }), [enemyRatio]);

  // 진행 인디케이터 스타일 메모이제이션
  const progressIndicatorStyle = useMemo((): CSSProperties => ({
    left: `${timelineProgress}%`,
    opacity: timelineIndicatorVisible ? 1 : 0,
    transition: 'opacity 0.3s ease-out'
  }), [timelineProgress, timelineIndicatorVisible]);

  // 여유 특성 카드 범위 계산
  const leisureCardRanges = useMemo(() => {
    const ranges: Array<{
      cardUid: string;
      cardIdx: number;
      minSp: number;
      maxSp: number;
      currentSp: number;
      offset: number;
    }> = [];

    let accumulatedSp = 0;
    playerTimeline.forEach((a, idx) => {
      const hasLeisure = a.card.traits?.includes('leisure');
      const cardUid = (a.card as { __uid?: string }).__uid || `leisure-${idx}`;
      const sameCount = playerTimeline.filter((q, i) => i < idx && q.sp === a.sp).length;
      const offset = sameCount * 28;

      if (hasLeisure && a.card.speedCost === LEISURE_MIN_SPEED) {
        const minSp = accumulatedSp + LEISURE_MIN_SPEED;
        const maxSp = accumulatedSp + LEISURE_MAX_SPEED;
        ranges.push({
          cardUid,
          cardIdx: idx,
          minSp,
          maxSp,
          currentSp: a.sp ?? minSp,
          offset
        });
      }
      accumulatedSp = a.sp ?? accumulatedSp;
    });

    return ranges;
  }, [playerTimeline]);

  // 여유 카드 드래그 핸들러
  const handleLeisureDragStart = useCallback((cardUid: string) => {
    if (battle.phase !== 'respond') return;
    setDraggingCardUid(cardUid);
  }, [battle.phase]);

  const handleLeisureDragEnd = useCallback(() => {
    setDraggingCardUid(null);
  }, []);

  const handleLeisureMouseMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (!draggingCardUid || !playerLaneRef.current || !actions.onLeisurePositionChange) return;

    const rect = playerLaneRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = (x / rect.width) * 100;
    const sp = Math.round((percent / 100) * playerMax);

    // 해당 카드의 범위 찾기
    const range = leisureCardRanges.find(r => r.cardUid === draggingCardUid);
    if (!range) return;

    // 범위 내로 제한
    const previousCardSp = range.minSp - LEISURE_MIN_SPEED;
    const clampedPosition = Math.max(LEISURE_MIN_SPEED, Math.min(LEISURE_MAX_SPEED, sp - previousCardSp));

    actions.onLeisurePositionChange(draggingCardUid, clampedPosition);
  }, [draggingCardUid, playerMax, leisureCardRanges, actions]);

  return (
    <>
      {/* 타임라인 숫자 오버레이 (고정) */}
      <div style={NUMBER_OVERLAY_STYLE}>
        <div style={NUMBER_INNER_STYLE}>
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
      <div style={TIMELINE_CONTAINER_STYLE}>
        <div className="panel-enhanced timeline-panel" style={TIMELINE_PANEL_STYLE}>
          <div className="timeline-body" style={TIMELINE_BODY_STYLE}>
            {/* 타임라인 progress indicator (시곗바늘) */}
            {battle.phase === 'resolve' && (
              <div
                className="timeline-progress-indicator"
                style={progressIndicatorStyle}
              />
            )}
            <div className="timeline-lanes" style={TIMELINE_LANES_STYLE}>
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
                <div style={OVERDRIVE_BADGE_STYLE}>
                  <span role="img" aria-label="overdrive">✨</span> {enemyOverdriveLabel}
                </div>
              )}
              <div
                ref={playerLaneRef}
                className="timeline-lane player-lane"
                style={playerLaneStyle}
                onMouseMove={handleLeisureMouseMove}
                onMouseUp={handleLeisureDragEnd}
                onMouseLeave={handleLeisureDragEnd}
              >
                {Array.from({ length: playerMax + 1 }).map((_, i) => (
                  <div key={`p-grid-${i}`} className="timeline-gridline" style={{ left: `${(i / playerMax) * 100}%` }} />
                ))}
                {/* 여유 특성 범위 표시 */}
                {battle.phase === 'respond' && leisureCardRanges.map((range) => {
                  const minPercent = (range.minSp / playerMax) * 100;
                  const maxPercent = (range.maxSp / playerMax) * 100;
                  const isDragging = draggingCardUid === range.cardUid;
                  return (
                    <div
                      key={`leisure-range-${range.cardUid}`}
                      className="leisure-range-indicator"
                      style={{
                        position: 'absolute',
                        left: `${minPercent}%`,
                        width: `${maxPercent - minPercent}%`,
                        top: `${6 + range.offset}px`,
                        height: '24px',
                        background: isDragging
                          ? `linear-gradient(90deg, ${LEISURE_COLOR.start}40, ${LEISURE_COLOR.end}40)`
                          : LEISURE_COLOR.bg,
                        borderRadius: '12px',
                        border: `2px dashed ${isDragging ? LEISURE_COLOR.start : LEISURE_COLOR.end}`,
                        boxShadow: isDragging
                          ? `0 0 12px ${LEISURE_COLOR.shadow}, inset 0 0 8px ${LEISURE_COLOR.shadow}`
                          : `0 0 6px ${LEISURE_COLOR.shadow}`,
                        zIndex: 5,
                        pointerEvents: 'none',
                        transition: 'box-shadow 0.2s, background 0.2s'
                      }}
                    >
                      {/* 범위 라벨 */}
                      <div style={{
                        position: 'absolute',
                        top: '-18px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '10px',
                        color: LEISURE_COLOR.start,
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        textShadow: '0 0 4px rgba(0,0,0,0.8)'
                      }}>
                        🎯 여유 ({LEISURE_MIN_SPEED}~{LEISURE_MAX_SPEED})
                      </div>
                    </div>
                  );
                })}
                {/* 패리 범위 표시 (여러 개 지원) */}
                {(Array.isArray(parryReadyStates) ? parryReadyStates : []).map((parryState, parryIdx) => {
                  if (!parryState?.active) return null;
                  const parryMaxPercent = (parryState.maxSp / playerMax) * 100;
                  const isExpired = timelineProgress > parryMaxPercent;
                  const color = PARRY_COLORS[parryIdx % PARRY_COLORS.length];
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
                  const hasGrowingDef = hasSpecial(a.card as Card, 'growingDefense');
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
                  const normalizedPosition = Math.min(((a.sp ?? 0) / playerMax) * 100, 100);

                  // 여유 특성 확인
                  const hasLeisure = a.card.traits?.includes('leisure') && a.card.speedCost === LEISURE_MIN_SPEED;
                  const cardUid = (a.card as { __uid?: string }).__uid || `leisure-${idx}`;
                  const isDragging = draggingCardUid === cardUid;
                  const canDrag = hasLeisure && battle.phase === 'respond';

                  return (
                    <div
                      key={idx}
                      className={`timeline-marker marker-player ${isExecuting ? 'timeline-active' : ''} ${isUsed ? 'timeline-used' : ''} ${hasLeisure ? 'leisure-card' : ''}`}
                      style={{
                        left: `${normalizedPosition}%`,
                        top: `${6 + offset}px`,
                        cursor: canDrag ? 'grab' : 'default',
                        ...(hasLeisure && battle.phase === 'respond' ? {
                          border: `2px solid ${LEISURE_COLOR.start}`,
                          boxShadow: isDragging
                            ? `0 0 16px ${LEISURE_COLOR.shadow}, 0 0 32px ${LEISURE_COLOR.shadow}`
                            : `0 0 8px ${LEISURE_COLOR.shadow}`,
                          transform: isDragging ? 'scale(1.2)' : 'none',
                          zIndex: isDragging ? 100 : 20
                        } : {})
                      }}
                      onMouseDown={canDrag ? () => handleLeisureDragStart(cardUid) : undefined}
                    >
                      <Icon size={14} className="text-white" />
                      <span className="text-white text-xs font-bold">{num > 0 ? num : ''}</span>
                      {hasLeisure && battle.phase === 'respond' && (
                        <span style={{
                          position: 'absolute',
                          bottom: '-16px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '8px',
                          color: LEISURE_COLOR.start,
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap'
                        }}>
                          ↔ 드래그
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="timeline-lane enemy-lane" style={enemyLaneStyle}>
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
                      const normalizedPosition = Math.min(((a.sp ?? 0) / enemyMax) * 100, 100);
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
      <div style={SPACER_STYLE} />
    </>
  );
});
