/**
 * @file MapLog.tsx
 * @description 맵 화면 우측 하단 활동 로그 컴포넌트
 *
 * 전투 결과, 이벤트 선택, 상점 거래 등을 표시합니다.
 */

import { memo, useState, type CSSProperties } from 'react';
import { useGameStore } from '../../../state/gameStore';
import type { MapLogEntry, MapLogType } from '../../../state/slices/types';

/** 로그 타입별 아이콘 */
const LOG_TYPE_ICONS: Record<MapLogType, string> = {
  battle: '⚔️',
  event: '📜',
  shop: '🛒',
  rest: '🏕️',
  dungeon: '🏰',
  item: '🎒',
  relic: '✨',
  system: '📢',
};

/** 로그 타입별 색상 */
const LOG_TYPE_COLORS: Record<MapLogType, string> = {
  battle: '#ef4444',
  event: '#f59e0b',
  shop: '#10b981',
  rest: '#06b6d4',
  dungeon: '#8b5cf6',
  item: '#ec4899',
  relic: '#fbbf24',
  system: '#94a3b8',
};

/** 컨테이너 스타일 */
const containerStyle: CSSProperties = {
  position: 'fixed',
  bottom: '12px',
  right: '12px',
  width: '280px',
  maxHeight: '200px',
  backgroundColor: 'rgba(15, 23, 42, 0.9)',
  borderRadius: '8px',
  border: '1px solid rgba(71, 85, 105, 0.5)',
  overflow: 'hidden',
  zIndex: 100,
  fontFamily: 'monospace',
  fontSize: '12px',
};

/** 헤더 스타일 */
const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 10px',
  backgroundColor: 'rgba(30, 41, 59, 0.8)',
  borderBottom: '1px solid rgba(71, 85, 105, 0.5)',
  cursor: 'pointer',
  userSelect: 'none',
};

/** 로그 목록 스타일 */
const logListStyle: CSSProperties = {
  maxHeight: '160px',
  overflowY: 'auto',
  padding: '4px 0',
};

/** 로그 항목 스타일 */
const getLogItemStyle = (type: MapLogType): CSSProperties => ({
  padding: '4px 10px',
  borderLeft: `3px solid ${LOG_TYPE_COLORS[type]}`,
  marginLeft: '4px',
  marginBottom: '2px',
});

/** 로그 메시지 스타일 */
const logMessageStyle: CSSProperties = {
  color: '#e2e8f0',
  lineHeight: 1.3,
};

/** 로그 상세 스타일 */
const logDetailStyle: CSSProperties = {
  color: '#94a3b8',
  fontSize: '11px',
  marginTop: '2px',
};

/** 빈 상태 스타일 */
const emptyStyle: CSSProperties = {
  color: '#64748b',
  textAlign: 'center',
  padding: '16px',
};

/** 로그 항목 컴포넌트 */
const LogItem = memo(({ entry }: { entry: MapLogEntry }) => {
  const icon = entry.icon || LOG_TYPE_ICONS[entry.type];

  return (
    <div style={getLogItemStyle(entry.type)}>
      <div style={logMessageStyle}>
        <span style={{ marginRight: '6px' }}>{icon}</span>
        {entry.message}
      </div>
      {entry.details && (
        <div style={logDetailStyle}>{entry.details}</div>
      )}
    </div>
  );
});

LogItem.displayName = 'LogItem';

/** 맵 로그 컴포넌트 */
export const MapLog = memo(() => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const mapLogs = useGameStore((state) => state.mapLogs);

  // 로그가 없으면 표시하지 않음
  if (mapLogs.length === 0) {
    return null;
  }

  return (
    <div style={containerStyle}>
      <div
        style={headerStyle}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <span style={{ color: '#e2e8f0', fontWeight: 600 }}>
          📋 활동 로그 ({mapLogs.length})
        </span>
        <span style={{ color: '#94a3b8' }}>
          {isCollapsed ? '▲' : '▼'}
        </span>
      </div>

      {!isCollapsed && (
        <div style={logListStyle}>
          {mapLogs.length === 0 ? (
            <div style={emptyStyle}>아직 기록이 없습니다</div>
          ) : (
            mapLogs.slice(0, 20).map((entry) => (
              <LogItem key={entry.id} entry={entry} />
            ))
          )}
        </div>
      )}
    </div>
  );
});

MapLog.displayName = 'MapLog';

export default MapLog;
