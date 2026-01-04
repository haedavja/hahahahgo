/**
 * @file StatsWidget.tsx
 * @description 게임 우측 상단 통계 버튼 위젯
 */

import { useState, useCallback, memo } from 'react';
import type { CSSProperties } from 'react';
import { getCurrentStats, getDetailedStats } from '../../../simulator/bridge/stats-bridge';

const WIDGET_STYLE: CSSProperties = {
  position: 'fixed',
  top: '12px',
  right: '12px',
  zIndex: 9999,
};

const BUTTON_STYLE: CSSProperties = {
  padding: '8px 12px',
  background: 'rgba(30, 41, 59, 0.95)',
  border: '1px solid #475569',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

const MODAL_OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  zIndex: 10000,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const MODAL_CONTENT_STYLE: CSSProperties = {
  background: '#1e293b',
  borderRadius: '12px',
  padding: '24px',
  maxWidth: '600px',
  maxHeight: '80vh',
  overflow: 'auto',
  color: '#e2e8f0',
  minWidth: '400px',
};

const STAT_ROW_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '8px 0',
  borderBottom: '1px solid #334155',
};

const STAT_LABEL_STYLE: CSSProperties = {
  color: '#94a3b8',
};

const STAT_VALUE_STYLE: CSSProperties = {
  fontWeight: 'bold',
  color: '#fbbf24',
};

const COPY_BUTTON_STYLE: CSSProperties = {
  marginTop: '16px',
  padding: '10px 20px',
  background: '#3b82f6',
  border: 'none',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
  cursor: 'pointer',
  width: '100%',
};

const CLOSE_BUTTON_STYLE: CSSProperties = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  fontSize: '20px',
  cursor: 'pointer',
};

export const StatsWidget = memo(function StatsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const stats = getCurrentStats();
  const detailed = getDetailedStats();

  const handleCopy = useCallback(() => {
    const text = formatStatsForCopy(stats, detailed);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [stats, detailed]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const winRate = stats.battles > 0 ? ((stats.wins / stats.battles) * 100).toFixed(1) : '0';
  const soulRate = stats.wins > 0 ? ((stats.soulDestructions / stats.wins) * 100).toFixed(1) : '0';
  const physRate = stats.wins > 0 ? ((stats.physicalDestructions / stats.wins) * 100).toFixed(1) : '0';

  return (
    <div style={WIDGET_STYLE}>
      <button
        onClick={() => setIsOpen(true)}
        style={BUTTON_STYLE}
        title="게임 통계 보기"
      >
        <span>📊</span>
        <span>{stats.wins}승 {stats.losses}패</span>
      </button>

      {isOpen && (
        <div style={MODAL_OVERLAY_STYLE} onClick={handleClose}>
          <div
            style={{ ...MODAL_CONTENT_STYLE, position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button style={CLOSE_BUTTON_STYLE} onClick={handleClose}>✕</button>

            <h2 style={{ margin: '0 0 16px', color: '#22c55e' }}>📊 게임 통계</h2>

            <div style={STAT_ROW_STYLE}>
              <span style={STAT_LABEL_STYLE}>총 전투</span>
              <span style={STAT_VALUE_STYLE}>{stats.battles}회</span>
            </div>
            <div style={STAT_ROW_STYLE}>
              <span style={STAT_LABEL_STYLE}>승리 / 패배</span>
              <span style={STAT_VALUE_STYLE}>
                <span style={{ color: '#22c55e' }}>{stats.wins}</span>
                {' / '}
                <span style={{ color: '#ef4444' }}>{stats.losses}</span>
              </span>
            </div>
            <div style={STAT_ROW_STYLE}>
              <span style={STAT_LABEL_STYLE}>승률</span>
              <span style={{ ...STAT_VALUE_STYLE, color: Number(winRate) >= 50 ? '#22c55e' : '#ef4444' }}>
                {winRate}%
              </span>
            </div>
            <div style={STAT_ROW_STYLE}>
              <span style={STAT_LABEL_STYLE}>평균 턴</span>
              <span style={STAT_VALUE_STYLE}>{stats.avgTurns.toFixed(1)}</span>
            </div>
            <div style={STAT_ROW_STYLE}>
              <span style={STAT_LABEL_STYLE}>평균 가한 피해</span>
              <span style={STAT_VALUE_STYLE}>{stats.avgDamageDealt.toFixed(1)}</span>
            </div>
            <div style={STAT_ROW_STYLE}>
              <span style={STAT_LABEL_STYLE}>평균 받은 피해</span>
              <span style={STAT_VALUE_STYLE}>{stats.avgDamageTaken.toFixed(1)}</span>
            </div>

            {stats.wins > 0 && (
              <>
                <h3 style={{ margin: '16px 0 8px', color: '#a855f7', fontSize: '14px' }}>
                  💀 승리 방식
                </h3>
                <div style={STAT_ROW_STYLE}>
                  <span style={STAT_LABEL_STYLE}>영혼파괴 (에테르)</span>
                  <span style={{ ...STAT_VALUE_STYLE, color: '#a855f7' }}>
                    {stats.soulDestructions}회 ({soulRate}%)
                  </span>
                </div>
                <div style={STAT_ROW_STYLE}>
                  <span style={STAT_LABEL_STYLE}>육체파괴 (HP)</span>
                  <span style={{ ...STAT_VALUE_STYLE, color: '#ef4444' }}>
                    {stats.physicalDestructions}회 ({physRate}%)
                  </span>
                </div>
              </>
            )}

            <h3 style={{ margin: '16px 0 8px', color: '#3b82f6', fontSize: '14px' }}>
              🏃 런 통계
            </h3>
            <div style={STAT_ROW_STYLE}>
              <span style={STAT_LABEL_STYLE}>총 런</span>
              <span style={STAT_VALUE_STYLE}>{stats.totalRuns}회</span>
            </div>
            <div style={STAT_ROW_STYLE}>
              <span style={STAT_LABEL_STYLE}>클리어</span>
              <span style={{ ...STAT_VALUE_STYLE, color: '#22c55e' }}>{stats.successfulRuns}회</span>
            </div>

            <button onClick={handleCopy} style={COPY_BUTTON_STYLE}>
              {copied ? '✅ 복사됨!' : '📋 통계 복사하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

function formatStatsForCopy(
  stats: ReturnType<typeof getCurrentStats>,
  detailed: ReturnType<typeof getDetailedStats>
): string {
  const lines: string[] = [];

  lines.push('# 게임 통계');
  lines.push('');
  lines.push('## 전투 통계');
  lines.push(`- 총 전투: ${stats.battles}회`);
  lines.push(`- 승리: ${stats.wins}회`);
  lines.push(`- 패배: ${stats.losses}회`);
  lines.push(`- 승률: ${stats.battles > 0 ? ((stats.wins / stats.battles) * 100).toFixed(1) : '0'}%`);
  lines.push(`- 평균 턴: ${stats.avgTurns.toFixed(1)}`);
  lines.push(`- 평균 가한 피해: ${stats.avgDamageDealt.toFixed(1)}`);
  lines.push(`- 평균 받은 피해: ${stats.avgDamageTaken.toFixed(1)}`);

  if (stats.wins > 0) {
    lines.push('');
    lines.push('## 승리 방식');
    const soulRate = ((stats.soulDestructions / stats.wins) * 100).toFixed(1);
    const physRate = ((stats.physicalDestructions / stats.wins) * 100).toFixed(1);
    lines.push(`- 영혼파괴: ${stats.soulDestructions}회 (${soulRate}%)`);
    lines.push(`- 육체파괴: ${stats.physicalDestructions}회 (${physRate}%)`);
  }

  lines.push('');
  lines.push('## 런 통계');
  lines.push(`- 총 런: ${stats.totalRuns}회`);
  lines.push(`- 클리어: ${stats.successfulRuns}회`);

  // 몬스터별 통계
  if (detailed.monsterStats && detailed.monsterStats.size > 0) {
    lines.push('');
    lines.push('## 몬스터별 통계');
    const sortedMonsters = Array.from(detailed.monsterStats.entries())
      .sort((a, b) => b[1].encounters - a[1].encounters)
      .slice(0, 10);

    for (const [id, data] of sortedMonsters) {
      const winRate = data.encounters > 0 ? ((data.wins / data.encounters) * 100).toFixed(1) : '0';
      lines.push(`- ${id}: ${data.encounters}전 ${data.wins}승 (${winRate}%)`);
    }
  }

  return lines.join('\n');
}

export default StatsWidget;
