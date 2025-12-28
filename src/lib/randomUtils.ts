/**
 * @file randomUtils.ts
 * @description 랜덤 관련 공통 유틸리티 함수
 */

/**
 * 고유 ID 생성
 * @param prefix - ID 접두사 (예: 'ghost', 'card', 'combo')
 * @returns 고유 ID 문자열
 */
export function generateUid(prefix: string = ''): string {
  const random = Math.random().toString(36).slice(2);
  return prefix ? `${prefix}_${random}` : random;
}

/**
 * 핸드 카드용 고유 ID 생성 (카드 ID + 인덱스 포함)
 * @param cardId - 카드 ID
 * @param index - 카드 인덱스
 * @param prefix - 접두사 (기본값: '')
 * @returns 핸드 카드 고유 ID
 */
export function generateHandUid(cardId: string, index: number, prefix: string = ''): string {
  const random = Math.random().toString(36).slice(2, 8);
  const base = `${cardId}_${index}_${random}`;
  return prefix ? `${prefix}_${base}` : base;
}

/**
 * 타임스탬프 포함 고유 ID 생성 (적 AI 카드 등)
 * @param prefix - ID 접두사
 * @returns 타임스탬프 포함 고유 ID
 */
export function generateTimestampUid(prefix: string): string {
  const random = Math.random().toString(36).slice(2);
  return `${prefix}_${Date.now()}_${random}`;
}

/**
 * 배열 셔플 (Fisher-Yates 변형)
 * @param arr - 셔플할 배열
 * @returns 새로운 셔플된 배열
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
