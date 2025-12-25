/**
 * BattleTab.tsx
 * 전투 관리 탭
 */

import { useState, useEffect, ChangeEvent } from 'react';
import { ANOMALY_TYPES } from '../../../data/anomalies';
import { ENEMY_GROUPS, ENEMIES } from '../../battle/battleData';

interface Anomaly {
  id: string;
  name: string;
  emoji: string;
  color: string;
  getEffect: (level: number) => { description: string };
}

interface ForcedAnomaly {
  anomalyId: string;
  level: number;
}

interface ActiveBattle {
  label: string;
  kind: string;
  difficulty: string;
}

interface Enemy {
  id: string;
  hp: number;
  emoji?: string;
}

interface EnemyGroup {
  id: string;
  name: string;
  tier: number;
  enemies: string[];
}

interface BattleTabProps {
  activeBattle: ActiveBattle | null;
  playerStrength: number;
  playerAgility: number;
  playerInsight: number;
  devDulledLevel: number | null | undefined;
  setDevDulledLevel: (level: number | null) => void;
  devForcedAnomalies: ForcedAnomaly[] | null;
  setDevForcedAnomalies: (anomalies: ForcedAnomaly[] | null) => void;
  devForceWin: () => void;
  devForceLose: () => void;
  updatePlayerStrength: (value: number) => void;
  updatePlayerAgility: (value: number) => void;
  updatePlayerInsight: (value: number) => void;
  devAddBattleToken?: (tokenId: string, stacks: number, target: string) => void;
  devStartBattle?: (groupId: string) => void;
}

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
  devAddBattleToken,
  devStartBattle
}: BattleTabProps) {
  const [strengthInput, setStrengthInput] = useState<number>(playerStrength || 0);
  const [agilityInput, setAgilityInput] = useState<number>(playerAgility || 0);
  const [insightInput, setInsightInput] = useState<number>(playerInsight || 0);
  const [dulledInput, setDulledInput] = useState<number>(devDulledLevel ?? 0);
  const [selectedAnomalies, setSelectedAnomalies] = useState<Record<string, boolean>>({});
  const [anomalyLevels, setAnomalyLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    setStrengthInput(playerStrength || 0);
  }, [playerStrength]);

  useEffect(() => {
    setAgilityInput(playerAgility || 0);
  }, [playerAgility]);

  useEffect(() => {
    setInsightInput(playerInsight || 0);
  }, [playerInsight]);

  const anomalyTypes = ANOMALY_TYPES as Record<string, Anomaly>;
  const enemyGroups = ENEMY_GROUPS as EnemyGroup[];
  const enemies = ENEMIES as Enemy[];

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
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: '#cbd5e1' }}>
            💪 힘: <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{strengthInput}</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min="-99"
              max="99"
              value={strengthInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setStrengthInput(Math.max(-99, Math.min(99, parseInt(e.target.value) || 0)))}
              style={{
                flex: 1, padding: '8px', background: '#1e293b', border: '1px solid #334155',
                borderRadius: '6px', color: '#cbd5e1', fontSize: '0.875rem',
              }}
            />
            <button onClick={() => updatePlayerStrength(strengthInput)} style={{
              padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px',
              color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer',
            }}>설정</button>
          </div>
        </div>

        {/* 민첩 */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: '#cbd5e1' }}>
            ⚡ 민첩: <span style={{ color: '#34d399', fontWeight: 'bold' }}>{agilityInput}</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min="-99"
              max="99"
              value={agilityInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAgilityInput(Math.max(-99, Math.min(99, parseInt(e.target.value) || 0)))}
              style={{
                flex: 1, padding: '8px', background: '#1e293b', border: '1px solid #334155',
                borderRadius: '6px', color: '#cbd5e1', fontSize: '0.875rem',
              }}
            />
            <button onClick={() => updatePlayerAgility(agilityInput)} style={{
              padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px',
              color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer',
            }}>설정</button>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            {agilityInput >= 0 ? `카드 속도 코스트 -${agilityInput} (최소 1)` : `카드 속도 코스트 +${Math.abs(agilityInput)}`}
          </div>
        </div>

        {/* 통찰 */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: '#cbd5e1' }}>
            👁️ 통찰: <span style={{ color: '#a78bfa', fontWeight: 'bold' }}>{insightInput}</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min="-99"
              max="99"
              value={insightInput}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setInsightInput(Math.max(-99, Math.min(99, parseInt(e.target.value) || 0)))}
              style={{
                flex: 1, padding: '8px', background: '#1e293b', border: '1px solid #334155',
                borderRadius: '6px', color: '#cbd5e1', fontSize: '0.875rem',
              }}
            />
            <button onClick={() => updatePlayerInsight(insightInput)} style={{
              padding: '8px 16px', background: '#3b82f6', border: 'none', borderRadius: '6px',
              color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer',
            }}>설정</button>
          </div>
        </div>

        {/* 통찰 레벨 강제 */}
        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: '#cbd5e1' }}>
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
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const insightValue = parseInt(e.target.value) || 0;
                const clampedValue = Math.max(-3, Math.min(3, insightValue));
                setDulledInput(-clampedValue);
              }}
              style={{
                flex: 1, padding: '8px', background: '#1e293b', border: '1px solid #334155',
                borderRadius: '6px', color: '#cbd5e1', fontSize: '0.875rem',
              }}
            />
            <button onClick={() => setDevDulledLevel(dulledInput)} style={{
              padding: '8px 16px', background: '#a78bfa', border: 'none', borderRadius: '6px',
              color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer',
            }}>적용</button>
            <button onClick={() => { setDevDulledLevel(null); setDulledInput(0); }} style={{
              padding: '8px 16px', background: '#334155', border: 'none', borderRadius: '6px',
              color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer',
            }}>해제</button>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            -3: 망각 🌑 / -2: 미련 🌘 / -1: 우둔 🌫️ / 0: 평온 🌕 / +1: 예측 🔮 / +2: 독심 👁️ / +3: 혜안 ✨
          </div>
        </div>
      </div>

      {/* 전투 중 토큰 추가 */}
      <h3 style={{ marginTop: '20px', color: '#a78bfa', fontSize: '1.125rem' }}>✨ 전투 중 토큰 추가</h3>
      <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '12px', fontSize: '0.875rem', color: '#cbd5e1' }}>
          전투 중 즉시 토큰을 추가합니다 (전투 중일 때만 작동)
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'finesse', label: '✨ 기교 +1', stacks: 1, color: '#a78bfa' },
            { id: 'finesse', label: '✨ 기교 +3', stacks: 3, color: '#8b5cf6' },
            { id: 'loaded', label: '🔫 장전 +1', stacks: 1, color: '#22c55e' },
            { id: 'evasion', label: '💨 회피 +1', stacks: 1, color: '#3b82f6' },
            { id: 'offense', label: '⚔️ 공세 +1', stacks: 1, color: '#f59e0b' },
          ].map((token, idx) => (
            <button
              key={idx}
              onClick={() => devAddBattleToken && devAddBattleToken(token.id, token.stacks, 'player')}
              disabled={!activeBattle}
              style={{
                padding: '10px 16px',
                background: activeBattle ? token.color : '#334155',
                border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold',
                cursor: activeBattle ? 'pointer' : 'not-allowed', opacity: activeBattle ? 1 : 0.5,
              }}
            >
              {token.label}
            </button>
          ))}
        </div>
        {!activeBattle && (
          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '8px' }}>
            ⚠️ 전투 중이 아닙니다. 전투를 시작하세요.
          </div>
        )}
      </div>

      {/* 이변 강제 발동 */}
      <h3 style={{ marginTop: '20px', color: '#ef4444', fontSize: '1.125rem' }}>⚠️ 이변 강제 발동</h3>
      <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '12px', fontSize: '0.875rem', color: '#cbd5e1' }}>
          다음 전투에서 발동할 이변을 선택하세요:
        </div>

        {Object.entries(anomalyTypes).map(([key, anomaly]) => {
          const isSelected = selectedAnomalies[anomaly.id] || false;
          const level = anomalyLevels[anomaly.id] || 1;

          return (
            <div key={anomaly.id} style={{
              marginBottom: '12px', padding: '12px',
              background: isSelected ? '#1e293b' : 'transparent',
              border: `1px solid ${isSelected ? anomaly.color : '#334155'}`, borderRadius: '8px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: isSelected ? '8px' : '0' }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setSelectedAnomalies(prev => ({ ...prev, [anomaly.id]: e.target.checked }));
                    if (!anomalyLevels[anomaly.id]) {
                      setAnomalyLevels(prev => ({ ...prev, [anomaly.id]: 1 }));
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '1.2rem' }}>{anomaly.emoji}</span>
                <span style={{ color: anomaly.color, fontWeight: 'bold', fontSize: '0.9rem' }}>{anomaly.name}</span>
              </div>

              {isSelected && (
                <div style={{ marginLeft: '28px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: '#94a3b8' }}>
                    레벨: {level}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={level}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setAnomalyLevels(prev => ({ ...prev, [anomaly.id]: parseInt(e.target.value) }));
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
                .map(([id]) => ({ anomalyId: id, level: anomalyLevels[id] || 1 }));
              setDevForcedAnomalies(forcedAnomalies.length > 0 ? forcedAnomalies : null);
            }}
            style={{
              flex: 1, padding: '10px', background: '#ef4444', border: 'none', borderRadius: '6px',
              color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            적용
          </button>
          <button
            onClick={() => { setDevForcedAnomalies(null); setSelectedAnomalies({}); setAnomalyLevels({}); }}
            style={{
              flex: 1, padding: '10px', background: '#334155', border: 'none', borderRadius: '6px',
              color: '#e2e8f0', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            해제
          </button>
        </div>

        {devForcedAnomalies && devForcedAnomalies.length > 0 && (
          <div style={{
            marginTop: '12px', padding: '8px', background: '#1e293b', borderRadius: '6px',
            fontSize: '0.8rem', color: '#cbd5e1'
          }}>
            <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '4px' }}>⚠️ 다음 전투에서 발동:</div>
            {devForcedAnomalies.map(({ anomalyId, level }) => {
              const anomaly = Object.values(anomalyTypes).find(a => a.id === anomalyId);
              return anomaly ? (
                <div key={anomalyId} style={{ marginLeft: '8px' }}>
                  {anomaly.emoji} {anomaly.name} (Lv.{level})
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>

      {/* 전투 시작 - 적 선택 */}
      <h3 style={{ marginTop: '20px', color: '#10b981', fontSize: '1.125rem' }}>🎯 전투 시작</h3>
      <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ marginBottom: '12px', fontSize: '0.875rem', color: '#cbd5e1' }}>
          원하는 적과 전투를 시작합니다:
        </div>

        {[1, 2, 3].map(tier => {
          const tierGroups = enemyGroups.filter(g => g.tier === tier);
          if (tierGroups.length === 0) return null;

          return (
            <div key={tier} style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '0.8rem',
                color: tier === 1 ? '#22c55e' : tier === 2 ? '#f59e0b' : '#ef4444',
                fontWeight: 'bold', marginBottom: '8px', padding: '4px 8px',
                background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'inline-block',
              }}>
                {tier === 1 ? '⭐ Tier 1 (초급)' : tier === 2 ? '⭐⭐ Tier 2 (중급)' : '⭐⭐⭐ Tier 3 (보스)'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {tierGroups.map(group => {
                  const enemyInfos = group.enemies.map(eid => enemies.find(e => e.id === eid));
                  const totalHp = enemyInfos.reduce((sum, e) => sum + (e?.hp || 0), 0);
                  const emojis = [...new Set(enemyInfos.map(e => e?.emoji || '👾'))].join('');

                  return (
                    <button
                      key={group.id}
                      onClick={() => devStartBattle && devStartBattle(group.id)}
                      disabled={!!activeBattle}
                      style={{
                        padding: '10px 14px',
                        background: activeBattle ? '#334155' : tier === 1 ? '#166534' : tier === 2 ? '#92400e' : '#991b1b',
                        border: 'none', borderRadius: '8px', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold',
                        cursor: activeBattle ? 'not-allowed' : 'pointer', opacity: activeBattle ? 0.5 : 1,
                        textAlign: 'left', minWidth: '140px',
                      }}
                      title={`${group.name}\n적: ${group.enemies.join(', ')}\nHP: ${totalHp}`}
                    >
                      <div style={{ marginBottom: '4px' }}>{emojis} {group.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                        HP: {totalHp} | {group.enemies.length}마리
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {activeBattle && (
          <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '8px' }}>
            ⚠️ 전투 중에는 새 전투를 시작할 수 없습니다.
          </div>
        )}
      </div>

      <h3 style={{ marginTop: 0, color: '#fbbf24', fontSize: '1.125rem' }}>전투 제어</h3>

      {activeBattle ? (
        <>
          <div style={{ padding: '12px', background: '#0f172a', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '4px' }}>진행 중인 전투:</div>
            <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>{activeBattle.label} ({activeBattle.kind})</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>난이도: {activeBattle.difficulty}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button onClick={devForceWin} style={{
              padding: '14px', background: '#10b981', border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer',
            }}>✓ 강제 승리</button>
            <button onClick={devForceLose} style={{
              padding: '14px', background: '#ef4444', border: 'none', borderRadius: '8px',
              color: '#fff', fontSize: '0.875rem', fontWeight: 'bold', cursor: 'pointer',
            }}>✗ 강제 패배</button>
          </div>
        </>
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
          진행 중인 전투가 없습니다
        </div>
      )}
    </div>
  );
}
