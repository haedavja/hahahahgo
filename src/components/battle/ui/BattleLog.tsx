/**
 * BattleLog.tsx
 *
 * 전투 로그 표시 컴포넌트
 * dangerouslySetInnerHTML 제거하고 안전한 텍스트 렌더링 사용
 * 최적화: React.memo + 스타일 상수 추출
 */

import { FC, RefObject, memo, useMemo } from 'react';
import type { CSSProperties } from 'react';

// =====================
// 스타일 상수
// =====================

const CONTAINER_STYLE: CSSProperties = {
  marginTop: '20px',
  paddingTop: '16px',
  borderTop: '2px solid rgba(148, 163, 184, 0.3)'
};

const HEADER_STYLE: CSSProperties = {
  fontSize: '15px',
  fontWeight: 'bold',
  color: '#f8fafc',
  marginBottom: '12px'
};

const LOG_CONTAINER_STYLE: CSSProperties = {
  height: '360px',
  minHeight: '360px',
  maxHeight: '360px',
  overflowY: 'auto'
};

const LOG_LINE_BASE_STYLE: CSSProperties = {
  fontSize: '13px',
  marginBottom: '6px',
  lineHeight: '1.5'
};

// 로그 라인 타입별 스타일 (매 렌더링마다 객체 생성 방지)
const LOG_LINE_STYLES: Record<'player' | 'enemy' | 'neutral', CSSProperties> = {
  player: { ...LOG_LINE_BASE_STYLE, color: '#60a5fa' },
  enemy: { ...LOG_LINE_BASE_STYLE, color: '#fca5a5' },
  neutral: { ...LOG_LINE_BASE_STYLE, color: '#cbd5e1' },
};

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
 * 로그 라인 스타일 반환 (미리 생성된 스타일 객체 사용)
 */
const getLogStyle = (type: 'player' | 'enemy' | 'neutral'): CSSProperties => LOG_LINE_STYLES[type];

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

  // 필터링된 로그 메모이제이션
  const filteredLog = useMemo(() => log.filter(shouldShowLogLine), [log]);

  return (
    <div style={CONTAINER_STYLE}>
      <div style={HEADER_STYLE}>
        🎮 전투 로그
      </div>
      <div ref={logContainerRef} style={LOG_CONTAINER_STYLE}>
        {filteredLog.map((line, i) => {
          const lineType = classifyLogLine(line);
          return (
            <div
              key={`${i}-${line.substring(0, 20)}`}
              style={getLogStyle(lineType)}
            >
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
});
