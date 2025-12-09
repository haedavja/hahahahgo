/**
 * colors.js
 *
 * UI 컴포넌트에서 사용되는 공통 색상 상수
 */

// Deflation (감쇄) 관련 색상
export const DEFLATION_COLORS = {
  text: '#fca5a5',
  background: 'linear-gradient(135deg, rgba(252, 165, 165, 0.25), rgba(252, 165, 165, 0.1))',
  border: 'rgba(252, 165, 165, 0.5)',
  shadow: '0 0 10px rgba(252, 165, 165, 0.3), inset 0 0 5px rgba(252, 165, 165, 0.15)',
  glowActive: '0 0 15px rgba(252, 165, 165, 0.6)'
};

// 골드 색상 (에테르, 배율 등)
export const GOLD = '#fbbf24';

// 블록 (방어) 색상
export const BLOCK_COLORS = {
  gradient: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
  border: '#60a5fa',
  rgba: 'rgba(96, 165, 250, 0.6)'
};

// 에테르 바 슬롯 색상 (플레이어) - 보색 관계로 시인성 극대화
export const PLAYER_SLOT_COLORS = [
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

// 에테르 바 슬롯 색상 (적)
export const ENEMY_SLOT_COLORS = [
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
