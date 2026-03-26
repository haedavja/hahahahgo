/**
 * EnergyDisplayFixed.tsx
 *
 * 좌측 하단 고정 활동력 표시
 */

import { FC, memo } from 'react';

interface EnergyDisplayFixedProps {
  remainingEnergy: number;
  maxEnergy: number;
}

export const EnergyDisplayFixed: FC<EnergyDisplayFixedProps> = memo(function EnergyDisplayFixed({
  remainingEnergy,
  maxEnergy,
}) {
  return (
    <div className="energy-display-fixed">
      <div className="energy-orb-compact">
        {remainingEnergy}<span style={{ margin: '0 6px' }}>/</span>{maxEnergy}
      </div>
    </div>
  );
});
