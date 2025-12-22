/**
 * DevToolsTabs.jsx
 * 
 * DevTools의 각 탭 컴포넌트들
 */

import React, { useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { getAllRelics, RELIC_RARITIES } from '../../data/relics';
import { CARDS } from '../battle/battleData';
import { ANOMALY_TYPES } from '../../data/anomalies';
import { NEW_EVENT_LIBRARY } from '../../data/newEvents';
import { ITEMS, ITEM_IDS } from '../../data/items';
import { OBSTACLE_TEMPLATES } from '../../data/dungeonNodes';

// 자원 관리 탭
export function ResourcesTab({ resources, setResources, devOpenRest, awakenAtRest, closeRest }) {
  const [inputs, setInputs] = useState(resources);

  const applyResources = () => {
    setResources(inputs);
  };

  const presets = {
    '풍족': { gold: 999, intel: 10, loot: 10, material: 10, aether: 50, memory: 200 },
    '초반': { gold: 50, intel: 2, loot: 1, material: 1, aether: 0, memory: 0 },
    '중반': { gold: 200, intel: 5, loot: 5, material: 3, aether: 10, memory: 50 },
    '후반': { gold: 500, intel: 8, loot: 8, material: 6, aether: 30, memory: 120 },
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>자원 직접 수정</h3>

      {/* 현재 자원 표시 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>현재 자원:</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {Object.entries(resources).map(([key, value]) => (
            <div key={key} style={{
              padding: '6px 12px',
              background: '#1e293b',
              borderRadius: '6px',
              border: '1px solid #334155',
            }}>
              <span style={{ color: '#64748b' }}>{key}:</span>{' '}
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 입력 폼 */}
      {Object.keys(resources).map(key => (
        <div key={key} style={{ marginBottom: '12px' }}>
          <label style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '0.875rem',
            color: '#cbd5e1',
            textTransform: 'capitalize',
          }}>
            {key}:
          </label>
          <input
            type="number"
            value={inputs[key]}
            onChange={(e) => setInputs({ ...inputs, [key]: parseInt(e.target.value) || 0 })}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontSize: '0.875rem',
            }}
          />
        </div>
      ))}

      <button
        onClick={applyResources}
        style={{
          width: '100%',
          padding: '12px',
          background: '#10b981',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginTop: '8px',
        }}
      >
        ✓ 적용
      </button>

      {/* 프리셋 버튼 */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px' }}>프리셋:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {Object.entries(presets).map(([name, preset]) => (
            <button
              key={name}
              onClick={() => {
                setInputs(preset);
                setResources(preset);
              }}
              style={{
                padding: '10px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* 휴식 노드 열기 */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '6px' }}>휴식 노드:</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button className="btn" style={{ background: 'rgba(253, 230, 138, 0.2)', border: '1px solid #fde68a' }} onClick={devOpenRest}>⛺ 휴식 창 열기</button>
          <button className="btn" onClick={closeRest}>휴식 창 닫기</button>
        </div>
      </div>

      {/* 각성 강제 (DEV) */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '6px' }}>개성 즉시 추가 (기억 100 필요):</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('brave'); }}>용맹(+힘)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('sturdy'); }}>굳건(+체력)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('cold'); }}>냉철(+통찰)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('thorough'); }}>철저(+보조슬롯)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('passionate'); }}>열정(+속도)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('lively'); }}>활력(+행동력)</button>
          <button className="btn" onClick={() => { devOpenRest(); awakenAtRest('random'); }}>랜덤</button>
        </div>
      </div>
    </div>
  );
}

// 맵 관리 탭
export function MapTab({ map, mapRisk, setMapRisk, selectNode, devClearAllNodes, devTeleportToNode, useNewDungeon, setUseNewDungeon, devForcedCrossroad, setDevForcedCrossroad }) {
  const currentNode = map?.nodes?.find(n => n.id === map.currentNodeId);
  const [selectedNodeId, setSelectedNodeId] = useState('');

  // 노드 타입별 이모지
  const nodeEmojis = {
    battle: '⚔️',
    rest: '🔥',
    shop: '🏪',
    event: '🎲',
    boss: '👹',
  };

  // 레이어별로 노드 그룹화
  const nodesByLayer = React.useMemo(() => {
    if (!map?.nodes) return {};
    const grouped = {};
    map.nodes.forEach(node => {
      const layer = node.layer || 0;
      if (!grouped[layer]) grouped[layer] = [];
      grouped[layer].push(node);
    });
    return grouped;
  }, [map?.nodes]);

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
          {currentNode ? `${currentNode.id} (${currentNode.displayLabel})` : '없음'}
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
          onChange={(e) => setMapRisk(parseInt(e.target.value))}
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
            onChange={(e) => setSelectedNodeId(e.target.value)}
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
            {Object.entries(nodesByLayer).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([layer, nodes]) => (
              <optgroup key={layer} label={`Layer ${layer}`}>
                {nodes.map(node => (
                  <option key={node.id} value={node.id}>
                    {nodeEmojis[node.type] || '📍'} {node.id} - {node.displayLabel || node.type}
                    {node.cleared ? ' ✓' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            onClick={() => {
              if (selectedNodeId) {
                devTeleportToNode(selectedNodeId);
              }
            }}
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
              title={`${node.id} - ${node.displayLabel || node.type}`}
            >
              {nodeEmojis[node.type] || '📍'} {node.id.split('-')[1] || node.id}
            </button>
          ))}
        </div>
      </div>

      {/* 새 던전 시스템 토글 */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #334155',
      }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px' }}>☠️ 던전 시스템</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={useNewDungeon || false}
              onChange={(e) => setUseNewDungeon && setUseNewDungeon(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span style={{ color: useNewDungeon ? '#22c55e' : '#94a3b8', fontSize: '0.875rem' }}>
              새 던전 시스템 (그래프 기반)
            </span>
          </label>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
          {useNewDungeon
            ? '✅ 메트로배니아 스타일 양방향 이동, 기로 시스템 활성화'
            : '기존 선형 던전 시스템 사용 중'}
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
              ✓ {OBSTACLE_TEMPLATES[devForcedCrossroad]?.name || devForcedCrossroad}
            </span>
            <button
              onClick={() => setDevForcedCrossroad(null)}
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
          {Object.entries(OBSTACLE_TEMPLATES).map(([key, template]) => (
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
}

// 전투 관리 탭
export function BattleTab({
  activeBattle,
  playerStrength,
  playerAgility,
  playerInsight,
  devDulledLevel,
  setDevDulledLevel,
  devForcedAnomalies,
  setDevForcedAnomalies,
  devForceWin,
  devForceLose,
  updatePlayerStrength,
  updatePlayerAgility,
  updatePlayerInsight,
  devAddBattleToken
}) {
  const [strengthInput, setStrengthInput] = React.useState(playerStrength || 0);
  const [agilityInput, setAgilityInput] = React.useState(playerAgility || 0);
  const [insightInput, setInsightInput] = React.useState(playerInsight || 0);
  // devDulledLevel은 내부적으로 insight의 음수 값 (insight = -devDulledLevel)
  const [dulledInput, setDulledInput] = React.useState(devDulledLevel ?? 0);

  // 이변 강제 발동 상태
  const [selectedAnomalies, setSelectedAnomalies] = React.useState({});
  const [anomalyLevels, setAnomalyLevels] = React.useState({});

  React.useEffect(() => {
    setStrengthInput(playerStrength || 0);
  }, [playerStrength]);

  React.useEffect(() => {
    setAgilityInput(playerAgility || 0);
  }, [playerAgility]);

  React.useEffect(() => {
    setInsightInput(playerInsight || 0);
  }, [playerInsight]);

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>플레이어 스탯</h3>

      {/* 스탯 조정 */}
      <div style={{
        padding: '16px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '20px',
      }}>
        {/* 힘 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '0.875rem',
            color: '#cbd5e1',
          }}>
            💪 힘: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{strengthInput}</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min="-99"
              max="99"
              value={strengthInput}
              onChange={(e) => setStrengthInput(Math.max(-99, Math.min(99, parseInt(e.target.value) || 0)))}
              style={{
                flex: 1,
                padding: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '0.875rem',
              }}
            />
            <button
              onClick={() => updatePlayerStrength(strengthInput)}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              설정
            </button>
          </div>
        </div>

        {/* 민첩 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '0.875rem',
            color: '#cbd5e1',
          }}>
            ⚡ 민첩: <span style={{ color: '#34d399', fontWeight: 'bold' }}>{agilityInput}</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min="-99"
              max="99"
              value={agilityInput}
              onChange={(e) => setAgilityInput(Math.max(-99, Math.min(99, parseInt(e.target.value) || 0)))}
              style={{
                flex: 1,
                padding: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '0.875rem',
              }}
            />
            <button
              onClick={() => updatePlayerAgility(agilityInput)}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              설정
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {agilityInput >= 0
              ? `카드 속도 코스트 -${agilityInput} (최소 1)`
              : `카드 속도 코스트 +${Math.abs(agilityInput)}`}
          </div>
        </div>

        {/* 통찰 */}
        <div>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '0.875rem',
            color: '#cbd5e1',
          }}>
            👁️ 통찰: <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{insightInput}</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min="-99"
              max="99"
              value={insightInput}
              onChange={(e) => setInsightInput(Math.max(-99, Math.min(99, parseInt(e.target.value) || 0)))}
              style={{
                flex: 1,
                padding: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '0.875rem',
              }}
            />
            <button
              onClick={() => updatePlayerInsight(insightInput)}
              style={{
                padding: '8px 16px',
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              설정
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            이벤트 추가 선택지, 적 타임라인 정보 제공
          </div>
        </div>

        {/* 통찰 레벨 강제 테스트 (-3~+3) */}
        <div style={{ marginTop: '16px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontSize: '0.875rem',
            color: '#cbd5e1',
          }}>
            👁️ 통찰 레벨 강제: <span style={{
              color: devDulledLevel === null || devDulledLevel === undefined ? '#a78bfa' :
                     devDulledLevel > 0 ? '#f87171' : devDulledLevel < 0 ? '#8b5cf6' : '#e2e8f0',
              fontWeight: 'bold'
            }}>
              {devDulledLevel === null || devDulledLevel === undefined ? '해제' : -devDulledLevel}
            </span>
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min="-3"
              max="3"
              value={dulledInput === null || dulledInput === undefined ? 0 : -dulledInput}
              onChange={(e) => {
                const insightValue = parseInt(e.target.value) || 0;
                const clampedValue = Math.max(-3, Math.min(3, insightValue));
                setDulledInput(-clampedValue); // 내부적으로는 dulled 형식으로 저장 (insight를 음수로 변환)
              }}
              style={{
                flex: 1,
                padding: '8px',
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#cbd5e1',
                fontSize: '0.875rem',
              }}
            />
            <button
              onClick={() => setDevDulledLevel(dulledInput)}
              style={{
                padding: '8px 16px',
                background: '#a78bfa',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              적용
            </button>
            <button
              onClick={() => { setDevDulledLevel(null); setDulledInput(0); }}
              style={{
                padding: '8px 16px',
                background: '#334155',
                border: 'none',
                borderRadius: '6px',
                color: '#e2e8f0',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              해제
            </button>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            -3: 망각 🌑 / -2: 미련 🌘 / -1: 우둔 🌫️ / 0: 평온 🌕 / +1: 예측 🔮 / +2: 독심 👁️ / +3: 혜안 ✨
          </div>
        </div>
      </div>

      {/* 전투 중 토큰 추가 */}
      <h3 style={{ marginTop: '20px', color: '#a78bfa', fontSize: '1.125rem' }}>✨ 전투 중 토큰 추가</h3>
      <div style={{
        padding: '16px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '20px',
      }}>
        <div style={{ marginBottom: '12px', fontSize: '0.875rem', color: '#cbd5e1' }}>
          전투 중 즉시 토큰을 추가합니다 (전투 중일 때만 작동)
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => devAddBattleToken && devAddBattleToken('finesse', 1, 'player')}
            disabled={!activeBattle}
            style={{
              padding: '10px 16px',
              background: activeBattle ? '#a78bfa' : '#334155',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 'bold',
              cursor: activeBattle ? 'pointer' : 'not-allowed',
              opacity: activeBattle ? 1 : 0.5,
            }}
          >
            ✨ 기교 +1
          </button>
          <button
            onClick={() => devAddBattleToken && devAddBattleToken('finesse', 3, 'player')}
            disabled={!activeBattle}
            style={{
              padding: '10px 16px',
              background: activeBattle ? '#8b5cf6' : '#334155',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 'bold',
              cursor: activeBattle ? 'pointer' : 'not-allowed',
              opacity: activeBattle ? 1 : 0.5,
            }}
          >
            ✨ 기교 +3
          </button>
          <button
            onClick={() => devAddBattleToken && devAddBattleToken('loaded', 1, 'player')}
            disabled={!activeBattle}
            style={{
              padding: '10px 16px',
              background: activeBattle ? '#22c55e' : '#334155',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 'bold',
              cursor: activeBattle ? 'pointer' : 'not-allowed',
              opacity: activeBattle ? 1 : 0.5,
            }}
          >
            🔫 장전 +1
          </button>
          <button
            onClick={() => devAddBattleToken && devAddBattleToken('evasion', 1, 'player')}
            disabled={!activeBattle}
            style={{
              padding: '10px 16px',
              background: activeBattle ? '#3b82f6' : '#334155',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 'bold',
              cursor: activeBattle ? 'pointer' : 'not-allowed',
              opacity: activeBattle ? 1 : 0.5,
            }}
          >
            💨 회피 +1
          </button>
          <button
            onClick={() => devAddBattleToken && devAddBattleToken('offense', 1, 'player')}
            disabled={!activeBattle}
            style={{
              padding: '10px 16px',
              background: activeBattle ? '#f59e0b' : '#334155',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 'bold',
              cursor: activeBattle ? 'pointer' : 'not-allowed',
              opacity: activeBattle ? 1 : 0.5,
            }}
          >
            ⚔️ 공세 +1
          </button>
        </div>
        {!activeBattle && (
          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '8px' }}>
            ⚠️ 전투 중이 아닙니다. 전투를 시작하세요.
          </div>
        )}
      </div>

      {/* 이변 강제 발동 */}
      <h3 style={{ marginTop: '20px', color: '#ef4444', fontSize: '1.125rem' }}>⚠️ 이변 강제 발동</h3>
      <div style={{
        padding: '16px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '20px',
      }}>
        <div style={{ marginBottom: '12px', fontSize: '0.875rem', color: '#cbd5e1' }}>
          다음 전투에서 발동할 이변을 선택하세요:
        </div>

        {Object.entries(ANOMALY_TYPES).map(([key, anomaly]) => {
          const isSelected = selectedAnomalies[anomaly.id] || false;
          const level = anomalyLevels[anomaly.id] || 1;

          return (
            <div key={anomaly.id} style={{
              marginBottom: '12px',
              padding: '12px',
              background: isSelected ? '#1e293b' : 'transparent',
              border: `1px solid ${isSelected ? anomaly.color : '#334155'}`,
              borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isSelected ? '8px' : '0' }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    setSelectedAnomalies(prev => ({
                      ...prev,
                      [anomaly.id]: e.target.checked
                    }));
                    if (!anomalyLevels[anomaly.id]) {
                      setAnomalyLevels(prev => ({ ...prev, [anomaly.id]: 1 }));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '1.2rem' }}>{anomaly.emoji}</span>
                <span style={{ color: anomaly.color, fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {anomaly.name}
                </span>
              </div>

              {isSelected && (
                <div style={{ marginLeft: '28px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '4px',
                    fontSize: '0.8rem',
                    color: '#94a3b8'
                  }}>
                    레벨: {level}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={level}
                    onChange={(e) => {
                      setAnomalyLevels(prev => ({
                        ...prev,
                        [anomaly.id]: parseInt(e.target.value)
                      }));
                    }}
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    {anomaly.getEffect(level).description}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={() => {
              const forcedAnomalies = Object.entries(selectedAnomalies)
                .filter(([id, selected]) => selected)
                .map(([id]) => ({
                  anomalyId: id,
                  level: anomalyLevels[id] || 1
                }));

              if (forcedAnomalies.length > 0) {
                setDevForcedAnomalies(forcedAnomalies);
              } else {
                setDevForcedAnomalies(null);
              }
            }}
            style={{
              flex: 1,
              padding: '10px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            적용
          </button>
          <button
            onClick={() => {
              setDevForcedAnomalies(null);
              setSelectedAnomalies({});
              setAnomalyLevels({});
            }}
            style={{
              flex: 1,
              padding: '10px',
              background: '#334155',
              border: 'none',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            해제
          </button>
        </div>

        {devForcedAnomalies && devForcedAnomalies.length > 0 && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: '#1e293b',
            borderRadius: '6px',
            fontSize: '0.8rem',
            color: '#cbd5e1'
          }}>
            <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>
              ⚠️ 다음 전투에서 발동:
            </div>
            {devForcedAnomalies.map(({ anomalyId, level }) => {
              const anomaly = Object.values(ANOMALY_TYPES).find(a => a.id === anomalyId);
              return anomaly ? (
                <div key={anomalyId} style={{ marginLeft: '8px' }}>
                  {anomaly.emoji} {anomaly.name} (Lv.{level})
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>

      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>전투 제어</h3>

      {activeBattle ? (
        <>
          <div style={{
            padding: '12px',
            background: '#0f172a',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '4px' }}>진행 중인 전투:</div>
            <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>
              {activeBattle.label} ({activeBattle.kind})
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              난이도: {activeBattle.difficulty}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={devForceWin}
              style={{
                padding: '14px',
                background: '#10b981',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✓ 강제 승리
            </button>
            <button
              onClick={devForceLose}
              style={{
                padding: '14px',
                background: '#ef4444',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✗ 강제 패배
            </button>
          </div>
        </>
      ) : (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.875rem',
        }}>
          진행 중인 전투가 없습니다
        </div>
      )}
    </div>
  );
}

// 상징 관리 탭
export function RelicsTab({ relics, addRelic, removeRelic, setRelics }) {
  const [selectedRarity, setSelectedRarity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const allRelics = getAllRelics();

  const filteredRelics = allRelics.filter(r => {
    // 등급 필터
    const matchesRarity = selectedRarity === 'all' || r.rarity === selectedRarity;
    // 검색 필터 (이름, 설명, 태그)
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      r.name.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.id.toLowerCase().includes(query) ||
      (r.tags && r.tags.some(tag => tag.toLowerCase().includes(query)));
    return matchesRarity && matchesSearch;
  });

  const hasRelic = (relicId) => relics.includes(relicId);

  const rarityColors = {
    [RELIC_RARITIES.COMMON]: '#94a3b8',
    [RELIC_RARITIES.RARE]: '#60a5fa',
    [RELIC_RARITIES.SPECIAL]: '#a78bfa',
    [RELIC_RARITIES.LEGENDARY]: '#fbbf24',
  };

  const rarityNames = {
    [RELIC_RARITIES.COMMON]: '일반',
    [RELIC_RARITIES.RARE]: '희귀',
    [RELIC_RARITIES.SPECIAL]: '특별',
    [RELIC_RARITIES.LEGENDARY]: '전설',
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>상징 관리</h3>

      {/* 현재 보유 상징 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
          보유 상징 ({relics.length}개)
        </div>
        {relics.length > 0 ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {relics.map(relicId => {
              const relic = allRelics.find(r => r.id === relicId);
              if (!relic) return null;
              return (
                <div
                  key={relicId}
                  onClick={() => removeRelic(relicId)}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    color: '#fca5a5',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  title="클릭하여 제거"
                >
                  {relic.name} ✕
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
            보유한 상징이 없습니다
          </div>
        )}
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setRelics([])}
            style={{
              padding: '8px 12px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            전체 제거
          </button>
          <button
            onClick={() => {
              const commonRelics = allRelics.filter(r => r.rarity === RELIC_RARITIES.COMMON).map(r => r.id);
              setRelics(commonRelics.slice(0, 3));
            }}
            style={{
              padding: '8px 12px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            테스트 (일반 3개)
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div style={{ marginBottom: '12px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="상징 검색 (이름, 설명, 태그, ID)"
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '0.875rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {searchQuery && (
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            검색 결과: {filteredRelics.length}개
          </div>
        )}
      </div>

      {/* 등급 필터 */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '6px' }}>
        <button
          onClick={() => setSelectedRarity('all')}
          style={{
            padding: '6px 12px',
            background: selectedRarity === 'all' ? '#3b82f6' : '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: selectedRarity === 'all' ? '#fff' : '#94a3b8',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          전체
        </button>
        {Object.entries(RELIC_RARITIES).map(([key, value]) => (
          <button
            key={value}
            onClick={() => setSelectedRarity(value)}
            style={{
              padding: '6px 12px',
              background: selectedRarity === value ? rarityColors[value] : '#1e293b',
              border: `1px solid ${rarityColors[value]}`,
              borderRadius: '6px',
              color: selectedRarity === value ? '#000' : rarityColors[value],
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {rarityNames[value]}
          </button>
        ))}
      </div>

      {/* 상징 목록 */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '8px',
        background: '#0f172a',
        borderRadius: '8px',
      }}>
        {filteredRelics.map(relic => {
          const owned = hasRelic(relic.id);
          return (
            <div
              key={relic.id}
              onClick={() => owned ? removeRelic(relic.id) : addRelic(relic.id)}
              style={{
                padding: '10px',
                marginBottom: '6px',
                background: owned ? 'rgba(34, 197, 94, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                border: `1px solid ${owned ? '#22c55e' : rarityColors[relic.rarity]}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: rarityColors[relic.rarity],
                }}>
                  {relic.name}
                  {owned && <span style={{ color: '#22c55e', marginLeft: '6px' }}>✓</span>}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  {rarityNames[relic.rarity]}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                {relic.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 아이템 관리 탭
export function ItemsTab({ items, addItem, removeItem, devSetItems }) {
  const [selectedTier, setSelectedTier] = useState('all');

  const allItems = Object.values(ITEMS);
  const filteredItems = selectedTier === 'all'
    ? allItems
    : allItems.filter(item => item.tier === parseInt(selectedTier));

  const usableLabels = {
    'combat': '전투용',
    'any': '범용',
  };

  const tierColors = {
    1: '#94a3b8',
    2: '#fbbf24',
  };

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>아이템 관리</h3>

      {/* 현재 보유 아이템 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
          보유 아이템 (3슬롯)
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(items || [null, null, null]).map((item, idx) => (
            <div
              key={idx}
              onClick={() => item && removeItem(idx)}
              style={{
                width: '60px',
                height: '60px',
                background: item ? '#1e293b' : '#0f172a',
                border: `2px solid ${item ? '#22c55e' : '#334155'}`,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: item ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}
              title={item ? `${item.name} - 클릭하여 제거` : '빈 슬롯'}
            >
              {item ? (
                <>
                  <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                  <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '2px' }}>
                    {item.usableIn === 'combat' ? '⚔️' : '✦'}
                  </span>
                </>
              ) : (
                <span style={{ color: '#64748b', fontSize: '1.5rem' }}>-</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => devSetItems([null, null, null])}
            style={{
              padding: '8px 12px',
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            전체 제거
          </button>
          <button
            onClick={() => devSetItems(['healing-potion-small', 'explosive-small', 'strength-boost-small'])}
            style={{
              padding: '8px 12px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            테스트 (소형 3개)
          </button>
          <button
            onClick={() => devSetItems(['healing-potion-large', 'explosive-large', 'strength-boost-large'])}
            style={{
              padding: '8px 12px',
              background: '#f59e0b',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            테스트 (대형 3개)
          </button>
        </div>
      </div>

      {/* 등급 필터 */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '6px' }}>
        <button
          onClick={() => setSelectedTier('all')}
          style={{
            padding: '6px 12px',
            background: selectedTier === 'all' ? '#3b82f6' : '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: selectedTier === 'all' ? '#fff' : '#94a3b8',
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          전체
        </button>
        <button
          onClick={() => setSelectedTier('1')}
          style={{
            padding: '6px 12px',
            background: selectedTier === '1' ? tierColors[1] : '#1e293b',
            border: `1px solid ${tierColors[1]}`,
            borderRadius: '6px',
            color: selectedTier === '1' ? '#000' : tierColors[1],
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          소형 (1티어)
        </button>
        <button
          onClick={() => setSelectedTier('2')}
          style={{
            padding: '6px 12px',
            background: selectedTier === '2' ? tierColors[2] : '#1e293b',
            border: `1px solid ${tierColors[2]}`,
            borderRadius: '6px',
            color: selectedTier === '2' ? '#000' : tierColors[2],
            fontSize: '0.75rem',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          대형 (2티어)
        </button>
      </div>

      {/* 아이템 목록 */}
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        padding: '8px',
        background: '#0f172a',
        borderRadius: '8px',
      }}>
        {filteredItems.map(item => {
          const hasEmptySlot = (items || []).some(slot => slot === null);
          return (
            <div
              key={item.id}
              onClick={() => hasEmptySlot && addItem(item.id)}
              style={{
                padding: '10px',
                marginBottom: '6px',
                background: hasEmptySlot ? 'rgba(30, 41, 59, 0.5)' : 'rgba(30, 41, 59, 0.2)',
                border: `1px solid ${tierColors[item.tier]}`,
                borderRadius: '6px',
                cursor: hasEmptySlot ? 'pointer' : 'not-allowed',
                opacity: hasEmptySlot ? 1 : 0.5,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: tierColors[item.tier],
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                  {item.name}
                </div>
                <div style={{
                  fontSize: '0.7rem',
                  color: item.usableIn === 'combat' ? '#f87171' : '#34d399',
                  background: item.usableIn === 'combat' ? 'rgba(248, 113, 113, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}>
                  {usableLabels[item.usableIn]}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                {item.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 이벤트 관리 탭
export function EventTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const { devTriggerEvent } = useGameStore();

  // 모든 이벤트를 배열로 변환
  const allEvents = Object.entries(NEW_EVENT_LIBRARY).map(([id, definition]) => ({
    id,
    title: definition.title || id,
    description: definition.description || '',
    multiStage: definition.multiStage || false,
  }));

  // 검색어로 필터링
  const filteredEvents = allEvents.filter((event) => {
    const term = searchTerm.toLowerCase();
    return (
      event.id.toLowerCase().includes(term) ||
      event.title.toLowerCase().includes(term) ||
      event.description.toLowerCase().includes(term)
    );
  });

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>이벤트 제어</h3>

      {/* 검색 입력 */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="이벤트 ID 또는 제목으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '0.875rem',
          }}
        />
      </div>

      {/* 이벤트 목록 */}
      <div style={{
        maxHeight: '400px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {filteredEvents.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.875rem',
          }}>
            검색 결과가 없습니다
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 'bold',
                    color: '#fbbf24',
                    fontSize: '0.9rem',
                    marginBottom: '4px',
                  }}>
                    {event.title}
                    {event.multiStage && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.7rem',
                        color: '#a78bfa',
                        background: 'rgba(167, 139, 250, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}>
                        다단계
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    marginBottom: '4px',
                  }}>
                    ID: {event.id}
                  </div>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {event.description}
                  </div>
                </div>
                <button
                  onClick={() => {
                    devTriggerEvent(event.id);
                    console.log(`[EventTab] Triggered event: ${event.id}`);
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  실행
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 총 이벤트 수 표시 */}
      <div style={{
        marginTop: '16px',
        padding: '8px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#64748b',
      }}>
        총 {allEvents.length}개 이벤트 중 {filteredEvents.length}개 표시
      </div>
    </div>
  );
}

// 카드 관리 탭
export function CardsTab({ cardUpgrades, upgradeCardRarity, characterBuild, updateCharacterBuild, addOwnedCard, removeOwnedCard, clearOwnedCards, showAllCards, setShowAllCards }) {
  const [selectedCardId, setSelectedCardId] = useState(CARDS[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [specialMode, setSpecialMode] = useState('main'); // 'main', 'sub', or 'owned'

  const mainSpecials = characterBuild?.mainSpecials || [];
  const subSpecials = characterBuild?.subSpecials || [];
  const ownedCards = characterBuild?.ownedCards || [];

  // 카드 추가
  const addCard = (cardId) => {
    if (specialMode === 'main') {
      updateCharacterBuild([...mainSpecials, cardId], subSpecials);
    } else if (specialMode === 'sub') {
      updateCharacterBuild(mainSpecials, [...subSpecials, cardId]);
    } else {
      addOwnedCard(cardId);
    }
  };

  // 카드 제거 (마지막 하나)
  const removeCard = (cardId, fromMain) => {
    if (fromMain) {
      const idx = mainSpecials.lastIndexOf(cardId);
      if (idx !== -1) {
        const newMain = [...mainSpecials.slice(0, idx), ...mainSpecials.slice(idx + 1)];
        updateCharacterBuild(newMain, subSpecials);
      }
    } else {
      const idx = subSpecials.lastIndexOf(cardId);
      if (idx !== -1) {
        const newSub = [...subSpecials.slice(0, idx), ...subSpecials.slice(idx + 1)];
        updateCharacterBuild(mainSpecials, newSub);
      }
    }
  };

  // 전체 초기화
  const clearAll = () => {
    if (specialMode === 'main') {
      updateCharacterBuild([], subSpecials);
    } else if (specialMode === 'sub') {
      updateCharacterBuild(mainSpecials, []);
    } else {
      clearOwnedCards();
    }
  };

  // 검색 필터
  const filteredCards = CARDS.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 카드 개수 카운트
  const getCount = (cardId, list) => list.filter(id => id === cardId).length;

  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>카드 관리</h3>

      {/* 현재 보유 카드 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
          주특기 ({mainSpecials.length}개)
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {mainSpecials.length === 0 ? (
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>없음</span>
          ) : (
            // 중복 카운트로 표시
            [...new Set(mainSpecials)].map(cardId => {
              const card = CARDS.find(c => c.id === cardId);
              const count = getCount(cardId, mainSpecials);
              return (
                <div
                  key={cardId}
                  onClick={() => removeCard(cardId, true)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(245, 215, 110, 0.15)',
                    border: '1px solid #f5d76e',
                    borderRadius: '6px',
                    color: '#f5d76e',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  title="클릭하여 제거"
                >
                  {card?.name || cardId}{count > 1 ? ` x${count}` : ''} ✕
                </div>
              );
            })
          )}
        </div>

        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
          보조특기 ({subSpecials.length}개)
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {subSpecials.length === 0 ? (
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>없음</span>
          ) : (
            [...new Set(subSpecials)].map(cardId => {
              const card = CARDS.find(c => c.id === cardId);
              const count = getCount(cardId, subSpecials);
              return (
                <div
                  key={cardId}
                  onClick={() => removeCard(cardId, false)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(125, 211, 252, 0.15)',
                    border: '1px solid #7dd3fc',
                    borderRadius: '6px',
                    color: '#7dd3fc',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  title="클릭하여 제거"
                >
                  {card?.name || cardId}{count > 1 ? ` x${count}` : ''} ✕
                </div>
              );
            })
          )}
        </div>

        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px', marginTop: '12px' }}>
          대기카드 ({ownedCards.length}개) - 10% 손패
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ownedCards.length === 0 ? (
            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>없음</span>
          ) : (
            [...new Set(ownedCards)].map(cardId => {
              const card = CARDS.find(c => c.id === cardId);
              const count = getCount(cardId, ownedCards);
              return (
                <div
                  key={cardId}
                  onClick={() => removeOwnedCard(cardId)}
                  style={{
                    padding: '4px 10px',
                    background: 'rgba(167, 139, 250, 0.15)',
                    border: '1px solid #a78bfa',
                    borderRadius: '6px',
                    color: '#a78bfa',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                  title="클릭하여 제거"
                >
                  {card?.name || cardId}{count > 1 ? ` x${count}` : ''} ✕
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 모드 선택 & 초기화 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button
          onClick={() => setSpecialMode('main')}
          style={{
            flex: 1,
            padding: '8px',
            background: specialMode === 'main' ? 'linear-gradient(135deg, #f5d76e, #c9a64a)' : '#1e293b',
            border: specialMode === 'main' ? 'none' : '1px solid #334155',
            borderRadius: '6px',
            color: specialMode === 'main' ? '#000' : '#94a3b8',
            fontWeight: specialMode === 'main' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          주특기 추가
        </button>
        <button
          onClick={() => setSpecialMode('sub')}
          style={{
            flex: 1,
            padding: '8px',
            background: specialMode === 'sub' ? 'linear-gradient(135deg, #7dd3fc, #2b6fbf)' : '#1e293b',
            border: specialMode === 'sub' ? 'none' : '1px solid #334155',
            borderRadius: '6px',
            color: specialMode === 'sub' ? '#000' : '#94a3b8',
            fontWeight: specialMode === 'sub' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          보조특기 추가
        </button>
        <button
          onClick={() => setSpecialMode('owned')}
          style={{
            flex: 1,
            padding: '8px',
            background: specialMode === 'owned' ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : '#1e293b',
            border: specialMode === 'owned' ? 'none' : '1px solid #334155',
            borderRadius: '6px',
            color: specialMode === 'owned' ? '#fff' : '#94a3b8',
            fontWeight: specialMode === 'owned' ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
        >
          대기카드 추가
        </button>
        <button
          onClick={clearAll}
          style={{
            padding: '8px 12px',
            background: '#ef4444',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          초기화
        </button>
      </div>

      {/* 검색 */}
      <input
        type="text"
        placeholder="카드 이름 또는 ID 검색..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '6px',
          color: '#e2e8f0',
          fontSize: '0.875rem',
          marginBottom: '12px',
          boxSizing: 'border-box',
        }}
      />

      {/* 카드 목록 */}
      <div style={{
        maxHeight: '250px',
        overflowY: 'auto',
        padding: '8px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        {filteredCards.map(card => {
          const mainCount = getCount(card.id, mainSpecials);
          const subCount = getCount(card.id, subSpecials);
          const rarity = cardUpgrades?.[card.id] || card.rarity || 'common';
          const rarityColors = { common: '#94a3b8', rare: '#60a5fa', special: '#a78bfa', legendary: '#fbbf24' };

          return (
            <div
              key={card.id}
              onClick={() => addCard(card.id)}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                background: (mainCount > 0 || subCount > 0) ? 'rgba(34, 197, 94, 0.1)' : 'rgba(30, 41, 59, 0.5)',
                border: `1px solid ${mainCount > 0 ? '#f5d76e' : subCount > 0 ? '#7dd3fc' : '#334155'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, color: rarityColors[rarity], marginRight: '8px' }}>
                    {card.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    ({card.id})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {mainCount > 0 && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      background: 'rgba(245, 215, 110, 0.2)',
                      border: '1px solid #f5d76e',
                      borderRadius: '4px',
                      color: '#f5d76e',
                    }}>
                      주특기 {mainCount > 1 ? `x${mainCount}` : ''}
                    </span>
                  )}
                  {subCount > 0 && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      background: 'rgba(125, 211, 252, 0.2)',
                      border: '1px solid #7dd3fc',
                      borderRadius: '4px',
                      color: '#7dd3fc',
                    }}>
                      보조 {subCount > 1 ? `x${subCount}` : ''}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                {card.type === 'attack' ? '⚔️ 공격' : '🛡️ 방어'} | AP {card.actionCost} | 속도 {card.speedCost}
                {card.damage ? ` | 데미지 ${card.damage}${card.hits ? ` x${card.hits}` : ''}` : ''}
                {card.block ? ` | 방어 ${card.block}` : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* 캐릭터 창 설정 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
        border: '1px solid #334155',
      }}>
        <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px', marginTop: 0 }}>🃏 캐릭터 창 설정</h4>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={showAllCards || false}
            onChange={(e) => setShowAllCards(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <span style={{ color: showAllCards ? '#22c55e' : '#94a3b8', fontSize: '0.875rem' }}>
            전체 카드 표시 (덱빌딩 모드)
          </span>
        </label>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
          {showAllCards
            ? '✅ 캐릭터 창에서 모든 카드를 표시합니다'
            : '캐릭터 창에서 보유 카드만 표시합니다'}
        </div>
      </div>

      {/* 카드 등급 올리기 (기존 기능) */}
      <h4 style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '8px' }}>카드 등급 업그레이드</h4>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selectedCardId}
          onChange={(e) => setSelectedCardId(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '8px 10px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            color: '#e2e8f0',
            fontSize: '0.8rem',
          }}
        >
          {CARDS.map((c) => {
            const rarity = cardUpgrades?.[c.id] || c.rarity || 'common';
            return (
              <option key={c.id} value={c.id}>
                {c.name} ({rarity})
              </option>
            );
          })}
        </select>
        <button
          onClick={() => upgradeCardRarity(selectedCardId)}
          style={{
            padding: '8px 12px',
            background: '#10b981',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          등급 올리기
        </button>
      </div>
    </div>
  );
}
