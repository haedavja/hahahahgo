/**
 * @file TraitTooltip.tsx
 * @description 특성 툴팁 컴포넌트
 */

import { memo } from 'react';
import type { FC } from 'react';
import { TRAITS } from '../../../battle/battleData';

interface TraitTooltipProps {
  traitId: string;
  x: number;
  y: number;
}

export const TraitTooltip: FC<TraitTooltipProps> = memo(function TraitTooltip({
  traitId,
  x,
  y,
}) {
  const trait = TRAITS[traitId as keyof typeof TRAITS];
  if (!trait) return null;

  const isPositive = trait.type === 'positive';

  return (
    <div
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y - 10}px`,
        transform: 'translate(-50%, -100%)',
        background: 'rgba(0, 0, 0, 0.95)',
        border: `2px solid ${isPositive ? '#22c55e' : '#ef4444'}`,
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.9)',
        zIndex: 99999,
        pointerEvents: 'none',
        minWidth: '200px',
        maxWidth: '300px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px'
      }}>
        <span style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          color: isPositive ? '#22c55e' : '#ef4444'
        }}>
          {trait.name}
        </span>
        <span style={{ fontSize: '0.9rem', color: '#fbbf24' }}>
          {"★".repeat(trait.weight)}
        </span>
      </div>
      <div style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.5 }}>
        {trait.description}
      </div>
    </div>
  );
});
