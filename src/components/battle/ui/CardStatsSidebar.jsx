/**
 * CardStatsSidebar.jsx
 *
 * 카드 통계 사이드바 컴포넌트 (공격력, 방어력, 속도)
 */

import React from 'react';

/**
 * 카드 스탯 사이드바 컴포넌트
 * @param {Object} card - 카드 객체
 * @param {number} strengthBonus - 힘 보너스 (player.strength)
 * @param {boolean} showCounter - counter 속성 표시 여부 (기본값: false)
 * @param {Function} formatSpeedText - 속도 텍스트 포맷 함수
 */
export const CardStatsSidebar = ({ card, strengthBonus = 0, showCounter = false, formatSpeedText }) => {
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
