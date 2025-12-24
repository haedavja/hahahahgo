/**
 * BattleTab.jsx
 * 전투 관리 탭
 */

import React, { useState, useEffect } from 'react';
import { ANOMALY_TYPES } from '../../../data/anomalies';

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
  const [strengthInput, setStrengthInput] = useState(playerStrength || 0);
  const [agilityInput, setAgilityInput] = useState(playerAgility || 0);
  const [insightInput, setInsightInput] = useState(playerInsight || 0);
  // devDulledLevel은 내부적으로 insight의 음수 값 (insight = -devDulledLevel)
  const [dulledInput, setDulledInput] = useState(devDulledLevel ?? 0);

  // 이변 강제 발동 상태
  const [selectedAnomalies, setSelectedAnomalies] = useState({});
  const [anomalyLevels, setAnomalyLevels] = useState({});

  useEffect(() => {
    setStrengthInput(playerStrength || 0);
  }, [playerStrength]);

  useEffect(() => {
    setAgilityInput(playerAgility || 0);
  }, [playerAgility]);

  useEffect(() => {
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
