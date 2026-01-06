/**
 * AutoTuneSection.tsx
 * 자동 밸런스 튜닝 섹션 - SimulatorTab에서 분리
 */

import { memo, useMemo, type CSSProperties } from 'react';
import type { DetailedStats } from '../../../../simulator/analysis/detailed-stats';

interface AutoTuneSectionProps {
  stats: DetailedStats;
  scrollBoxStyle: CSSProperties;
}

interface CardAnalysisItem {
  id: string;
  name: string;
  pickRate: number;
  contribution: number;
  suggestion: string;
  type: 'nerf' | 'buff';
}

export const AutoTuneSection = memo(function AutoTuneSection({ stats, scrollBoxStyle }: AutoTuneSectionProps) {
  const { baseWinRate, targetWinRate, gapPercent, isBalanced, nerfs, buffs, hasData } = useMemo(() => {
    const baseWinRate = stats.runStats.successRate;
    const targetWinRate = 0.5;
    const gapPercent = ((baseWinRate - targetWinRate) * 100).toFixed(1);
    const isBalanced = Math.abs(baseWinRate - targetWinRate) < 0.05;

    const cardAnalysis: CardAnalysisItem[] = [];

    if (stats.cardDeepStats && stats.cardPickStats && stats.cardContributionStats) {
      for (const [cardId, deepStats] of stats.cardDeepStats) {
        const pickRate = stats.cardPickStats.pickRate[cardId] || 0;
        const contribution = stats.cardContributionStats.contribution[cardId] || 0;
        const timesOffered = stats.cardPickStats.timesOffered[cardId] || 0;

        if (timesOffered >= 10) {
          if (pickRate > 0.7 && contribution > 0.1) {
            cardAnalysis.push({
              id: cardId,
              name: deepStats.cardName,
              pickRate,
              contribution,
              suggestion: `damage/block -${Math.round(contribution * 15)}% 또는 speedCost +1`,
              type: 'nerf',
            });
          } else if (pickRate < 0.25 && contribution < -0.05) {
            cardAnalysis.push({
              id: cardId,
              name: deepStats.cardName,
              pickRate,
              contribution,
              suggestion: `damage/block +${Math.round(Math.abs(contribution) * 20)}% 또는 speedCost -1`,
              type: 'buff',
            });
          }
        }
      }
    }

    const nerfs = cardAnalysis.filter(c => c.type === 'nerf').sort((a, b) => b.contribution - a.contribution);
    const buffs = cardAnalysis.filter(c => c.type === 'buff').sort((a, b) => a.contribution - b.contribution);

    return { baseWinRate, targetWinRate, gapPercent, isBalanced, nerfs, buffs, hasData: cardAnalysis.length > 0 };
  }, [stats]);

  return (
    <>
      <h4 style={{ margin: '0 0 12px 0', color: '#f97316' }}>🔧 자동 밸런스 튜닝</h4>
      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '12px' }}>
        시뮬레이션 결과를 분석하여 구체적인 수치 조정 제안 및 A/B 테스트 자동화
      </p>

      {/* 현재 상태 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <SummaryCard
          label="현재 승률"
          value={`${(baseWinRate * 100).toFixed(1)}%`}
          color={isBalanced ? '#22c55e' : '#f59e0b'}
        />
        <SummaryCard label="목표 승률" value={`${(targetWinRate * 100).toFixed(0)}%`} color="#3b82f6" />
        <SummaryCard
          label="편차"
          value={`${parseFloat(gapPercent) > 0 ? '+' : ''}${gapPercent}%`}
          color={isBalanced ? '#22c55e' : parseFloat(gapPercent) > 0 ? '#ef4444' : '#3b82f6'}
        />
      </div>

      {/* 밸런스 상태 */}
      <div style={{
        padding: '12px',
        background: isBalanced ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        borderRadius: '8px',
        marginBottom: '16px',
        borderLeft: `4px solid ${isBalanced ? '#22c55e' : '#f59e0b'}`
      }}>
        {isBalanced ? (
          <div style={{ color: '#22c55e' }}>✅ 현재 밸런스가 목표 범위(±5%) 내에 있습니다.</div>
        ) : parseFloat(gapPercent) > 0 ? (
          <div style={{ color: '#ef4444' }}>⚠️ 플레이어 승률이 높습니다. 너프가 필요합니다.</div>
        ) : (
          <div style={{ color: '#3b82f6' }}>⚠️ 플레이어 승률이 낮습니다. 버프가 필요합니다.</div>
        )}
      </div>

      {/* 너프 후보 */}
      {nerfs.length > 0 && (
        <>
          <h5 style={{ margin: '0 0 8px 0', color: '#ef4444' }}>🔴 너프 후보 (과잉 강화 카드)</h5>
          <div style={{ ...scrollBoxStyle, marginBottom: '16px' }}>
            {nerfs.slice(0, 5).map((card, i) => (
              <CardSuggestionItem key={i} card={card} isNerf />
            ))}
          </div>
        </>
      )}

      {/* 버프 후보 */}
      {buffs.length > 0 && (
        <>
          <h5 style={{ margin: '0 0 8px 0', color: '#22c55e' }}>🟢 버프 후보 (약한 카드)</h5>
          <div style={{ ...scrollBoxStyle, marginBottom: '16px' }}>
            {buffs.slice(0, 5).map((card, i) => (
              <CardSuggestionItem key={i} card={card} isNerf={false} />
            ))}
          </div>
        </>
      )}

      {!hasData && (
        <div style={{ padding: '16px', background: '#1e293b', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
          분석할 데이터가 부족합니다. 더 많은 시뮬레이션을 실행하세요.
        </div>
      )}

      {/* 안내 메시지 */}
      <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', marginTop: '16px' }}>
        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          📌 <strong>사용 방법:</strong> 위 제안을 참고하여 <code>battleData.ts</code>의 카드 데이터를 수정한 후 다시 시뮬레이션을 실행하세요.
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
          상세 분석 모듈: <code>src/simulator/analysis/balance-auto-tuner.ts</code>
        </div>
      </div>
    </>
  );
});

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '12px', background: '#1e293b', borderRadius: '8px', textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>{value}</div>
    </div>
  );
}

function CardSuggestionItem({ card, isNerf }: { card: CardAnalysisItem; isNerf: boolean }) {
  const color = isNerf ? '#ef4444' : '#22c55e';
  return (
    <div style={{ padding: '8px', background: '#1e293b', borderRadius: '6px', marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>{card.name}</span>
        <span style={{ fontSize: '0.75rem', color }}>
          픽률 {(card.pickRate * 100).toFixed(0)}% | 기여도 {isNerf ? '+' : ''}{(card.contribution * 100).toFixed(1)}%
        </span>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
        💡 제안: {card.suggestion}
      </div>
    </div>
  );
}

export default AutoTuneSection;
