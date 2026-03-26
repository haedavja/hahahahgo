/**
 * @file ConfidenceBadge.tsx
 * @description 신뢰도 배지 컴포넌트 - 샘플 크기 기반 신뢰도 표시
 */

import { memo } from 'react';
import type { CSSProperties } from 'react';
import {
  getConfidenceLevel,
  getConfidenceLevelLabel,
  calculateProportionCI,
  type ConfidenceLevel,
} from '../../simulator/analysis/stats-utils';

export interface ConfidenceBadgeProps {
  /** 샘플 수 */
  sampleSize: number;
  /** 배지 크기 */
  size?: 'small' | 'medium';
  /** 툴팁 표시 여부 */
  showTooltip?: boolean;
}

const BADGE_COLORS: Record<ConfidenceLevel, { bg: string; text: string }> = {
  very_high: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' },
  high: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
  medium: { bg: 'rgba(251, 191, 36, 0.2)', text: '#fbbf24' },
  low: { bg: 'rgba(249, 115, 22, 0.2)', text: '#f97316' },
  very_low: { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
};

const getBadgeStyle = (level: ConfidenceLevel, size: 'small' | 'medium'): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: size === 'small' ? '2px' : '4px',
  padding: size === 'small' ? '1px 4px' : '2px 6px',
  borderRadius: '4px',
  fontSize: size === 'small' ? '9px' : '10px',
  fontWeight: 500,
  background: BADGE_COLORS[level].bg,
  color: BADGE_COLORS[level].text,
  cursor: 'help',
});

/**
 * 신뢰도 배지 - 샘플 크기에 따른 신뢰도 표시
 */
export const ConfidenceBadge = memo(function ConfidenceBadge({
  sampleSize,
  size = 'small',
  showTooltip = true,
}: ConfidenceBadgeProps) {
  const confidence = getConfidenceLevel(sampleSize);
  const label = getConfidenceLevelLabel(confidence.level);

  const tooltip = showTooltip
    ? `신뢰도: ${label} (n=${sampleSize})\n${confidence.warning || '통계적으로 신뢰할 수 있습니다.'}`
    : undefined;

  return (
    <span style={getBadgeStyle(confidence.level, size)} title={tooltip}>
      {label}
    </span>
  );
});

export interface WinRateWithCIProps {
  /** 승리 수 */
  wins: number;
  /** 총 전투 수 */
  total: number;
  /** 신뢰도 배지 표시 여부 */
  showBadge?: boolean;
  /** 신뢰 구간 표시 여부 */
  showCI?: boolean;
  /** 값 색상 */
  valueColor?: string;
}

const VALUE_STYLE: CSSProperties = {
  fontWeight: 'bold',
};

const CI_STYLE: CSSProperties = {
  fontSize: '10px',
  color: '#64748b',
  marginLeft: '4px',
};

/**
 * 승률 + 신뢰 구간 표시 컴포넌트
 */
export const WinRateWithCI = memo(function WinRateWithCI({
  wins,
  total,
  showBadge = true,
  showCI = false,
  valueColor,
}: WinRateWithCIProps) {
  const winRate = total > 0 ? (wins / total) * 100 : 0;
  const ci = calculateProportionCI(wins, total);
  const color = valueColor || (winRate >= 50 ? '#22c55e' : '#ef4444');

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ ...VALUE_STYLE, color }}>{winRate.toFixed(1)}%</span>
      {showCI && total > 0 && (
        <span style={CI_STYLE}>
          [{(ci.lower * 100).toFixed(0)}-{(ci.upper * 100).toFixed(0)}%]
        </span>
      )}
      {showBadge && <ConfidenceBadge sampleSize={total} />}
    </span>
  );
});
