/**
 * 그래프 기반 던전 탐험 컴포넌트
 * 메트로배니아 스타일 양방향 이동 지원
 */
import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../../state/gameStore';
import { DungeonMinimap } from './DungeonMinimap';
import {
  generateDungeonGraph,
  getAvailableConnections,
  moveToNode,
  DUNGEON_NODE_TYPES,
  DUNGEON_EVENT_TYPES,
  CONNECTION_TYPES,
  OBSTACLE_TEMPLATES,
} from '../../data/dungeonNodes';
import './dungeon.css';

// 노드 타입별 아이콘
const NODE_ICONS = {
  [DUNGEON_NODE_TYPES.ENTRANCE]: '🚪',
  [DUNGEON_NODE_TYPES.EXIT]: '🌟',
  [DUNGEON_NODE_TYPES.ROOM]: '🏠',
  [DUNGEON_NODE_TYPES.CORRIDOR]: '🚶',
  [DUNGEON_NODE_TYPES.CROSSROAD]: '⚔️',
  [DUNGEON_NODE_TYPES.TREASURE]: '💎',
  [DUNGEON_NODE_TYPES.BOSS]: '💀',
};

// 연결 타입별 표시
const CONNECTION_LABELS = {
  [CONNECTION_TYPES.OPEN]: '',
  [CONNECTION_TYPES.STAT_GATE]: '🔒',
  [CONNECTION_TYPES.ITEM_GATE]: '🔑',
  [CONNECTION_TYPES.ONE_WAY]: '➡️',
  [CONNECTION_TYPES.LOCKED]: '⛔',
};

export function GraphDungeonExploration() {
  // Store hooks
  const activeDungeon = useGameStore((s) => s.activeDungeon);
  const setDungeonData = useGameStore((s) => s.setDungeonData);
  const skipDungeon = useGameStore((s) => s.skipDungeon);
  const completeDungeon = useGameStore((s) => s.completeDungeon);
  const playerStrength = useGameStore((s) => s.playerStrength);
  const playerAgility = useGameStore((s) => s.playerAgility);
  const playerInsight = useGameStore((s) => s.playerInsight);
  const playerHp = useGameStore((s) => s.playerHp);
  const maxHp = useGameStore((s) => s.maxHp);
  const items = useGameStore((s) => s.items);
  const addResources = useGameStore((s) => s.addResources);
  const startBattle = useGameStore((s) => s.startBattle);

  // Local state
  const [dungeonState, setDungeonState] = useState(null);
  const [message, setMessage] = useState('');
  const [currentEvent, setCurrentEvent] = useState(null);
  const [crossroadModal, setCrossroadModal] = useState(null);

  const playerStats = { strength: playerStrength, agility: playerAgility, insight: playerInsight };

  // 던전 초기화
  useEffect(() => {
    console.log('[GraphDungeonExploration useEffect] activeDungeon:', activeDungeon, 'dungeonState:', !!dungeonState);
    if (activeDungeon && !dungeonState) {
      console.log('[GraphDungeonExploration useEffect] Generating new dungeon graph...');
      const newDungeon = generateDungeonGraph('dungeon_' + Date.now());
      console.log('[GraphDungeonExploration useEffect] Generated dungeon:', newDungeon);
      setDungeonState(newDungeon);
      setMessage('던전에 입장했습니다. 탐험을 시작하세요.');
    }
  }, [activeDungeon, dungeonState]);

  // 현재 노드 정보
  const currentNode = dungeonState?.nodes?.find(n => n.id === dungeonState.currentNodeId);

  // 이동 가능한 연결 목록
  const availableConnections = dungeonState
    ? getAvailableConnections(dungeonState, playerStats, items)
    : [];

  // 노드 이동 처리
  const handleMove = useCallback((targetNodeId) => {
    if (!dungeonState) return;

    const result = moveToNode(dungeonState, targetNodeId, playerStats, items);

    if (!result.success) {
      setMessage(result.message);
      return;
    }

    setDungeonState(result.newState);

    // 이동한 노드 정보
    const targetNode = result.newState.nodes.find(n => n.id === targetNodeId);

    if (targetNode) {
      // 출구 도달
      if (targetNode.type === DUNGEON_NODE_TYPES.EXIT) {
        setMessage('던전을 탈출했습니다!');
        setTimeout(() => {
          completeDungeon();
        }, 1500);
        return;
      }

      // 이벤트 처리
      if (targetNode.event && !targetNode.cleared) {
        handleNodeEvent(targetNode, result.newState);
      } else {
        setMessage(`${targetNode.name}에 도착했습니다.`);
      }
    }
  }, [dungeonState, playerStats, items, completeDungeon]);

  // 노드 이벤트 처리
  const handleNodeEvent = useCallback((node, state) => {
    const event = node.event;

    switch (event.type) {
      case DUNGEON_EVENT_TYPES.COMBAT:
        setMessage('적과 조우했습니다!');
        setTimeout(() => {
          startBattle('dungeon');
        }, 1000);
        break;

      case DUNGEON_EVENT_TYPES.CHEST:
        const goldAmount = event.quality === 'rare'
          ? 20 + Math.floor(Math.random() * 30)
          : 10 + Math.floor(Math.random() * 15);
        addResources({ gold: goldAmount });
        setMessage(`보물 상자에서 ${goldAmount} 골드를 획득했습니다!`);
        markNodeCleared(node.id, state);
        break;

      case DUNGEON_EVENT_TYPES.CURIO:
        const isBad = Math.random() < 0.3;
        if (isBad) {
          setMessage('저주받은 유물이었습니다! 피해를 입었습니다.');
          useGameStore.setState({ playerHp: Math.max(0, playerHp - 8) });
        } else {
          const reward = event.quality === 'legendary' ? 50 : 25;
          addResources({ gold: reward });
          setMessage(`신비로운 유물에서 ${reward} 골드를 획득했습니다!`);
        }
        markNodeCleared(node.id, state);
        break;

      case DUNGEON_EVENT_TYPES.OBSTACLE:
        // 기로(장애물) 모달 열기
        const template = OBSTACLE_TEMPLATES[event.templateId] || OBSTACLE_TEMPLATES.cliff;
        setCrossroadModal({
          node,
          template,
          choiceState: {},
        });
        break;

      case DUNGEON_EVENT_TYPES.TRAP:
        const trapDamage = 5 + Math.floor(Math.random() * 10);
        useGameStore.setState({ playerHp: Math.max(0, playerHp - trapDamage) });
        setMessage(`함정에 걸렸습니다! ${trapDamage} 피해를 입었습니다.`);
        markNodeCleared(node.id, state);
        break;

      default:
        setMessage(`${node.name}을(를) 탐색했습니다.`);
        markNodeCleared(node.id, state);
    }
  }, [playerHp, addResources, startBattle]);

  // 노드 클리어 처리
  const markNodeCleared = (nodeId, state) => {
    const newState = { ...state };
    const nodeIdx = newState.nodes.findIndex(n => n.id === nodeId);
    if (nodeIdx >= 0) {
      newState.nodes = [...newState.nodes];
      newState.nodes[nodeIdx] = { ...newState.nodes[nodeIdx], cleared: true };
      setDungeonState(newState);
    }
  };

  // 기로 선택지 실행
  const executeChoice = useCallback((choice) => {
    if (!crossroadModal) return;

    const { node } = crossroadModal;
    const attemptCount = crossroadModal.choiceState[choice.id]?.attempts || 0;

    if (choice.repeatable) {
      const newAttempts = attemptCount + 1;
      const maxAttempts = choice.maxAttempts || 5;

      // 스케일링 요구조건 체크
      const hasScalingReq = !!choice.scalingRequirement;
      let meetsRequirement = true;

      if (hasScalingReq) {
        const req = choice.scalingRequirement;
        const requiredValue = req.baseValue + (req.increment * newAttempts);
        const statValue = playerStats[req.stat] || 0;
        meetsRequirement = statValue >= requiredValue;
      }

      // 스탯 미달 시 즉시 실패
      if (hasScalingReq && !meetsRequirement) {
        applyOutcome(choice.outcomes.failure, node);
        setCrossroadModal(null);
        return;
      }

      // 최대 시도 도달
      if (newAttempts >= maxAttempts) {
        const isSuccess = hasScalingReq ? true : (Math.random() < (choice.successRate ?? 0.5));
        const outcome = isSuccess ? choice.outcomes.success : choice.outcomes.failure;
        applyOutcome(outcome, node);
        setCrossroadModal(null);
      } else {
        // 진행 중
        const progressIdx = Math.min(newAttempts - 1, (choice.progressText?.length || 1) - 1);
        const progressMsg = choice.progressText?.[progressIdx] || `시도 ${newAttempts}/${maxAttempts}`;
        setMessage(progressMsg);

        setCrossroadModal({
          ...crossroadModal,
          choiceState: {
            ...crossroadModal.choiceState,
            [choice.id]: { attempts: newAttempts },
          },
        });
      }
    } else {
      // 일회성 선택지
      const hasSuccessRate = choice.successRate !== undefined;
      const isSuccess = hasSuccessRate ? (Math.random() < choice.successRate) : true;
      const outcome = isSuccess ? choice.outcomes.success : choice.outcomes.failure;
      applyOutcome(outcome, node);
      setCrossroadModal(null);
    }
  }, [crossroadModal, playerStats]);

  // 결과 적용
  const applyOutcome = (outcome, node) => {
    if (!outcome) return;

    setMessage(outcome.text);

    if (outcome.effect) {
      // 피해
      if (outcome.effect.damage) {
        useGameStore.setState({
          playerHp: Math.max(0, playerHp - outcome.effect.damage)
        });
      }

      // 보상
      if (outcome.effect.reward?.gold) {
        const gold = typeof outcome.effect.reward.gold === 'object'
          ? outcome.effect.reward.gold.min + Math.floor(Math.random() * (outcome.effect.reward.gold.max - outcome.effect.reward.gold.min + 1))
          : outcome.effect.reward.gold;
        addResources({ gold });
      }

      // 전투 트리거
      if (outcome.effect.triggerCombat) {
        setTimeout(() => startBattle('dungeon'), 1500);
      }
    }

    // 노드 클리어
    markNodeCleared(node.id, dungeonState);

    // 메시지 클리어
    setTimeout(() => setMessage(''), 3000);
  };

  // 던전 포기
  const handleAbandon = () => {
    if (window.confirm('던전을 포기하시겠습니까?')) {
      skipDungeon();
    }
  };

  console.log('[GraphDungeonExploration render] activeDungeon:', activeDungeon, 'dungeonState:', !!dungeonState);
  if (!activeDungeon || !dungeonState) {
    console.log('[GraphDungeonExploration render] Returning null - activeDungeon:', !!activeDungeon, 'dungeonState:', !!dungeonState);
    return null;
  }
  console.log('[GraphDungeonExploration render] Rendering dungeon UI');

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '20px',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      minHeight: '100vh',
      color: '#e2e8f0',
      zIndex: 100,
      overflow: 'auto',
    }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.8)',
        borderRadius: '12px',
        border: '1px solid #334155',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#f1c40f' }}>
            던전 탐험
          </h2>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            턴: {dungeonState.timeElapsed}/{dungeonState.maxTime}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* HP 표시 */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>HP</div>
            <div style={{ fontSize: '18px', color: '#ef4444', fontWeight: 'bold' }}>
              {playerHp}/{maxHp}
            </div>
          </div>

          <button
            onClick={handleAbandon}
            style={{
              padding: '8px 16px',
              background: '#dc2626',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            포기
          </button>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '16px',
        flex: 1,
      }}>
        {/* 현재 위치 & 이동 선택 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* 현재 노드 */}
          <div style={{
            padding: '24px',
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '12px',
            border: '1px solid #475569',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}>
              <span style={{ fontSize: '32px' }}>
                {NODE_ICONS[currentNode?.type] || '❓'}
              </span>
              <div>
                <h3 style={{ margin: 0, fontSize: '24px', color: '#f1c40f' }}>
                  {currentNode?.name || '알 수 없는 장소'}
                </h3>
                <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '14px' }}>
                  {currentNode?.description}
                </p>
              </div>
            </div>

            {/* 메시지 */}
            {message && (
              <div style={{
                padding: '12px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                color: '#93c5fd',
                fontSize: '14px',
              }}>
                {message}
              </div>
            )}
          </div>

          {/* 이동 가능한 곳 */}
          <div style={{
            padding: '20px',
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '12px',
            border: '1px solid #475569',
          }}>
            <h4 style={{ margin: '0 0 16px', color: '#cbd5e1', fontSize: '16px' }}>
              이동 가능한 곳
            </h4>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              {availableConnections.map((conn, idx) => (
                <button
                  key={idx}
                  onClick={() => conn.canPass && handleMove(conn.targetId)}
                  disabled={!conn.canPass}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    background: conn.canPass
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(100, 116, 139, 0.1)',
                    border: `2px solid ${conn.canPass ? '#22c55e' : '#475569'}`,
                    borderRadius: '10px',
                    color: conn.canPass ? '#e2e8f0' : '#64748b',
                    cursor: conn.canPass ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>
                    {conn.targetNode?.visited
                      ? NODE_ICONS[conn.targetNode?.type] || '❓'
                      : '❓'}
                  </span>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>
                      {conn.targetNode?.visited ? conn.targetNode?.name : '???'}
                      {CONNECTION_LABELS[conn.type] && (
                        <span style={{ marginLeft: '8px' }}>
                          {CONNECTION_LABELS[conn.type]}
                        </span>
                      )}
                    </div>
                    {!conn.canPass && conn.reason && (
                      <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '2px' }}>
                        {conn.reason}
                      </div>
                    )}
                  </div>

                  {conn.canPass && (
                    <span style={{ color: '#22c55e' }}>→</span>
                  )}
                </button>
              ))}

              {availableConnections.length === 0 && (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
                  이동할 수 있는 곳이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 미니맵 */}
        <div>
          <DungeonMinimap
            dungeonState={dungeonState}
            onNodeClick={(nodeId) => {
              // 연결된 노드인 경우에만 이동
              const conn = availableConnections.find(c => c.targetId === nodeId);
              if (conn?.canPass) {
                handleMove(nodeId);
              }
            }}
            playerStats={playerStats}
          />

          {/* 스탯 표시 */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(15, 23, 42, 0.95)',
            borderRadius: '12px',
            border: '1px solid #334155',
          }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
              스탯
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <StatBadge label="힘" value={playerStrength} color="#ef4444" />
              <StatBadge label="민첩" value={playerAgility} color="#22c55e" />
              <StatBadge label="통찰" value={playerInsight} color="#3b82f6" />
            </div>
          </div>
        </div>
      </div>

      {/* 기로 모달 */}
      {crossroadModal && (
        <CrossroadModal
          modal={crossroadModal}
          onChoice={executeChoice}
          onClose={() => setCrossroadModal(null)}
        />
      )}
    </div>
  );
}

// 스탯 뱃지 컴포넌트
function StatBadge({ label, value, color }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: color,
      }} />
      <span style={{ color: '#94a3b8', fontSize: '12px' }}>{label}</span>
      <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{value}</span>
    </div>
  );
}

// 기로 모달 컴포넌트
function CrossroadModal({ modal, onChoice, onClose }) {
  const { template, choiceState } = modal;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        width: '90%',
        maxWidth: '500px',
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '16px',
        border: '2px solid #475569',
        padding: '24px',
      }}>
        {/* 제목 */}
        <h3 style={{
          margin: '0 0 8px',
          fontSize: '24px',
          color: '#f1c40f',
          textAlign: 'center',
        }}>
          {template?.name || '기로'}
        </h3>

        {/* 설명 */}
        <p style={{
          margin: '0 0 24px',
          fontSize: '15px',
          color: '#94a3b8',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          {template?.description}
        </p>

        {/* 선택지 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {template?.choices?.map((choice) => {
            const attemptCount = choiceState[choice.id]?.attempts || 0;
            const canSelect = choice.repeatable || attemptCount === 0;

            return (
              <button
                key={choice.id}
                onClick={() => canSelect && onChoice(choice)}
                disabled={!canSelect}
                style={{
                  padding: '16px 20px',
                  background: canSelect
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'rgba(100, 116, 139, 0.1)',
                  border: `2px solid ${canSelect ? '#3b82f6' : '#475569'}`,
                  borderRadius: '10px',
                  color: canSelect ? '#e2e8f0' : '#64748b',
                  fontSize: '15px',
                  cursor: canSelect ? 'pointer' : 'not-allowed',
                  textAlign: 'left',
                  opacity: canSelect ? 1 : 0.5,
                }}
              >
                <div style={{ fontWeight: '600' }}>{choice.text}</div>
                {choice.repeatable && attemptCount > 0 && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    시도: {attemptCount}/{choice.maxAttempts || 5}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default GraphDungeonExploration;
