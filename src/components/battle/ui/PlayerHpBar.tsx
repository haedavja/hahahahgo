/**
 * PlayerHpBar.tsx
 *
 * 플레이어 HP 바와 상태 표시 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출
 */

import { useState, FC, ReactNode, memo, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { TokenDisplay } from './TokenDisplay';
import type { TokenState, TokenEntity, HpBarPlayer as Player, StatInfo } from '../../../types';

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  position: 'fixed',
  top: '500px',
  left: '150px',
  zIndex: 3000,
  pointerEvents: 'none'
};

const INNER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  position: 'relative'
};

const HP_AREA_STYLE: CSSProperties = {
  position: 'relative',
  pointerEvents: 'auto'
};

const HP_ROW_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const CHARACTER_STYLE: CSSProperties = {
  fontSize: '64px'
};

const HP_TEXT_STYLE: CSSProperties = {
  color: '#f87171',
  fontSize: '1.25rem',
  fontWeight: 'bold',
  position: 'absolute',
  top: '-30px',
  left: '0'
};

const HP_BAR_STYLE: CSSProperties = {
  width: '200px',
  height: '12px',
  position: 'relative',
  overflow: 'hidden'
};

const STATS_ROW_STYLE: CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginTop: '6px',
  fontSize: '0.9rem',
  fontWeight: 700
};

const TOOLTIP_TRIGGER_STYLE: CSSProperties = {
  position: 'relative',
  cursor: 'help'
};

interface InsightLevelInfo extends StatInfo {}

// 통찰 레벨에 따른 이름과 이모지 (모듈 레벨에서 정의)
const INSIGHT_LEVELS: Record<string, InsightLevelInfo> = {
  '-3': {
    name: '망각',
    emoji: '🌑',
    color: '#1e293b',
    description: '타임라인과 적의 체력, 에테르를 확인할 수 없음.'
  },
  '-2': {
    name: '미련',
    emoji: '🌘',
    color: '#475569',
    description: '진행단계에서 적의 타임라인 확인 불가.'
  },
  '-1': {
    name: '우둔',
    emoji: '🌫️',
    color: '#94a3b8',
    description: '대응단계에서 적의 타임라인 확인 불가.'
  },
  '0': {
    name: '평온',
    emoji: '🌕',
    color: '#e2e8f0',
    description: '선택단계에서 적의 타임라인 카드 3개 확인 가능. (카드 정보 없음)'
  },
  '1': {
    name: '예측',
    emoji: '🔮',
    color: '#c4b5fd',
    description: '선택단계에서 적의 타임라인 카드 2개 확인 가능.'
  },
  '2': {
    name: '독심',
    emoji: '👁️',
    color: '#a78bfa',
    description: '선택단계에서 적의 타임라인 카드를 모두 확인 가능.'
  },
  '3': {
    name: '혜안',
    emoji: '✨',
    color: '#8b5cf6',
    description: '선택단계에서 적의 타임라인을 모두 확인하고 카드의 정보를 확인 가능.'
  }
};

const getInsightLevelInfo = (level: number): InsightLevelInfo => {
  return INSIGHT_LEVELS[level.toString()] || INSIGHT_LEVELS['0'];
};

interface StatTooltipProps {
  stat: StatInfo;
  children: ReactNode;
}

// 상태이상 툴팁 컴포넌트
const StatTooltip: FC<StatTooltipProps> = memo(({ stat, children }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const tooltipStyle = useMemo((): CSSProperties => ({
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
    background: 'rgba(15, 23, 42, 0.98)',
    border: `2px solid ${stat.color}`,
    borderRadius: '8px',
    padding: '12px 16px',
    minWidth: '220px',
    maxWidth: '300px',
    boxShadow: `0 4px 20px ${stat.color}66`,
    zIndex: 10000,
    pointerEvents: 'none',
    whiteSpace: 'normal'
  }), [stat.color]);

  return (
    <span
      style={TOOLTIP_TRIGGER_STYLE}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isHovered && (
        <div style={tooltipStyle}>
          <div style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: stat.color,
            marginBottom: '6px'
          }}>
            {stat.emoji} {stat.name}
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: '#e2e8f0',
            lineHeight: 1.5
          }}>
            {stat.description}
          </div>
        </div>
      )}
    </span>
  );
});

interface PlayerHpBarProps {
  player: Player;
  playerHit: boolean;
  playerBlockAnim: boolean;
  playerOverdriveFlash: boolean;
  effectiveAgility: number;
  dulledLevel: number;
  insightLevel?: number;
}

export const PlayerHpBar: FC<PlayerHpBarProps> = memo(({
  player,
  playerHit,
  playerBlockAnim,
  playerOverdriveFlash,
  effectiveAgility,
  dulledLevel,
  insightLevel
}) => {
  // 블록 오버레이 스타일 메모이제이션
  const blockOverlayStyle = useMemo((): CSSProperties => ({
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: `${Math.min((player.block / player.maxHp) * 100, 100)}%`,
    background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
    borderRight: '2px solid #60a5fa'
  }), [player.block, player.maxHp]);

  // 통찰 레벨 정보 메모이제이션
  const insightInfo = useMemo(() => {
    const level = insightLevel !== undefined ? insightLevel : (dulledLevel > 0 ? -dulledLevel : 0);
    return { level, info: getInsightLevelInfo(level) };
  }, [insightLevel, dulledLevel]);

  // 스탯 정보 메모이제이션
  const strengthStat = useMemo((): StatInfo => ({
    name: '힘',
    emoji: '💪',
    color: '#fbbf24',
    description: `공격력과 방어력을 ${player.strength || 0}만큼 상승.`
  }), [player.strength]);

  const etherMultiplierStat = useMemo((): StatInfo => ({
    name: '에테르 증폭',
    emoji: '💎',
    color: '#a78bfa',
    description: `턴 종료 시 에테르 획득량이 ${player.etherMultiplier}배가 됩니다.`
  }), [player.etherMultiplier]);

  const agilityStat = useMemo((): StatInfo => ({
    name: '민첩',
    emoji: '⚡',
    color: effectiveAgility > 0 ? '#34d399' : '#ef4444',
    description: effectiveAgility > 0
      ? `카드의 시간을 ${Math.abs(effectiveAgility)}만큼 감소.`
      : `카드의 시간을 ${Math.abs(effectiveAgility)}만큼 증가.`
  }), [effectiveAgility]);

  const etherOverflowStat = useMemo((): StatInfo => ({
    name: '에테르 범람',
    emoji: '🌊',
    color: '#a78bfa',
    description: `에테르가 넘쳐흐르는 상태. 턴 종료 시 ${player.etherOverflow}pt의 에테르가 소멸됩니다.`
  }), [player.etherOverflow]);

  return (
    <div style={CONTAINER_STYLE}>
      <div style={INNER_STYLE}>
        <div style={HP_AREA_STYLE}>
          <div style={HP_ROW_STYLE}>
            <div className={`character-display ${playerOverdriveFlash ? 'overdrive-burst' : ''}`} style={CHARACTER_STYLE}>🧙‍♂️</div>
            <div></div>
            <div style={{ position: 'relative' }}>
              <div className={playerHit ? 'hit-animation' : ''} style={HP_TEXT_STYLE}>
                ❤️ {player.hp}/{player.maxHp}
                {player.block > 0 && <span className={playerBlockAnim ? 'block-animation' : ''} style={{ color: '#60a5fa', marginLeft: '8px' }}>🛡️{player.block}</span>}
              </div>
              <div className="hp-bar-enhanced mb-1" style={HP_BAR_STYLE}>
                <div className="hp-fill" style={{ width: `${(player.hp / player.maxHp) * 100}%` }}></div>
                {player.block > 0 && (
                  <div style={blockOverlayStyle}></div>
                )}
              </div>
              <div style={STATS_ROW_STYLE}>
                {(player.strength || 0) !== 0 && (
                  <StatTooltip stat={strengthStat}>
                    <span style={{ color: '#fbbf24' }}>💪 힘 {player.strength || 0}</span>
                  </StatTooltip>
                )}
                {(player.etherMultiplier || 1) > 1 && (
                  <StatTooltip stat={etherMultiplierStat}>
                    <span style={{ color: '#a78bfa' }}>💎 x{player.etherMultiplier}</span>
                  </StatTooltip>
                )}
                {effectiveAgility !== 0 && (
                  <StatTooltip stat={agilityStat}>
                    <span style={{ color: effectiveAgility > 0 ? '#34d399' : '#ef4444' }}>⚡ 민첩 {effectiveAgility}</span>
                  </StatTooltip>
                )}
                {insightInfo.level !== 0 && (
                  <StatTooltip stat={insightInfo.info}>
                    <span style={{ color: insightInfo.info.color }}>{insightInfo.info.emoji} lv{insightInfo.level} {insightInfo.info.name}</span>
                  </StatTooltip>
                )}
                {(player.etherOverflow ?? 0) > 0 && (
                  <StatTooltip stat={etherOverflowStat}>
                    <span style={{ color: '#a78bfa', fontSize: '0.85rem' }}>🌊 범람 {player.etherOverflow} PT</span>
                  </StatTooltip>
                )}
              </div>
              {/* 토큰 표시 */}
              <TokenDisplay entity={player} position="player" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
