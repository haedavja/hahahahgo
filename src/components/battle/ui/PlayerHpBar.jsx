/**
 * PlayerHpBar.jsx
 *
 * 플레이어 HP 바와 상태 표시 컴포넌트
 */

import { TokenDisplay } from './TokenDisplay';

export const PlayerHpBar = ({
  player,
  playerHit,
  playerBlockAnim,
  playerOverdriveFlash,
  effectiveAgility,
  dulledLevel
}) => {
  return (
    <div style={{ position: 'fixed', top: '500px', left: '150px', zIndex: 3000, pointerEvents: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        <div style={{ position: 'relative', pointerEvents: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className={`character-display ${playerOverdriveFlash ? 'overdrive-burst' : ''}`} style={{ fontSize: '64px' }}>🧙‍♂️</div>
            <div></div>
            <div style={{ position: 'relative' }}>
              <div className={playerHit ? 'hit-animation' : ''} style={{ color: '#f87171', fontSize: '1.25rem', fontWeight: 'bold', position: 'absolute', top: '-30px', left: '0' }}>
                ❤️ {player.hp}/{player.maxHp}
                {player.block > 0 && <span className={playerBlockAnim ? 'block-animation' : ''} style={{ color: '#60a5fa', marginLeft: '8px' }}>🛡️{player.block}</span>}
              </div>
              <div className="hp-bar-enhanced mb-1" style={{ width: '200px', height: '12px', position: 'relative', overflow: 'hidden' }}>
                <div className="hp-fill" style={{ width: `${(player.hp / player.maxHp) * 100}%` }}></div>
                {player.block > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${Math.min((player.block / player.maxHp) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
                    borderRight: '2px solid #60a5fa'
                  }}></div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '0.9rem', fontWeight: '700' }}>
                {(player.strength || 0) !== 0 && (
                  <span style={{ color: '#fbbf24' }}>💪 힘 {player.strength || 0}</span>
                )}
                {effectiveAgility !== 0 && (
                  <span style={{ color: effectiveAgility > 0 ? '#34d399' : '#ef4444' }}>⚡ 민첩 {effectiveAgility}</span>
                )}
                {(player.insight || 0) !== 0 && (
                  <span style={{ color: '#a78bfa' }}>👁️ 통찰 {player.insight || 0}</span>
                )}
                {dulledLevel > 0 && (
                  <span style={{ color: '#94a3b8' }}>🌫️ 우둔 {dulledLevel}</span>
                )}
                {player.etherOverflow > 0 && (
                  <span style={{ color: '#a78bfa', fontSize: '0.85rem' }}>🌊 범람 {player.etherOverflow} PT</span>
                )}
              </div>
              {/* 토큰 표시 */}
              <TokenDisplay entity={player} position="player" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
