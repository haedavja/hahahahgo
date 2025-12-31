/**
 * @file GrowthPyramidModal.tsx
 * @description 피라미드 성장 시스템 메인 UI
 *
 * 구조:
 * 1단계: 기초 에토스 (6개)
 * 2단계: 기본 파토스 (5개)
 * 3단계: 에토스 노드 (6개, 각 2선택지)
 * 4단계: 파토스 노드 (5개, 각 2선택지)
 * 5단계: 상위 에토스 노드 (4개, 각 2선택지)
 * 정점: 자아 (검사/총잡이) + 로고스
 */

import { useState, memo, useCallback, type CSSProperties } from 'react';
import { useGameStore } from '../../state/gameStore';
import { useShallow } from 'zustand/shallow';
import { ETHOS, ETHOS_NODES, BASE_ETHOS, type Ethos, type EthosNode } from '../../data/growth/ethosData';
import { PATHOS, PATHOS_NODES, BASE_PATHOS, MAX_EQUIPPED_PATHOS, type Pathos, type PathosNode } from '../../data/growth/pathosData';
import { LOGOS, type LogosType } from '../../data/growth/logosData';
import { IDENTITIES, type IdentityType } from '../../data/growth/identityData';
import { getPyramidLevelFromTraits } from '../../data/reflections';
import {
  initialGrowthState,
  getAvailableBaseEthos,
  getAvailableBasePathos,
  getAvailableEthosNodes,
  getAvailablePathosNodes,
  getNodeChoices,
  getUnlockedEthos,
  getUnlockedPathos,
  canSelectIdentity,
} from '../../state/slices/growthSlice';

interface GrowthPyramidModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 스타일 상수
const TIER_COLORS = {
  1: { bg: 'rgba(134, 239, 172, 0.15)', border: '#86efac', text: '#86efac' }, // 기초 에토스
  2: { bg: 'rgba(244, 114, 182, 0.15)', border: '#f472b6', text: '#f472b6' }, // 기본 파토스
  3: { bg: 'rgba(96, 165, 250, 0.15)', border: '#60a5fa', text: '#60a5fa' },   // 에토스 노드
  4: { bg: 'rgba(251, 146, 60, 0.15)', border: '#fb923c', text: '#fb923c' },   // 파토스 노드
  5: { bg: 'rgba(167, 139, 250, 0.15)', border: '#a78bfa', text: '#a78bfa' },  // 상위 에토스
  identity: { bg: 'rgba(251, 191, 36, 0.15)', border: '#fbbf24', text: '#fbbf24' }, // 자아
};

export const GrowthPyramidModal = memo(function GrowthPyramidModal({
  isOpen,
  onClose,
}: GrowthPyramidModalProps) {
  const {
    playerTraits,
    growth,
    selectBaseEthos,
    selectBasePathos,
    unlockNode,
    selectNodeChoice,
    selectIdentity,
    equipPathos,
  } = useGameStore(
    useShallow((state) => ({
      playerTraits: state.playerTraits || [],
      growth: state.growth || initialGrowthState,
      selectBaseEthos: state.selectBaseEthos,
      selectBasePathos: state.selectBasePathos,
      unlockNode: state.unlockNode,
      selectNodeChoice: state.selectNodeChoice,
      selectIdentity: state.selectIdentity,
      equipPathos: state.equipPathos,
    }))
  );

  const [activeTab, setActiveTab] = useState<'pyramid' | 'ethos' | 'pathos' | 'identity' | 'logos'>('pyramid');

  if (!isOpen) return null;

  const pyramidLevel = growth.pyramidLevel;
  const skillPoints = growth.skillPoints;
  const pendingSelection = growth.pendingNodeSelection;

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div
        className="event-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', maxHeight: '85vh', overflow: 'auto' }}
      >
        <header>
          <h3>🔺 피라미드 성장</h3>
          <small>개성으로 스킬포인트를 얻고, 에토스/파토스를 해금하세요</small>
        </header>

        {/* 탭 네비게이션 */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {(['pyramid', 'ethos', 'pathos', 'identity', 'logos'] as const).map((tab) => (
            <button
              key={tab}
              className="btn"
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'rgba(96, 165, 250, 0.3)' : undefined,
                border: activeTab === tab ? '1px solid rgba(96, 165, 250, 0.5)' : undefined,
              }}
            >
              {tab === 'pyramid' && '피라미드'}
              {tab === 'ethos' && '에토스'}
              {tab === 'pathos' && '파토스'}
              {tab === 'identity' && '자아'}
              {tab === 'logos' && '로고스'}
            </button>
          ))}
        </div>

        {/* 현재 상태 요약 */}
        <div style={{
          padding: '10px',
          background: 'rgba(30, 41, 59, 0.8)',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '13px',
        }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span>개성: <strong style={{ color: '#fde68a' }}>{playerTraits.length}개</strong></span>
            <span>피라미드 Lv: <strong style={{ color: '#60a5fa' }}>{pyramidLevel}</strong></span>
            <span>스킬포인트: <strong style={{ color: '#fbbf24' }}>{skillPoints}P</strong></span>
            <span>에토스: <strong style={{ color: '#86efac' }}>{growth.unlockedEthos.length}개</strong></span>
            <span>파토스: <strong style={{ color: '#f472b6' }}>{growth.unlockedPathos.length}개</strong></span>
          </div>
          {pendingSelection && (
            <div style={{ marginTop: '8px', padding: '6px', background: 'rgba(251, 191, 36, 0.2)', borderRadius: '4px' }}>
              <strong style={{ color: '#fbbf24' }}>
                🎯 선택 대기: [{pendingSelection.type === 'ethos' ? '에토스' : '파토스'}] 노드의 선택지를 골라주세요!
              </strong>
            </div>
          )}
        </div>

        {/* 탭 내용 */}
        {activeTab === 'pyramid' && (
          <PyramidView
            pyramidLevel={pyramidLevel}
            skillPoints={skillPoints}
            playerTraits={playerTraits}
            growth={growth}
            onUnlockNode={unlockNode}
            onSelectChoice={selectNodeChoice}
            onSelectBaseEthos={selectBaseEthos}
            onSelectBasePathos={selectBasePathos}
          />
        )}
        {activeTab === 'ethos' && (
          <EthosView
            growth={growth}
            onSelectBase={selectBaseEthos}
            onUnlockNode={(nodeId) => unlockNode(nodeId, 'ethos')}
            onSelectChoice={selectNodeChoice}
          />
        )}
        {activeTab === 'pathos' && (
          <PathosView
            growth={growth}
            onSelectBase={selectBasePathos}
            onUnlockNode={(nodeId) => unlockNode(nodeId, 'pathos')}
            onSelectChoice={selectNodeChoice}
            onEquip={equipPathos}
          />
        )}
        {activeTab === 'identity' && (
          <IdentityView
            growth={growth}
            onSelect={selectIdentity}
          />
        )}
        {activeTab === 'logos' && (
          <LogosView growth={growth} />
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
});

// ========================================
// 피라미드 뷰 (시각적 피라미드)
// ========================================
function PyramidView({
  pyramidLevel,
  skillPoints,
  playerTraits,
  growth,
  onUnlockNode,
  onSelectChoice,
  onSelectBaseEthos,
  onSelectBasePathos,
}: {
  pyramidLevel: number;
  skillPoints: number;
  playerTraits: string[];
  growth: typeof initialGrowthState;
  onUnlockNode: (nodeId: string, type: 'ethos' | 'pathos') => void;
  onSelectChoice: (choiceId: string) => void;
  onSelectBaseEthos: (ethosId: string) => void;
  onSelectBasePathos: (pathosId: string) => void;
}) {
  const pendingSelection = growth.pendingNodeSelection;

  // 5단계 에토스 노드
  const tier5Nodes = Object.values(ETHOS_NODES).filter(n => n.tier === 5);
  // 4단계 파토스 노드
  const tier4Nodes = Object.values(PATHOS_NODES).filter(n => n.tier === 4);
  // 3단계 에토스 노드
  const tier3Nodes = Object.values(ETHOS_NODES).filter(n => n.tier === 3);
  // 2단계 기본 파토스
  const tier2Items = Object.values(BASE_PATHOS);
  // 1단계 기초 에토스
  const tier1Items = Object.values(BASE_ETHOS);

  return (
    <div>
      <h4 style={{ marginBottom: '12px', color: '#e2e8f0' }}>피라미드 구조</h4>

      {/* 정점 - 자아 */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'inline-flex', gap: '20px' }}>
          {(['swordsman', 'gunslinger'] as const).map(id => {
            const identity = IDENTITIES[id];
            const isSelected = growth.identities.includes(id);
            const canSelect = pyramidLevel >= 5 && !isSelected;

            return (
              <div
                key={id}
                style={{
                  padding: '10px 20px',
                  background: isSelected ? TIER_COLORS.identity.bg : 'rgba(71, 85, 105, 0.3)',
                  border: isSelected ? `2px solid ${TIER_COLORS.identity.border}` : '1px solid #475569',
                  borderRadius: '8px',
                  opacity: pyramidLevel >= 5 ? 1 : 0.5,
                  cursor: canSelect ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontSize: '20px' }}>{identity.emoji}</span>
                <div style={{ color: isSelected ? TIER_COLORS.identity.text : '#9ca3af', fontWeight: 'bold' }}>
                  {identity.name}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
          정점 - 자아 (Lv5+)
        </div>
      </div>

      {/* 5단계 - 상위 에토스 노드 */}
      <TierRow
        tier={5}
        label="5단계 - 상위 에토스"
        nodes={tier5Nodes}
        type="ethos"
        growth={growth}
        skillPoints={skillPoints}
        pyramidLevel={pyramidLevel}
        onUnlockNode={onUnlockNode}
        onSelectChoice={onSelectChoice}
        pendingSelection={pendingSelection}
      />

      {/* 4단계 - 파토스 노드 */}
      <TierRow
        tier={4}
        label="4단계 - 파토스 노드"
        nodes={tier4Nodes}
        type="pathos"
        growth={growth}
        skillPoints={skillPoints}
        pyramidLevel={pyramidLevel}
        onUnlockNode={onUnlockNode}
        onSelectChoice={onSelectChoice}
        pendingSelection={pendingSelection}
      />

      {/* 3단계 - 에토스 노드 */}
      <TierRow
        tier={3}
        label="3단계 - 에토스 노드"
        nodes={tier3Nodes}
        type="ethos"
        growth={growth}
        skillPoints={skillPoints}
        pyramidLevel={pyramidLevel}
        onUnlockNode={onUnlockNode}
        onSelectChoice={onSelectChoice}
        pendingSelection={pendingSelection}
      />

      {/* 2단계 - 기본 파토스 */}
      <BaseItemRow
        tier={2}
        label="2단계 - 기본 파토스"
        items={tier2Items}
        type="pathos"
        growth={growth}
        skillPoints={skillPoints}
        pyramidLevel={pyramidLevel}
        onSelect={onSelectBasePathos}
      />

      {/* 1단계 - 기초 에토스 */}
      <BaseItemRow
        tier={1}
        label="1단계 - 기초 에토스"
        items={tier1Items}
        type="ethos"
        growth={growth}
        skillPoints={skillPoints}
        pyramidLevel={pyramidLevel}
        onSelect={onSelectBaseEthos}
      />

      {/* 개성 (기반) */}
      <div style={{
        padding: '12px',
        background: 'rgba(253, 230, 138, 0.1)',
        border: '1px solid rgba(253, 230, 138, 0.3)',
        borderRadius: '6px',
        marginTop: '16px',
      }}>
        <div style={{ color: '#fde68a', fontWeight: 'bold', marginBottom: '8px' }}>
          기반 - 개성 ({playerTraits.length}개)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {playerTraits.length === 0 ? (
            <span style={{ color: '#6b7280', fontSize: '12px' }}>개성이 없습니다. 휴식 노드에서 각성하세요.</span>
          ) : (
            playerTraits.map((trait, idx) => (
              <span
                key={idx}
                style={{
                  padding: '3px 8px',
                  background: 'rgba(253, 230, 138, 0.2)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#fde68a',
                }}
              >
                {trait}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 노드 행 컴포넌트
function TierRow({
  tier,
  label,
  nodes,
  type,
  growth,
  skillPoints,
  pyramidLevel,
  onUnlockNode,
  onSelectChoice,
  pendingSelection,
}: {
  tier: number;
  label: string;
  nodes: (EthosNode | PathosNode)[];
  type: 'ethos' | 'pathos';
  growth: typeof initialGrowthState;
  skillPoints: number;
  pyramidLevel: number;
  onUnlockNode: (nodeId: string, type: 'ethos' | 'pathos') => void;
  onSelectChoice: (choiceId: string) => void;
  pendingSelection: typeof initialGrowthState.pendingNodeSelection;
}) {
  const colors = TIER_COLORS[tier as keyof typeof TIER_COLORS];
  const isLocked = pyramidLevel < tier;

  return (
    <div style={{ marginBottom: '16px', opacity: isLocked ? 0.5 : 1 }}>
      <div style={{ fontSize: '12px', color: colors.text, marginBottom: '6px' }}>
        {label} {isLocked && `(Lv${tier} 필요)`}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
        {nodes.map(node => {
          const isUnlocked = growth.unlockedNodes.includes(node.id);
          const isPending = pendingSelection?.nodeId === node.id;
          const canUnlock = !isLocked && !isUnlocked && skillPoints >= 1;

          // 선택된 선택지 찾기
          const selectedChoice = isUnlocked
            ? node.choices.find(choiceId =>
                type === 'ethos'
                  ? growth.unlockedEthos.includes(choiceId)
                  : growth.unlockedPathos.includes(choiceId)
              )
            : null;

          return (
            <div
              key={node.id}
              style={{
                padding: '8px 12px',
                background: isPending
                  ? 'rgba(251, 191, 36, 0.3)'
                  : isUnlocked
                    ? colors.bg
                    : 'rgba(71, 85, 105, 0.2)',
                border: isPending
                  ? '2px solid #fbbf24'
                  : isUnlocked
                    ? `1px solid ${colors.border}`
                    : '1px dashed #475569',
                borderRadius: '6px',
                minWidth: '100px',
                textAlign: 'center',
                cursor: canUnlock ? 'pointer' : 'default',
              }}
              onClick={() => canUnlock && onUnlockNode(node.id, type)}
            >
              <div style={{ fontWeight: 'bold', color: isUnlocked ? colors.text : '#9ca3af', fontSize: '13px' }}>
                {node.name}
              </div>
              {selectedChoice && (
                <div style={{ fontSize: '11px', color: '#86efac', marginTop: '2px' }}>
                  ✓ {type === 'ethos' ? ETHOS[selectedChoice]?.name : PATHOS[selectedChoice]?.name}
                </div>
              )}
              {isPending && (
                <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '4px' }}>
                  선택지를 고르세요 ↓
                </div>
              )}
              {canUnlock && (
                <div style={{ fontSize: '10px', color: '#60a5fa', marginTop: '2px' }}>
                  [1P로 해금]
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 선택 대기 중인 노드의 선택지 표시 */}
      {pendingSelection?.type === type && nodes.find(n => n.id === pendingSelection.nodeId) && (
        <NodeChoiceSelector
          nodeId={pendingSelection.nodeId}
          type={type}
          onSelectChoice={onSelectChoice}
        />
      )}
    </div>
  );
}

// 기본 아이템 행 (1, 2단계)
function BaseItemRow({
  tier,
  label,
  items,
  type,
  growth,
  skillPoints,
  pyramidLevel,
  onSelect,
}: {
  tier: number;
  label: string;
  items: (Ethos | Pathos)[];
  type: 'ethos' | 'pathos';
  growth: typeof initialGrowthState;
  skillPoints: number;
  pyramidLevel: number;
  onSelect: (id: string) => void;
}) {
  const colors = TIER_COLORS[tier as keyof typeof TIER_COLORS];
  const isLocked = pyramidLevel < tier;
  const unlockedIds = type === 'ethos' ? growth.unlockedEthos : growth.unlockedPathos;

  // 1단계는 기반이므로 스킬포인트 불필요
  const isFreeBase = tier === 1;

  return (
    <div style={{ marginBottom: '16px', opacity: isLocked ? 0.5 : 1 }}>
      <div style={{ fontSize: '12px', color: colors.text, marginBottom: '6px' }}>
        {label} {isLocked && `(Lv${tier} 필요)`} {isFreeBase && !isLocked && '(무료)'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
        {items.map(item => {
          const isUnlocked = unlockedIds.includes(item.id);
          // 1단계는 무료, 2단계+ 는 스킬포인트 필요
          const canSelect = !isLocked && !isUnlocked && (isFreeBase || skillPoints >= 1);

          return (
            <div
              key={item.id}
              title={item.description}
              style={{
                padding: '6px 10px',
                background: isUnlocked ? colors.bg : 'rgba(71, 85, 105, 0.2)',
                border: isUnlocked ? `1px solid ${colors.border}` : '1px dashed #475569',
                borderRadius: '4px',
                fontSize: '12px',
                color: isUnlocked ? colors.text : '#6b7280',
                cursor: canSelect ? 'pointer' : 'default',
              }}
              onClick={() => canSelect && onSelect(item.id)}
            >
              {isUnlocked && '✓ '}{item.name}
              {canSelect && !isFreeBase && <span style={{ color: '#60a5fa', marginLeft: '4px' }}>[1P]</span>}
              {canSelect && isFreeBase && <span style={{ color: '#86efac', marginLeft: '4px' }}>[무료]</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 노드 선택지 선택 UI
function NodeChoiceSelector({
  nodeId,
  type,
  onSelectChoice,
}: {
  nodeId: string;
  type: 'ethos' | 'pathos';
  onSelectChoice: (choiceId: string) => void;
}) {
  const choices = getNodeChoices(nodeId, type);
  if (!choices) return null;

  const [choice1, choice2] = choices;

  return (
    <div style={{
      marginTop: '12px',
      padding: '12px',
      background: 'rgba(251, 191, 36, 0.1)',
      border: '1px solid rgba(251, 191, 36, 0.3)',
      borderRadius: '8px',
    }}>
      <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '8px', fontWeight: 'bold' }}>
        선택지 중 하나를 골라주세요:
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[choice1, choice2].map(choice => (
          <div
            key={choice.id}
            onClick={() => onSelectChoice(choice.id)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px',
              background: 'rgba(30, 41, 59, 0.8)',
              border: '2px solid rgba(251, 191, 36, 0.5)',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#e2e8f0', marginBottom: '4px' }}>
              {choice.name}
              <span style={{
                marginLeft: '8px',
                fontSize: '10px',
                color: choice.type === 'sword' ? '#60a5fa' : choice.type === 'gun' ? '#f472b6' : '#9ca3af',
              }}>
                {choice.type === 'sword' ? '검술' : choice.type === 'gun' ? '총기' : '공용'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              {choice.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================
// 에토스 뷰
// ========================================
function EthosView({
  growth,
  onSelectBase,
  onUnlockNode,
  onSelectChoice,
}: {
  growth: typeof initialGrowthState;
  onSelectBase: (id: string) => void;
  onUnlockNode: (nodeId: string) => void;
  onSelectChoice: (choiceId: string) => void;
}) {
  const unlockedEthos = getUnlockedEthos(growth);
  const pendingSelection = growth.pendingNodeSelection;

  return (
    <div>
      <h4 style={{ marginBottom: '8px', color: '#86efac' }}>에토스 (패시브 스킬)</h4>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
        해금된 에토스는 상시 적용됩니다. 스킬포인트: {growth.skillPoints}P
      </p>

      {/* 선택 대기 중인 노드 */}
      {pendingSelection?.type === 'ethos' && (
        <NodeChoiceSelector
          nodeId={pendingSelection.nodeId}
          type="ethos"
          onSelectChoice={onSelectChoice}
        />
      )}

      {/* 해금된 에토스 */}
      <h5 style={{ marginTop: '16px', marginBottom: '8px', color: '#9ca3af' }}>
        해금된 에토스 ({unlockedEthos.length})
      </h5>
      {unlockedEthos.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '13px' }}>아직 해금된 에토스가 없습니다.</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {unlockedEthos.map((ethos) => (
            <EthosCard key={ethos.id} ethos={ethos} />
          ))}
        </div>
      )}
    </div>
  );
}

function EthosCard({ ethos }: { ethos: Ethos }) {
  const typeColor = ethos.type === 'gun' ? '#f472b6' : ethos.type === 'sword' ? '#60a5fa' : '#9ca3af';
  const typeLabel = ethos.type === 'gun' ? '총기' : ethos.type === 'sword' ? '검술' : '공용';

  return (
    <div style={{
      padding: '10px',
      background: 'rgba(30, 41, 59, 0.8)',
      border: '1px solid rgba(134, 239, 172, 0.3)',
      borderRadius: '6px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{ethos.name}</span>
        <span style={{ fontSize: '11px', color: typeColor }}>{typeLabel}</span>
      </div>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{ethos.description}</p>
    </div>
  );
}

// ========================================
// 파토스 뷰
// ========================================
function PathosView({
  growth,
  onSelectBase,
  onUnlockNode,
  onSelectChoice,
  onEquip,
}: {
  growth: typeof initialGrowthState;
  onSelectBase: (id: string) => void;
  onUnlockNode: (nodeId: string) => void;
  onSelectChoice: (choiceId: string) => void;
  onEquip: (ids: string[]) => void;
}) {
  const [selectedForEquip, setSelectedForEquip] = useState<string[]>(growth.equippedPathos);
  const unlockedPathos = getUnlockedPathos(growth);
  const pendingSelection = growth.pendingNodeSelection;

  const handleToggleEquip = (id: string) => {
    if (selectedForEquip.includes(id)) {
      setSelectedForEquip(prev => prev.filter(x => x !== id));
    } else if (selectedForEquip.length < MAX_EQUIPPED_PATHOS) {
      setSelectedForEquip(prev => [...prev, id]);
    }
  };

  const handleSaveEquip = () => {
    onEquip(selectedForEquip);
  };

  return (
    <div>
      <h4 style={{ marginBottom: '8px', color: '#f472b6' }}>파토스 (액티브 스킬)</h4>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
        전투 전 최대 {MAX_EQUIPPED_PATHOS}개를 장착하여 사용할 수 있습니다. 스킬포인트: {growth.skillPoints}P
      </p>

      {/* 선택 대기 중인 노드 */}
      {pendingSelection?.type === 'pathos' && (
        <NodeChoiceSelector
          nodeId={pendingSelection.nodeId}
          type="pathos"
          onSelectChoice={onSelectChoice}
        />
      )}

      {/* 해금된 파토스 */}
      <h5 style={{ marginTop: '16px', marginBottom: '8px', color: '#9ca3af' }}>
        해금된 파토스 ({unlockedPathos.length}) - 장착: {selectedForEquip.length}/{MAX_EQUIPPED_PATHOS}
      </h5>
      {unlockedPathos.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '13px' }}>아직 해금된 파토스가 없습니다.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gap: '8px', marginBottom: '12px' }}>
            {unlockedPathos.map((pathos) => (
              <PathosCard
                key={pathos.id}
                pathos={pathos}
                equipped={selectedForEquip.includes(pathos.id)}
                onToggleEquip={handleToggleEquip}
              />
            ))}
          </div>
          <button className="btn" onClick={handleSaveEquip}>
            장착 저장
          </button>
        </>
      )}
    </div>
  );
}

function PathosCard({
  pathos,
  equipped,
  onToggleEquip,
}: {
  pathos: Pathos;
  equipped: boolean;
  onToggleEquip: (id: string) => void;
}) {
  const typeColor = pathos.type === 'gun' ? '#f472b6' : pathos.type === 'sword' ? '#60a5fa' : '#9ca3af';
  const typeLabel = pathos.type === 'gun' ? '총기' : pathos.type === 'sword' ? '검술' : '공용';

  return (
    <div
      onClick={() => onToggleEquip(pathos.id)}
      style={{
        padding: '10px',
        background: equipped ? 'rgba(244, 114, 182, 0.2)' : 'rgba(30, 41, 59, 0.8)',
        border: equipped ? '2px solid #f472b6' : '1px solid rgba(71, 85, 105, 0.5)',
        borderRadius: '6px',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>
          {equipped && '[ 장착 ] '}{pathos.name}
        </span>
        <span style={{ fontSize: '11px', color: typeColor }}>
          {typeLabel} {pathos.cooldown && `(쿨다운 ${pathos.cooldown}턴)`}
        </span>
      </div>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{pathos.description}</p>
    </div>
  );
}

// ========================================
// 자아 뷰
// ========================================
function IdentityView({
  growth,
  onSelect,
}: {
  growth: typeof initialGrowthState;
  onSelect: (id: IdentityType) => void;
}) {
  const canSelect = canSelectIdentity(growth);

  return (
    <div>
      <h4 style={{ marginBottom: '8px', color: '#fbbf24' }}>자아 (검사 / 총잡이)</h4>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>
        피라미드 Lv5 이상에서 자아를 선택할 수 있습니다. 하이브리드 가능!
      </p>

      {!canSelect && (
        <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '12px' }}>
          피라미드 Lv5 이상이 필요합니다. (현재: Lv{growth.pyramidLevel})
        </p>
      )}

      <div style={{ display: 'grid', gap: '12px' }}>
        {(Object.keys(IDENTITIES) as IdentityType[]).map((id) => {
          const identity = IDENTITIES[id];
          const isSelected = growth.identities.includes(id);

          return (
            <div
              key={id}
              onClick={() => canSelect && !isSelected && onSelect(id)}
              style={{
                padding: '12px',
                background: isSelected
                  ? 'rgba(251, 191, 36, 0.2)'
                  : canSelect
                    ? 'rgba(30, 41, 59, 0.8)'
                    : 'rgba(30, 41, 59, 0.5)',
                border: isSelected
                  ? '2px solid #fbbf24'
                  : '1px solid rgba(71, 85, 105, 0.5)',
                borderRadius: '8px',
                cursor: canSelect && !isSelected ? 'pointer' : 'default',
                opacity: canSelect || isSelected ? 1 : 0.6,
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>
                {identity.emoji} <strong style={{ color: isSelected ? '#fbbf24' : '#e2e8f0' }}>{identity.name}</strong>
                {isSelected && <span style={{ marginLeft: '8px', color: '#86efac' }}>선택됨</span>}
              </div>
              <p style={{ fontSize: '13px', color: '#9ca3af' }}>{identity.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================================
// 로고스 뷰
// ========================================
function LogosView({ growth }: { growth: typeof initialGrowthState }) {
  return (
    <div>
      <h4 style={{ marginBottom: '12px', color: '#fbbf24' }}>로고스 (피라미드 정점)</h4>

      {/* 공용 로고스 */}
      <LogosSection
        title="공용"
        logos={LOGOS.common}
        currentLevel={growth.logosLevels.common}
        available={growth.pyramidLevel >= 3}
      />

      {/* 건카타 */}
      <LogosSection
        title="건카타 (총잡이)"
        logos={LOGOS.gunkata}
        currentLevel={growth.logosLevels.gunkata}
        available={growth.identities.includes('gunslinger')}
        locked={!growth.identities.includes('gunslinger')}
      />

      {/* 배틀 왈츠 */}
      <LogosSection
        title="배틀 왈츠 (검사)"
        logos={LOGOS.battleWaltz}
        currentLevel={growth.logosLevels.battleWaltz}
        available={growth.identities.includes('swordsman')}
        locked={!growth.identities.includes('swordsman')}
      />
    </div>
  );
}

function LogosSection({
  title,
  logos,
  currentLevel,
  available,
  locked,
}: {
  title: string;
  logos: typeof LOGOS.common;
  currentLevel: number;
  available: boolean;
  locked?: boolean;
}) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <h5 style={{
        marginBottom: '8px',
        color: locked ? '#6b7280' : '#e2e8f0',
      }}>
        {title} {locked && '(자아 선택 필요)'}
      </h5>
      <div style={{ display: 'grid', gap: '8px' }}>
        {logos.levels.map((level) => {
          const isUnlocked = currentLevel >= level.level;

          return (
            <div
              key={level.level}
              style={{
                padding: '10px',
                background: isUnlocked
                  ? 'rgba(251, 191, 36, 0.2)'
                  : 'rgba(30, 41, 59, 0.5)',
                border: isUnlocked
                  ? '1px solid rgba(251, 191, 36, 0.5)'
                  : '1px solid rgba(71, 85, 105, 0.3)',
                borderRadius: '6px',
                opacity: locked ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontWeight: 'bold',
                  color: isUnlocked ? '#fbbf24' : '#6b7280',
                }}>
                  Lv{level.level} - {level.name}
                </span>
                {isUnlocked && <span style={{ fontSize: '11px', color: '#86efac' }}>해금</span>}
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                {level.effect.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GrowthPyramidModal;
