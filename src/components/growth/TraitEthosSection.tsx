/**
 * @file TraitEthosSection.tsx
 * @description 1단계 에토스 섹션 (개성 기반 자동 해금)
 */

import { memo } from 'react';
import type { Ethos } from '../../data/growth/ethosData';
import type { initialGrowthState } from '../../state/slices/growthSlice';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../styles/theme';

// 개성 이름 → 1단계 에토스 ID 매핑
const TRAIT_TO_ETHOS: Record<string, string> = {
  '용맹함': 'bravery',
  '굳건함': 'steadfast',
  '냉철함': 'composure',
  '철저함': 'thorough',
  '열정적': 'passion',
  '활력적': 'vitality',
};

interface TraitEthosSectionProps {
  playerTraits: string[];
  growth: typeof initialGrowthState;
  tier1Items: Ethos[];
}

export const TraitEthosSection = memo(function TraitEthosSection({
  playerTraits,
  growth,
  tier1Items,
}: TraitEthosSectionProps) {
  const colors = COLORS.tier[1];

  return (
    <div style={{
      marginBottom: '80px', // 단계별 높이 간격 2배
      position: 'relative',
    }}>
      {/* 티어 헤더와 에토스를 같은 줄에 배치 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: SPACING.md,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        paddingLeft: '20px',
      }}>
        {/* 티어 헤더 */}
        <div style={{
          display: 'inline-block',
          padding: `${SPACING.sm} ${SPACING.md}`,
          background: 'rgba(30, 41, 59, 0.8)',
          border: `1px solid ${colors.text}`,
          borderRadius: BORDER_RADIUS.lg,
          fontSize: FONT_SIZE.md,
          color: colors.text,
          fontWeight: 'bold',
        }}>
          1단계 에토스
        </div>

        {/* 에토스 카드들 */}
        {tier1Items.map(ethos => (
          <EthosCard
            key={ethos.id}
            ethos={ethos}
            playerTraits={playerTraits}
            isUnlocked={growth.unlockedEthos.includes(ethos.id)}
            colors={colors}
          />
        ))}
      </div>
    </div>
  );
});

// ========================================
// EthosCard 컴포넌트
// ========================================
interface EthosCardProps {
  ethos: Ethos;
  playerTraits: string[];
  isUnlocked: boolean;
  colors: { bg: string; border: string; text: string };
}

const EthosCard = memo(function EthosCard({
  ethos,
  playerTraits,
  isUnlocked,
  colors,
}: EthosCardProps) {
  const matchingTrait = Object.entries(TRAIT_TO_ETHOS).find(
    ([, ethosId]) => ethosId === ethos.id
  )?.[0];
  const traitCount = matchingTrait
    ? playerTraits.filter(t => t === matchingTrait).length
    : 0;
  const hasTrait = traitCount > 0;

  return (
    <div
      data-node-id={ethos.id}
      style={{
      position: 'relative',
      zIndex: 10,
      width: '200px',
      flex: '0 0 200px',
      padding: SPACING.md,
      background: isUnlocked ? '#1a2f1f' : '#1e293b', // 불투명 배경
      border: isUnlocked ? `1px solid ${colors.border}` : '1px solid #475569',
      borderRadius: BORDER_RADIUS.lg,
    }}>
      {/* 에토스 이름 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
      }}>
        {isUnlocked && (
          <span style={{ color: COLORS.success, fontSize: FONT_SIZE.md }}>✓</span>
        )}
        <span style={{
          fontWeight: 'bold',
          fontSize: FONT_SIZE.lg,
          color: isUnlocked ? colors.text : COLORS.text.muted,
        }}>
          {ethos.name}
        </span>
        {traitCount > 1 && (
          <span style={{ fontSize: FONT_SIZE.md, color: COLORS.primary }}>
            x{traitCount}
          </span>
        )}
      </div>

      {/* 개성 조건 */}
      <div style={{
        fontSize: FONT_SIZE.sm,
        color: hasTrait ? '#fde68a' : COLORS.text.muted,
        marginBottom: SPACING.xs,
        textAlign: 'center',
      }}>
        {hasTrait
          ? `✓ ${matchingTrait}${traitCount > 1 ? ` x${traitCount}` : ''}`
          : `${matchingTrait || '?'} 필요`}
      </div>

      {/* 설명 */}
      <div style={{
        fontSize: FONT_SIZE.sm,
        color: isUnlocked ? COLORS.text.secondary : COLORS.text.disabled,
        lineHeight: '1.4',
        textAlign: 'center',
      }}>
        {ethos.description}
      </div>
    </div>
  );
});

export default TraitEthosSection;
