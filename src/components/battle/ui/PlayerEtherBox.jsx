/**
 * PlayerEtherBox.jsx
 *
 * 플레이어 에테르 계산 표시 컴포넌트
 */

export const PlayerEtherBox = ({
  currentCombo,
  battle,
  currentDeflation,
  etherCalcPhase,
  turnEtherAccumulated,
  etherPulse,
  finalComboMultiplier,
  multiplierPulse
}) => {
  if (!currentCombo || !(battle.phase === 'select' || battle.phase === 'respond' || battle.phase === 'resolve')) {
    return null;
  }

  return (
    <div
      className="player-ether-box"
      style={{
        position: 'absolute',
        top: '70px',
        left: '40px',
        padding: '0',
        borderRadius: '12px',
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        minHeight: '140px',
        pointerEvents: 'none'
      }}
    >
      <div className="combo-display" style={{ textAlign: 'center' }}>
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
          <span>{currentCombo.name}</span>
          {currentDeflation && (
            <div style={{
              position: 'absolute',
              left: 'calc(50% + 120px)',
              fontSize: etherCalcPhase === 'deflation' ? '1.1rem' : '0.9rem',
              fontWeight: 'bold',
              color: '#fca5a5',
              background: 'linear-gradient(135deg, rgba(252, 165, 165, 0.25), rgba(252, 165, 165, 0.1))',
              border: '1.5px solid rgba(252, 165, 165, 0.5)',
              borderRadius: '6px',
              padding: '4px 10px',
              letterSpacing: '0.05em',
              boxShadow: '0 0 10px rgba(252, 165, 165, 0.3), inset 0 0 5px rgba(252, 165, 165, 0.15)',
              transition: 'font-size 0.3s ease, transform 0.3s ease',
              transform: etherCalcPhase === 'deflation' ? 'scale(1.2)' : 'scale(1)',
              textShadow: etherCalcPhase === 'deflation' ? '0 0 15px rgba(252, 165, 165, 0.6)' : 'none'
            }}>
              -{Math.round((1 - currentDeflation.multiplier) * 100)}%
            </div>
          )}
        </div>
        <div style={{
          fontSize: etherPulse ? '1.8rem' : (etherCalcPhase === 'sum' ? '2rem' : '1.5rem'),
          color: '#fbbf24',
          fontWeight: 'bold',
          letterSpacing: '0.2em',
          marginBottom: '2px',
          transition: 'font-size 0.3s ease, transform 0.3s ease',
          transform: etherPulse ? 'scale(1.2)' : (etherCalcPhase === 'sum' ? 'scale(1.3)' : 'scale(1)'),
          textShadow: etherCalcPhase === 'sum' ? '0 0 20px #fbbf24' : 'none',
          visibility: battle.phase === 'resolve' ? 'visible' : 'hidden',
          height: '1.8rem'
        }}>
          + {turnEtherAccumulated.toString().split('').join(' ')} P T
        </div>
        <div style={{
          fontSize: etherCalcPhase === 'multiply' ? '1.6rem' : '1.32rem',
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
          transform: (etherCalcPhase === 'multiply' || multiplierPulse) ? 'scale(1.3)' : 'scale(1)',
          textShadow: (etherCalcPhase === 'multiply' || multiplierPulse) ? '0 0 20px #fbbf24' : 'none'
        }}>
          <span>× {finalComboMultiplier.toFixed(2).split('').join(' ')}</span>
        </div>
      </div>
    </div>
  );
};
