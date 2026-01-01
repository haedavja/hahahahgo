/**
 * @file TraitEthosSection.tsx
 * @description 1단계 에토스 섹션 (개성 기반 자동 해금)
 */

import { memo, useState, useCallback } from 'react';
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

  // 접기/펼치기 상태 (1단계는 기본 펼침)
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // 해금된 에토스 수
  const unlockedCount = tier1Items.filter(e => growth.unlockedEthos.includes(e.id)).length;

  return (
    <div style={{
      marginBottom: SPACING.xl,
      position: 'relative',
      zIndex: 1,
    }}>
      {/* 티어 헤더 (클릭으로 토글) */}
      <div
        onClick={toggleCollapse}
        style={{
          fontSize: FONT_SIZE.md,
          color: colors.text,
          marginBottom: SPACING.sm,
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.sm,
          cursor: 'pointer',
          padding: `${SPACING.xs} ${SPACING.sm}`,
          borderRadius: BORDER_RADIUS.md,
          background: isCollapsed ? 'rgba(30, 41, 59, 0.5)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        {/* 접기/펼치기 아이콘 */}
        <span style={{
          fontSize: FONT_SIZE.sm,
          color: COLORS.text.muted,
          transition: 'transform 0.2s',
          transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>
          ▼
        </span>

        <span style={{ fontWeight: 'bold' }}>1단계 에토스</span>

        {/* 해금 진행 상태 */}
        {unlockedCount > 0 && (
          <span style={{
            fontSize: FONT_SIZE.xs,
            padding: `1px ${SPACING.sm}`,
            background: 'rgba(134, 239, 172, 0.2)',
            borderRadius: BORDER_RADIUS.sm,
            color: COLORS.success,
          }}>
            {unlockedCount}/{tier1Items.length} 해금
          </span>
        )}

        <span style={{
          fontSize: FONT_SIZE.xs,
          padding: `1px ${SPACING.sm}`,
          background: 'rgba(71, 85, 105, 0.3)',
          borderRadius: BORDER_RADIUS.sm,
          color: COLORS.text.secondary,
        }}>
          ✓ 개성 보유 시 자동 해금
        </span>

        {/* 접힌 상태 힌트 */}
        {isCollapsed && (
          <span style={{
            fontSize: FONT_SIZE.xs,
            color: COLORS.text.muted,
            marginLeft: 'auto',
          }}>
            클릭해서 펼치기
          </span>
        )}
      </div>

      {/* 에토스 그리드 (접혔으면 숨김) */}
      {!isCollapsed && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: SPACING.md,
          justifyContent: 'center',
          animation: 'fadeIn 0.2s ease-out',
        }}>
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
      )}
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
      zIndex: 1,
      width: '180px',
      flex: '0 0 180px',
      padding: SPACING.md,
      background: isUnlocked ? '#1a2f1f' : '#1e293b', // 불투명 배경
      border: isUnlocked ? `1px solid ${colors.border}` : '1px solid #475569',
      borderRadius: BORDER_RADIUS.lg,
    }}>
      {/* 에토스 이름 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
      }}>
        {isUnlocked && (
          <span style={{ color: COLORS.success, fontSize: FONT_SIZE.sm }}>✓</span>
        )}
        <span style={{
          fontWeight: 'bold',
          fontSize: FONT_SIZE.md,
          color: isUnlocked ? colors.text : COLORS.text.muted,
        }}>
          {ethos.name}
        </span>
        {traitCount > 1 && (
          <span style={{ fontSize: FONT_SIZE.sm, color: COLORS.primary }}>
            x{traitCount}
          </span>
        )}
      </div>

      {/* 개성 조건 */}
      <div style={{
        fontSize: FONT_SIZE.xs,
        color: hasTrait ? '#fde68a' : COLORS.text.muted,
        marginBottom: SPACING.xs,
      }}>
        {hasTrait
          ? `✓ ${matchingTrait}${traitCount > 1 ? ` x${traitCount}` : ''}`
          : `${matchingTrait || '?'} 필요`}
      </div>

      {/* 설명 */}
      <div style={{
        fontSize: FONT_SIZE.xs,
        color: isUnlocked ? COLORS.text.secondary : COLORS.text.disabled,
        lineHeight: '1.3',
      }}>
        {ethos.description}
      </div>
    </div>
  );
});

export default TraitEthosSection;
