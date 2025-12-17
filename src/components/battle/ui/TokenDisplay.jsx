/**
 * TokenDisplay.jsx
 *
 * 토큰 표시 컴포넌트
 */

import React, { useState } from 'react';
import { getAllTokens } from '../../../lib/tokenUtils';
import { TOKEN_COLORS, TOKEN_CATEGORY_COLORS, TOKENS } from '../../../data/tokens';

/**
 * 단일 토큰 배지 컴포넌트
 */
const TokenBadge = ({ token, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const bgColor = TOKEN_COLORS[token.durationType];
  const borderColor = TOKEN_CATEGORY_COLORS[token.category];

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '4px 6px',
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: '8px',
          fontSize: '1.2rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          boxShadow: isHovered ? `0 0 12px ${borderColor}` : 'none'
        }}
      >
        <span>{token.emoji}</span>
        {/* 룰렛 토큰: x{횟수} {확률}% 형식으로 표시 */}
        {token.id === 'roulette' && token.stacks >= 1 && (
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 'bold',
            color: '#1e293b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: 1
          }}>
            <span>x{token.stacks}</span>
            <span style={{ color: '#dc2626' }}>{token.stacks * 5}%</span>
          </span>
        )}
        {/* 일반 토큰: 스택만 표시 */}
        {token.id !== 'roulette' && token.stacks > 1 && (
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 'bold',
            color: '#1e293b'
          }}>
            {token.stacks}
          </span>
        )}
      </div>

      {/* 툴팁 */}
      {isHovered && (
        <div
          style={{
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
          }}
        >
          <div style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: borderColor,
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>{token.emoji}</span>
            {token.name}
            {token.id === 'roulette' && token.stacks >= 1 && (
              <span style={{ color: '#dc2626' }}>({token.stacks * 5}%)</span>
            )}
            {token.id !== 'roulette' && token.stacks > 1 && <span style={{ color: bgColor }}>×{token.stacks}</span>}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: bgColor,
            marginBottom: '6px',
            opacity: 0.8
          }}>
            {token.durationType === 'usage' ? '사용소모' : token.durationType === 'turn' ? '턴소모' : '반영구'}
          </div>
          <div style={{
            fontSize: '0.85rem',
            color: '#e2e8f0',
            lineHeight: '1.5'
          }}>
            {token.id === 'roulette'
              ? `총격 ${token.stacks}회 사용. 다음 총격 시 ${token.stacks * 5}% 확률로 탄걸림.`
              : token.description}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * 토큰 표시 컴포넌트
 *
 * @param {Object} entity - player 또는 enemy 객체
 * @param {string} position - 배치 위치 ('player' 또는 'enemy')
 */
export const TokenDisplay = ({ entity, position = 'player' }) => {
  if (!entity || !entity.tokens) return null;

  const allTokens = getAllTokens(entity);
  if (allTokens.length === 0) return null;

  // 유형별로 그룹화
  const permanentTokens = allTokens.filter(t => t.durationType === 'permanent');
  const usageTokens = allTokens.filter(t => t.durationType === 'usage');
  const turnTokens = allTokens.filter(t => t.durationType === 'turn');

  const isPlayer = position === 'player';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        alignItems: isPlayer ? 'flex-start' : 'flex-end',
        marginTop: '8px'
      }}
    >
      {/* 반영구 토큰 */}
      {permanentTokens.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          alignItems: 'center'
        }}>
          {permanentTokens.map((token, idx) => (
            <TokenBadge key={`${token.id}-${idx}`} token={token} />
          ))}
        </div>
      )}

      {/* 사용소모 토큰 */}
      {usageTokens.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          alignItems: 'center'
        }}>
          {usageTokens.map((token, idx) => (
            <TokenBadge key={`${token.id}-${idx}`} token={token} />
          ))}
        </div>
      )}

      {/* 턴소모 토큰 */}
      {turnTokens.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          alignItems: 'center'
        }}>
          {turnTokens.map((token, idx) => (
            <TokenBadge key={`${token.id}-${idx}`} token={token} />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 간소화된 토큰 카운터 (아이콘만 표시)
 *
 * @param {Object} entity - player 또는 enemy 객체
 */
export const TokenCounter = ({ entity }) => {
  if (!entity || !entity.tokens) return null;

  const allTokens = getAllTokens(entity);
  if (allTokens.length === 0) return null;

  const positiveCount = allTokens.filter(t => t.category === 'positive').reduce((sum, t) => sum + t.stacks, 0);
  const negativeCount = allTokens.filter(t => t.category === 'negative').reduce((sum, t) => sum + t.stacks, 0);

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      fontSize: '0.9rem',
      fontWeight: 'bold'
    }}>
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
};
