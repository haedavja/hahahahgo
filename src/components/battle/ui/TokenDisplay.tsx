/**
 * TokenDisplay.tsx
 *
 * 토큰 표시 컴포넌트
 * 최적화: React.memo + 스타일 상수 추출
 */

import { useState, FC, memo, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { getAllTokens } from '../../../lib/tokenUtils';
import { TOKEN_COLORS, TOKEN_CATEGORY_COLORS } from '../../../data/tokens';
import type { TokenData, TokenState, TokenEntity as Entity } from '../../../types';

// =====================
// 스타일 상수
// =====================

const BADGE_WRAPPER_STYLE: CSSProperties = {
  position: 'relative',
  display: 'inline-block'
};

const BADGE_BASE_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '2px',
  padding: '4px 6px',
  borderRadius: '8px',
  fontSize: '1.2rem',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const STACK_SMALL_STYLE: CSSProperties = {
  fontSize: '0.7rem',
  fontWeight: 'bold',
  color: '#1e293b'
};

const ROULETTE_STACK_STYLE: CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 'bold',
  color: '#1e293b',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  lineHeight: 1
};

const TOOLTIP_HEADER_STYLE: CSSProperties = {
  fontSize: '1rem',
  fontWeight: 'bold',
  marginBottom: '6px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px'
};

const TOOLTIP_EMOJI_STYLE: CSSProperties = {
  fontSize: '1.2rem'
};

const TOOLTIP_DURATION_STYLE: CSSProperties = {
  fontSize: '0.75rem',
  marginBottom: '6px',
  opacity: 0.8
};

const TOOLTIP_DESC_STYLE: CSSProperties = {
  fontSize: '0.85rem',
  color: '#e2e8f0',
  lineHeight: 1.5
};

const TOKEN_GROUP_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px',
  alignItems: 'center'
};

const COUNTER_STYLE: CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  fontSize: '0.9rem',
  fontWeight: 'bold'
};

interface TokenBadgeProps {
  token: TokenData;
  onClick?: () => void;
}

/**
 * 단일 토큰 배지 컴포넌트
 */
const TokenBadge: FC<TokenBadgeProps> = memo(({ token, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const bgColor = TOKEN_COLORS[token.durationType];
  const borderColor = TOKEN_CATEGORY_COLORS[token.category];

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const badgeStyle = useMemo((): CSSProperties => ({
    ...BADGE_BASE_STYLE,
    background: bgColor,
    border: `2px solid ${borderColor}`,
    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
    boxShadow: isHovered ? `0 0 12px ${borderColor}` : 'none'
  }), [bgColor, borderColor, isHovered]);

  const tooltipStyle = useMemo((): CSSProperties => ({
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: '8px',
    background: 'rgba(15, 23, 42, 0.98)',
    border: `2px solid ${borderColor}`,
    borderRadius: '8px',
    padding: '12px 16px',
    minWidth: '220px',
    maxWidth: '300px',
    boxShadow: `0 4px 20px ${borderColor}66`,
    zIndex: 10000,
    pointerEvents: 'none',
    whiteSpace: 'normal'
  }), [borderColor]);

  const durationText = token.durationType === 'usage' ? '사용소모' : token.durationType === 'turn' ? '턴소모' : '반영구';
  const isRoulette = token.id === 'roulette';

  return (
    <div
      style={BADGE_WRAPPER_STYLE}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <div style={badgeStyle}>
        <span>{token.emoji}</span>
        {/* 룰렛 토큰: x{횟수} {확률}% 형식으로 표시 */}
        {isRoulette && token.stacks >= 1 && (
          <span style={ROULETTE_STACK_STYLE}>
            <span>x{token.stacks}</span>
            <span style={{ color: '#dc2626' }}>{token.stacks * 5}%</span>
          </span>
        )}
        {/* 일반 토큰: 스택만 표시 */}
        {!isRoulette && token.stacks > 1 && (
          <span style={STACK_SMALL_STYLE}>
            {token.stacks}
          </span>
        )}
      </div>

      {/* 툴팁 */}
      {isHovered && (
        <div style={tooltipStyle}>
          <div style={{ ...TOOLTIP_HEADER_STYLE, color: borderColor }}>
            <span style={TOOLTIP_EMOJI_STYLE}>{token.emoji}</span>
            {token.name}
            {isRoulette && token.stacks >= 1 && (
              <span style={{ color: '#dc2626' }}>({token.stacks * 5}%)</span>
            )}
            {!isRoulette && token.stacks > 1 && <span style={{ color: bgColor }}>×{token.stacks}</span>}
          </div>
          <div style={{ ...TOOLTIP_DURATION_STYLE, color: bgColor }}>
            {durationText}
          </div>
          <div style={TOOLTIP_DESC_STYLE}>
            {isRoulette
              ? `총격 ${token.stacks}회 사용. 다음 총격 시 ${token.stacks * 5}% 확률로 탄걸림.`
              : token.description}
          </div>
        </div>
      )}
    </div>
  );
});

interface TokenDisplayProps {
  entity: Entity | null;
  position?: 'player' | 'enemy';
}

/**
 * 토큰 표시 컴포넌트
 */
export const TokenDisplay: FC<TokenDisplayProps> = memo(({ entity, position = 'player' }) => {
  const isPlayer = position === 'player';

  // 토큰 그룹화 메모이제이션
  const { permanentTokens, usageTokens, turnTokens, hasTokens } = useMemo(() => {
    if (!entity || !entity.tokens) {
      return { permanentTokens: [], usageTokens: [], turnTokens: [], hasTokens: false };
    }
    const allTokens = getAllTokens(entity) as TokenData[];
    return {
      permanentTokens: allTokens.filter(t => t.durationType === 'permanent'),
      usageTokens: allTokens.filter(t => t.durationType === 'usage'),
      turnTokens: allTokens.filter(t => t.durationType === 'turn'),
      hasTokens: allTokens.length > 0
    };
  }, [entity]);

  const containerStyle = useMemo((): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    alignItems: isPlayer ? 'flex-start' : 'flex-end',
    marginTop: '8px'
  }), [isPlayer]);

  if (!hasTokens) return null;

  return (
    <div style={containerStyle}>
      {/* 반영구 토큰 */}
      {permanentTokens.length > 0 && (
        <div style={TOKEN_GROUP_STYLE}>
          {permanentTokens.map((token, idx) => (
            <TokenBadge key={`${token.id}-${idx}`} token={token} />
          ))}
        </div>
      )}

      {/* 사용소모 토큰 */}
      {usageTokens.length > 0 && (
        <div style={TOKEN_GROUP_STYLE}>
          {usageTokens.map((token, idx) => (
            <TokenBadge key={`${token.id}-${idx}`} token={token} />
          ))}
        </div>
      )}

      {/* 턴소모 토큰 */}
      {turnTokens.length > 0 && (
        <div style={TOKEN_GROUP_STYLE}>
          {turnTokens.map((token, idx) => (
            <TokenBadge key={`${token.id}-${idx}`} token={token} />
          ))}
        </div>
      )}
    </div>
  );
});

interface TokenCounterProps {
  entity: Entity | null;
}

/**
 * 간소화된 토큰 카운터 (아이콘만 표시)
 */
export const TokenCounter: FC<TokenCounterProps> = memo(({ entity }) => {
  const { positiveCount, negativeCount } = useMemo(() => {
    if (!entity || !entity.tokens) {
      return { positiveCount: 0, negativeCount: 0 };
    }
    const allTokens = getAllTokens(entity) as TokenData[];
    return {
      positiveCount: allTokens.filter(t => t.category === 'positive').reduce((sum, t) => sum + t.stacks, 0),
      negativeCount: allTokens.filter(t => t.category === 'negative').reduce((sum, t) => sum + t.stacks, 0)
    };
  }, [entity]);

  if (positiveCount === 0 && negativeCount === 0) return null;

  return (
    <div style={COUNTER_STYLE}>
      {positiveCount > 0 && (
        <span style={{ color: TOKEN_CATEGORY_COLORS.positive }}>
          ✨ {positiveCount}
        </span>
      )}
      {negativeCount > 0 && (
        <span style={{ color: TOKEN_CATEGORY_COLORS.negative }}>
          💀 {negativeCount}
        </span>
      )}
    </div>
  );
});
