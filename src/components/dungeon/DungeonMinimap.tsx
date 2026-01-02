/**
 * 던전 미니맵 컴포넌트
 * 메트로배니아 스타일 던전 탐색을 위한 미니맵
 */
import React, { useMemo, useCallback, memo } from 'react';
import { DUNGEON_NODE_TYPES, CONNECTION_TYPES } from '../../data/dungeonNodes';

interface DungeonConnection {
  targetId: string;
  type?: string;
  unlocked?: boolean;
}

type DungeonConnections = Record<string, DungeonConnection[]>;

interface DungeonNode {
  id: string;
  type: string;
  name: string;
  description: string;
  x?: number;
  y?: number;
  visited: boolean;
  cleared: boolean;
  hidden?: boolean;
}

interface DungeonState {
  nodes: DungeonNode[];
  connections: Record<string, DungeonConnection[]>;
  currentNodeId: string;
  unlockedShortcuts?: string[];
  discoveredHidden?: string[];
}

interface DungeonMinimapProps {
  dungeonState: DungeonState;
  onNodeClick?: (nodeId: string) => void;
  playerStats?: unknown;
}

interface LegendItemProps {
  color: string;
  label: string;
  dashed: boolean;
}

// 노드 타입별 색상
const NODE_COLORS = {
  [DUNGEON_NODE_TYPES.ENTRANCE]: '#22c55e',   // 녹색
  [DUNGEON_NODE_TYPES.EXIT]: '#eab308',       // 노란색
  [DUNGEON_NODE_TYPES.ROOM]: '#3b82f6',       // 파란색
  [DUNGEON_NODE_TYPES.CORRIDOR]: '#64748b',   // 회색
  [DUNGEON_NODE_TYPES.CROSSROAD]: '#8b5cf6',  // 보라색
  [DUNGEON_NODE_TYPES.TREASURE]: '#f59e0b',   // 주황색
  [DUNGEON_NODE_TYPES.BOSS]: '#ef4444',       // 빨간색
  [DUNGEON_NODE_TYPES.SHORTCUT]: '#06b6d4',   // 청록색
};

// 노드 타입별 아이콘
const NODE_ICONS = {
  [DUNGEON_NODE_TYPES.ENTRANCE]: '▶',
  [DUNGEON_NODE_TYPES.EXIT]: '◀',
  [DUNGEON_NODE_TYPES.ROOM]: '□',
  [DUNGEON_NODE_TYPES.CORRIDOR]: '─',
  [DUNGEON_NODE_TYPES.CROSSROAD]: '◇',
  [DUNGEON_NODE_TYPES.TREASURE]: '★',
  [DUNGEON_NODE_TYPES.BOSS]: '☠',
};

export const DungeonMinimap = memo(function DungeonMinimap({ dungeonState, onNodeClick, playerStats }: DungeonMinimapProps) {
  if (!dungeonState?.nodes || !dungeonState?.connections) {
    return null;
  }

  const { nodes, connections, currentNodeId, unlockedShortcuts, discoveredHidden } = dungeonState;

  // 미니맵 그리드 범위 계산
  const bounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    nodes.forEach((node: DungeonNode) => {
      if (node.hidden && !discoveredHidden?.includes(node.id)) return;
      if (node.x !== undefined) {
        minX = Math.min(minX, node.x);
        maxX = Math.max(maxX, node.x);
      }
      if (node.y !== undefined) {
        minY = Math.min(minY, node.y);
        maxY = Math.max(maxY, node.y);
      }
    });

    return { minX, maxX, minY, maxY };
  }, [nodes, discoveredHidden]);

  // 연결선 렌더링
  const renderConnections = useCallback(() => {
    const lines: React.ReactElement[] = [];
    const cellSize = 50;
    const offsetX = -bounds.minX;
    const offsetY = -bounds.minY;

    Object.entries(connections as DungeonConnections).forEach(([fromId, conns]: [string, DungeonConnection[]]) => {
      const fromNode = nodes.find((n: DungeonNode) => n.id === fromId);
      if (!fromNode || fromNode.x === undefined || fromNode.y === undefined) return;
      if (fromNode.hidden && !discoveredHidden?.includes(fromId)) return;

      const fromX = fromNode.x;
      const fromY = fromNode.y;

      conns.forEach((conn: DungeonConnection, idx: number) => {
        const toNode = nodes.find((n: DungeonNode) => n.id === conn.targetId);
        if (!toNode || toNode.x === undefined || toNode.y === undefined) return;
        if (toNode.hidden && !discoveredHidden?.includes(conn.targetId)) return;

        const x1 = (fromX + offsetX) * cellSize + cellSize / 2;
        const y1 = (fromY + offsetY) * cellSize + cellSize / 2;
        const x2 = (toNode.x + offsetX) * cellSize + cellSize / 2;
        const y2 = (toNode.y + offsetY) * cellSize + cellSize / 2;

        // 연결 타입에 따른 스타일
        let strokeColor = '#475569';
        let strokeDash = 'none';
        let strokeWidth = 2;

        if (conn.type === CONNECTION_TYPES.STAT_GATE && !conn.unlocked) {
          strokeColor = '#f59e0b';
          strokeDash = '4,4';
        } else if (conn.type === CONNECTION_TYPES.ITEM_GATE && !conn.unlocked) {
          strokeColor = '#8b5cf6';
          strokeDash = '4,4';
        } else if (conn.type === CONNECTION_TYPES.ONE_WAY) {
          strokeColor = '#06b6d4';
        } else if (conn.type === CONNECTION_TYPES.LOCKED) {
          if (unlockedShortcuts?.includes(conn.targetId)) {
            strokeColor = '#22c55e';
          } else {
            strokeColor = '#ef4444';
            strokeDash = '2,2';
          }
        }

        // 방문한 노드 간의 연결은 더 밝게
        if (fromNode.visited && toNode.visited) {
          strokeWidth = 3;
        }

        lines.push(
          <line
            key={`${fromId}-${conn.targetId}-${idx}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
            opacity={0.6}
          />
        );
      });
    });

    return lines;
  }, [nodes, connections, bounds, discoveredHidden, unlockedShortcuts]);

  // 노드 렌더링
  const renderNodes = useCallback(() => {
    const cellSize = 50;
    const nodeSize = 32;
    const offsetX = -bounds.minX;
    const offsetY = -bounds.minY;

    return nodes.map((node: DungeonNode) => {
      // 숨겨진 노드 체크
      if (node.hidden && !discoveredHidden?.includes(node.id)) {
        return null;
      }

      if (node.x === undefined || node.y === undefined) return null;

      const x = (node.x + offsetX) * cellSize + (cellSize - nodeSize) / 2;
      const y = (node.y + offsetY) * cellSize + (cellSize - nodeSize) / 2;
      const isCurrent = node.id === currentNodeId;
      const isVisited = node.visited;

      const bgColor = isVisited
        ? NODE_COLORS[node.type] || '#475569'
        : '#1e293b';
      const borderColor = isCurrent
        ? '#fff'
        : isVisited
          ? NODE_COLORS[node.type] || '#475569'
          : '#334155';

      return (
        <g
          key={node.id}
          style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
          onClick={() => onNodeClick?.(node.id)}
        >
          {/* 현재 위치 표시 (빛나는 효과) */}
          {isCurrent && (
            <circle
              cx={x + nodeSize / 2}
              cy={y + nodeSize / 2}
              r={nodeSize / 2 + 4}
              fill="none"
              stroke="#fff"
              strokeWidth="2"
              opacity="0.5"
            >
              <animate
                attributeName="opacity"
                values="0.5;1;0.5"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </circle>
          )}

          {/* 노드 배경 */}
          <rect
            x={x}
            y={y}
            width={nodeSize}
            height={nodeSize}
            rx={6}
            fill={bgColor}
            stroke={borderColor}
            strokeWidth={isCurrent ? 3 : 2}
            opacity={isVisited ? 1 : 0.5}
          />

          {/* 노드 아이콘 */}
          <text
            x={x + nodeSize / 2}
            y={y + nodeSize / 2 + 5}
            textAnchor="middle"
            fill={isVisited ? '#fff' : '#64748b'}
            fontSize="14"
            fontWeight="bold"
          >
            {isVisited ? NODE_ICONS[node.type] || '?' : '?'}
          </text>
        </g>
      );
    });
  }, [nodes, bounds, currentNodeId, discoveredHidden, onNodeClick]);

  // SVG 크기 계산
  const cellSize = 50;
  const width = (bounds.maxX - bounds.minX + 1) * cellSize + 20;
  const height = (bounds.maxY - bounds.minY + 1) * cellSize + 20;

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.95)',
      borderRadius: '12px',
      padding: '12px',
      border: '1px solid #334155',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>
          던전 지도
        </span>
        <span style={{ color: '#64748b', fontSize: '11px' }}>
          {nodes.filter((n: DungeonNode) => n.visited).length}/{nodes.filter((n: DungeonNode) => !n.hidden || discoveredHidden?.includes(n.id)).length} 탐색
        </span>
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ display: 'block' }}
      >
        <g transform="translate(10, 10)">
          {renderConnections()}
          {renderNodes()}
        </g>
      </svg>

      {/* 범례 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '8px',
        flexWrap: 'wrap',
      }}>
        <LegendItem color="#22c55e" label="입구" dashed={false} />
        <LegendItem color="#eab308" label="출구" dashed={false} />
        <LegendItem color="#f59e0b" label="보물" dashed={false} />
        <LegendItem color="#f59e0b" dashed={true} label="관문" />
        <LegendItem color="#06b6d4" label="숏컷" dashed={false} />
        <LegendItem color="#ef4444" dashed={true} label="잠김" />
      </div>
    </div>
  );
});

const LegendItem = memo(function LegendItem({ color, label, dashed }: LegendItemProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{
        width: '16px',
        height: '3px',
        background: color,
        borderRadius: '2px',
        ...(dashed && {
          background: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 4px, transparent 4px, transparent 8px)`,
        }),
      }} />
      <span style={{ color: '#94a3b8', fontSize: '10px' }}>{label}</span>
    </div>
  );
});

export default DungeonMinimap;
