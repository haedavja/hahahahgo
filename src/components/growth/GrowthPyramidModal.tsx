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

import { useState, memo } from 'react';
import { useGameStore } from '../../state/gameStore';
import { useShallow } from 'zustand/shallow';
import { ETHOS, ETHOS_NODES, BASE_ETHOS, type Ethos, type EthosNode } from '../../data/growth/ethosData';
import { PATHOS, PATHOS_NODES, BASE_PATHOS, MAX_EQUIPPED_PATHOS, type Pathos, type PathosNode } from '../../data/growth/pathosData';
import { IDENTITIES, type IdentityType } from '../../data/growth/identityData';
import { LOGOS, getLogosLevelFromPyramid } from '../../data/growth/logosData';
import {
  initialGrowthState,
  getNodeChoices,
  getUnlockedEthos,
  getUnlockedPathos,
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
    unlockLogos,
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
      unlockLogos: state.unlockLogos,
    }))
  );

  if (!isOpen) return null;

  const pyramidLevel = growth.pyramidLevel;
  const skillPoints = growth.skillPoints;
  const pendingSelection = growth.pendingNodeSelection;

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div
        className="event-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '100%', width: '960px', maxHeight: '95vh', overflow: 'auto' }}
      >
        <header>
          <h3>🔺 피라미드 성장</h3>
          <small>개성으로 스킬포인트를 얻고, 에토스/파토스를 해금하세요</small>
        </header>

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

        {/* 통합 피라미드 뷰 */}
        <UnifiedPyramidView
          pyramidLevel={pyramidLevel}
          skillPoints={skillPoints}
          playerTraits={playerTraits}
          growth={growth}
          onUnlockNode={unlockNode}
          onSelectChoice={selectNodeChoice}
          onSelectBaseEthos={selectBaseEthos}
          onSelectBasePathos={selectBasePathos}
          onSelectIdentity={selectIdentity}
          onEquipPathos={equipPathos}
          onUnlockLogos={unlockLogos}
        />

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
});

// ========================================
// 통합 피라미드 뷰 (한 화면에 모두 표시)
// ========================================
function UnifiedPyramidView({
  pyramidLevel,
  skillPoints,
  playerTraits,
  growth,
  onUnlockNode,
  onSelectChoice,
  onSelectBaseEthos,
  onSelectBasePathos,
  onSelectIdentity,
  onEquipPathos,
  onUnlockLogos,
}: {
  pyramidLevel: number;
  skillPoints: number;
  playerTraits: string[];
  growth: typeof initialGrowthState;
  onUnlockNode: (nodeId: string, type: 'ethos' | 'pathos') => void;
  onSelectChoice: (choiceId: string) => void;
  onSelectBaseEthos: (ethosId: string) => void;
  onSelectBasePathos: (pathosId: string) => void;
  onSelectIdentity: (id: IdentityType) => void;
  onEquipPathos: (ids: string[]) => void;
  onUnlockLogos: (logosType: 'common' | 'gunkata' | 'battleWaltz') => void;
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
      {/* ===== 로고스 (정점 위) ===== */}
      <LogosDisplay
        pyramidLevel={pyramidLevel}
        skillPoints={skillPoints}
        growth={growth}
        onUnlockLogos={onUnlockLogos}
      />

      {/* ===== 정점 - 자아 ===== */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', color: TIER_COLORS.identity.text, marginBottom: '8px' }}>
          ⬆ 정점 - 자아 {pyramidLevel < 5 && '(Lv5 필요)'}
        </div>
        <div style={{ display: 'inline-flex', gap: '16px' }}>
          {(['swordsman', 'gunslinger'] as const).map(id => {
            const identity = IDENTITIES[id];
            const isSelected = growth.identities.includes(id);
            const canSelect = pyramidLevel >= 5 && !isSelected;

            return (
              <div
                key={id}
                onClick={() => canSelect && onSelectIdentity(id)}
                style={{
                  padding: '12px 24px',
                  background: isSelected ? TIER_COLORS.identity.bg : 'rgba(71, 85, 105, 0.3)',
                  border: isSelected ? `2px solid ${TIER_COLORS.identity.border}` : '1px solid #475569',
                  borderRadius: '8px',
                  opacity: pyramidLevel >= 5 ? 1 : 0.5,
                  cursor: canSelect ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '24px' }}>{identity.emoji}</span>
                <div style={{ color: isSelected ? TIER_COLORS.identity.text : '#9ca3af', fontWeight: 'bold', marginTop: '4px' }}>
                  {identity.name}
                </div>
                {isSelected && <div style={{ fontSize: '10px', color: '#86efac' }}>✓ 선택됨</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 5단계 - 상위 에토스 노드 ===== */}
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

      {/* ===== 4단계 - 파토스 노드 ===== */}
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

      {/* ===== 3단계 - 에토스 노드 ===== */}
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

      {/* ===== 2단계 - 기본 파토스 ===== */}
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

      {/* ===== 기반 - 개성 + 1단계 에토스 (통합) ===== */}
      <TraitEthosSection
        playerTraits={playerTraits}
        growth={growth}
        tier1Items={tier1Items}
      />

      {/* ===== 해금된 에토스/파토스 요약 ===== */}
      <UnlockedSummary growth={growth} onEquipPathos={onEquipPathos} />
    </div>
  );
}

// 해금된 에토스/파토스 요약 (하단)
function UnlockedSummary({
  growth,
  onEquipPathos,
}: {
  growth: typeof initialGrowthState;
  onEquipPathos: (ids: string[]) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const unlockedEthos = getUnlockedEthos(growth);
  const unlockedPathos = getUnlockedPathos(growth);

  if (unlockedEthos.length === 0 && unlockedPathos.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '20px', borderTop: '1px solid #475569', paddingTop: '16px' }}>
      <div
        onClick={() => setShowDetails(!showDetails)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          padding: '8px',
          background: 'rgba(30, 41, 59, 0.5)',
          borderRadius: '6px',
        }}
      >
        <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>
          해금 현황: 에토스 {unlockedEthos.length}개 / 파토스 {unlockedPathos.length}개
        </span>
        <span style={{ color: '#9ca3af' }}>{showDetails ? '▲ 접기' : '▼ 펼치기'}</span>
      </div>

      {showDetails && (
        <div style={{ marginTop: '12px' }}>
          {/* 에토스 목록 */}
          {unlockedEthos.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#86efac', marginBottom: '6px' }}>에토스 (패시브)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {unlockedEthos.map(ethos => (
                  <span
                    key={ethos.id}
                    title={ethos.description}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(134, 239, 172, 0.15)',
                      border: '1px solid rgba(134, 239, 172, 0.3)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#86efac',
                    }}
                  >
                    {ethos.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 파토스 목록 */}
          {unlockedPathos.length > 0 && (
            <div>
              <div style={{ fontSize: '12px', color: '#f472b6', marginBottom: '6px' }}>
                파토스 (액티브) - 장착: {growth.equippedPathos.length}/{MAX_EQUIPPED_PATHOS}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {unlockedPathos.map(pathos => {
                  const isEquipped = growth.equippedPathos.includes(pathos.id);
                  return (
                    <span
                      key={pathos.id}
                      title={pathos.description}
                      onClick={() => {
                        if (isEquipped) {
                          onEquipPathos(growth.equippedPathos.filter(id => id !== pathos.id));
                        } else if (growth.equippedPathos.length < MAX_EQUIPPED_PATHOS) {
                          onEquipPathos([...growth.equippedPathos, pathos.id]);
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        background: isEquipped ? 'rgba(244, 114, 182, 0.3)' : 'rgba(244, 114, 182, 0.1)',
                        border: isEquipped ? '2px solid #f472b6' : '1px solid rgba(244, 114, 182, 0.3)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#f472b6',
                        cursor: 'pointer',
                      }}
                    >
                      {isEquipped && '✓ '}{pathos.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 노드 행 컴포넌트 - 가로 피라미드 구조
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
      {/* 티어 헤더 */}
      <div style={{
        fontSize: '11px',
        color: colors.text,
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{ fontWeight: 'bold' }}>{label}</span>
        {isLocked && (
          <span style={{
            fontSize: '9px',
            padding: '1px 4px',
            background: 'rgba(239, 68, 68, 0.2)',
            borderRadius: '3px',
            color: '#ef4444',
          }}>
            🔒 Lv{tier}
          </span>
        )}
      </div>

      {/* 노드 가로 그리드 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
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

          // 선택지 정보
          const choices = getNodeChoices(node.id, type);
          const [choice1, choice2] = choices || [null, null];

          return (
            <div
              key={node.id}
              style={{
                width: 'calc(50% - 4px)',
                minWidth: '280px',
                maxWidth: '450px',
                padding: '8px 10px',
                background: isPending
                  ? 'rgba(251, 191, 36, 0.15)'
                  : isUnlocked
                    ? colors.bg
                    : 'rgba(71, 85, 105, 0.1)',
                border: isPending
                  ? '2px solid #fbbf24'
                  : isUnlocked
                    ? `1px solid ${colors.border}`
                    : '1px solid #475569',
                borderRadius: '6px',
              }}
            >
              {/* 노드 헤더 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}>
                <div style={{
                  fontWeight: 'bold',
                  color: isUnlocked ? colors.text : '#e2e8f0',
                  fontSize: '12px',
                }}>
                  {isUnlocked && '✓ '}{node.name}
                  <span style={{ fontWeight: 'normal', color: '#6b7280', marginLeft: '6px', fontSize: '10px' }}>
                    {node.description}
                  </span>
                </div>

                {/* 상태 뱃지 */}
                {canUnlock && (
                  <button
                    onClick={() => onUnlockNode(node.id, type)}
                    style={{
                      padding: '2px 6px',
                      background: 'rgba(96, 165, 250, 0.2)',
                      border: '1px solid #60a5fa',
                      borderRadius: '4px',
                      color: '#60a5fa',
                      fontSize: '9px',
                      cursor: 'pointer',
                    }}
                  >
                    1P 해금
                  </button>
                )}
                {selectedChoice && (
                  <span style={{
                    fontSize: '9px',
                    padding: '2px 4px',
                    background: 'rgba(134, 239, 172, 0.2)',
                    borderRadius: '3px',
                    color: '#86efac',
                  }}>
                    완료
                  </span>
                )}
              </div>

              {/* 선택지 2개 - 클릭으로 직접 선택 */}
              {choice1 && choice2 && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <ChoiceBadge
                    choice={choice1}
                    isSelected={selectedChoice === choice1.id}
                    isAlternative={selectedChoice === choice2.id}
                    canSelect={isPending}
                    onSelect={() => isPending && onSelectChoice(choice1.id)}
                  />
                  <ChoiceBadge
                    choice={choice2}
                    isSelected={selectedChoice === choice2.id}
                    isAlternative={selectedChoice === choice1.id}
                    canSelect={isPending}
                    onSelect={() => isPending && onSelectChoice(choice2.id)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 선택지 뱃지 - 클릭으로 직접 선택
function ChoiceBadge({
  choice,
  isSelected,
  isAlternative,
  canSelect,
  onSelect,
}: {
  choice: Ethos | Pathos;
  isSelected: boolean;
  isAlternative: boolean;
  canSelect: boolean;
  onSelect: () => void;
}) {
  const typeColor = choice.type === 'sword' ? '#60a5fa' : choice.type === 'gun' ? '#f472b6' : '#9ca3af';
  const typeLabel = choice.type === 'sword' ? '검' : choice.type === 'gun' ? '총' : '공';

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (canSelect) onSelect();
      }}
      title={choice.description}
      style={{
        flex: 1,
        padding: '6px 8px',
        background: isSelected
          ? 'rgba(134, 239, 172, 0.2)'
          : canSelect
            ? 'rgba(251, 191, 36, 0.15)'
            : isAlternative
              ? 'rgba(71, 85, 105, 0.1)'
              : 'rgba(30, 41, 59, 0.4)',
        border: isSelected
          ? '2px solid #86efac'
          : canSelect
            ? '2px solid #fbbf24'
            : '1px solid rgba(71, 85, 105, 0.3)',
        borderRadius: '4px',
        opacity: isAlternative ? 0.4 : 1,
        cursor: canSelect ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
    >
      {/* 이름 + 타입 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
        {isSelected && <span style={{ color: '#86efac', fontSize: '10px' }}>✓</span>}
        <span style={{
          fontWeight: isSelected ? 'bold' : 'normal',
          fontSize: '11px',
          color: isSelected ? '#86efac' : canSelect ? '#fbbf24' : isAlternative ? '#6b7280' : '#e2e8f0',
        }}>
          {choice.name}
        </span>
        <span style={{
          fontSize: '8px',
          padding: '0px 3px',
          background: `${typeColor}20`,
          borderRadius: '2px',
          color: typeColor,
        }}>
          {typeLabel}
        </span>
        {canSelect && (
          <span style={{ fontSize: '9px', color: '#fbbf24', marginLeft: 'auto' }}>클릭!</span>
        )}
      </div>
      {/* 설명 */}
      <div style={{
        fontSize: '9px',
        color: isAlternative ? '#4b5563' : '#9ca3af',
        lineHeight: '1.3',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
      }}>
        {choice.description}
      </div>
    </div>
  );
}

// 개성 이름 → 1단계 에토스 ID 매핑
const TRAIT_TO_ETHOS: Record<string, string> = {
  '용맹함': 'bravery',
  '굳건함': 'steadfast',
  '냉철함': 'composure',
  '철저함': 'thorough',
  '열정적': 'passion',
  '활력적': 'vitality',
};

// 기반 - 개성 + 1단계 에토스 통합 섹션
function TraitEthosSection({
  playerTraits,
  growth,
  tier1Items,
}: {
  playerTraits: string[];
  growth: typeof initialGrowthState;
  tier1Items: Ethos[];
}) {
  return (
    <div style={{
      padding: '12px',
      background: 'rgba(134, 239, 172, 0.08)',
      border: '1px solid rgba(134, 239, 172, 0.3)',
      borderRadius: '6px',
      marginTop: '8px',
    }}>
      <div style={{ color: '#86efac', fontWeight: 'bold', marginBottom: '8px', fontSize: '12px' }}>
        ⬇ 기반 - 개성 → 1단계 에토스
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
        {tier1Items.map(ethos => {
          // 이 에토스에 해당하는 개성 찾기
          const matchingTrait = Object.entries(TRAIT_TO_ETHOS).find(([, ethosId]) => ethosId === ethos.id)?.[0];
          const hasTrait = matchingTrait && playerTraits.includes(matchingTrait);
          const isUnlocked = growth.unlockedEthos.includes(ethos.id);

          return (
            <div
              key={ethos.id}
              title={ethos.description}
              style={{
                padding: '8px 12px',
                background: isUnlocked
                  ? 'rgba(134, 239, 172, 0.15)'
                  : 'rgba(71, 85, 105, 0.2)',
                border: isUnlocked
                  ? '1px solid #86efac'
                  : '1px dashed #475569',
                borderRadius: '6px',
                textAlign: 'center',
                minWidth: '100px',
              }}
            >
              <div style={{
                fontWeight: 'bold',
                color: isUnlocked ? '#86efac' : '#6b7280',
                fontSize: '12px',
              }}>
                {isUnlocked && '✓ '}{ethos.name}
              </div>
              <div style={{
                fontSize: '10px',
                color: hasTrait ? '#fde68a' : '#6b7280',
                marginTop: '2px',
              }}>
                {hasTrait ? `✓ ${matchingTrait} 개성` : `${matchingTrait || '?'} 개성 필요`}
              </div>
              {isUnlocked && (
                <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>
                  {ethos.description}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {playerTraits.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <span style={{ color: '#6b7280', fontSize: '11px' }}>
            개성이 없습니다. 휴식 노드에서 각성하세요.
          </span>
        </div>
      )}
    </div>
  );
}

// 기본 아이템 행 (2단계 파토스용)
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

// 로고스 표시 컴포넌트
function LogosDisplay({
  pyramidLevel,
  skillPoints,
  growth,
  onUnlockLogos,
}: {
  pyramidLevel: number;
  skillPoints: number;
  growth: typeof initialGrowthState;
  onUnlockLogos: (logosType: 'common' | 'gunkata' | 'battleWaltz') => void;
}) {
  const maxUnlockableLevel = getLogosLevelFromPyramid(pyramidLevel);
  const hasSwordsman = growth.identities.includes('swordsman');
  const hasGunslinger = growth.identities.includes('gunslinger');

  // 피라미드 Lv3 미만이면 로고스 표시 안함
  if (pyramidLevel < 3) {
    return (
      <div style={{
        padding: '10px',
        background: 'rgba(71, 85, 105, 0.2)',
        border: '1px dashed #475569',
        borderRadius: '6px',
        marginBottom: '16px',
        textAlign: 'center',
      }}>
        <span style={{ color: '#6b7280', fontSize: '12px' }}>
          ⬆ 로고스: 피라미드 Lv3 이상에서 해금 가능
        </span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px',
      background: 'rgba(251, 191, 36, 0.05)',
      border: '1px solid rgba(251, 191, 36, 0.2)',
      borderRadius: '8px',
      marginBottom: '16px',
    }}>
      <div style={{ fontSize: '12px', color: '#fbbf24', marginBottom: '10px', fontWeight: 'bold' }}>
        ⬆ 로고스 (최대 해금 가능: Lv{maxUnlockableLevel})
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {/* 배틀 왈츠 (검사) */}
        <LogosCard
          logos={LOGOS.battleWaltz}
          logosType="battleWaltz"
          currentLevel={growth.logosLevels.battleWaltz}
          maxUnlockableLevel={maxUnlockableLevel}
          skillPoints={skillPoints}
          locked={!hasSwordsman}
          onUnlock={onUnlockLogos}
        />

        {/* 공용 로고스 (중앙) - 자아 하나 이상 필요 */}
        <LogosCard
          logos={LOGOS.common}
          logosType="common"
          currentLevel={growth.logosLevels.common}
          maxUnlockableLevel={maxUnlockableLevel}
          skillPoints={skillPoints}
          locked={growth.identities.length === 0}
          lockReason="자아 1개 이상 필요"
          onUnlock={onUnlockLogos}
        />

        {/* 건카타 (총잡이) */}
        <LogosCard
          logos={LOGOS.gunkata}
          logosType="gunkata"
          currentLevel={growth.logosLevels.gunkata}
          maxUnlockableLevel={maxUnlockableLevel}
          skillPoints={skillPoints}
          locked={!hasGunslinger}
          onUnlock={onUnlockLogos}
        />
      </div>
    </div>
  );
}

// 개별 로고스 카드
function LogosCard({
  logos,
  logosType,
  currentLevel,
  maxUnlockableLevel,
  skillPoints,
  locked,
  lockReason,
  onUnlock,
}: {
  logos: typeof LOGOS.common;
  logosType: 'common' | 'gunkata' | 'battleWaltz';
  currentLevel: number;
  maxUnlockableLevel: number;
  skillPoints: number;
  locked: boolean;
  lockReason?: string;
  onUnlock: (logosType: 'common' | 'gunkata' | 'battleWaltz') => void;
}) {
  // 다음 레벨 해금 가능 여부
  const canUnlockNext = !locked && currentLevel < maxUnlockableLevel && skillPoints >= 1;

  return (
    <div style={{
      flex: 1,
      minWidth: '150px',
      padding: '8px',
      background: locked ? 'rgba(71, 85, 105, 0.2)' : 'rgba(30, 41, 59, 0.5)',
      border: locked ? '1px dashed #475569' : '1px solid rgba(251, 191, 36, 0.3)',
      borderRadius: '6px',
      opacity: locked ? 0.5 : 1,
    }}>
      <div style={{
        fontWeight: 'bold',
        color: locked ? '#6b7280' : '#fbbf24',
        fontSize: '12px',
        marginBottom: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span>
          {logos.name} (Lv{currentLevel})
          {locked && <span style={{ fontSize: '10px', color: '#6b7280' }}> ({lockReason || '자아 필요'})</span>}
        </span>
        {canUnlockNext && (
          <button
            onClick={() => onUnlock(logosType)}
            style={{
              padding: '2px 6px',
              background: 'rgba(96, 165, 250, 0.2)',
              border: '1px solid #60a5fa',
              borderRadius: '4px',
              color: '#60a5fa',
              fontSize: '10px',
              cursor: 'pointer',
            }}
          >
            +1 [1P]
          </button>
        )}
      </div>

      {logos.levels.map(level => {
        const isUnlocked = currentLevel >= level.level;
        const isNextToUnlock = currentLevel + 1 === level.level && canUnlockNext;
        return (
          <div
            key={level.level}
            onClick={() => isNextToUnlock && onUnlock(logosType)}
            style={{
              padding: '4px 6px',
              marginBottom: '4px',
              background: isUnlocked
                ? 'rgba(251, 191, 36, 0.15)'
                : isNextToUnlock
                  ? 'rgba(96, 165, 250, 0.1)'
                  : 'transparent',
              border: isNextToUnlock ? '1px dashed #60a5fa' : '1px solid transparent',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: isNextToUnlock ? 'pointer' : 'default',
            }}
          >
            <span style={{ color: isUnlocked ? '#86efac' : isNextToUnlock ? '#60a5fa' : '#6b7280' }}>
              {isUnlocked ? '✓' : isNextToUnlock ? '▷' : '○'} Lv{level.level}
            </span>
            <span style={{ color: isUnlocked ? '#e2e8f0' : '#6b7280', marginLeft: '4px' }}>
              {level.name}
            </span>
            {isNextToUnlock && (
              <span style={{ color: '#60a5fa', marginLeft: '4px', fontSize: '10px' }}>[1P로 해금]</span>
            )}
            {isUnlocked && (
              <div style={{ color: '#9ca3af', fontSize: '10px', marginTop: '2px' }}>
                {level.effect.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default GrowthPyramidModal;
