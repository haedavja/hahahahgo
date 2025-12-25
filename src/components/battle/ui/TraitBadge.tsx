/**
 * TraitBadge.tsx
 *
 * 카드 특성 배지 표시 컴포넌트
 */

import { FC } from 'react';
import { TRAITS } from '../battleData';

interface TraitBadgeProps {
  traitId: string;
}

/**
 * 단일 특성 배지 컴포넌트
 */
export const TraitBadge: FC<TraitBadgeProps> = ({ traitId }) => {
  const trait = TRAITS[traitId];
  if (!trait) return null;

  const isPositive = trait.type === 'positive';
  const color = isPositive ? '#22c55e' : '#ef4444';
  const background = isPositive ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)';

  return (
    <span
      style={{
        color,
        background,
        padding: '2px 6px',
        borderRadius: '4px',
        border: `1px solid ${color}`
      }}
    >
      {trait.name}
    </span>
  );
};

interface TraitBadgeListProps {
  traits: string[] | null;
}

/**
 * 특성 배지 리스트 컴포넌트
 */
export const TraitBadgeList: FC<TraitBadgeListProps> = ({ traits }) => {
  if (!traits || traits.length === 0) return null;

  return (
    <span style={{ fontWeight: 600, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      {traits.map((traitId) => (
        <TraitBadge key={traitId} traitId={traitId} />
      ))}
    </span>
  );
};
