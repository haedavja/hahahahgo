/**
 * BattleLog.jsx
 *
 * 전투 로그 표시 컴포넌트
 */

export const BattleLog = ({ phase, log, logContainerRef, showAlways = false }) => {
  // showAlways가 true이면 항상 표시 (패배 시에도 로그 유지)
  if (!showAlways && phase !== 'resolve') {
    return null;
  }
  if (!log || log.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px solid rgba(148, 163, 184, 0.3)' }}>
      <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '12px' }}>
        🎮 전투 로그
      </div>
      <div ref={logContainerRef} style={{ height: '360px', minHeight: '360px', maxHeight: '360px', overflowY: 'auto' }}>
        {log.filter(line => {
          // 불필요한 로그 제거
          if (line.includes('게임 시작') || line.includes('적 성향 힌트')) return false;
          return true;
        }).map((line, i) => {
          // 적 행동: "-> 플레이어" 패턴 (적이 플레이어를 공격)
          const isEnemyAction = line.includes('-> 플레이어');
          // 플레이어 행동: "플레이어 ->" 패턴 (플레이어가 적을 공격)
          const isPlayerAction = line.includes('플레이어 ->') || line.includes('플레이어 •');
          return (
            <div key={i} style={{
              fontSize: '13px',
              color: isEnemyAction ? '#fca5a5' : isPlayerAction ? '#60a5fa' : '#cbd5e1',
              marginBottom: '6px',
              lineHeight: '1.5'
            }} dangerouslySetInnerHTML={{ __html: line }}>
            </div>
          );
        })}
      </div>
    </div>
  );
};
