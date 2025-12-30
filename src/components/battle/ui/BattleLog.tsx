/**
 * BattleLog.tsx
 *
 * 전투 로그 표시 컴포넌트
 * dangerouslySetInnerHTML 제거하고 안전한 텍스트 렌더링 사용
 */

import { FC, RefObject, memo } from 'react';

interface BattleLogProps {
  phase: string;
  log: string[] | null;
  logContainerRef: RefObject<HTMLDivElement | null>;
  showAlways?: boolean;
}

/**
 * 로그 라인 분류 (플레이어/적/일반)
 */
const classifyLogLine = (line: string): 'player' | 'enemy' | 'neutral' => {
  const isPlayerAction = line.includes('플레이어(') || line.startsWith('🔵') || line.includes('플레이어 •');
  const isEnemyAction = line.includes('-> 플레이어') || line.startsWith('👾') || (!isPlayerAction && line.includes(' •'));

  if (isPlayerAction) return 'player';
  if (isEnemyAction) return 'enemy';
  return 'neutral';
};

/**
 * 로그 라인 색상 반환
 */
const getLogColor = (type: 'player' | 'enemy' | 'neutral'): string => {
  switch (type) {
    case 'player': return '#60a5fa';
    case 'enemy': return '#fca5a5';
    default: return '#cbd5e1';
  }
};

/**
 * 로그 필터링 조건
 */
const shouldShowLogLine = (line: string): boolean => {
  if (line.includes('게임 시작') || line.includes('적 성향 힌트')) return false;
  return true;
};

export const BattleLog: FC<BattleLogProps> = memo(({ phase, log, logContainerRef, showAlways = false }) => {
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
        {log.filter(shouldShowLogLine).map((line, i) => {
          const lineType = classifyLogLine(line);
          const color = getLogColor(lineType);
          return (
            <div
              key={i}
              style={{
                fontSize: '13px',
                color,
                marginBottom: '6px',
                lineHeight: '1.5'
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
});
