/**
 * @file TierRow.tsx
 * @description 피라미드 티어 행 컴포넌트 (에토스/파토스 노드)
 */

import { memo } from 'react';
import type { EthosNode } from '../../data/growth/ethosData';
import type { PathosNode } from '../../data/growth/pathosData';
import type { Ethos } from '../../data/growth/ethosData';
import type { Pathos } from '../../data/growth/pathosData';
import { getNodeChoices, getNodeUnlockStatus, type initialGrowthState } from '../../state/slices/growthSlice';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, type TierNumber } from '../../styles/theme';

interface TierRowProps {
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
}

export const TierRow = memo(function TierRow({
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
}: TierRowProps) {
  const colors = COLORS.tier[tier as TierNumber];
  const isLocked = pyramidLevel < tier;

  return (
    <div style={{
      marginBottom: '80px', // 단계별 높이 간격 2배
      position: 'relative',
    }}>
      {/* 티어 헤더와 노드를 같은 줄에 배치 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: SPACING.md,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        paddingLeft: tier === 4 ? '120px' : tier === 5 ? '240px' : tier === 6 ? '360px' : 0,
      }}>
        {/* 티어 헤더 */}
        <TierHeader
          label={label}
          isLocked={isLocked}
          color={colors.text}
        />

        {/* 노드들 */}
        {nodes.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            type={type}
            growth={growth}
            skillPoints={skillPoints}
            isLocked={isLocked}
            isPending={pendingSelection?.nodeId === node.id}
            hasPendingSelection={pendingSelection !== null}
            colors={colors}
            nodeCount={nodes.length}
            tier={tier}
            onUnlockNode={onUnlockNode}
            onSelectChoice={onSelectChoice}
          />
        ))}
      </div>
    </div>
  );
});

// ========================================
// TierHeader 컴포넌트
// ========================================
interface TierHeaderProps {
  label: string;
  isLocked: boolean;
  color: string;
}

const TierHeader = memo(function TierHeader({
  label,
  isLocked,
  color,
}: TierHeaderProps) {
  return (
    <div style={{
      position: 'relative',
      zIndex: 10,
      padding: `${SPACING.sm} ${SPACING.md}`,
      background: isLocked ? '#141a22' : 'rgba(30, 41, 59, 0.8)',
      border: `1px solid ${isLocked ? '#334155' : color}`,
      borderRadius: BORDER_RADIUS.lg,
      fontSize: FONT_SIZE.md,
      color: isLocked ? COLORS.text.muted : color,
      fontWeight: 'bold',
    }}>
      {isLocked ? '🔒 ' : ''}{label}
    </div>
  );
});

// ========================================
// NodeCard 컴포넌트
// ========================================
interface NodeCardProps {
  node: EthosNode | PathosNode;
  type: 'ethos' | 'pathos';
  growth: typeof initialGrowthState;
  skillPoints: number;
  isLocked: boolean;
  isPending: boolean;
  hasPendingSelection: boolean;
  colors: { bg: string; border: string; text: string };
  nodeCount: number;
  tier: number;
  onUnlockNode: (nodeId: string, type: 'ethos' | 'pathos') => void;
  onSelectChoice: (choiceId: string) => void;
}

const NodeCard = memo(function NodeCard({
  node,
  type,
  growth,
  skillPoints,
  isLocked,
  isPending,
  hasPendingSelection,
  colors,
  nodeCount,
  tier,
  onUnlockNode,
  onSelectChoice,
}: NodeCardProps) {
  const isUnlocked = growth.unlockedNodes.includes(node.id);

  // 피라미드 트리 해금 조건 확인
  const unlockStatus = getNodeUnlockStatus(node.id, growth);
  // 선택 대기 중인 노드가 있으면 해금 불가
  const canUnlock = !isUnlocked && unlockStatus.canUnlock && skillPoints >= 1 && !hasPendingSelection;

  const selectedChoice = isUnlocked
    ? node.choices.find(choiceId =>
        type === 'ethos'
          ? growth.unlockedEthos.includes(choiceId)
          : growth.unlockedPathos.includes(choiceId)
      )
    : null;

  const choices = getNodeChoices(node.id, type);
  const [choice1, choice2] = choices || [null, null];

  // 모든 노드 동일 크기
  const nodeWidth = '200px';

  // 불투명 배경색 (연결선이 카드 뒤로 숨겨지도록)
  const getOpaqueBackground = () => {
    if (isPending) return '#2d2a1f'; // 노란 톤의 어두운 배경
    if (isUnlocked) {
      // 티어별 불투명 배경
      const opaqueColors: Record<number, string> = {
        2: '#1f2a2a', // 핑크 톤
        3: '#1a2433', // 파랑 톤
        4: '#2a2419', // 주황 톤
        5: '#231f33', // 보라 톤
        6: '#2a1a1a', // 빨강 톤
      };
      return opaqueColors[node.tier] || '#1e293b';
    }
    return '#141a22'; // 해금 안됨: 더 어두운 배경
  };

  return (
    <div
      data-node-id={node.id}
      style={{
      position: 'relative',
      zIndex: 10,
      width: nodeWidth,
      flex: `0 0 ${nodeWidth}`,
      padding: SPACING.md,
      background: getOpaqueBackground(),
      border: isPending
        ? `2px solid ${COLORS.primary}`
        : isUnlocked
          ? `1px solid ${colors.border}`
          : '1px solid #334155', // 더 어두운 테두리
      borderRadius: BORDER_RADIUS.lg,
    }}>
      {/* 콘텐츠 wrapper - 배경은 불투명, 콘텐츠만 흐리게 */}
      <div style={{ opacity: isUnlocked || isPending ? 1 : 0.7 }}>
        {/* 노드 헤더 */}
        <div style={{
        textAlign: 'center',
        marginBottom: SPACING.sm,
      }}>
        <div style={{
          fontWeight: 'bold',
          color: isUnlocked ? colors.text : COLORS.text.muted,
          fontSize: FONT_SIZE.lg,
          marginBottom: SPACING.xs,
        }}>
          {isUnlocked && '✓ '}{node.name}
          {selectedChoice && <span style={{ color: COLORS.success, marginLeft: SPACING.xs }}>✓</span>}
        </div>

        {canUnlock && (
          <button
            onClick={() => onUnlockNode(node.id, type)}
            style={{
              padding: `${SPACING.xs} ${SPACING.md}`,
              background: 'rgba(96, 165, 250, 0.2)',
              border: `1px solid ${COLORS.secondary}`,
              borderRadius: BORDER_RADIUS.md,
              color: COLORS.secondary,
              fontSize: FONT_SIZE.sm,
              cursor: 'pointer',
            }}
          >
            1P 해금
          </button>
        )}

        {/* 선택 대기 중 메시지 */}
        {!isUnlocked && unlockStatus.canUnlock && hasPendingSelection && (
          <div style={{
            fontSize: FONT_SIZE.xs,
            color: COLORS.primary,
            padding: `${SPACING.xs} ${SPACING.sm}`,
            background: 'rgba(251, 191, 36, 0.1)',
            borderRadius: BORDER_RADIUS.sm,
            marginTop: SPACING.xs,
          }}>
            ⏳ 선택 완료 후 해금 가능
          </div>
        )}

        {/* 해금 불가 사유 표시 */}
        {!isUnlocked && !unlockStatus.canUnlock && unlockStatus.reason && (
          <div style={{
            fontSize: FONT_SIZE.xs,
            color: COLORS.danger,
            padding: `${SPACING.xs} ${SPACING.sm}`,
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: BORDER_RADIUS.sm,
            marginTop: SPACING.xs,
          }}>
            🔒 {unlockStatus.reason}
          </div>
        )}
      </div>

      {/* 선택지 */}
      {choice1 && choice2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
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
    </div>
  );
});

// ========================================
// ChoiceBadge 컴포넌트
// ========================================
interface ChoiceBadgeProps {
  choice: Ethos | Pathos;
  isSelected: boolean;
  isAlternative: boolean;
  canSelect: boolean;
  onSelect: () => void;
}

const ChoiceBadge = memo(function ChoiceBadge({
  choice,
  isSelected,
  isAlternative,
  canSelect,
  onSelect,
}: ChoiceBadgeProps) {
  const typeColor = COLORS.type[choice.type as keyof typeof COLORS.type] || COLORS.type.neutral;
  const typeEmoji = choice.type === 'sword' ? '⚔' : choice.type === 'gun' ? '🔫' : '◎';

  const getBackground = () => {
    if (isSelected) return 'rgba(134, 239, 172, 0.2)';
    if (canSelect) return 'rgba(251, 191, 36, 0.15)';
    if (isAlternative) return 'rgba(71, 85, 105, 0.1)';
    return 'rgba(30, 41, 59, 0.4)';
  };

  const getBorder = () => {
    if (isSelected) return `2px solid ${COLORS.success}`;
    if (canSelect) return `2px solid ${COLORS.primary}`;
    return '1px solid rgba(71, 85, 105, 0.3)';
  };

  const getNameColor = () => {
    if (isSelected) return COLORS.success;
    if (canSelect) return COLORS.primary;
    if (isAlternative) return COLORS.text.muted;
    return COLORS.text.primary;
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (canSelect) onSelect();
      }}
      style={{
        padding: `${SPACING.sm} ${SPACING.md}`,
        background: getBackground(),
        border: getBorder(),
        borderRadius: BORDER_RADIUS.md,
        opacity: isAlternative ? 0.4 : 1,
        cursor: canSelect ? 'pointer' : 'default',
        transition: 'all 0.15s',
        textAlign: 'center',
      }}
    >
      {/* 첫째 줄 - 능력 이름 중앙 배치 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.xs,
      }}>
        <span style={{ fontSize: FONT_SIZE.lg, color: typeColor }}>{typeEmoji}</span>
        {isSelected && <span style={{ color: COLORS.success, fontSize: FONT_SIZE.md }}>✓</span>}
        <span style={{ fontWeight: 'bold', fontSize: FONT_SIZE.lg, color: getNameColor() }}>
          {choice.name}
        </span>
      </div>
      {/* 선택 버튼 */}
      {canSelect && (
        <div style={{ fontSize: FONT_SIZE.sm, color: COLORS.primary, marginBottom: SPACING.xs }}>
          [ 선택 ]
        </div>
      )}
      {/* 둘째 줄 */}
      <div style={{
        fontSize: FONT_SIZE.sm,
        color: isAlternative ? COLORS.text.disabled : COLORS.text.secondary,
        lineHeight: '1.4',
      }}>
        {choice.description}
      </div>
    </div>
  );
});

export default TierRow;
