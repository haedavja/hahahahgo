/**
 * TimelineDisplay.tsx
 *
 * 타임라인 및 타임라인 숫자 오버레이 컴포넌트
 * 리팩토링: 스타일/훅/마커 컴포넌트 분리
 */

import { FC, memo, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { hasSpecial } from '../utils/cardSpecialEffects';
import type {
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

// 분리된 컴포넌트 및 스타일
import {
  NUMBER_OVERLAY_STYLE,
  NUMBER_INNER_STYLE,
  TIMELINE_CONTAINER_STYLE,
  TIMELINE_PANEL_STYLE,
  TIMELINE_BODY_STYLE,
  TIMELINE_LANES_STYLE,
  OVERDRIVE_BADGE_STYLE,
  SPACER_STYLE,
  LEISURE_COLOR,
  STRAIN_COLOR,
  STRAIN_MAX_OFFSET,
  useTimelineDrag,
  useLeisureRanges,
  useStrainRanges,
  LeisureRangeIndicator,
  StrainRangeIndicator,
  ParryRangeIndicator,
  PlayerTimelineMarker,
  EnemyTimelineMarker,
} from './timeline';

/** 타임라인 액션 타입 */
type TimelineAction = UITimelineAction | OrderItem;

/** 카드 성장 상태 타입 */
interface CardGrowthState {
  traits?: string[];
  [key: string]: unknown;
}

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
  cardGrowth?: Record<string, CardGrowthState>;
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
  parryReadyStates = [],
  cardGrowth = {}
}) => {
  // 카드의 특성 확인
  const hasCardTrait = useCallback((card: { id?: string; traits?: string[] }, traitId: string): boolean => {
    if (card.traits?.includes(traitId)) return true;
    if (card.id && cardGrowth[card.id]?.traits?.includes(traitId)) return true;
    return false;
  }, [cardGrowth]);

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

  // 적 타임라인 숨김 조건
  const hideEnemyTimeline = useMemo(() =>
    (dulledLevel >= 2 && battle.phase === 'resolve') ||
    (dulledLevel >= 1 && battle.phase === 'respond'),
    [dulledLevel, battle.phase]
  );

  // 레인 스타일
  const playerLaneStyle = useMemo((): CSSProperties => ({
    width: `${playerRatio * 100}%`,
    overflow: 'hidden'
  }), [playerRatio]);

  const enemyLaneStyle = useMemo((): CSSProperties => ({
    width: `${enemyRatio * 100}%`,
    overflow: 'hidden'
  }), [enemyRatio]);

  // 진행 인디케이터 스타일
  const progressIndicatorStyle = useMemo((): CSSProperties => ({
    left: `${timelineProgress}%`,
    opacity: timelineIndicatorVisible ? 1 : 0,
    transition: 'opacity 0.3s ease-out'
  }), [timelineProgress, timelineIndicatorVisible]);

  // sp 오프셋 계산
  const spOffsets = useMemo(() => {
    const offsets: number[] = [];
    const spCounts = new Map<number, number>();
    playerTimeline.forEach((a) => {
      const sp = a.sp ?? 0;
      const currentCount = spCounts.get(sp) || 0;
      offsets.push(currentCount);
      spCounts.set(sp, currentCount + 1);
    });
    return offsets;
  }, [playerTimeline]);

  const enemySpOffsets = useMemo(() => {
    const offsets: number[] = [];
    const spCounts = new Map<number, number>();
    enemyTimeline.forEach((a) => {
      const sp = a.sp ?? 0;
      const currentCount = spCounts.get(sp) || 0;
      offsets.push(currentCount);
      spCounts.set(sp, currentCount + 1);
    });
    return offsets;
  }, [enemyTimeline]);

  // 여유/무리 범위 계산 (분리된 훅 사용)
  const leisureCardRanges = useLeisureRanges({ playerTimeline, spOffsets, cardGrowth });
  const strainCardRanges = useStrainRanges({ playerTimeline, spOffsets, cardGrowth });

  // 드래그 훅
  const {
    playerLaneRef,
    draggingCardUid,
    draggingType,
    handleMouseMove,
    handleLeisureDragStart,
    handleStrainDragStart,
    handleDragEnd,
  } = useTimelineDrag({
    phase: battle.phase,
    playerMax,
    leisureCardRanges,
    strainCardRanges,
    onLeisurePositionChange: actions.onLeisurePositionChange,
    onStrainOffsetChange: actions.onStrainOffsetChange,
  });

  return (
    <>
      {/* 타임라인 숫자 오버레이 */}
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

      {/* Timeline 컨테이너 */}
      <div style={TIMELINE_CONTAINER_STYLE} data-testid="timeline-container">
        <div className="panel-enhanced timeline-panel" style={TIMELINE_PANEL_STYLE} data-testid="timeline-panel">
          <div className="timeline-body" style={TIMELINE_BODY_STYLE} data-testid="timeline-body">
            {/* 진행 인디케이터 (시곗바늘) */}
            {battle.phase === 'resolve' && (
              <div className="timeline-progress-indicator" style={progressIndicatorStyle} />
            )}

            <div className="timeline-lanes" style={TIMELINE_LANES_STYLE} data-testid="timeline-lanes">
              {/* 통찰 오버레이 */}
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

              {/* 오버드라이브 뱃지 */}
              {enemyOverdriveVisible && (
                <div style={OVERDRIVE_BADGE_STYLE}>
                  <span role="img" aria-label="overdrive">{String.fromCodePoint(0x2728)}</span> {enemyOverdriveLabel}
                </div>
              )}

              {/* 플레이어 레인 */}
              <div
                ref={playerLaneRef}
                className="timeline-lane player-lane"
                data-testid="player-timeline-lane"
                style={playerLaneStyle}
                onMouseMove={handleMouseMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
              >
                {/* 그리드라인 */}
                {Array.from({ length: playerMax + 1 }, (_, i) => (
                  <div key={`p-grid-${i}`} className="timeline-gridline" style={{ left: `${(i / playerMax) * 100}%` }} />
                ))}

                {/* 여유 범위 인디케이터 */}
                {battle.phase === 'respond' && leisureCardRanges.map((range) => (
                  <LeisureRangeIndicator
                    key={`leisure-range-${range.cardUid}`}
                    range={range}
                    playerMax={playerMax}
                    isDragging={draggingCardUid === range.cardUid}
                  />
                ))}

                {/* 무리 범위 인디케이터 */}
                {battle.phase === 'respond' && strainCardRanges.map((range) => (
                  <StrainRangeIndicator
                    key={`strain-range-${range.cardUid}`}
                    range={range}
                    playerMax={playerMax}
                    isDragging={draggingCardUid === range.cardUid && draggingType === 'strain'}
                  />
                ))}

                {/* 패리 범위 인디케이터 */}
                {(Array.isArray(parryReadyStates) ? parryReadyStates : []).map((parryState, parryIdx) => (
                  <ParryRangeIndicator
                    key={`parry-${parryIdx}`}
                    parryState={parryState}
                    parryIdx={parryIdx}
                    playerMax={playerMax}
                    timelineProgress={timelineProgress}
                  />
                ))}

                {/* 플레이어 카드 마커 */}
                {playerTimeline.map((a, idx) => {
                  const strengthBonus = player.strength || 0;
                  const hasGrowingDef = hasSpecial(a.card as Card, 'growingDefense');
                  const currentTimelineSp = battle.phase === 'resolve'
                    ? Math.floor((timelineProgress / 100) * playerMax)
                    : 0;
                  const globalIdx = battle.phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                  const cardAlreadyUsed = globalIdx !== -1 && globalIdx < qIndex;
                  const growingDefenseBonus = hasGrowingDef
                    ? (cardAlreadyUsed ? Math.max(0, currentTimelineSp - (a.sp || 0)) : 0)
                    : 0;

                  const globalIndex = battle.phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                  const isExecuting = executingCardIndex === globalIndex;
                  const isUsed = Array.isArray(usedCardIndices) && usedCardIndices.includes(globalIndex) && globalIndex < qIndex;

                  const hasLeisure = hasCardTrait(a.card, 'leisure');
                  const hasStrain = hasCardTrait(a.card, 'strain');
                  const cardUid = (a.card as { __handUid?: string; __uid?: string }).__handUid || (a.card as { __uid?: string }).__uid || `card-${idx}`;
                  const currentStrainOffset = (a.card as { strainOffset?: number }).strainOffset || 0;

                  return (
                    <PlayerTimelineMarker
                      key={idx}
                      action={a}
                      idx={idx}
                      playerMax={playerMax}
                      offset={spOffsets[idx] * 28}
                      strengthBonus={strengthBonus}
                      growingDefenseBonus={growingDefenseBonus}
                      isExecuting={isExecuting}
                      isUsed={isUsed}
                      hasLeisure={hasLeisure}
                      hasStrain={hasStrain}
                      isDragging={draggingCardUid === cardUid && draggingType === 'leisure'}
                      isStrainDragging={draggingCardUid === cardUid && draggingType === 'strain'}
                      currentStrainOffset={currentStrainOffset}
                      canDrag={hasLeisure && battle.phase === 'respond'}
                      canDragStrain={hasStrain && battle.phase === 'respond'}
                      phase={battle.phase}
                      onLeisureDragStart={handleLeisureDragStart}
                      onStrainDragStart={handleStrainDragStart}
                    />
                  );
                })}
              </div>

              {/* 적 레인 */}
              <div className="timeline-lane enemy-lane" style={enemyLaneStyle} data-testid="enemy-timeline-lane">
                {!hideEnemyTimeline && (
                  <>
                    {Array.from({ length: enemyMax + 1 }, (_, i) => (
                      <div key={`e-grid-${i}`} className="timeline-gridline" style={{ left: `${(i / enemyMax) * 100}%` }} />
                    ))}
                    {enemyTimeline.map((a, idx) => {
                      const globalIndex = battle.phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                      const isExecuting = executingCardIndex === globalIndex;
                      const isUsed = Array.isArray(usedCardIndices) && usedCardIndices.includes(globalIndex) && globalIndex < qIndex;
                      const isDestroying = destroyingEnemyCards.includes(idx);
                      const isFreezing = freezingEnemyCards.includes(idx);
                      const isFrozen = frozenOrder > 0 && !isFreezing;
                      const levelForTooltip = battle.phase === 'select' ? (insightReveal?.level || 0) : (effectiveInsight || 0);
                      const canShowTooltip = levelForTooltip >= 3;
                      const normalizedPosition = Math.min(((a.sp ?? 0) / enemyMax) * 100, 100);

                      return (
                        <EnemyTimelineMarker
                          key={idx}
                          action={a}
                          idx={idx}
                          enemyMax={enemyMax}
                          offset={enemySpOffsets[idx] * 28}
                          isExecuting={isExecuting}
                          isUsed={isUsed}
                          isDestroying={isDestroying}
                          isFreezing={isFreezing}
                          isFrozen={isFrozen}
                          canShowTooltip={canShowTooltip}
                          onMouseEnter={(e) => {
                            if (!canShowTooltip) return;
                            actions.setHoveredEnemyAction({
                              action: a.card,
                              idx,
                              left: normalizedPosition,
                              top: 6 + enemySpOffsets[idx] * 28,
                              pageX: e.clientX,
                              pageY: e.clientY,
                            });
                          }}
                          onMouseLeave={() => actions.setHoveredEnemyAction(null)}
                        />
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
