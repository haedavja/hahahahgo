/**
 * @file colors.js
 * @description UI 공통 색상 상수
 *
 * ## 색상 카테고리
 * - DEFLATION: 감쇄 효과
 * - PLAYER_SLOT: 에테르 슬롯 (보색 배치)
 * - BLOCK: 방어 관련
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

// HP 바 공통 스타일
export const HP_BAR_DIMENSIONS = {
  width: '200px',
  height: '12px',
} as const;

// HP 텍스트 색상
export const HP_TEXT_COLOR = '#f87171';

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

// ==================== 시맨틱 텍스트 색상 ====================

export const TEXT_COLORS = {
  primary: '#e2e8f0',    // slate-200 - 기본 텍스트
  secondary: '#94a3b8',  // slate-400 - 보조 텍스트
  muted: '#64748b',      // slate-500 - 약한 텍스트
  light: '#f1f5f9',      // slate-100 - 밝은 텍스트
  accent: '#cbd5e1',     // slate-300 - 강조 텍스트
} as const;

// ==================== 상태 색상 ====================

export const STATUS_COLORS = {
  success: '#22c55e',    // green-500 - 성공/승리
  error: '#ef4444',      // red-500 - 오류/패배
  errorLight: '#f87171', // red-400 - 밝은 오류
  warning: '#fbbf24',    // amber-400 - 경고
  info: '#3b82f6',       // blue-500 - 정보
  infoLight: '#60a5fa',  // blue-400 - 밝은 정보
} as const;

// ==================== 배경 색상 ====================

export const BG_COLORS = {
  primary: '#1e293b',    // slate-800 - 기본 배경
  secondary: '#334155',  // slate-700 - 보조 배경
  dark: '#0f172a',       // slate-900 - 어두운 배경
  darker: '#020617',     // slate-950 - 가장 어두운 배경
  button: '#374151',     // gray-700 - 버튼 배경
} as const;

// ==================== 카드 등급 색상 ====================

export const RARITY_COLORS = {
  common: '#94a3b8',     // slate-400 - 일반
  rare: '#60a5fa',       // blue-400 - 희귀
  special: '#34d399',    // emerald-400 - 특별
  legendary: '#fbbf24',  // amber-400 - 전설
} as const;
