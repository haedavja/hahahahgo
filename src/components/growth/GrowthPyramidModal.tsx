/**
 * @file GrowthPyramidModal.tsx
 * @description 피라미드 성장 시스템 메인 UI
 *
 * 구조:
 * 1단계: 기초 에토스 (6개)
 * 2단계: 기본 파토스 (6개, 각 2선택지)
 * 3단계: 에토스 노드 (6개, 각 2선택지)
 * 4단계: 파토스 노드 (5개, 각 2선택지)
 * 5단계: 상위 에토스 노드 (4개, 각 2선택지)
 * 6단계: 상위 파토스 노드 (3개, 각 2선택지)
 * 정점: 자아 (검사/총잡이) + 로고스
 */

import { memo, useRef } from 'react';
import { useGameStore } from '../../state/gameStore';
import { useShallow } from 'zustand/shallow';
import { ETHOS_NODES, BASE_ETHOS } from '../../data/growth/ethosData';
import { PATHOS_NODES } from '../../data/growth/pathosData';
import { initialGrowthState } from '../../state/slices/growthSlice';
import { COLORS, SPACING } from '../../styles/theme';

// 분리된 컴포넌트들
import { LogosSection } from './LogosSection';
import { IdentitySection } from './IdentitySection';
import { TierRow } from './TierRow';
import { TraitEthosSection } from './TraitEthosSection';
import { UnlockedSummary } from './UnlockedSummary';
import { PyramidConnections } from './PyramidConnections';

interface GrowthPyramidModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GrowthPyramidModal = memo(function GrowthPyramidModal({
  isOpen,
  onClose,
}: GrowthPyramidModalProps) {
  const {
    playerTraits,
    growth,
    unlockNode,
    selectNodeChoice,
    selectIdentity,
    equipPathos,
    unlockLogos,
  } = useGameStore(
    useShallow((state) => ({
      playerTraits: state.playerTraits || [],
      growth: state.growth || initialGrowthState,
      unlockNode: state.unlockNode,
      selectNodeChoice: state.selectNodeChoice,
      selectIdentity: state.selectIdentity,
      equipPathos: state.equipPathos,
      unlockLogos: state.unlockLogos,
    }))
  );

  if (!isOpen) return null;

  const { pyramidLevel, skillPoints, pendingNodeSelection } = growth;

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div
        className="event-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '100vw', width: '1600px', maxHeight: '95vh', overflow: 'auto' }}
      >
        {/* 헤더 */}
        <header>
          <h3>🔺 피라미드 성장</h3>
          <small>개성으로 스킬포인트를 얻고, 에토스/파토스를 해금하세요</small>
        </header>

        {/* 상태 요약 */}
        <StatusSummary
          playerTraits={playerTraits}
          growth={growth}
          pendingSelection={pendingNodeSelection}
        />

        {/* 피라미드 뷰 */}
        <PyramidView
          pyramidLevel={pyramidLevel}
          skillPoints={skillPoints}
          playerTraits={playerTraits}
          growth={growth}
          pendingSelection={pendingNodeSelection}
          onUnlockNode={unlockNode}
          onSelectChoice={selectNodeChoice}
          onSelectIdentity={selectIdentity}
          onEquipPathos={equipPathos}
          onUnlockLogos={unlockLogos}
        />

        {/* 닫기 버튼 */}
        <div style={{ display: 'flex', gap: '10px', marginTop: SPACING.xl }}>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
});

// ========================================
// StatusSummary 컴포넌트
// ========================================
interface StatusSummaryProps {
  playerTraits: string[];
  growth: typeof initialGrowthState;
  pendingSelection: typeof initialGrowthState.pendingNodeSelection;
}

const StatusSummary = memo(function StatusSummary({
  playerTraits,
  growth,
  pendingSelection,
}: StatusSummaryProps) {
  return (
    <div style={{
      padding: '10px',
      background: COLORS.bg.primary,
      borderRadius: '6px',
      marginBottom: SPACING.lg,
      fontSize: '13px',
    }}>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <span>개성: <strong style={{ color: '#fde68a' }}>{playerTraits.length}개</strong></span>
        <span>피라미드 Lv: <strong style={{ color: COLORS.secondary }}>{growth.pyramidLevel}</strong></span>
        <span>스킬포인트: <strong style={{ color: COLORS.primary }}>{growth.skillPoints}P</strong></span>
        <span>에토스: <strong style={{ color: COLORS.success }}>{growth.unlockedEthos.length}개</strong></span>
        <span>파토스: <strong style={{ color: COLORS.tier[2].text }}>{growth.unlockedPathos.length}개</strong></span>
      </div>
      {pendingSelection && (
        <div style={{
          marginTop: SPACING.md,
          padding: SPACING.sm,
          background: 'rgba(251, 191, 36, 0.2)',
          borderRadius: '4px',
        }}>
          <strong style={{ color: COLORS.primary }}>
            🎯 선택 대기: [{pendingSelection.type === 'ethos' ? '에토스' : '파토스'}] 노드의 선택지를 골라주세요!
          </strong>
        </div>
      )}
    </div>
  );
});

// ========================================
// PyramidView 컴포넌트
// ========================================
interface PyramidViewProps {
  pyramidLevel: number;
  skillPoints: number;
  playerTraits: string[];
  growth: typeof initialGrowthState;
  pendingSelection: typeof initialGrowthState.pendingNodeSelection;
  onUnlockNode: (nodeId: string, type: 'ethos' | 'pathos') => void;
  onSelectChoice: (choiceId: string) => void;
  onSelectIdentity: (id: 'swordsman' | 'gunslinger') => void;
  onEquipPathos: (ids: string[]) => void;
  onUnlockLogos: (logosType: 'common' | 'gunkata' | 'battleWaltz') => void;
}

const PyramidView = memo(function PyramidView({
  pyramidLevel,
  skillPoints,
  playerTraits,
  growth,
  pendingSelection,
  onUnlockNode,
  onSelectChoice,
  onSelectIdentity,
  onEquipPathos,
  onUnlockLogos,
}: PyramidViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 티어별 노드 분류
  const tier6Nodes = Object.values(PATHOS_NODES).filter(n => n.tier === 6);
  const tier5Nodes = Object.values(ETHOS_NODES).filter(n => n.tier === 5);
  const tier4Nodes = Object.values(PATHOS_NODES).filter(n => n.tier === 4);
  const tier3Nodes = Object.values(ETHOS_NODES).filter(n => n.tier === 3);
  const tier2Nodes = Object.values(PATHOS_NODES).filter(n => n.tier === 2);
  const tier1Items = Object.values(BASE_ETHOS);

  return (
    <div ref={containerRef} style={{
      position: 'relative',
      transform: 'scale(1.2)',
      transformOrigin: 'top center',
      marginBottom: '20%', // scale로 인한 여백 보정
    }}>
      {/* 노드 연결선 SVG */}
      <PyramidConnections
        containerRef={containerRef}
        unlockedNodes={growth.unlockedNodes}
      />
      {/* 로고스 (정점 위) */}
      <LogosSection
        pyramidLevel={pyramidLevel}
        skillPoints={skillPoints}
        growth={growth}
        onUnlockLogos={onUnlockLogos}
      />

      {/* 자아 (정점) */}
      <IdentitySection
        pyramidLevel={pyramidLevel}
        selectedIdentities={growth.identities}
        onSelectIdentity={onSelectIdentity}
      />

      {/* 6단계 - 상위 파토스 */}
      <TierRow
        tier={6}
        label="6단계 파토스"
        requirement="개성 6개 (Lv6) + 1P"
        nodes={tier6Nodes}
        type="pathos"
        growth={growth}
        skillPoints={skillPoints}
        pyramidLevel={pyramidLevel}
        onUnlockNode={onUnlockNode}
        onSelectChoice={onSelectChoice}
        pendingSelection={pendingSelection}
      />

      {/* 5단계 - 상위 에토스 */}
      <TierRow
        tier={5}
        label="5단계 에토스"
        requirement="개성 5개 (Lv5) + 1P"
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
        label="4단계 파토스"
        requirement="개성 4개 (Lv4) + 1P"
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
        label="3단계 에토스"
        requirement="개성 3개 (Lv3) + 1P"
        nodes={tier3Nodes}
        type="ethos"
        growth={growth}
        skillPoints={skillPoints}
        pyramidLevel={pyramidLevel}
        onUnlockNode={onUnlockNode}
        onSelectChoice={onSelectChoice}
        pendingSelection={pendingSelection}
      />

      {/* 2단계 - 파토스 노드 */}
      <TierRow
        tier={2}
        label="2단계 파토스"
        requirement="개성 2개 (Lv2) + 1P"
        nodes={tier2Nodes}
        type="pathos"
        growth={growth}
        skillPoints={skillPoints}
        pyramidLevel={pyramidLevel}
        onUnlockNode={onUnlockNode}
        onSelectChoice={onSelectChoice}
        pendingSelection={pendingSelection}
      />

      {/* 1단계 - 기초 에토스 */}
      <TraitEthosSection
        playerTraits={playerTraits}
        growth={growth}
        tier1Items={tier1Items}
      />

      {/* 해금 현황 요약 */}
      <UnlockedSummary
        growth={growth}
        onEquipPathos={onEquipPathos}
      />
    </div>
  );
});

export default GrowthPyramidModal;
