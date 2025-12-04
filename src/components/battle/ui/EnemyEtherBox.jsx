/**
 * EnemyEtherBox.jsx
 *
 * 적 에테르 계산 표시 컴포넌트
 */

export const EnemyEtherBox = ({
  enemyCombo,
  battle,
  insightReveal,
  enemyCurrentDeflation,
  enemyEtherCalcPhase,
  enemyTurnEtherAccumulated,
  COMBO_MULTIPLIERS
}) => {
  if (!enemyCombo || ((battle.phase === 'select') && ((insightReveal?.level || 0) === 0)) || !(battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve')) {
    return null;
  }

  return (
    <div
      className="enemy-ether-box"
      style={{
        position: 'fixed',
        top: '330px',
        right: '510px',
        padding: '0',
        borderRadius: '12px',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        minHeight: '140px',
        pointerEvents: 'none',
        textAlign: 'center'
      }}
    >
      <div className="combo-display">
        <div style={{
          fontSize: '1.92rem',
          fontWeight: 'bold',
          color: '#fbbf24',
          marginBottom: '2px',
          height: '2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <span>{enemyCombo.name}</span>
          {enemyCurrentDeflation && (
            <div style={{
              position: 'absolute',
              right: 'calc(50% + 120px)',
              fontSize: enemyEtherCalcPhase === 'deflation' ? '1.1rem' : '0.9rem',
              fontWeight: 'bold',
              color: '#fca5a5',
              background: 'linear-gradient(135deg, rgba(252, 165, 165, 0.25), rgba(252, 165, 165, 0.1))',
              border: '1.5px solid rgba(252, 165, 165, 0.5)',
              borderRadius: '6px',
              padding: '4px 10px',
              letterSpacing: '0.05em',
              boxShadow: '0 0 10px rgba(252, 165, 165, 0.3), inset 0 0 5px rgba(252, 165, 165, 0.15)',
              transition: 'font-size 0.3s ease, transform 0.3s ease',
              transform: enemyEtherCalcPhase === 'deflation' ? 'scale(1.2)' : 'scale(1)',
              textShadow: enemyEtherCalcPhase === 'deflation' ? '0 0 15px rgba(252, 165, 165, 0.6)' : 'none'
            }}>
              -{Math.round((1 - enemyCurrentDeflation.multiplier) * 100)}%
            </div>
          )}
        </div>
        <div style={{
          fontSize: enemyEtherCalcPhase === 'sum' ? '2rem' : '1.5rem',
          color: '#fbbf24',
          fontWeight: 'bold',
          letterSpacing: '0.2em',
          marginBottom: '2px',
          transition: 'font-size 0.3s ease, transform 0.3s ease',
          transform: enemyEtherCalcPhase === 'sum' ? 'scale(1.3)' : 'scale(1)',
          textShadow: enemyEtherCalcPhase === 'sum' ? '0 0 20px #fbbf24' : 'none',
          visibility: battle.phase === 'resolve' ? 'visible' : 'hidden',
          height: '1.8rem'
        }}>
          + {enemyTurnEtherAccumulated.toString().split('').join(' ')} P T
        </div>
        <div style={{
          fontSize: enemyEtherCalcPhase === 'multiply' ? '1.6rem' : '1.32rem',
          color: '#fbbf24',
          fontWeight: 'bold',
          letterSpacing: '0.15em',
          minWidth: '400px',
          height: '2rem',
          marginTop: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          transition: 'font-size 0.3s ease, transform 0.3s ease',
          transform: enemyEtherCalcPhase === 'multiply' ? 'scale(1.3)' : 'scale(1)',
          textShadow: enemyEtherCalcPhase === 'multiply' ? '0 0 20px #fbbf24' : 'none'
        }}>
          <span>× {((enemyCombo && COMBO_MULTIPLIERS[enemyCombo.name]) || 1).toFixed(2).split('').join(' ')}</span>
        </div>
      </div>
    </div>
  );
};
