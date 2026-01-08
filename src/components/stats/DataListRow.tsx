/**
 * @file DataListRow.tsx
 * @description 데이터 리스트 행 컴포넌트 - 라벨, 값, 부가 정보를 포함하는 확장 행
 */

import { memo } from 'react';
import type { ReactNode } from 'react';
import { STAT_ROW_STYLE, STAT_LABEL_STYLE, STAT_VALUE_STYLE, STATS_COLORS } from './styles';

export interface DataListRowProps {
  /** 라벨 (왼쪽) */
  label: ReactNode;
  /** 값 (오른쪽) */
  value: ReactNode;
  /** 값 색상 */
  valueColor?: string;
  /** 하위 상세 정보 */
  subtext?: ReactNode;
  /** 하위 정보 색상 */
  subtextColor?: string;
  /** 추가 배지 (ConfidenceBadge 등) */
  badge?: ReactNode;
}

/**
 * 데이터 리스트 행 컴포넌트
 * 몬스터, 카드, 상징 등의 통계 표시에 사용
 */
export const DataListRow = memo(function DataListRow({
  label,
  value,
  valueColor = STATS_COLORS.value,
  subtext,
  subtextColor = STATS_COLORS.textMuted,
  badge,
}: DataListRowProps) {
  return (
    <div style={{ ...STAT_ROW_STYLE, flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={STAT_LABEL_STYLE}>{label}</span>
        <span style={{ ...STAT_VALUE_STYLE, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: valueColor }}>{value}</span>
          {badge}
        </span>
      </div>
      {subtext && (
        <div style={{ fontSize: '11px', color: subtextColor }}>
          {subtext}
        </div>
      )}
    </div>
  );
});
