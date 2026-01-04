/**
 * @file StatRow.tsx
 * @description 통계 행 컴포넌트 - 라벨과 값을 한 줄로 표시
 */

import { memo } from 'react';
import { STAT_ROW_STYLE, STAT_LABEL_STYLE, STAT_VALUE_STYLE, STATS_COLORS } from './styles';

export interface StatRowProps {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}

export const StatRow = memo(function StatRow({
  label,
  value,
  valueColor = STATS_COLORS.value,
}: StatRowProps) {
  return (
    <div style={STAT_ROW_STYLE}>
      <span style={STAT_LABEL_STYLE}>{label}</span>
      <span style={{ ...STAT_VALUE_STYLE, color: valueColor }}>
        {value}
      </span>
    </div>
  );
});
