/**
 * MapTab.tsx
 * 맵 관리 탭
 */

import { useState, useMemo, useCallback, memo, ChangeEvent } from 'react';
import { OBSTACLE_TEMPLATES } from '../../../data/dungeonNodes';
import type { MapNode, GameMap } from '../../../types';

// 스타일 상수
const NODE_EMOJIS: Record<string, string> = {
  battle: '⚔️', rest: '🔥', shop: '🏪', event: '🎲', boss: '👹',
};

interface MapTabProps {
  map: GameMap | null;
  mapRisk: number;
  setMapRisk: (risk: number) => void;
  selectNode: (nodeId: string) => void;
  devClearAllNodes: () => void;
  devTeleportToNode: (nodeId: string) => void;
  devForcedCrossroad: string | null;
  setDevForcedCrossroad: (crossroad: string | null) => void;
}

export const MapTab = memo(function MapTab({ map, mapRisk, setMapRisk, selectNode, devClearAllNodes, devTeleportToNode, devForcedCrossroad, setDevForcedCrossroad }: MapTabProps) {
  const currentNode = useMemo(() => map?.nodes?.find(n => n.id === map.currentNodeId), [map?.nodes, map?.currentNodeId]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  // 핸들러
  const handleRiskChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setMapRisk(parseInt(e.target.value)), [setMapRisk]);
  const handleNodeSelect = useCallback((e: ChangeEvent<HTMLSelectElement>) => setSelectedNodeId(e.target.value), []);
  const handleTeleport = useCallback(() => { if (selectedNodeId) devTeleportToNode(selectedNodeId); }, [selectedNodeId, devTeleportToNode]);
  const handleClearCrossroad = useCallback(() => setDevForcedCrossroad(null), [setDevForcedCrossroad]);

  // 레이어별로 노드 그룹화
  const nodesByLayer = useMemo(() => {
    if (!map?.nodes) return {};
    const grouped: Record<number, MapNode[]> = {};
    map.nodes.forEach(node => {
      const layer = node.layer || 0;
      if (!grouped[layer]) grouped[layer] = [];
      grouped[layer].push(node);
    });
    return grouped;
  }, [map?.nodes]);

  // 정렬된 레이어 엔트리 (메모이제이션)
  const sortedLayerEntries = useMemo(() =>
    Object.entries(nodesByLayer).sort(([a], [b]) => parseInt(a) - parseInt(b)) as [string, MapNode[]][],
    [nodesByLayer]);

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>맵 제어</h3>

      {/* 현재 위치 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '4px' }}>현재 노드:</div>
        <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>
          {currentNode ? `${currentNode.id} (${(currentNode as { displayLabel?: string }).displayLabel || currentNode.type})` : '없음'}
        </div>
      </div>

      {/* 맵 위험도 슬라이더 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontSize: '0.875rem',
          color: '#cbd5e1',
        }}>
          맵 위험도: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{mapRisk}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={mapRisk}
          onChange={handleRiskChange}
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '4px',
            background: `linear-gradient(to right, #10b981 0%, #fbbf24 50%, #ef4444 100%)`,
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: '#64748b',
          marginTop: '4px',
        }}>
          <span>안전 (0%)</span>
          <span>위험 (100%)</span>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px' }}>빠른 액션:</h4>
        <button
          onClick={devClearAllNodes}
          style={{
            width: '100%',
            padding: '12px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginBottom: '8px',
          }}
        >
          🔓 모든 노드 해금
        </button>
      </div>

      {/* 노드 텔레포트 */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #334155',
      }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px' }}>🚀 노드 텔레포트</h4>

        {/* 드롭다운 방식 */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <select
            value={selectedNodeId}
            onChange={handleNodeSelect}
            style={{
              flex: 1,
              padding: '8px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#cbd5e1',
              fontSize: '0.875rem',
            }}
          >
            <option value="">노드 선택...</option>
            {sortedLayerEntries.map(([layer, nodes]) => (
              <optgroup key={layer} label={`Layer ${layer}`}>
                {nodes.map((node: MapNode) => (
                  <option key={node.id} value={node.id}>
                    {NODE_EMOJIS[node.type] || '📍'} {node.id} - {node.displayLabel || node.type}
                    {node.cleared ? ' ✓' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            onClick={handleTeleport}
            disabled={!selectedNodeId}
            style={{
              padding: '8px 16px',
              background: selectedNodeId ? '#8b5cf6' : '#334155',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              cursor: selectedNodeId ? 'pointer' : 'not-allowed',
            }}
          >
            이동
          </button>
        </div>

        {/* 레이어별 빠른 버튼 */}
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>빠른 이동:</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: '6px',
          maxHeight: '200px',
          overflowY: 'auto',
          padding: '4px',
        }}>
          {map?.nodes?.slice(0, 30).map(node => (
            <button
              key={node.id}
              onClick={() => devTeleportToNode(node.id)}
              style={{
                padding: '6px 8px',
                background: node.id === currentNode?.id ? '#8b5cf6' : '#1e293b',
                border: `1px solid ${node.id === currentNode?.id ? '#a78bfa' : '#334155'}`,
                borderRadius: '4px',
                color: node.id === currentNode?.id ? '#fff' : '#94a3b8',
                fontSize: '0.7rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              title={`${node.id} - ${(node as { displayLabel?: string }).displayLabel || node.type}`}
            >
              {NODE_EMOJIS[node.type] || '📍'} {node.id.split('-')[1] || node.id}
            </button>
          ))}
        </div>
      </div>

      {/* 기로 템플릿 강제 선택 */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #334155',
      }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px' }}>🔀 기로 템플릿 강제</h4>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>
          다음 던전 진입 시 모든 기로에 적용됩니다
        </div>

        {/* 현재 설정 표시 */}
        {devForcedCrossroad && (
          <div style={{
            padding: '8px',
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid #8b5cf6',
            borderRadius: '6px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ color: '#a78bfa', fontSize: '0.875rem' }}>
              ✓ {(OBSTACLE_TEMPLATES as Record<string, { name?: string }>)[devForcedCrossroad]?.name || devForcedCrossroad}
            </span>
            <button
              onClick={handleClearCrossroad}
              style={{
                padding: '4px 8px',
                background: '#334155',
                border: 'none',
                borderRadius: '4px',
                color: '#e2e8f0',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              해제
            </button>
          </div>
        )}

        {/* 기로 템플릿 목록 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
        }}>
          {Object.entries(OBSTACLE_TEMPLATES as Record<string, { name: string; choices?: unknown[] }>).map(([key, template]) => (
            <button
              key={key}
              onClick={() => setDevForcedCrossroad(key)}
              style={{
                padding: '10px 8px',
                background: devForcedCrossroad === key ? '#8b5cf6' : '#1e293b',
                border: `1px solid ${devForcedCrossroad === key ? '#a78bfa' : '#334155'}`,
                borderRadius: '6px',
                color: devForcedCrossroad === key ? '#fff' : '#cbd5e1',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{template.name}</div>
              <div style={{ fontSize: '0.7rem', color: devForcedCrossroad === key ? '#e0d4fc' : '#64748b' }}>
                {template.choices?.length || 0}개 선택지
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});
