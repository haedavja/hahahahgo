/**
 * 새 던전 탐험 시스템 (그래프 기반)
 * 메트로배니아 스타일의 양방향 이동과 기로 시스템
 */

import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../../state/gameStore';
import { DungeonNode } from './DungeonNode';
import { generateDungeonGraph, calculateTimePenalty, DUNGEON_EVENT_TYPES } from '../../data/dungeonNodes';
import { CharacterSheet } from '../character/CharacterSheet';
import './dungeon.css';

export function DungeonExplorationNew() {
  // Store hooks
  const activeDungeon = useGameStore((s) => s.activeDungeon);
  const setDungeonData = useGameStore((s) => s.setDungeonData);
  const setDungeonInitialResources = useGameStore((s) => s.setDungeonInitialResources);
  const setDungeonDeltas = useGameStore((s) => s.setDungeonDeltas);
  const navigateDungeonNode = useGameStore((s) => s.navigateDungeonNode);
  const clearDungeonNode = useGameStore((s) => s.clearDungeonNode);
  const applyDungeonTimePenalty = useGameStore((s) => s.applyDungeonTimePenalty);
  const skipDungeon = useGameStore((s) => s.skipDungeon);
  const completeDungeon = useGameStore((s) => s.completeDungeon);
  const startBattle = useGameStore((s) => s.startBattle);
  const addResources = useGameStore((s) => s.addResources);
  const lastBattleResult = useGameStore((s) => s.lastBattleResult);
  const clearBattleResult = useGameStore((s) => s.clearBattleResult);
  const resources = useGameStore((s) => s.resources);

  const [showCharacter, setShowCharacter] = useState(false);
  const [dungeonSummary, setDungeonSummary] = useState(null);
  const [combatResult, setCombatResult] = useState(null);

  // 던전 그래프 생성 (한 번만)
  useEffect(() => {
    if (activeDungeon && !activeDungeon.dungeonData?.nodes) {
      const dungeonGraph = generateDungeonGraph(`dungeon_${Date.now()}`, {
        nodeCount: { min: 8, max: 12 },
        branchChance: 0.3,
        eventDensity: 0.6,
        minCombats: 2,
        difficulty: 1,
      });
      setDungeonData(dungeonGraph);
    }
  }, [activeDungeon, setDungeonData]);

  // 초기 자원 저장 (한 번만)
  useEffect(() => {
    if (activeDungeon && !activeDungeon.initialResources) {
      setDungeonInitialResources({ ...resources });
    }
  }, [activeDungeon, setDungeonInitialResources, resources]);

  // 던전 델타 초기화 (한 번만)
  useEffect(() => {
    if (activeDungeon && !activeDungeon.dungeonDeltas) {
      setDungeonDeltas({ gold: 0, intel: 0, loot: 0, material: 0 });
    }
  }, [activeDungeon, setDungeonDeltas]);

  // 전투 결과 처리
  useEffect(() => {
    if (!lastBattleResult || !lastBattleResult.nodeId.startsWith('dungeon-node-')) return;

    if (lastBattleResult.result === 'victory') {
      const gold = 5 + Math.floor(Math.random() * 6);
      const loot = Math.random() < 0.5 ? 1 : 0;
      setCombatResult({ gold, loot, victory: true });

      // 현재 노드 클리어 처리
      const nodeId = lastBattleResult.nodeId.replace('dungeon-node-', '');
      clearDungeonNode(nodeId);
    } else {
      setCombatResult({ gold: 0, loot: 0, victory: false });
    }

    clearBattleResult();
  }, [lastBattleResult, clearBattleResult, clearDungeonNode]);

  // 노드 이동 핸들러
  const handleNavigate = useCallback((targetNodeId) => {
    navigateDungeonNode(targetNodeId);

    // 시간 페널티 확인 및 적용
    const dungeon = activeDungeon?.dungeonData;
    if (dungeon) {
      const penalty = calculateTimePenalty(dungeon.timeElapsed + 1, dungeon.maxTime);
      if (penalty.etherDecay > 0) {
        applyDungeonTimePenalty(penalty.etherDecay);
      }
    }
  }, [navigateDungeonNode, activeDungeon, applyDungeonTimePenalty]);

  // 던전 탈출 핸들러
  const handleExit = useCallback(() => {
    const dungeonDeltas = activeDungeon?.dungeonDeltas || { gold: 0, intel: 0, loot: 0, material: 0 };
    setDungeonSummary({
      ...dungeonDeltas,
      isComplete: true,
    });
  }, [activeDungeon]);

  // 던전 탈출 (중도 포기)
  const handleSkip = useCallback(() => {
    const dungeonDeltas = activeDungeon?.dungeonDeltas || { gold: 0, intel: 0, loot: 0, material: 0 };
    setDungeonSummary({
      ...dungeonDeltas,
      isComplete: false,
    });
  }, [activeDungeon]);

  // 전투 시작 핸들러
  const handleCombat = useCallback((combatType) => {
    const dungeon = activeDungeon?.dungeonData;
    if (!dungeon) return;

    const currentNodeId = dungeon.currentNodeId;
    const enemyHp = combatType === 'mimic' ? 40 : 25 + Math.floor(Math.random() * 10);

    startBattle({
      nodeId: `dungeon-node-${currentNodeId}`,
      kind: 'combat',
      label: combatType === 'mimic' ? '미믹' : '던전 몬스터',
      enemyHp,
      rewards: {},
    });
  }, [activeDungeon, startBattle]);

  // 전투 결과 모달 닫기
  const closeCombatResult = useCallback(() => {
    if (combatResult && (combatResult.gold > 0 || combatResult.loot > 0)) {
      const dungeonDeltas = activeDungeon?.dungeonDeltas || { gold: 0, intel: 0, loot: 0, material: 0 };
      setDungeonDeltas({
        ...dungeonDeltas,
        gold: dungeonDeltas.gold + combatResult.gold,
        loot: dungeonDeltas.loot + combatResult.loot,
      });
    }
    setCombatResult(null);
  }, [combatResult, activeDungeon, setDungeonDeltas]);

  // 던전 종료 확인
  const closeDungeonSummary = useCallback(() => {
    const isComplete = dungeonSummary?.isComplete;
    const dungeonDeltas = activeDungeon?.dungeonDeltas || { gold: 0, intel: 0, loot: 0, material: 0 };

    addResources(dungeonDeltas);
    setDungeonSummary(null);

    if (isComplete) {
      completeDungeon();
    } else {
      skipDungeon();
    }
  }, [dungeonSummary, activeDungeon, addResources, completeDungeon, skipDungeon]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setShowCharacter((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dungeon = activeDungeon?.dungeonData;
  const initialResources = activeDungeon?.initialResources || resources;
  const dungeonDeltas = activeDungeon?.dungeonDeltas || { gold: 0, intel: 0, loot: 0, material: 0 };

  if (!dungeon?.nodes) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e2e8f0',
        fontSize: '18px',
      }}>
        던전 생성 중...
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* 상단 자원 바 */}
      <div style={{
        padding: '12px 20px',
        background: 'rgba(15, 23, 42, 0.9)',
        borderBottom: '1px solid #334155',
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
      }}>
        <ResourceDisplay
          label="금"
          value={initialResources.gold}
          delta={dungeonDeltas.gold}
          color="#ffd700"
        />
        <ResourceDisplay
          label="정보"
          value={initialResources.intel}
          delta={dungeonDeltas.intel}
          color="#9da9d6"
        />
        <ResourceDisplay
          label="전리품"
          value={initialResources.loot}
          delta={dungeonDeltas.loot}
          color="#ff6b6b"
        />
        <ResourceDisplay
          label="원자재"
          value={initialResources.material}
          delta={dungeonDeltas.material}
          color="#a0e9ff"
        />
      </div>

      {/* 메인 던전 노드 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
        <DungeonNode
          dungeon={dungeon}
          onNavigate={handleNavigate}
          onExit={handleExit}
          onCombat={handleCombat}
        />
      </div>

      {/* 하단 액션 바 */}
      <div style={{
        padding: '16px 20px',
        background: 'rgba(15, 23, 42, 0.9)',
        borderTop: '1px solid #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ color: '#94a3b8', fontSize: '14px' }}>
          C: 캐릭터 정보
        </div>
        <button
          onClick={handleSkip}
          style={{
            padding: '10px 20px',
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => e.target.style.background = '#b91c1c'}
          onMouseOut={(e) => e.target.style.background = '#dc2626'}
        >
          던전 탈출
        </button>
      </div>

      {/* 전투 결과 모달 */}
      {combatResult && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: '#1e293b',
            padding: '32px',
            borderRadius: '16px',
            border: '2px solid #475569',
            textAlign: 'center',
            color: '#e2e8f0',
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '24px', color: combatResult.victory ? '#22c55e' : '#ef4444' }}>
              {combatResult.victory ? '승리!' : '패배'}
            </h3>
            {combatResult.victory && (
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                {combatResult.gold > 0 && <div style={{ color: '#ffd700', marginBottom: '4px' }}>금 +{combatResult.gold}</div>}
                {combatResult.loot > 0 && <div style={{ color: '#ff6b6b' }}>전리품 +{combatResult.loot}</div>}
              </div>
            )}
            {!combatResult.victory && <div style={{ fontSize: '14px', color: '#ef4444' }}>보상 없음</div>}
            <button
              onClick={closeCombatResult}
              style={{
                marginTop: '20px',
                padding: '10px 24px',
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 던전 종료 요약 모달 */}
      {dungeonSummary && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: '#1e293b',
            padding: '32px',
            borderRadius: '16px',
            border: '2px solid #475569',
            textAlign: 'center',
            color: '#e2e8f0',
            minWidth: '300px',
          }}>
            <h3 style={{ margin: '0 0 24px', fontSize: '24px', color: dungeonSummary.isComplete ? '#22c55e' : '#f59e0b' }}>
              {dungeonSummary.isComplete ? '던전 완료!' : '던전 탈출'}
            </h3>
            <div style={{ fontSize: '16px', lineHeight: '1.8', textAlign: 'left', marginBottom: '20px' }}>
              <SummaryRow label="금" value={dungeonSummary.gold} color="#ffd700" />
              <SummaryRow label="정보" value={dungeonSummary.intel} color="#9da9d6" />
              <SummaryRow label="전리품" value={dungeonSummary.loot} color="#ff6b6b" />
              <SummaryRow label="원자재" value={dungeonSummary.material} color="#a0e9ff" />
            </div>
            <button
              onClick={closeDungeonSummary}
              style={{
                marginTop: '20px',
                padding: '10px 24px',
                background: dungeonSummary.isComplete ? '#22c55e' : '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 캐릭터 창 */}
      {showCharacter && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
          onClick={() => setShowCharacter(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <CharacterSheet onClose={() => setShowCharacter(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// 자원 표시 컴포넌트
function ResourceDisplay({ label, value, delta, color }) {
  return (
    <div style={{ color, fontSize: '14px', fontWeight: '600' }}>
      {label}: {value}
      {delta !== 0 && (
        <span style={{ color: delta > 0 ? '#22c55e' : '#ef4444', marginLeft: '4px' }}>
          ({delta > 0 ? '+' : ''}{delta})
        </span>
      )}
    </div>
  );
}

// 요약 행 컴포넌트
function SummaryRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <span style={{ color }}>{label}:</span>
      <span style={{ color: value >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
        {value >= 0 ? '+' : ''}{value}
      </span>
    </div>
  );
}
