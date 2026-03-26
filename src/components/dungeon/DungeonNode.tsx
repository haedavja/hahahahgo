/**
 * 던전 노드 UI 컴포넌트
 * 그래프 기반 던전 탐험을 위한 노드 표시 및 상호작용
 * 최적화: React.memo + 스타일 상수 추출
 */

import { useState, useMemo, useCallback, memo } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../state/gameStore';
import {
  DUNGEON_NODE_TYPES,
  DUNGEON_EVENT_TYPES,
  OBSTACLE_TEMPLATES,
  calculateTimePenalty,
} from '../../data/dungeonNodes';
import {
  canSelectChoice,
  getSpecialOverride,
  executeChoice,
  getChoiceDisplayInfo,
  isOverpushing,
  getOverpushPenalty,
} from '../../lib/dungeonChoices';
import type {
  DungeonChoice,
  DungeonPlayerStats,
  DungeonChoiceState,
  DungeonSpecialOverride,
} from '../../types/game';

// 확장된 선택지 타입 (실제 데이터에는 id가 포함됨)
interface DungeonChoiceWithId extends DungeonChoice {
  id: string;
}

// dungeonNodes.ts에서 정의된 타입들
interface DungeonNode {
  id: string;
  type: string;
  name: string;
  description: string;
  x: number;
  y: number;
  event: DungeonEvent | null;
  connections: string[];
  visited: boolean;
  cleared: boolean;
  hidden?: boolean;
}

interface DungeonEvent {
  type: string;
  templateId?: string;
  quality?: string;
  difficulty?: number;
}

interface DungeonState {
  id: string;
  nodes: DungeonNode[];
  connections: Record<string, unknown[]>;
  currentNodeId: string;
  unlockedShortcuts: string[];
  discoveredHidden: string[];
  timeElapsed: number;
  maxTime: number;
}

// 노드 타입별 이모지
const NODE_EMOJIS = {
  [DUNGEON_NODE_TYPES.ENTRANCE]: '🚪',
  [DUNGEON_NODE_TYPES.ROOM]: '🏠',
  [DUNGEON_NODE_TYPES.CORRIDOR]: '🚶',
  [DUNGEON_NODE_TYPES.CROSSROAD]: '🔀',
  [DUNGEON_NODE_TYPES.EXIT]: '🌅',
};

// 이벤트 타입별 이모지
const EVENT_EMOJIS = {
  [DUNGEON_EVENT_TYPES.CHEST]: '📦',
  [DUNGEON_EVENT_TYPES.COMBAT]: '⚔️',
  [DUNGEON_EVENT_TYPES.CURIO]: '🔮',
  [DUNGEON_EVENT_TYPES.OBSTACLE]: '🧗',
  [DUNGEON_EVENT_TYPES.TRAP]: '⚠️',
  [DUNGEON_EVENT_TYPES.REST]: '🔥',
  [DUNGEON_EVENT_TYPES.MERCHANT]: '🛒',
};

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  padding: '24px',
  maxWidth: '600px',
  margin: '0 auto',
  color: '#e2e8f0'
};

const HEADER_BASE_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
  padding: '12px 16px',
  background: 'rgba(15, 23, 42, 0.9)',
  borderRadius: '8px'
};

const TIME_LABEL_STYLE: CSSProperties = {
  fontSize: '14px',
  color: '#94a3b8'
};

const TIME_VALUE_STYLE: CSSProperties = {
  fontSize: '18px',
  fontWeight: 'bold'
};

const NODE_INFO_STYLE: CSSProperties = {
  padding: '20px',
  background: 'rgba(30, 41, 59, 0.9)',
  borderRadius: '12px',
  marginBottom: '20px',
  border: '1px solid #475569'
};

const NODE_HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '12px'
};

const MESSAGE_STYLE: CSSProperties = {
  padding: '16px',
  background: 'rgba(15, 23, 42, 0.8)',
  borderRadius: '8px',
  marginTop: '16px',
  borderLeft: '4px solid #3b82f6',
  fontSize: '15px',
  lineHeight: '1.6'
};

const WARNING_STYLE: CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(234, 179, 8, 0.2)',
  borderRadius: '8px',
  marginTop: '12px',
  border: '1px solid #eab308',
  color: '#fde047',
  fontSize: '14px'
};

const SECTION_STYLE: CSSProperties = {
  padding: '20px',
  background: 'rgba(30, 41, 59, 0.9)',
  borderRadius: '12px',
  marginBottom: '20px',
  border: '1px solid #475569'
};

const SECTION_TITLE_STYLE: CSSProperties = {
  margin: '0 0 16px',
  fontSize: '16px',
  color: '#94a3b8'
};

const NAV_BUTTONS_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px'
};

const EXIT_BUTTON_STYLE: CSSProperties = {
  marginTop: '16px',
  padding: '14px 24px',
  width: '100%',
  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer'
};

const CHOICE_SUBTEXT_BASE_STYLE: CSSProperties = {
  fontSize: '12px',
  marginTop: '4px'
};

const LOADING_STYLE: CSSProperties = {
  color: '#fff',
  textAlign: 'center'
};

/**
 * 선택지 버튼 컴포넌트
 */
interface ChoiceButtonProps {
  choice: DungeonChoiceWithId;
  playerStats: DungeonPlayerStats;
  choiceState: DungeonChoiceState;
  specials: string[];
  onSelect: (choice: DungeonChoiceWithId, specialOverride: DungeonSpecialOverride | null) => void;
  shaking: boolean;
}

const ChoiceButton = memo(function ChoiceButton({ choice, playerStats, choiceState, specials, onSelect, shaking }: ChoiceButtonProps) {
  const specialOverride = getSpecialOverride(choice, specials);
  const displayInfo = getChoiceDisplayInfo(choice, playerStats, choiceState, specialOverride);

  const buttonStyle = useMemo((): CSSProperties => ({
    padding: '12px 20px',
    margin: '6px 0',
    width: '100%',
    textAlign: 'left',
    background: displayInfo.isSpecial
      ? 'linear-gradient(135deg, rgba(147, 51, 234, 0.3), rgba(79, 70, 229, 0.3))'
      : displayInfo.disabled
        ? 'rgba(30, 41, 59, 0.5)'
        : 'rgba(30, 41, 59, 0.9)',
    border: displayInfo.isSpecial
      ? '2px solid #a78bfa'
      : displayInfo.disabled
        ? '1px solid #475569'
        : '1px solid #64748b',
    borderRadius: '8px',
    color: displayInfo.disabled ? '#64748b' : '#e2e8f0',
    cursor: displayInfo.disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '15px',
  }), [displayInfo.isSpecial, displayInfo.disabled]);

  if (displayInfo.hidden) return null;

  return (
    <button
      className={`dungeon-choice-btn ${displayInfo.disabled ? 'disabled' : ''} ${displayInfo.isSpecial ? 'special' : ''} ${shaking ? 'shake' : ''}`}
      disabled={displayInfo.disabled}
      onClick={() => onSelect(choice, specialOverride)}
      style={buttonStyle}
    >
      <div>{displayInfo.text}</div>
      {displayInfo.subtext && (
        <div style={{ ...CHOICE_SUBTEXT_BASE_STYLE, color: displayInfo.isSpecial ? '#c4b5fd' : '#94a3b8' }}>
          {displayInfo.subtext}
        </div>
      )}
    </button>
  );
});

/**
 * 던전 노드 메인 컴포넌트
 */
interface DungeonNodeProps {
  dungeon: DungeonState;
  onNavigate: (nodeId: string) => void;
  onExit: () => void;
  onCombat: (combatId: string) => void;
}

function DungeonNodeComponent({ dungeon, onNavigate, onExit, onCombat }: DungeonNodeProps) {
  const playerStrength = useGameStore((s) => s.playerStrength || 0);
  const playerAgility = useGameStore((s) => s.playerAgility || 0);
  const playerInsight = useGameStore((s) => s.playerInsight || 0);
  const characterBuild = useGameStore((s) => s.characterBuild);
  const playerHp = useGameStore((s) => s.playerHp);
  const maxHp = useGameStore((s) => s.maxHp);
  const applyDamage = useGameStore((s) => s.applyDamage);
  const addResources = useGameStore((s) => s.addResources);

  // 선택 상태 (노드별 시도 횟수 등)
  const [choiceStates, setChoiceStates] = useState({});
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showWarning, setShowWarning] = useState<string | null>(null);

  const currentNode = useMemo(() => {
    return dungeon?.nodes?.find((n) => n.id === dungeon.currentNodeId);
  }, [dungeon]);

  const connectedNodes = useMemo(() => {
    if (!currentNode || !dungeon?.nodes) return [];
    return currentNode.connections
      .map((id) => dungeon.nodes.find((n) => n.id === id))
      .filter((node): node is DungeonNode => node !== undefined);
  }, [currentNode, dungeon]);

  const playerStats = useMemo(() => ({
    strength: playerStrength,
    agility: playerAgility,
    insight: playerInsight,
  }), [playerStrength, playerAgility, playerInsight]);

  const playerSpecials = useMemo(() => {
    const specials = characterBuild?.mainSpecials;
    if (!specials) return [];
    // mainSpecials is an array of strings, not objects
    return Array.isArray(specials) ? specials : [];
  }, [characterBuild]);

  const timePenalty = useMemo(() => {
    return calculateTimePenalty(dungeon?.timeElapsed || 0, dungeon?.maxTime || 30);
  }, [dungeon]);

  // 이벤트에 따른 선택지 가져오기
  const eventChoices = useMemo((): DungeonChoiceWithId[] => {
    if (!currentNode?.event) return [];

    const eventType = currentNode.event.type;

    // 템플릿에서 선택지 가져오기
    if (eventType === DUNGEON_EVENT_TYPES.OBSTACLE) {
      const templateId = currentNode.event.templateId || 'cliff';
      const templatesRecord = OBSTACLE_TEMPLATES as Record<string, { choices?: unknown[] }>;
      const template = templatesRecord[templateId];
      return (template?.choices || []) as DungeonChoiceWithId[];
    }

    if (eventType === DUNGEON_EVENT_TYPES.CHEST) {
      const template = OBSTACLE_TEMPLATES.lockedChest;
      return (template?.choices || []) as DungeonChoiceWithId[];
    }

    return [];
  }, [currentNode]);

  // 선택 실행
  const handleChoiceSelect = useCallback((choice: DungeonChoiceWithId, specialOverride: DungeonSpecialOverride | null) => {
    if (!currentNode) return;

    const choiceKey = `${currentNode.id}_${choice.id}`;
    const statesRecord = choiceStates as Record<string, { attempts: number; completed?: boolean }>;
    const currentState = statesRecord[choiceKey] || { attempts: 0 };

    // 과잉 선택 체크
    if (isOverpushing(choice, currentState.attempts + 1)) {
      const penalty = getOverpushPenalty(choice, currentState.attempts + 1);
      if (penalty) {
        setCurrentMessage(penalty.text);
        if (penalty.effect?.damage) {
          applyDamage(penalty.effect.damage as number);
        }
        if (penalty.effect?.triggerCombat) {
          setTimeout(() => {
            onCombat(penalty.effect?.triggerCombat as string);
          }, 1500);
        }
        setChoiceStates(prev => ({
          ...prev,
          [choiceKey]: { ...currentState, attempts: currentState.attempts + 1, completed: true }
        }));
        return;
      }
    }

    const result = executeChoice(choice, playerStats, currentState, specialOverride);

    // 상태 업데이트
    setChoiceStates(prev => ({
      ...prev,
      [choiceKey]: result.newState
    }));

    // 메시지 표시
    setCurrentMessage(result.message);

    // 경고 표시
    if (result.warning) {
      setShowWarning(result.warning);
      setTimeout(() => setShowWarning(null), 3000);
    }

    // 화면 효과
    if (result.screenEffect === 'shake') {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 300);
    }

    // 효과 적용
    if (result.effect) {
      if (result.effect.damage) {
        applyDamage(result.effect.damage as number);
      }
      if (result.effect.reward) {
        const reward: Record<string, number> = {};
        const rewardData = result.effect.reward as Record<string, unknown>;
        if (rewardData.gold) {
          const goldData = rewardData.gold as { min: number; max: number };
          const { min, max } = goldData;
          reward.gold = min + Math.floor(Math.random() * (max - min + 1));
        }
        if (rewardData.loot) {
          reward.loot = rewardData.loot as number;
        }
        addResources(reward);
      }
      if (result.effect.triggerCombat) {
        setTimeout(() => {
          onCombat(result.effect.triggerCombat as string);
        }, 1500);
      }
      if (result.effect.unlockNode) {
        // 노드 잠금 해제 로직
      }
    }

    // 완료 후 메시지 자동 제거
    if (result.newState.completed) {
      setTimeout(() => setCurrentMessage(null), 3000);
    }
  }, [currentNode, choiceStates, playerStats, applyDamage, addResources, onCombat]);

  // 노드 이동
  const handleNavigate = useCallback((targetNode: DungeonNode) => {
    setCurrentMessage(null);
    setShowWarning(null);
    onNavigate(targetNode.id);
  }, [onNavigate]);

  if (!currentNode) {
    return <div style={LOADING_STYLE}>던전 로딩 중...</div>;
  }

  const nodeEmoji = NODE_EMOJIS[currentNode.type] || '❓';
  const eventEmoji = currentNode.event ? EVENT_EMOJIS[currentNode.event.type] : null;

  return (
    <div className={`dungeon-node-container ${isShaking ? 'shake-screen' : ''}`} style={CONTAINER_STYLE}>
      {/* 헤더: 시간 페널티 표시 */}
      <div style={{
        ...HEADER_BASE_STYLE,
        border: `1px solid ${timePenalty.level === 0 ? '#22c55e' : timePenalty.level === 1 ? '#eab308' : timePenalty.level === 2 ? '#f97316' : '#ef4444'}`,
      }}>
        <div>
          <span style={TIME_LABEL_STYLE}>탐험 시간</span>
          <div style={TIME_VALUE_STYLE}>
            {dungeon.timeElapsed || 0} / {dungeon.maxTime || 30}
          </div>
        </div>
        <div style={{
          padding: '6px 12px',
          borderRadius: '20px',
          background: timePenalty.level === 0 ? 'rgba(34, 197, 94, 0.2)' :
                      timePenalty.level === 1 ? 'rgba(234, 179, 8, 0.2)' :
                      timePenalty.level === 2 ? 'rgba(249, 115, 22, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: timePenalty.level === 0 ? '#22c55e' :
                 timePenalty.level === 1 ? '#eab308' :
                 timePenalty.level === 2 ? '#f97316' : '#ef4444',
          fontSize: '14px',
          fontWeight: '600',
        }}>
          {timePenalty.description}
        </div>
        <div>
          <span style={TIME_LABEL_STYLE}>체력</span>
          <div style={{ ...TIME_VALUE_STYLE, color: playerHp / maxHp > 0.5 ? '#22c55e' : playerHp / maxHp > 0.25 ? '#eab308' : '#ef4444' }}>
            {playerHp} / {maxHp}
          </div>
        </div>
      </div>

      {/* 현재 노드 정보 */}
      <div style={NODE_INFO_STYLE}>
        <div style={NODE_HEADER_STYLE}>
          <span style={{ fontSize: '32px' }}>{nodeEmoji}</span>
          {eventEmoji && <span style={{ fontSize: '24px' }}>{eventEmoji}</span>}
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#f8fafc' }}>{currentNode.name}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#94a3b8' }}>{currentNode.description}</p>
          </div>
        </div>

        {/* 현재 메시지 */}
        {currentMessage && (
          <div style={MESSAGE_STYLE}>
            {currentMessage}
          </div>
        )}

        {/* 경고 메시지 */}
        {showWarning && (
          <div style={WARNING_STYLE}>
            ⚠️ {showWarning}
          </div>
        )}
      </div>

      {/* 선택지 */}
      {eventChoices.length > 0 && (
        <div style={SECTION_STYLE}>
          <h3 style={SECTION_TITLE_STYLE}>선택지</h3>
          {eventChoices.map((choice) => (
            <ChoiceButton
              key={choice.id}
              choice={choice}
              playerStats={playerStats}
              choiceState={(choiceStates as Record<string, DungeonChoiceState>)[`${currentNode.id}_${choice.id}`] || {}}
              specials={playerSpecials}
              onSelect={handleChoiceSelect}
              shaking={isShaking}
            />
          ))}
        </div>
      )}

      {/* 이동 가능한 노드 */}
      <div style={{ ...SECTION_STYLE, marginBottom: 0 }}>
        <h3 style={SECTION_TITLE_STYLE}>이동</h3>
        <div style={NAV_BUTTONS_STYLE}>
          {connectedNodes.map((node) => (
            <button
              key={node.id}
              onClick={() => handleNavigate(node)}
              style={{
                padding: '10px 16px',
                background: node.visited ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                border: `1px solid ${node.visited ? '#22c55e' : '#3b82f6'}`,
                borderRadius: '8px',
                color: node.visited ? '#86efac' : '#93c5fd',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{NODE_EMOJIS[node.type] || '❓'}</span>
              <span>{node.name}</span>
              {node.visited && <span style={{ fontSize: '12px' }}>✓</span>}
            </button>
          ))}
        </div>

        {/* 출구 도착 시 */}
        {currentNode.type === DUNGEON_NODE_TYPES.EXIT && (
          <button
            onClick={onExit}
            style={EXIT_BUTTON_STYLE}
          >
            🌅 던전 탈출
          </button>
        )}
      </div>
    </div>
  );
}

export const DungeonNode = memo(DungeonNodeComponent);
