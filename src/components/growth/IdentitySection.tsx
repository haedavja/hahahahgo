/**
 * @file IdentitySection.tsx
 * @description 자아 선택 섹션 (검사/총잡이)
 */

import { memo } from 'react';
import { IDENTITIES, type IdentityType } from '../../data/growth/identityData';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZE } from '../../styles/theme';

interface IdentitySectionProps {
  pyramidLevel: number;
  selectedIdentities: IdentityType[];
  onSelectIdentity: (id: IdentityType) => void;
}

export const IdentitySection = memo(function IdentitySection({
  pyramidLevel,
  selectedIdentities,
  onSelectIdentity,
}: IdentitySectionProps) {
  const canAccess = pyramidLevel >= 5;

  return (
    <div style={{ marginBottom: SPACING.xxl }}>
      {/* 티어 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
      }}>
        <div style={{
          display: 'inline-block',
          padding: `${SPACING.sm} ${SPACING.md}`,
          background: canAccess ? 'rgba(30, 41, 59, 0.8)' : '#141a22',
          border: `1px solid ${canAccess ? COLORS.tier.identity.text : '#334155'}`,
          borderRadius: BORDER_RADIUS.lg,
          fontSize: FONT_SIZE.md,
          color: canAccess ? COLORS.tier.identity.text : COLORS.text.muted,
          fontWeight: 'bold',
        }}>
          {!canAccess && '🔒 '}7단계 자아
        </div>
      </div>

      {/* 자아 카드들 - 6단계 노드들 사이에 배치되도록 간격 조정 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '200px', // 검잡이와 총잡이 사이 간격 (6단계 노드 사이에 맞춤)
      }}>
        {(['swordsman', 'gunslinger'] as const).map(id => (
          <IdentityCard
            key={id}
            identity={IDENTITIES[id]}
            identityId={id}
            isSelected={selectedIdentities.includes(id)}
            canSelect={canAccess && !selectedIdentities.includes(id)}
            canAccess={canAccess}
            onSelect={onSelectIdentity}
          />
        ))}
      </div>
    </div>
  );
});

// ========================================
// IdentityCard 컴포넌트
// ========================================
interface IdentityCardProps {
  identity: typeof IDENTITIES.swordsman;
  identityId: IdentityType;
  isSelected: boolean;
  canSelect: boolean;
  canAccess: boolean;
  onSelect: (id: IdentityType) => void;
}

const IdentityCard = memo(function IdentityCard({
  identity,
  identityId,
  isSelected,
  canSelect,
  canAccess,
  onSelect,
}: IdentityCardProps) {
  return (
    <div
      onClick={() => canSelect && onSelect(identityId)}
      style={{
        padding: `${SPACING.lg} 24px`,
        background: isSelected ? COLORS.tier.identity.bg : 'rgba(71, 85, 105, 0.3)',
        border: isSelected
          ? `2px solid ${COLORS.tier.identity.border}`
          : '1px solid #475569',
        borderRadius: BORDER_RADIUS.xl,
        opacity: canAccess ? 1 : 0.5,
        cursor: canSelect ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: '24px' }}>{identity.emoji}</span>
      <div style={{
        color: isSelected ? COLORS.tier.identity.text : COLORS.text.secondary,
        fontWeight: 'bold',
        marginTop: SPACING.sm,
      }}>
        {identity.name}
      </div>
      {isSelected && (
        <div style={{ fontSize: FONT_SIZE.sm, color: COLORS.success }}>
          ✓ 선택됨
        </div>
      )}
    </div>
  );
});

export default IdentitySection;
