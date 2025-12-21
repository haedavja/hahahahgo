/**
 * EnemyUnitsDisplay.jsx
 *
 * 다중 적 유닛 표시 및 타겟팅 UI
 * 각 유닛은 개별 HP/방어력을 가지며 클릭으로 타겟 선택 가능
 */

import { TokenDisplay } from './TokenDisplay';

export const EnemyUnitsDisplay = ({
  units = [],
  selectedTargetUnit,
  onSelectUnit,
  previewDamage,
  dulledLevel = 0,
  phase,
  enemyHit,
  enemyBlockAnim,
  soulShatter,
  // 에테르 관련 props
  enemyEtherValue = 0,
  enemyEtherCapacity = 300,
  enemyTransferPulse = false,
  formatCompactValue,
}) => {
  if (!units || units.length === 0) return null;

  // 살아있는 유닛만 표시
  const aliveUnits = units.filter(u => u.hp > 0);

  if (aliveUnits.length === 0) return null;

  // 유닛이 1개면 기존 방식 유지 (선택 불필요)
  const showTargeting = aliveUnits.length > 1;

  // 에테르 스케일 계산
  const enemySoulScale = Math.max(0.4, Math.min(1.3, enemyEtherCapacity > 0 ? enemyEtherValue / enemyEtherCapacity : 1));

  return (
    <>
      {/* 유닛 목록 - 에테르 구슬 왼쪽 */}
      <div className="enemy-units-container" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'fixed',
        top: '420px',
        right: '550px',
        zIndex: 100,
        maxWidth: '320px',
      }}>
      {aliveUnits.map((unit, idx) => {
        const isSelected = unit.unitId === selectedTargetUnit;
        const isTargetable = phase === 'select' || phase === 'respond';
        const showDamage = isTargetable && isSelected && previewDamage.value > 0;
        const hideVitals = dulledLevel >= 3;

        return (
          <div
            key={unit.unitId}
            className={`enemy-unit ${isSelected ? 'selected' : ''} ${showTargeting && isTargetable ? 'targetable' : ''}`}
            onClick={() => showTargeting && isTargetable && onSelectUnit(unit.unitId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '12px 16px',
              background: isSelected
                ? 'rgba(239, 68, 68, 0.2)'
                : 'rgba(30, 41, 59, 0.8)',
              border: isSelected
                ? '2px solid #ef4444'
                : '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '12px',
              cursor: showTargeting && isTargetable ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              boxShadow: isSelected
                ? '0 0 20px rgba(239, 68, 68, 0.3)'
                : '0 4px 12px rgba(0, 0, 0, 0.3)',
              transform: soulShatter && isSelected ? 'scale(0.95)' : 'scale(1)',
              opacity: soulShatter && isSelected ? 0.7 : 1,
            }}
          >
            {/* 유닛 이모지 */}
            <div
              className={`unit-emoji ${enemyHit && isSelected ? 'hit-animation' : ''}`}
              style={{
                fontSize: '48px',
                filter: unit.hp <= 0 ? 'grayscale(1)' : 'none',
              }}
            >
              {unit.emoji || '👾'}
            </div>

            {/* 유닛 정보 */}
            <div style={{ flex: 1, minWidth: '180px' }}>
              {/* 이름 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}>
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: '#e2e8f0',
                }}>
                  {unit.name}
                  {unit.count > 1 && (
                    <span style={{
                      marginLeft: '6px',
                      fontSize: '0.85rem',
                      color: '#94a3b8',
                    }}>
                      ×{unit.count}
                    </span>
                  )}
                </span>
                {isSelected && showTargeting && (
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#ef4444',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    🎯 TARGET
                  </span>
                )}
              </div>

              {/* HP/방어력 텍스트 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '4px',
                fontSize: '0.9rem',
              }}>
                {showDamage && (
                  <span
                    className={`${previewDamage.lethal ? 'lethal' : ''} ${previewDamage.overkill ? 'overkill' : ''}`}
                    style={{ color: '#fbbf24', fontWeight: '600' }}
                  >
                    🗡️-{previewDamage.value}
                    {previewDamage.lethal && (previewDamage.overkill ? '☠️' : '💀')}
                  </span>
                )}
                {!hideVitals && unit.block > 0 && (
                  <span
                    className={enemyBlockAnim && isSelected ? 'block-animation' : ''}
                    style={{ color: '#60a5fa', fontWeight: '600' }}
                  >
                    🛡️{unit.block}
                  </span>
                )}
                <span style={{ color: '#f87171', fontWeight: '600' }}>
                  ❤️ {hideVitals ? '??' : `${unit.hp}/${unit.maxHp}`}
                </span>
              </div>

              {/* HP 바 */}
              <div
                className="hp-bar-enhanced"
                style={{
                  width: '100%',
                  height: '10px',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '5px',
                }}
              >
                <div
                  className="hp-fill"
                  style={{
                    width: hideVitals ? '0%' : `${(unit.hp / unit.maxHp) * 100}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
                {!hideVitals && unit.block > 0 && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${Math.min((unit.block / unit.maxHp) * 100, 100)}%`,
                    background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
                    borderRight: '2px solid #60a5fa',
                    transition: 'width 0.3s ease',
                  }} />
                )}
              </div>

              {/* 토큰 표시 */}
              <div style={{ marginTop: '6px', minHeight: '24px' }}>
                <TokenDisplay entity={unit} position="enemy" />
              </div>
            </div>
          </div>
        );
      })}

        {/* 타겟팅 힌트 */}
        {showTargeting && (phase === 'select' || phase === 'respond') && (
          <div style={{
            fontSize: '0.75rem',
            color: '#94a3b8',
            textAlign: 'center',
            padding: '4px 8px',
            background: 'rgba(30, 41, 59, 0.6)',
            borderRadius: '6px',
          }}>
            💡 클릭하여 공격 대상 선택
          </div>
        )}
      </div>

      {/* 에테르 구슬 (영혼) - 단일 유닛과 같은 위치 */}
      <div
        className={`soul-orb ${enemyTransferPulse ? 'pulse' : ''} ${soulShatter ? 'shatter' : ''}`}
        title={dulledLevel >= 3 ? '?? / ??' : `${enemyEtherValue.toLocaleString()} / ${enemyEtherCapacity.toLocaleString()}`}
        style={{
          position: 'fixed',
          top: '470px',
          right: '300px',
        }}
      >
        <div
          className={`soul-orb-shell ${enemyTransferPulse ? 'pulse' : ''} ${soulShatter ? 'shatter' : ''}`}
          style={{ transform: `scale(${enemySoulScale})` }}
        />
        <div className="soul-orb-content">
          <div className="soul-orb-value">
            {dulledLevel >= 3 ? '??' : (formatCompactValue ? formatCompactValue(enemyEtherValue) : enemyEtherValue)}
          </div>
          <div className="soul-orb-label">SOUL</div>
        </div>
      </div>
    </>
  );
};
