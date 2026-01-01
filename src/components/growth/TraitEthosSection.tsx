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
      {/* CSS Grid로 고정 레이아웃 - 리플로우 방지 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '100px repeat(6, 200px)', // 헤더 + 6개 카드 고정
        gap: SPACING.md,
        alignItems: 'start',
        marginLeft: '-10px', // 2단계와 수직 정렬
      }}>
        {/* 티어 헤더 */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          padding: `${SPACING.sm} ${SPACING.md}`,
          background: '#1e293b', // 불투명 배경
          border: `1px solid ${colors.text}`,
          borderRadius: BORDER_RADIUS.lg,
          fontSize: FONT_SIZE.md,
          color: colors.text,
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          1단계 개성
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
      // Grid가 크기 제어하므로 width 속성 불필요
      padding: SPACING.md,
      boxSizing: 'border-box',
      background: isUnlocked ? '#1a2f1f' : '#1e293b', // 불투명 배경
      border: isUnlocked ? `1px solid ${colors.border}` : '1px solid #475569',
      borderRadius: BORDER_RADIUS.lg,
      // transition 제거 - 레이아웃 안정성 우선
    }}>
      {/* 에토스 이름 - 레이아웃 안정화 */}
      <div style={{
        textAlign: 'center',
        marginBottom: SPACING.sm,
      }}>
        {/* 해금 체크마크 - 이름 옆에 표시 */}
        {isUnlocked && (
          <span style={{
            color: COLORS.success,
            fontSize: FONT_SIZE.lg,
            marginRight: '4px',
          }}>✓</span>
        )}
        <span style={{
          fontWeight: 'bold',
          fontSize: FONT_SIZE.lg,
          color: isUnlocked ? colors.text : COLORS.text.muted,
        }}>
          {ethos.name}
        </span>
        {/* x{count} 뱃지: 2개 이상일 때만 표시, 공간은 항상 예약 */}
        <span style={{
          fontSize: FONT_SIZE.md,
          color: COLORS.primary,
          marginLeft: '4px',
          visibility: traitCount > 1 ? 'visible' : 'hidden',
        }}>
          x{traitCount > 1 ? traitCount : 2}
        </span>
      </div>

      {/* 개성 조건 - 미해금 시에만 표시 */}
      {!hasTrait && (
        <div style={{
          fontSize: FONT_SIZE.sm,
          color: COLORS.text.muted,
          marginBottom: SPACING.xs,
          textAlign: 'center',
        }}>
          개성 필요
        </div>
      )}

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
