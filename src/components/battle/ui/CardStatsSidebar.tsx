/**
 * CardStatsSidebar.tsx
 *
 * 카드 통계 사이드바 컴포넌트 (공격력, 방어력, 속도)
 * React.memo로 최적화됨
 */

import { FC, memo } from 'react';
import type { SidebarCard as Card } from '../../../types';

interface CardStatsSidebarProps {
  card: Card;
  strengthBonus?: number;
  fencingBonus?: number;  // 날 세우기 보너스 (검격 카드만 적용)
  showCounter?: boolean;
  formatSpeedText: (speed: number) => string;
}

/**
 * 카드 스탯 사이드바 컴포넌트
 * React.memo로 불필요한 리렌더링 방지
 */
export const CardStatsSidebar: FC<CardStatsSidebarProps> = memo(({ card, strengthBonus = 0, fencingBonus = 0, showCounter = false, formatSpeedText }) => {
  // 검격 카드에만 날 세우기 보너스 적용
  const isFencingCard = card.cardCategory === 'fencing';
  const totalDamageBonus = strengthBonus + (isFencingCard ? fencingBonus : 0);
  const hasFencingBonus = isFencingCard && fencingBonus > 0;

  return (
    <div className="card-stats-sidebar">
      {card.damage != null && card.damage > 0 && (
        <div className={`card-stat-item attack ${hasFencingBonus ? 'fencing-boosted' : ''}`}>
          ⚔️{card.damage + totalDamageBonus}{card.hits ? `×${card.hits}` : ''}
          {hasFencingBonus && <span className="bonus-indicator">+{fencingBonus}</span>}
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
}, (prevProps, nextProps) => {
  // 얕은 비교로 성능 최적화
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.card.damage === nextProps.card.damage &&
    prevProps.card.block === nextProps.card.block &&
    prevProps.card.speedCost === nextProps.card.speedCost &&
    prevProps.card.hits === nextProps.card.hits &&
    prevProps.card.counter === nextProps.card.counter &&
    prevProps.card.cardCategory === nextProps.card.cardCategory &&
    prevProps.strengthBonus === nextProps.strengthBonus &&
    prevProps.fencingBonus === nextProps.fencingBonus &&
    prevProps.showCounter === nextProps.showCounter
  );
});
