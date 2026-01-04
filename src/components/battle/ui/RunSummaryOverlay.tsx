/**
 * RunSummaryOverlay.tsx
 *
 * 런 종료 시 통계를 보여주는 오버레이 컴포넌트
 * 승리/패배 모두에서 사용
 */

import { FC, memo, useCallback, useState } from 'react';
import type { CSSProperties } from 'react';
import { useGameStore } from '../../../state/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { RELICS } from '../../../data/relics';
import { CARD_LIBRARY } from '../../../data/cards';
import { getCurrentStats, getDetailedStats } from '../../../simulator/bridge/stats-bridge';

// =====================
// 스타일 상수
// =====================

const OVERLAY_STYLE: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.85)',
  zIndex: 9999,
  pointerEvents: 'auto',
  overflow: 'auto',
  padding: '20px'
};

const CONTENT_STYLE: CSSProperties = {
  maxWidth: '600px',
  width: '100%',
  background: 'rgba(30, 41, 59, 0.95)',
  borderRadius: '16px',
  border: '2px solid rgba(148, 163, 184, 0.3)',
  padding: '24px',
  maxHeight: '90vh',
  overflowY: 'auto'
};

const TITLE_STYLE: CSSProperties = {
  fontSize: '32px',
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: '20px'
};

const SECTION_STYLE: CSSProperties = {
  marginBottom: '16px',
  padding: '12px',
  background: 'rgba(0, 0, 0, 0.3)',
  borderRadius: '8px'
};

const SECTION_TITLE_STYLE: CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#94a3b8',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const STAT_ROW_STYLE: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '4px 0',
  fontSize: '15px'
};

const STAT_LABEL_STYLE: CSSProperties = {
  color: '#cbd5e1'
};

const STAT_VALUE_STYLE: CSSProperties = {
  color: '#f1f5f9',
  fontWeight: '600'
};

const TAG_CONTAINER_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  marginTop: '4px'
};

const TAG_STYLE: CSSProperties = {
  padding: '4px 8px',
  background: 'rgba(99, 102, 241, 0.2)',
  border: '1px solid rgba(99, 102, 241, 0.4)',
  borderRadius: '4px',
  fontSize: '12px',
  color: '#a5b4fc'
};

const RELIC_TAG_STYLE: CSSProperties = {
  ...TAG_STYLE,
  background: 'rgba(251, 191, 36, 0.2)',
  border: '1px solid rgba(251, 191, 36, 0.4)',
  color: '#fcd34d'
};

const BUTTON_ROW_STYLE: CSSProperties = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'center',
  marginTop: '20px'
};

const COPY_BUTTON_STYLE: CSSProperties = {
  fontSize: '16px',
  padding: '12px 24px',
  background: 'rgba(99, 102, 241, 0.2)',
  border: '2px solid #6366f1',
  color: '#a5b4fc',
  borderRadius: '8px',
  cursor: 'pointer'
};

const EXIT_BUTTON_STYLE: CSSProperties = {
  fontSize: '16px',
  padding: '12px 32px'
};

const COPIED_TOAST_STYLE: CSSProperties = {
  position: 'fixed',
  bottom: '100px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'rgba(34, 197, 94, 0.9)',
  color: 'white',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600',
  zIndex: 10000
};

const TOGGLE_BUTTON_STYLE: CSSProperties = {
  width: '100%',
  padding: '10px',
  background: 'rgba(59, 130, 246, 0.2)',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  borderRadius: '8px',
  color: '#93c5fd',
  fontSize: '14px',
  cursor: 'pointer',
  marginTop: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

const STATS_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '8px',
  marginTop: '8px'
};

const MINI_STAT_STYLE: CSSProperties = {
  padding: '8px',
  background: 'rgba(0, 0, 0, 0.3)',
  borderRadius: '6px',
  textAlign: 'center'
};

const MINI_STAT_LABEL: CSSProperties = {
  fontSize: '11px',
  color: '#94a3b8',
  marginBottom: '2px'
};

const MINI_STAT_VALUE: CSSProperties = {
  fontSize: '16px',
  fontWeight: 'bold',
  color: '#f1f5f9'
};

interface RunSummaryOverlayProps {
  result: 'victory' | 'defeat';
  onExit: () => void;
}

/**
 * 런 요약 통계를 포맷팅
 */
function formatRunSummary(data: {
  result: 'victory' | 'defeat';
  layer: number;
  hp: number;
  maxHp: number;
  gold: number;
  relics: string[];
  deck: string[];
  traits: string[];
  battlesWon: number;
}): string {
  const resultEmoji = data.result === 'victory' ? '🏆' : '💀';
  const resultText = data.result === 'victory' ? '클리어' : '패배';

  const lines: string[] = [
    `${resultEmoji} 하하하GO ${resultText}`,
    ``,
    `📊 런 결과`,
    `도달층: ${data.layer}/11`,
    `HP: ${data.hp}/${data.maxHp}`,
    `골드: ${data.gold}`,
    `전투 승리: ${data.battlesWon}회`,
    ``
  ];

  if (data.relics.length > 0) {
    const relicNames = data.relics.map(id => RELICS[id]?.name || id);
    lines.push(`🔮 상징 (${data.relics.length})`);
    lines.push(relicNames.join(', '));
    lines.push(``);
  }

  if (data.deck.length > 0) {
    // 카드 개수별로 그룹화
    const cardCounts: Record<string, number> = {};
    data.deck.forEach(id => {
      const name = CARD_LIBRARY[id]?.name || id;
      cardCounts[name] = (cardCounts[name] || 0) + 1;
    });

    const cardList = Object.entries(cardCounts)
      .map(([name, count]) => count > 1 ? `${name}x${count}` : name)
      .join(', ');

    lines.push(`🃏 덱 (${data.deck.length}장)`);
    lines.push(cardList);
    lines.push(``);
  }

  if (data.traits.length > 0) {
    lines.push(`✨ 특성 (${data.traits.length})`);
    lines.push(data.traits.join(', '));
  }

  return lines.join('\n');
}

export const RunSummaryOverlay: FC<RunSummaryOverlayProps> = memo(({ result, onExit }) => {
  const [showCopied, setShowCopied] = useState(false);
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  // 통계 데이터
  const simpleStats = getCurrentStats();
  const detailedStats = getDetailedStats();

  // 게임 상태에서 통계 수집
  const {
    layer,
    hp,
    maxHp,
    gold,
    relics,
    deck,
    traits,
    lastBattleResult
  } = useGameStore(useShallow(state => ({
    layer: state.map.baseLayer ?? 1,
    hp: state.playerHp,
    maxHp: state.maxHp,
    gold: state.resources.gold,
    relics: state.relics,
    deck: state.characterBuild?.cards?.map(c => c.id) || [],
    traits: state.playerTraits || [],
    lastBattleResult: state.lastBattleResult
  })));

  // 전투 승리 횟수 계산 (간단하게 현재 층에서 추정)
  const battlesWon = result === 'victory' ? layer : Math.max(0, layer - 1);

  const handleCopy = useCallback(async () => {
    const summary = formatRunSummary({
      result,
      layer,
      hp,
      maxHp,
      gold,
      relics,
      deck,
      traits,
      battlesWon
    });

    try {
      await navigator.clipboard.writeText(summary);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      // 클립보드 API 실패 시 fallback
      const textarea = document.createElement('textarea');
      textarea.value = summary;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  }, [result, layer, hp, maxHp, gold, relics, deck, traits, battlesWon]);

  const titleColor = result === 'victory' ? '#22c55e' : '#ef4444';
  const titleEmoji = result === 'victory' ? '🏆' : '💀';
  const titleText = result === 'victory' ? '클리어!' : '패배...';

  return (
    <div style={OVERLAY_STYLE}>
      <div style={CONTENT_STYLE}>
        {/* 제목 */}
        <div style={{ ...TITLE_STYLE, color: titleColor }}>
          {titleEmoji} {titleText}
        </div>

        {/* 기본 통계 */}
        <div style={SECTION_STYLE}>
          <div style={SECTION_TITLE_STYLE}>런 결과</div>
          <div style={STAT_ROW_STYLE}>
            <span style={STAT_LABEL_STYLE}>도달층</span>
            <span style={STAT_VALUE_STYLE}>{layer} / 11</span>
          </div>
          <div style={STAT_ROW_STYLE}>
            <span style={STAT_LABEL_STYLE}>HP</span>
            <span style={{ ...STAT_VALUE_STYLE, color: hp > 0 ? '#22c55e' : '#ef4444' }}>
              {hp} / {maxHp}
            </span>
          </div>
          <div style={STAT_ROW_STYLE}>
            <span style={STAT_LABEL_STYLE}>골드</span>
            <span style={{ ...STAT_VALUE_STYLE, color: '#fcd34d' }}>{gold}</span>
          </div>
          <div style={STAT_ROW_STYLE}>
            <span style={STAT_LABEL_STYLE}>전투 승리</span>
            <span style={STAT_VALUE_STYLE}>{battlesWon}회</span>
          </div>
        </div>

        {/* 상징 */}
        {relics.length > 0 && (
          <div style={SECTION_STYLE}>
            <div style={SECTION_TITLE_STYLE}>상징 ({relics.length})</div>
            <div style={TAG_CONTAINER_STYLE}>
              {relics.map(id => (
                <span key={id} style={RELIC_TAG_STYLE}>
                  {RELICS[id]?.emoji || '🔮'} {RELICS[id]?.name || id}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 덱 */}
        {deck.length > 0 && (
          <div style={SECTION_STYLE}>
            <div style={SECTION_TITLE_STYLE}>덱 ({deck.length}장)</div>
            <div style={TAG_CONTAINER_STYLE}>
              {(() => {
                // 카드 개수별 그룹화
                const cardCounts: Record<string, { count: number; name: string }> = {};
                deck.forEach(id => {
                  const card = CARD_LIBRARY[id];
                  const name = card?.name || id;
                  if (!cardCounts[id]) {
                    cardCounts[id] = { count: 0, name };
                  }
                  cardCounts[id].count++;
                });

                return Object.entries(cardCounts).map(([id, { count, name }]) => (
                  <span key={id} style={TAG_STYLE}>
                    {name}{count > 1 ? ` x${count}` : ''}
                  </span>
                ));
              })()}
            </div>
          </div>
        )}

        {/* 특성 */}
        {traits.length > 0 && (
          <div style={SECTION_STYLE}>
            <div style={SECTION_TITLE_STYLE}>특성 ({traits.length})</div>
            <div style={TAG_CONTAINER_STYLE}>
              {traits.map(trait => (
                <span key={trait} style={TAG_STYLE}>{trait}</span>
              ))}
            </div>
          </div>
        )}

        {/* 마지막 전투 정보 */}
        {lastBattleResult && (
          <div style={SECTION_STYLE}>
            <div style={SECTION_TITLE_STYLE}>마지막 전투</div>
            <div style={STAT_ROW_STYLE}>
              <span style={STAT_LABEL_STYLE}>상대</span>
              <span style={STAT_VALUE_STYLE}>
                {lastBattleResult.enemyInfo?.emoji || '👾'} {lastBattleResult.label}
              </span>
            </div>
          </div>
        )}

        {/* 상세 통계 토글 */}
        {simpleStats.battles > 0 && (
          <>
            <button
              onClick={() => setShowDetailedStats(!showDetailedStats)}
              style={TOGGLE_BUTTON_STYLE}
            >
              📊 {showDetailedStats ? '상세 통계 숨기기' : '상세 통계 보기'}
              <span style={{ fontSize: '12px' }}>
                ({simpleStats.battles}회 전투 기록)
              </span>
            </button>

            {showDetailedStats && (
              <div style={{ ...SECTION_STYLE, marginTop: '12px' }}>
                <div style={SECTION_TITLE_STYLE}>📊 전투 통계</div>
                <div style={STATS_GRID_STYLE}>
                  <div style={MINI_STAT_STYLE}>
                    <div style={MINI_STAT_LABEL}>전체 승률</div>
                    <div style={{
                      ...MINI_STAT_VALUE,
                      color: simpleStats.winRate >= 0.5 ? '#22c55e' : '#ef4444'
                    }}>
                      {(simpleStats.winRate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div style={MINI_STAT_STYLE}>
                    <div style={MINI_STAT_LABEL}>평균 턴</div>
                    <div style={MINI_STAT_VALUE}>{simpleStats.avgTurns.toFixed(1)}</div>
                  </div>
                  <div style={MINI_STAT_STYLE}>
                    <div style={MINI_STAT_LABEL}>총 피해량</div>
                    <div style={{ ...MINI_STAT_VALUE, color: '#f97316' }}>
                      {simpleStats.totalDamageDealt}
                    </div>
                  </div>
                  <div style={MINI_STAT_STYLE}>
                    <div style={MINI_STAT_LABEL}>평균 피해</div>
                    <div style={MINI_STAT_VALUE}>
                      {simpleStats.avgDamageDealt.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* TOP 카드 시너지 */}
                {detailedStats.cardSynergyStats?.topSynergies &&
                  detailedStats.cardSynergyStats.topSynergies.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ ...SECTION_TITLE_STYLE, fontSize: '12px' }}>
                      ⚡ TOP 카드 조합
                    </div>
                    <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                      {detailedStats.cardSynergyStats.topSynergies.slice(0, 3).map((s, i) => (
                        <div key={i} style={{ padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{s.pair}</span>
                          <span style={{ color: s.winRate >= 0.5 ? '#22c55e' : '#f97316' }}>
                            {(s.winRate * 100).toFixed(0)}% ({s.frequency}회)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 버튼 */}
        <div style={BUTTON_ROW_STYLE}>
          <button onClick={handleCopy} style={COPY_BUTTON_STYLE}>
            📋 복사
          </button>
          <button
            onClick={onExit}
            className="btn-enhanced btn-primary"
            style={EXIT_BUTTON_STYLE}
          >
            확인
          </button>
        </div>
      </div>

      {/* 복사 완료 토스트 */}
      {showCopied && (
        <div style={COPIED_TOAST_STYLE}>
          ✅ 클립보드에 복사되었습니다!
        </div>
      )}
    </div>
  );
});

RunSummaryOverlay.displayName = 'RunSummaryOverlay';
