/**
 * TraitBadge.tsx
 *
 * 카드 특성 배지 표시 컴포넌트
 * 최적화: React.memo + useMemo + 스타일 상수
 */

import { FC, memo, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { TRAITS } from '../battleData';

// =====================
// 스타일 상수
// =====================

const BADGE_BASE_STYLE: CSSProperties = {
  padding: '2px 6px',
  borderRadius: '4px'
};

const POSITIVE_STYLE: CSSProperties = {
  ...BADGE_BASE_STYLE,
  color: '#22c55e',
  background: 'rgba(34, 197, 94, 0.2)',
  border: '1px solid #22c55e'
};

const NEGATIVE_STYLE: CSSProperties = {
  ...BADGE_BASE_STYLE,
  color: '#ef4444',
  background: 'rgba(239, 68, 68, 0.2)',
  border: '1px solid #ef4444'
};

const LIST_STYLE: CSSProperties = {
  fontWeight: 600,
  display: 'flex',
  gap: '4px',
  flexWrap: 'wrap'
};

interface TraitBadgeProps {
  traitId: string;
}

/**
 * 단일 특성 배지 컴포넌트
 */
export const TraitBadge: FC<TraitBadgeProps> = memo(({ traitId }) => {
  const { trait, style } = useMemo(() => {
    const t = (TRAITS as any)[traitId];
    if (!t) return { trait: null, style: NEGATIVE_STYLE };
    return {
      trait: t,
      style: t.type === 'positive' ? POSITIVE_STYLE : NEGATIVE_STYLE
    };
  }, [traitId]);

  if (!trait) return null;

  return (
    <span style={style}>
      {trait.name}
    </span>
  );
});

interface TraitBadgeListProps {
  traits: string[] | null;
}

/**
 * 특성 배지 리스트 컴포넌트
 */
export const TraitBadgeList: FC<TraitBadgeListProps> = memo(({ traits }) => {
  if (!traits || traits.length === 0) return null;

  return (
    <span style={LIST_STYLE}>
      {traits.map((traitId: string) => (
        <TraitBadge key={traitId} traitId={traitId} />
      ))}
    </span>
  );
});
