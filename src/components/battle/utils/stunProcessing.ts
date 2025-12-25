/**
 * @file stunProcessing.ts
 * @description 기절(stun) 효과 처리 시스템
 *
 * ## 기절 효과
 * - 타임라인 범위 내 적 카드 취소
 * - 범위: STUN_RANGE (5)
 */

/** 카드 정보 */
interface CardInfo {
  name?: string;
  [key: string]: unknown;
}

/** 액션 정보 */
interface Action {
  card: CardInfo;
  sp?: number;
  actor: 'player' | 'enemy';
}

/** 큐 아이템 */
interface QueueItem {
  card?: CardInfo;
  sp?: number;
  actor?: 'player' | 'enemy';
}

/** 기절 이벤트 */
interface StunEvent {
  actor: 'player' | 'enemy';
  card: string;
  type: 'stun';
  msg: string;
}

/** 기절 처리 결과 */
interface StunProcessingResult {
  updatedQueue: QueueItem[];
  stunEvent: StunEvent | null;
}

/** 기절 처리 파라미터 */
interface StunProcessingParams {
  action: Action;
  queue: QueueItem[];
  currentQIndex: number;
  addLog: (msg: string) => void;
}

/** 기절 효과 범위 (타임라인 기준) */
export const STUN_RANGE = 5;

/**
 * 기절 효과 처리
 * @param params - 파라미터
 * @returns { updatedQueue, stunEvent }
 */
export function processStunEffect({
  action,
  queue,
  currentQIndex,
  addLog
}: StunProcessingParams): StunProcessingResult {
  const centerSp = action.sp ?? 0;
  const stunnedActions: Array<{ item: QueueItem; idx: number }> = [];

  const targets = queue
    .map((item, idx) => ({ item, idx }))
    .filter(({ item, idx }) => {
      if (idx <= currentQIndex || !item) return false;
      const isOpponent = item.actor !== action.actor;
      const withinRange = typeof item.sp === 'number' && item.sp >= centerSp && item.sp <= centerSp + STUN_RANGE;
      return isOpponent && withinRange;
    });

  if (targets.length > 0) {
    stunnedActions.push(...targets);
  }

  const updatedQueue = targets.length > 0
    ? queue.filter((_, idx) => !targets.some(t => t.idx === idx))
    : queue;

  let stunEvent: StunEvent | null = null;
  if (stunnedActions.length > 0) {
    const stunnedNames = stunnedActions.map(t => t.item?.card?.name || '카드').join(', ');
    const msg = `😵 "${action.card.name}"의 기절! 상대 카드 ${stunnedActions.length}장 파괴 (범위: ${centerSp}~${centerSp + STUN_RANGE}${stunnedNames ? `, 대상: ${stunnedNames}` : ''})`;
    addLog(msg);
    stunEvent = { actor: action.actor, card: action.card.name || '', type: 'stun', msg };
  }

  return { updatedQueue, stunEvent };
}
