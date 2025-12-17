/**
 * EnemyHpBar.jsx
 *
 * 적 HP 바와 상태 표시 컴포넌트
 */

import { TokenDisplay } from './TokenDisplay';

export const EnemyHpBar = ({
  battle,
  previewDamage,
  dulledLevel,
  enemy,
  enemyHit,
  enemyBlockAnim,
  soulShatter,
  groupedEnemyMembers,
  enemyOverdriveFlash,
  enemyEtherValue,
  enemyTransferPulse,
  enemySoulScale,
  formatCompactValue,
  frozenOrder
}) => {
  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: '0', paddingRight: '0', gap: '40px', background: 'transparent', border: 'none', boxShadow: 'none' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '0',
        margin: '0',
        borderRadius: '0',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        position: 'fixed',
        top: '530px',
        right: '640px',
        pointerEvents: 'none'
      }}>
        <div style={{ textAlign: 'right', position: 'relative', paddingRight: '8px', pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', paddingTop: '30px' }}>
                {(() => {
                  const hideEnemyVitals = dulledLevel >= 3;
                  const hpText = hideEnemyVitals ? '??' : `${enemy.hp}/${enemy.maxHp}`;
                  const blockText = hideEnemyVitals ? '??' : (enemy.block > 0 ? `${enemy.block}` : null);
                  const showDamage = (battle.phase === 'select' || battle.phase === 'respond') && previewDamage.value > 0;
                  return (
                  <div className={enemyHit ? 'hit-animation' : ''} style={{ color: '#f87171', fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'right', transition: 'opacity 0.4s ease, transform 0.4s ease', opacity: soulShatter ? 0 : 1, transform: soulShatter ? 'scale(0.9)' : 'scale(1)', position: 'absolute', top: frozenOrder ? '-35px' : '-20px', right: '-200px', width: '280px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    {showDamage && (
                      <span className={`${previewDamage.lethal ? 'lethal' : ''} ${previewDamage.overkill ? 'overkill' : ''}`} style={{ color: '#fbbf24' }}>
                        🗡️-{previewDamage.value}{previewDamage.lethal && (previewDamage.overkill ? '☠️' : '💀')}
                      </span>
                    )}
                    {blockText && <span className={enemyBlockAnim ? 'block-animation' : ''} style={{ color: '#60a5fa' }}>🛡️{blockText}</span>}
                    <span>❤️ {hpText}</span>
                  </div>
                );
                })()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div className="hp-bar-enhanced mb-1" style={{ width: '200px', height: '12px', position: 'relative', overflow: 'hidden' }}>
                  <div className="hp-fill" style={{ width: `${dulledLevel >= 3 ? 0 : (enemy.hp / enemy.maxHp) * 100}%` }}></div>
                  {enemy.block > 0 && dulledLevel < 3 && (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      height: '100%',
                      width: `${Math.min((enemy.block / enemy.maxHp) * 100, 100)}%`,
                      background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
                      borderRight: '2px solid #60a5fa'
                    }}></div>
                  )}
                </div>
                {/* 토큰 표시 - HP바 아래 */}
                <TokenDisplay entity={enemy} position="enemy" />
                {/* 빙결 상태이상 표시 */}
                {frozenOrder > 0 && (
                  <div
                    className="enemy-status-frozen"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      background: 'rgba(100, 200, 255, 0.2)',
                      border: '1px solid rgba(100, 200, 255, 0.6)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#7dd3fc',
                      fontWeight: '600',
                      animation: 'frozenPulse 1.5s ease-in-out infinite',
                      cursor: 'help',
                      width: 'fit-content'
                    }}>
                    <span>❄️</span>
                    <span style={{
                      padding: '0 4px',
                      background: 'rgba(100, 200, 255, 0.3)',
                      borderRadius: '3px',
                      fontSize: '11px'
                    }}>x{frozenOrder}</span>
                    {/* 툴팁 */}
                    <div className="status-tooltip" style={{
                      position: 'absolute',
                      left: '100%',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      marginLeft: '8px',
                      padding: '12px 16px',
                      background: 'rgba(15, 23, 42, 0.98)',
                      border: '1px solid rgba(100, 200, 255, 0.5)',
                      borderRadius: '6px',
                      fontSize: '15px',
                      color: '#e2e8f0',
                      whiteSpace: 'nowrap',
                      opacity: 0,
                      visibility: 'hidden',
                      transition: 'opacity 0.15s, visibility 0.15s',
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                    }}>
                      <div style={{ fontWeight: 700, color: '#7dd3fc', marginBottom: '8px', fontSize: '16px' }}>❄️ 빙결 (x{frozenOrder})</div>
                      <div style={{ lineHeight: 1.5 }}>{frozenOrder}턴 동안 플레이어 카드가<br/>모두 먼저 발동합니다.</div>
                    </div>
                  </div>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginTop: '-88px' }}>
              {groupedEnemyMembers.map((member, idx) => {
                const rawName = member.name || '몬스터';
                const displayName = member.count > 1 ? `${rawName} x${member.count}` : rawName;
                return (
                  <div key={`${rawName}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '0.95rem',
                      color: '#e2e8f0',
                      fontWeight: '600',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      transform: 'translateX(220px)'
                    }}>
                      {displayName}
                    </span>
                    <div
                      className={`character-display ${soulShatter ? 'soul-shatter-target' : ''} ${enemyOverdriveFlash ? 'overdrive-burst' : ''}`}
                      style={{
                        fontSize: idx === 0 ? '64px' : '56px',
                        filter: idx === 0 ? 'none' : 'brightness(0.95)',
                        transform: 'translateX(220px)'
                      }}
                    >
                      {member.emoji || '👹'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div
        className={`soul-orb ${enemyTransferPulse ? 'pulse' : ''} ${soulShatter ? 'shatter' : ''}`}
        title={dulledLevel >= 3 ? '?? / ??' : `${(enemyEtherValue || 0).toLocaleString()} / ${((enemy?.etherCapacity ?? enemyEtherValue) || 0).toLocaleString()}`}
        style={{ position: 'fixed', top: '470px', right: '300px' }}>
        <div className={`soul-orb-shell ${enemyTransferPulse ? 'pulse' : ''} ${soulShatter ? 'shatter' : ''}`} style={{ transform: `scale(${enemySoulScale})` }} />
        <div className="soul-orb-content">
          <div className="soul-orb-value">{dulledLevel >= 3 ? '??' : formatCompactValue(enemyEtherValue)}</div>
          <div className="soul-orb-label">SOUL</div>
        </div>
      </div>
    </div>
  );
};
