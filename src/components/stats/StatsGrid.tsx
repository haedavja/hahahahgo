/**
 * @file StatsGrid.tsx
 * @description 통계 그리드 컴포넌트 - 카드 형태로 통계 표시
 */

import { memo } from 'react';
import { STATS_GRID_STYLE, STAT_ITEM_STYLE, STAT_LABEL_STYLE, STAT_VALUE_STYLE, STATS_COLORS } from './styles';

export interface StatItem {
  label: string;
  value: React.ReactNode;
  valueColor?: string;
}

export interface StatsGridProps {
  items: StatItem[];
  columns?: number;
}

export const StatsGrid = memo(function StatsGrid({
  items,
  columns,
}: StatsGridProps) {
  const gridStyle = columns
    ? { ...STATS_GRID_STYLE, gridTemplateColumns: `repeat(${columns}, 1fr)` }
    : STATS_GRID_STYLE;

  return (
    <div style={gridStyle}>
      {items.map((item, index) => (
        <div key={index} style={STAT_ITEM_STYLE}>
          <div style={{ ...STAT_LABEL_STYLE, fontSize: '0.75rem' }}>{item.label}</div>
          <div style={{ ...STAT_VALUE_STYLE, color: item.valueColor || STATS_COLORS.value, fontSize: '1rem' }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
});
