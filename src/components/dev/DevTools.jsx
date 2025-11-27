import React, { useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import { getAllRelics, RELIC_RARITIES } from '../../data/relics';

/**
 * 개발자 도구 오버레이
 * Alt+D로 토글
 */
export function DevTools({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('resources');

  const {
    resources,
    map,
    mapRisk,
    activeBattle,
    playerStrength,
    playerAgility,
    playerInsight,
    relics,
    setResources,
    setMapRisk,
    selectNode,
    devClearAllNodes,
    devForceWin,
    devForceLose,
    updatePlayerStrength,
    updatePlayerAgility,
    updatePlayerInsight,
    addRelic,
    removeRelic,
    setRelics,
  } = useGameStore();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '600px',
      maxHeight: '80vh',
      backgroundColor: '#1e293b',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
      zIndex: 10000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>
          🛠️ Developer Tools
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          ✕
        </button>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 12px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #334155',
      }}>
        {[
          { id: 'resources', label: '💰 자원', icon: '💰' },
          { id: 'map', label: '🗺️ 맵', icon: '🗺️' },
          { id: 'battle', label: '⚔️ 전투', icon: '⚔️' },
          { id: 'relics', label: '💎 유물', icon: '💎' },
          { id: 'event', label: '🎲 이벤트', icon: '🎲' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab.id ? '#3b82f6' : 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#fff' : '#94a3b8',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div style={{
        padding: '20px',
        overflowY: 'auto',
        flex: 1,
        color: '#e2e8f0',
      }}>
        {activeTab === 'resources' && (
          <ResourcesTab resources={resources} setResources={setResources} />
        )}
        {activeTab === 'map' && (
          <MapTab
            map={map}
            mapRisk={mapRisk}
            setMapRisk={setMapRisk}
            selectNode={selectNode}
            devClearAllNodes={devClearAllNodes}
          />
        )}
        {activeTab === 'battle' && (
          <BattleTab
            activeBattle={activeBattle}
            playerStrength={playerStrength}
            playerAgility={playerAgility}
            playerInsight={playerInsight}
            devForceWin={devForceWin}
            devForceLose={devForceLose}
            updatePlayerStrength={updatePlayerStrength}
            updatePlayerAgility={updatePlayerAgility}
            updatePlayerInsight={updatePlayerInsight}
          />
        )}
        {activeTab === 'relics' && (
          <RelicsTab
            relics={relics}
            addRelic={addRelic}
            removeRelic={removeRelic}
            setRelics={setRelics}
          />
        )}
        {activeTab === 'event' && (
          <EventTab />
        )}
      </div>

      {/* 푸터 */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: '#0f172a',
        borderTop: '1px solid #334155',
        fontSize: '0.75rem',
        color: '#64748b',
        textAlign: 'center',
      }}>
        Press <kbd style={{
          padding: '2px 6px',
          background: '#334155',
          borderRadius: '4px',
          color: '#cbd5e1',
        }}>Alt+D</kbd> to toggle
      </div>
    </div>
  );
}

// 자원 관리 탭
function ResourcesTab({ resources, setResources }) {
  const [inputs, setInputs] = useState(resources);

  const applyResources = () => {
    setResources(inputs);
  };

  const presets = {
    '풍족': { gold: 999, intel: 10, loot: 10, material: 10, aether: 50 },
    '초반': { gold: 50, intel: 2, loot: 1, material: 1, aether: 0 },
    '중반': { gold: 200, intel: 5, loot: 5, material: 3, aether: 10 },
    '후반': { gold: 500, intel: 8, loot: 8, material: 6, aether: 30 },
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
    </div>
  );
}

// 맵 관리 탭
function MapTab({ map, mapRisk, setMapRisk, selectNode, devClearAllNodes }) {
  const currentNode = map?.nodes?.find(n => n.id === map.currentNodeId);

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
          맵 위험도: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{mapRisk}</span>
        </label>
        <input
          type="range"
          min="20"
          max="80"
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
          <span>안전 (20)</span>
          <span>위험 (80)</span>
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

      {/* 노드 점프 (추후 구현) */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #334155',
      }}>
        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
          💡 노드 점프 기능은 추후 추가 예정
        </div>
      </div>
    </div>
  );
}

// 전투 관리 탭
function BattleTab({ activeBattle, playerStrength, playerAgility, playerInsight, devForceWin, devForceLose, updatePlayerStrength, updatePlayerAgility, updatePlayerInsight }) {
  const [strengthInput, setStrengthInput] = React.useState(playerStrength || 0);
  const [agilityInput, setAgilityInput] = React.useState(playerAgility || 0);
  const [insightInput, setInsightInput] = React.useState(playerInsight || 0);

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
              min="0"
              max="99"
              value={insightInput}
              onChange={(e) => setInsightInput(Math.max(0, Math.min(99, parseInt(e.target.value) || 0)))}
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

// 유물 관리 탭
function RelicsTab({ relics, addRelic, removeRelic, setRelics }) {
  const [selectedRarity, setSelectedRarity] = useState('all');
  const allRelics = getAllRelics();

  const filteredRelics = selectedRarity === 'all'
    ? allRelics
    : allRelics.filter(r => r.rarity === selectedRarity);

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
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>유물 관리</h3>

      {/* 현재 보유 유물 */}
      <div style={{
        padding: '12px',
        background: '#0f172a',
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '8px' }}>
          보유 유물 ({relics.length}개)
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
            보유한 유물이 없습니다
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

      {/* 유물 목록 */}
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

// 이벤트 관리 탭
function EventTab() {
  return (
    <div>
      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>이벤트 제어</h3>
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.875rem',
      }}>
        이벤트 제어 기능은 추후 추가 예정
      </div>
    </div>
  );
}
