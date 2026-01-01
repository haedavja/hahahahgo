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

import { memo, useRef, useEffect } from 'react';
import { useGameStore } from '../../state/gameStore';
import { useShallow } from 'zustand/shallow';
import { ETHOS_NODES, BASE_ETHOS } from '../../data/growth/ethosData';
import { PATHOS_NODES, MAX_EQUIPPED_PATHOS } from '../../data/growth/pathosData';
import { initialGrowthState, getUnlockedEthos, getUnlockedPathos } from '../../state/slices/growthSlice';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../styles/theme';

// 분리된 컴포넌트들
import { LogosSection } from './LogosSection';
import { IdentitySection } from './IdentitySection';
import { TierRow } from './TierRow';
import { TraitEthosSection } from './TraitEthosSection';
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

  // 성장 모달이 열렸을 때 아이템 슬롯 숨기기
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('growth-modal-open');
    }
    return () => {
      document.body.classList.remove('growth-modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const { pyramidLevel, skillPoints, pendingNodeSelection } = growth;

  return (
    <div className="event-modal-overlay" onClick={onClose}>
      <div
        className="event-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '100vw', width: '1900px', maxHeight: '95vh', overflowY: 'auto', overflowX: 'hidden', paddingTop: 0 }}
      >
        {/* 헤더 + 상태 요약 - 스크롤 시 상단 고정 */}
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          background: '#1e293b',
          paddingBottom: SPACING.md,
          marginBottom: SPACING.md,
        }}>
          {/* 닫기 버튼 - 오른쪽 상단 */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: SPACING.sm,
              right: SPACING.md,
              background: 'transparent',
              border: 'none',
              color: COLORS.text.secondary,
              fontSize: '24px',
              cursor: 'pointer',
              padding: SPACING.xs,
              lineHeight: 1,
            }}
          >
            ✕
          </button>

          <header style={{ textAlign: 'center', marginTop: 0 }}>
            <h3 style={{ marginTop: 0 }}>🔺 피라미드 성장</h3>
            <small>개성으로 스킬포인트를 얻고, 에토스/파토스를 해금하세요</small>
          </header>

          {/* 상태 요약 */}
          <StatusSummary
            playerTraits={playerTraits}
            growth={growth}
            pendingSelection={pendingNodeSelection}
            onEquipPathos={equipPathos}
          />
        </div>

        {/* 피라미드 뷰 - 중앙 정렬 wrapper */}
        <div style={{ paddingLeft: '20px' }}>
          <PyramidView
            pyramidLevel={pyramidLevel}
            skillPoints={skillPoints}
            playerTraits={playerTraits}
            growth={growth}
            pendingSelection={pendingNodeSelection}
            onUnlockNode={unlockNode}
            onSelectChoice={selectNodeChoice}
            onSelectIdentity={selectIdentity}
            onUnlockLogos={unlockLogos}
          />
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
  onEquipPathos: (ids: string[]) => void;
}

const StatusSummary = memo(function StatusSummary({
  playerTraits,
  growth,
  pendingSelection,
  onEquipPathos,
}: StatusSummaryProps) {
  const unlockedEthos = getUnlockedEthos(growth);
  const unlockedPathos = getUnlockedPathos(growth);

  // 1단계 기본 에토스 제외 (용맹함, 굳건함, 냉철함, 철저함, 활력적, 열정적)
  const displayEthos = unlockedEthos.filter(ethos => ethos.pyramidLevel !== 1);

  const handleToggleEquip = (pathosId: string, isEquipped: boolean) => {
    if (isEquipped) {
      onEquipPathos(growth.equippedPathos.filter(id => id !== pathosId));
    } else if (growth.equippedPathos.length < MAX_EQUIPPED_PATHOS) {
      onEquipPathos([...growth.equippedPathos, pathosId]);
    }
  };

  return (
    <div style={{
      padding: '10px',
      background: COLORS.bg.primary,
      borderRadius: '6px',
      fontSize: '13px',
    }}>
      {/* 3열 레이아웃: 파토스(왼쪽) | 상태(중앙) | 에토스(오른쪽) */}
      <div style={{ display: 'flex', gap: SPACING.md, alignItems: 'flex-start' }}>
        {/* 왼쪽: 파토스 (액티브) */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          {unlockedPathos.length > 0 && (
            <div style={{
              padding: SPACING.sm,
              background: '#1f2a2a',
              border: `1px solid ${COLORS.tier[2].border}`,
              borderRadius: BORDER_RADIUS.md,
            }}>
              <div style={{
                fontSize: '17px', // 40% 확대 (12px → 17px)
                color: COLORS.tier[2].text,
                marginBottom: SPACING.xs,
                fontWeight: 'bold',
              }}>
                파토스 (액티브) {unlockedPathos.length}개 [{growth.equippedPathos.length}/{MAX_EQUIPPED_PATHOS}]
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {unlockedPathos.map(pathos => {
                  const isEquipped = growth.equippedPathos.includes(pathos.id);
                  return (
                    <span
                      key={pathos.id}
                      title={pathos.description}
                      onClick={() => handleToggleEquip(pathos.id, isEquipped)}
                      style={{
                        padding: '2px 6px',
                        background: isEquipped ? 'rgba(244, 114, 182, 0.3)' : 'rgba(244, 114, 182, 0.1)',
                        border: isEquipped ? `2px solid ${COLORS.tier[2].border}` : '1px solid rgba(244, 114, 182, 0.3)',
                        borderRadius: BORDER_RADIUS.sm,
                        fontSize: '14px', // 40% 확대 (10px → 14px)
                        color: COLORS.tier[2].text,
                        cursor: 'pointer',
                      }}
                    >
                      {isEquipped && '✓'}{pathos.name}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 중앙: 상태 정보 */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span>개성: <strong style={{ color: '#fde68a' }}>{playerTraits.length}개</strong></span>
            <span>SP: <strong style={{ color: COLORS.primary }}>{growth.skillPoints}P</strong></span>
          </div>
          {pendingSelection && (
            <div style={{
              marginTop: SPACING.sm,
              padding: SPACING.xs,
              background: 'rgba(251, 191, 36, 0.2)',
              borderRadius: '4px',
            }}>
              <strong style={{ color: COLORS.primary, fontSize: FONT_SIZE.sm }}>
                🎯 선택 대기: [{pendingSelection.type === 'ethos' ? '에토스' : '파토스'}] 선택지를 골라주세요!
              </strong>
            </div>
          )}
        </div>

        {/* 오른쪽: 에토스 (패시브) - 1단계 기본 에토스 제외 */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          {displayEthos.length > 0 && (
            <div style={{
              padding: SPACING.sm,
              background: '#1a2433',
              border: `1px solid ${COLORS.success}`,
              borderRadius: BORDER_RADIUS.md,
            }}>
              <div style={{
                fontSize: '17px', // 40% 확대 (12px → 17px)
                color: COLORS.success,
                marginBottom: SPACING.xs,
                fontWeight: 'bold',
                textAlign: 'right',
              }}>
                에토스 (패시브) {displayEthos.length}개
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
                {displayEthos.map(ethos => (
                  <span
                    key={ethos.id}
                    title={ethos.description}
                    style={{
                      padding: '2px 6px',
                      background: 'rgba(134, 239, 172, 0.15)',
                      border: '1px solid rgba(134, 239, 172, 0.3)',
                      borderRadius: BORDER_RADIUS.sm,
                      fontSize: '14px', // 40% 확대 (10px → 14px)
                      color: COLORS.success,
                    }}
                  >
                    {ethos.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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
      transformOrigin: 'top left',
      marginBottom: '20%', // scale로 인한 여백 보정
    }}>
      {/* 노드 연결선 SVG */}
      <PyramidConnections
        containerRef={containerRef}
        unlockedNodes={growth.unlockedNodes}
        identities={growth.identities}
        scale={1.2}
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
        growth={growth}
        onSelectIdentity={onSelectIdentity}
      />

      {/* 6단계 - 상위 파토스 */}
      <TierRow
        tier={6}
        label="6단계 파토스"
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
    </div>
  );
});

export default GrowthPyramidModal;
