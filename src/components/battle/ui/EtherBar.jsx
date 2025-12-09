/**
 * EtherBar.jsx
 *
 * 에테르 게이지 바 컴포넌트
 */

import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from '../../../lib/etherUtils';

const etherSlots = (pts) => calculateEtherSlots(pts || 0);

export function EtherBar({
  pts,
  slots,
  previewGain = 0,
  color = "cyan",
  label,
  pulse = false,
  showBarTooltip = false,
  showPtsTooltip = false,
  actions
}) {
  const safePts = Number.isFinite(pts) ? pts : 0;
  const derivedSlots = Number.isFinite(slots) ? slots : etherSlots(safePts);
  const safeSlots = Number.isFinite(derivedSlots) ? derivedSlots : 0;
  const safePreview = Number.isFinite(previewGain) ? previewGain : 0;

  // 숫자 축약 포맷터 (K/M/B) + 전체 문자열
  const formatCompact = (num) => {
    const abs = Math.abs(num);
    if (abs >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  // 현재 슬롯 내의 pt (각 슬롯 도달시마다 0으로 리셋)
  const currentPts = getCurrentSlotPts(safePts);
  // 다음 슬롯을 채우는데 필요한 총 pt
  const nextSlotCost = getNextSlotCost(safePts);
  // 다음 슬롯까지의 진행률 (0-1)
  const slotProgress = getSlotProgress(safePts);
  // 진행률은 현재 슬롯 내 비율만 사용 (색상은 회전)
  const ratio = Math.max(0, Math.min(1, slotProgress));
  const tier = `x${safeSlots}`;

  // 디버깅: 값 확인
  console.log('[EtherBar]', {
    pts,
    safePts,
    currentPts,
    nextSlotCost,
    ratio,
    tier,
    safeSlots
  });

  const borderColor = color === 'red' ? '#ef4444' : '#53d7ff';
  const textColor = color === 'red' ? '#fca5a5' : '#8fd3ff';

  // 표시용 압축 문자열과 툴팁용 전체 문자열
  const compactCurrent = formatCompact(currentPts);
  const compactNext = formatCompact(nextSlotCost);
  const fullTitle = `${currentPts.toLocaleString()} / ${nextSlotCost.toLocaleString()}`;

  // 슬롯별 색상 (플레이어: 보색 관계로 시인성 극대화)
  const playerSlotColors = [
    'linear-gradient(180deg, #67e8f9 0%, #06b6d4 100%)', // x1 - 밝은 시안 (cyan)
    'linear-gradient(180deg, #fb923c 0%, #ea580c 100%)', // x2 - 주황 (시안의 보색)
    'linear-gradient(180deg, #a855f7 0%, #7e22ce 100%)', // x3 - 보라 (주황과 대비)
    'linear-gradient(180deg, #bef264 0%, #84cc16 100%)', // x4 - 라임 (보라의 보색)
    'linear-gradient(180deg, #f472b6 0%, #db2777 100%)', // x5 - 마젠타 (라임과 대비)
    'linear-gradient(180deg, #fde047 0%, #facc15 100%)', // x6 - 밝은 노랑 (마젠타와 대비)
    'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)', // x7 - 파랑 (노랑의 보색)
    'linear-gradient(180deg, #fbbf24 0%, #f59e0b 100%)', // x8 - 골드 (파랑과 대비)
    'linear-gradient(180deg, #34d399 0%, #059669 100%)', // x9 - 민트 (골드와 대비)
    'linear-gradient(180deg, #e0e7ff 0%, #c7d2fe 100%)'  // x10 - 연보라 (민트와 대비)
  ];

  const enemySlotColors = [
    'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)', // x1 - 다크 레드
    'linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%)', // x2 - 레드
    'linear-gradient(180deg, #dc2626 0%, #991b1b 100%)', // x3 - 밝은 레드
    'linear-gradient(180deg, #ea580c 0%, #c2410c 100%)', // x4 - 오렌지 레드
    'linear-gradient(180deg, #c2410c 0%, #9a3412 100%)', // x5 - 다크 오렌지
    'linear-gradient(180deg, #92400e 0%, #78350f 100%)', // x6 - 번트 오렌지
    'linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)', // x7 - 크림슨
    'linear-gradient(180deg, #ef4444 0%, #b91c1c 100%)', // x8 - 파이어 레드
    'linear-gradient(180deg, #f87171 0%, #dc2626 100%)', // x9 - 스칼렛
    'linear-gradient(180deg, #450a0a 0%, #1c0a0a 100%)'  // x10 - 블랙 레드
  ];

  const slotColors = color === 'red' ? enemySlotColors : playerSlotColors;

  return (
    <div
      style={{
        width: '72px',
        padding: '12px 10px 16px',
        borderRadius: '36px',
        background: 'linear-gradient(180deg, rgba(8, 12, 20, 0.95), rgba(10, 15, 25, 0.75))',
        border: '1px solid rgba(96, 210, 255, 0.35)',
        boxShadow: `${pulse ? '0 0 18px rgba(251,191,36,0.55), ' : ''}0 20px 40px rgba(0, 0, 0, 0.45)`,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative'
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center', color: '#5fe0ff', letterSpacing: '0.12em' }}>
        {label}
      </div>
      <div style={{
        position: 'relative',
        width: '46px',
        height: '220px',
        margin: '0 auto',
        borderRadius: '30px',
        border: `2px solid ${borderColor}`,
        background: 'rgba(9, 17, 27, 0.95)',
        overflow: 'hidden',
      }}
        onMouseEnter={() => actions.setShowBarTooltip(true)}
        onMouseLeave={() => actions.setShowBarTooltip(false)}
      >
        <div style={{
          position: 'absolute',
          left: '3px',
          right: '3px',
          bottom: '3px',
          height: `${ratio * 100}%`,
          borderRadius: '24px',
          background: slotColors[(safeSlots % slotColors.length + slotColors.length) % slotColors.length],
          transition: 'height 0.8s ease-out'
        }} />
      </div>
      {showBarTooltip && (
        <div className="insight-tooltip" style={{ position: 'absolute', left: '50%', top: '0', transform: 'translate(-50%, -110%)', whiteSpace: 'nowrap', zIndex: 1200 }}>
          <div className="insight-tooltip-title">진행률</div>
          <div className="insight-tooltip-desc">{Math.round(slotProgress * 100)}%</div>
        </div>
      )}
      <div
        style={{ textAlign: 'center', color: textColor, fontSize: '20px', position: 'relative' }}
        onMouseEnter={() => actions.setShowPtsTooltip(true)}
        onMouseLeave={() => actions.setShowPtsTooltip(false)}
      >
        <div key={`pts-${safePts}`} style={{ fontFamily: 'monospace', lineHeight: 1.1, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div>{compactCurrent}</div>
          <div style={{ height: '1px', width: '100%', background: 'rgba(255,255,255,0.4)' }} />
          <div>{compactNext}</div>
        </div>
        <div style={{ marginTop: '6px' }}>{tier}</div>
        {safePreview > 0 && (
          <div style={{ color: '#6ee7b7', fontSize: '16px', marginTop: '4px' }}>
            +{safePreview.toLocaleString()}pt
          </div>
        )}
        {showPtsTooltip && (
          <div className="insight-tooltip" style={{ position: 'absolute', left: '50%', top: '-12px', transform: 'translate(-50%, -100%)', whiteSpace: 'nowrap', zIndex: 1200 }}>
            <div className="insight-tooltip-title">에테르</div>
            <div className="insight-tooltip-desc">{fullTitle}</div>
            {safePreview > 0 && (
              <div className="insight-tooltip-desc">+{safePreview.toLocaleString()} pt</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
