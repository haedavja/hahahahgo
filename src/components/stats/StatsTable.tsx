/**
 * @file StatsTable.tsx
 * @description 통계 테이블 컴포넌트 - 목록 데이터를 테이블로 표시
 */

import { memo } from 'react';
import { TABLE_STYLE, TH_STYLE, TD_STYLE } from './styles';

export interface StatsTableColumn<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface StatsTableProps<T> {
  data: T[];
  columns: StatsTableColumn<T>[];
  keyExtractor: (item: T, index: number) => string;
  emptyMessage?: string;
}

function StatsTableInner<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = '데이터 없음',
}: StatsTableProps<T>) {
  if (data.length === 0) {
    return (
      <div style={{ color: '#64748b', textAlign: 'center', padding: '16px' }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <table style={TABLE_STYLE}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{ ...TH_STYLE, textAlign: col.align || 'left' }}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((item, index) => (
          <tr key={keyExtractor(item, index)}>
            {columns.map((col) => (
              <td
                key={col.key}
                style={{ ...TD_STYLE, textAlign: col.align || 'left' }}
              >
                {col.render
                  ? col.render(item, index)
                  : (item as Record<string, unknown>)[col.key] as React.ReactNode}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export const StatsTable = memo(StatsTableInner) as typeof StatsTableInner;
