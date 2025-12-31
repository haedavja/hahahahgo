/**
 * @file TierRow.tsx
 * @description 피라미드 티어 행 컴포넌트 (에토스/파토스 노드)
 */

import { memo } from 'react';
import type { EthosNode } from '../../data/growth/ethosData';
import type { PathosNode } from '../../data/growth/pathosData';
import type { Ethos } from '../../data/growth/ethosData';
import type { Pathos } from '../../data/growth/pathosData';
import { getNodeChoices, type initialGrowthState } from '../../state/slices/growthSlice';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, type TierNumber } from '../../styles/theme';

interface TierRowProps {
  tier: number;
  label: string;
  requirement: string;
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
  requirement,
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
    <div style={{ marginBottom: SPACING.xl, opacity: isLocked ? 0.5 : 1 }}>
      {/* 티어 헤더 */}
      <TierHeader
        label={label}
        requirement={requirement}
        isLocked={isLocked}
        color={colors.text}
      />

      {/* 노드 그리드 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: SPACING.md,
        justifyContent: 'center',
        maxWidth: tier <= 3 ? '100%' : tier === 4 ? '90%' : '80%',
        margin: '0 auto',
      }}>
        {nodes.map(node => (
          <NodeCard
            key={node.id}
            node={node}
            type={type}
            growth={growth}
            skillPoints={skillPoints}
            isLocked={isLocked}
            isPending={pendingSelection?.nodeId === node.id}
            colors={colors}
            nodeCount={nodes.length}
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
  requirement: string;
  isLocked: boolean;
  color: string;
}

const TierHeader = memo(function TierHeader({
  label,
  requirement,
  isLocked,
  color,
}: TierHeaderProps) {
  return (
    <div style={{
      fontSize: FONT_SIZE.md,
      color,
      marginBottom: SPACING.sm,
      display: 'flex',
      alignItems: 'center',
      gap: SPACING.sm,
    }}>
      <span style={{ fontWeight: 'bold' }}>{label}</span>
      <span style={{
        fontSize: FONT_SIZE.xs,
        padding: `1px ${SPACING.sm}`,
        background: isLocked ? 'rgba(239, 68, 68, 0.2)' : 'rgba(71, 85, 105, 0.3)',
        borderRadius: BORDER_RADIUS.sm,
        color: isLocked ? COLORS.danger : COLORS.text.secondary,
      }}>
        {isLocked ? '🔒 ' : '✓ '}{requirement}
      </span>
      <span style={{ fontSize: FONT_SIZE.xs, color: COLORS.text.muted }}>검⚔ vs 총🔫</span>
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
  colors: { bg: string; border: string; text: string };
  nodeCount: number;
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
  colors,
  nodeCount,
  onUnlockNode,
  onSelectChoice,
}: NodeCardProps) {
  const isUnlocked = growth.unlockedNodes.includes(node.id);
  const canUnlock = !isLocked && !isUnlocked && skillPoints >= 1;

  const selectedChoice = isUnlocked
    ? node.choices.find(choiceId =>
        type === 'ethos'
          ? growth.unlockedEthos.includes(choiceId)
          : growth.unlockedPathos.includes(choiceId)
      )
    : null;

  const choices = getNodeChoices(node.id, type);
  const [choice1, choice2] = choices || [null, null];

  const nodeWidth = nodeCount <= 4 ? '220px' : nodeCount <= 5 ? '200px' : '180px';

  return (
    <div style={{
      width: nodeWidth,
      flex: `0 0 ${nodeWidth}`,
      padding: SPACING.md,
      background: isPending
        ? 'rgba(251, 191, 36, 0.15)'
        : isUnlocked
          ? colors.bg
          : 'rgba(71, 85, 105, 0.1)',
      border: isPending
        ? `2px solid ${COLORS.primary}`
        : isUnlocked
          ? `1px solid ${colors.border}`
          : '1px solid #475569',
      borderRadius: BORDER_RADIUS.lg,
    }}>
      {/* 노드 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
      }}>
        <span style={{
          fontWeight: 'bold',
          color: isUnlocked ? colors.text : COLORS.text.primary,
          fontSize: FONT_SIZE.md,
        }}>
          {isUnlocked && '✓ '}{node.name}
        </span>

        {canUnlock && (
          <button
            onClick={() => onUnlockNode(node.id, type)}
            style={{
              padding: `${SPACING.xs} 5px`,
              background: 'rgba(96, 165, 250, 0.2)',
              border: `1px solid ${COLORS.secondary}`,
              borderRadius: BORDER_RADIUS.md,
              color: COLORS.secondary,
              fontSize: FONT_SIZE.xs,
              cursor: 'pointer',
            }}
          >
            1P
          </button>
        )}
        {selectedChoice && (
          <span style={{ fontSize: FONT_SIZE.xs, color: COLORS.success }}>✓</span>
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
        padding: `5px ${SPACING.md}`,
        background: getBackground(),
        border: getBorder(),
        borderRadius: BORDER_RADIUS.md,
        opacity: isAlternative ? 0.4 : 1,
        cursor: canSelect ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
    >
      {/* 첫째 줄 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xs }}>
        <span style={{ fontSize: FONT_SIZE.md, color: typeColor }}>{typeEmoji}</span>
        {isSelected && <span style={{ color: COLORS.success, fontSize: FONT_SIZE.sm }}>✓</span>}
        <span style={{ fontWeight: 'bold', fontSize: FONT_SIZE.md, color: getNameColor() }}>
          {choice.name}
        </span>
        {canSelect && (
          <span style={{ fontSize: FONT_SIZE.xs, color: COLORS.primary, marginLeft: 'auto' }}>선택</span>
        )}
      </div>
      {/* 둘째 줄 */}
      <div style={{
        fontSize: FONT_SIZE.xs,
        color: isAlternative ? COLORS.text.disabled : COLORS.text.secondary,
        lineHeight: '1.3',
      }}>
        {choice.description}
      </div>
    </div>
  );
});

export default TierRow;
