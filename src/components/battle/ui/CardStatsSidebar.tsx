/**
 * CardStatsSidebar.tsx
 *
 * 카드 통계 사이드바 컴포넌트 (공격력, 방어력, 속도)
 */

import { FC } from 'react';

interface Card {
  damage?: number | null;
  block?: number | null;
  counter?: number;
  speedCost: number;
  hits?: number;
}

interface CardStatsSidebarProps {
  card: Card;
  strengthBonus?: number;
  showCounter?: boolean;
  formatSpeedText: (speed: number) => string;
}

/**
 * 카드 스탯 사이드바 컴포넌트
 */
export const CardStatsSidebar: FC<CardStatsSidebarProps> = ({ card, strengthBonus = 0, showCounter = false, formatSpeedText }) => {
  return (
    <div className="card-stats-sidebar">
      {card.damage != null && card.damage > 0 && (
        <div className="card-stat-item attack">
          ⚔️{card.damage + strengthBonus}{card.hits ? `×${card.hits}` : ''}
        </div>
      )}
      {card.block != null && card.block > 0 && (
        <div className="card-stat-item defense">
          🛡️{card.block + strengthBonus}
        </div>
      )}
      {showCounter && card.counter !== undefined && (
        <div className="card-stat-item counter">
          ⚡{card.counter}
        </div>
      )}
      <div className="card-stat-item speed">
        ⏱️{formatSpeedText(card.speedCost)}
      </div>
    </div>
  );
};
