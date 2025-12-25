/**
 * @file parryProcessing.ts
 * @description 쳐내기(parry) 효과 처리 시스템
 *
 * ## 쳐내기 흐름
 * 1. 쳐내기 카드 발동 → 패리 대기 상태
 * 2. 범위 내 적 공격 발동 → 트리거
 * 3. 트리거 시 적 카드 타임라인 밀어냄
 */

/** 카드 정보 */
interface CardInfo {
  name?: string;
  type?: string;
  parryRange?: number;
  parryPushAmount?: number;
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

/** 패리 대기 상태 */
interface ParryReadyState {
  active: boolean;
  actor: 'player' | 'enemy';
  cardName?: string;
  centerSp: number;
  maxSp: number;
  pushAmount: number;
  triggered: boolean;
}

/** 패리 이벤트 */
interface ParryEvent {
  actor: 'player' | 'enemy';
  card?: string;
  type: 'parry';
  pushAmount: number;
  triggeredBy?: string;
  msg: string;
}

/** 패리 트리거 결과 */
interface ParryTriggerResult {
  updatedQueue: QueueItem[];
  parryEvents: ParryEvent[];
  updatedParryStates: ParryReadyState[];
  outCards: QueueItem[];
}

/** setupParryReady 파라미터 */
interface SetupParryReadyParams {
  action: Action;
  addLog: (msg: string) => void;
}

/** checkParryTrigger 파라미터 */
interface CheckParryTriggerParams {
  parryReadyStates: ParryReadyState | ParryReadyState[] | null | undefined;
  enemyAction: Action;
  queue: QueueItem[];
  currentQIndex: number;
  enemyMaxSpeed?: number;
  addLog: (msg: string) => void;
  playParrySound?: () => void;
}

/**
 * 쳐내기 카드 발동 시 패리 대기 상태 설정
 */
export function setupParryReady({ action, addLog }: SetupParryReadyParams): ParryReadyState {
  const card = action.card;
  const parryRange = card.parryRange ?? 5;
  const pushAmount = card.parryPushAmount ?? 3;
  const centerSp = action.sp ?? 0;

  addLog(`🛡️ "${card.name}" 패리 대기! (범위: ${centerSp}~${centerSp + parryRange})`);

  return {
    active: true,
    actor: action.actor,
    cardName: card.name,
    centerSp,
    maxSp: centerSp + parryRange,
    pushAmount,
    triggered: false
  };
}

/**
 * 적 카드 발동 시 패리 트리거 체크 (여러 패리 상태 지원)
 */
export function checkParryTrigger({
  parryReadyStates,
  enemyAction,
  queue,
  currentQIndex,
  enemyMaxSpeed,
  addLog,
  playParrySound
}: CheckParryTriggerParams): ParryTriggerResult {
  // 배열이 아니면 단일 상태를 배열로 변환 (하위 호환)
  const states: ParryReadyState[] = Array.isArray(parryReadyStates)
    ? parryReadyStates
    : (parryReadyStates ? [parryReadyStates] : []);

  // 활성 상태가 없으면 스킵
  const activeStates = states.filter(s => s?.active && !s.triggered);
  if (activeStates.length === 0) {
    return { updatedQueue: queue, parryEvents: [], updatedParryStates: states, outCards: [] };
  }

  // 적 공격이 아니면 스킵
  if (enemyAction.card?.type !== 'attack') {
    return { updatedQueue: queue, parryEvents: [], updatedParryStates: states, outCards: [] };
  }

  const enemySp = enemyAction.sp ?? 0;
  let currentQueue = queue;
  const parryEvents: ParryEvent[] = [];
  let totalPushAmount = 0;

  // 각 패리 상태를 체크
  const updatedParryStates = states.map(parryState => {
    if (!parryState?.active || parryState.triggered) {
      return parryState;
    }

    // 같은 편이면 스킵
    if (enemyAction.actor === parryState.actor) {
      return parryState;
    }

    // 범위 체크: centerSp < enemySp <= maxSp
    if (enemySp <= parryState.centerSp || enemySp > parryState.maxSp) {
      return parryState;
    }

    // 패리 트리거!
    totalPushAmount += parryState.pushAmount;

    // 로그 및 이벤트 생성
    const msg = `🛡️✨ "${parryState.cardName}" 패리 성공! "${enemyAction.card?.name}" 쳐냄! +${parryState.pushAmount} 밀림`;
    addLog(msg);

    parryEvents.push({
      actor: parryState.actor,
      card: parryState.cardName,
      type: 'parry',
      pushAmount: parryState.pushAmount,
      triggeredBy: enemyAction.card?.name,
      msg
    });

    // 패리 상태 업데이트 (한 번만 발동)
    return {
      ...parryState,
      triggered: true,
      active: false
    };
  });

  const outCards: QueueItem[] = [];

  // 패리가 발동됐으면 사운드 재생 및 큐 업데이트
  if (totalPushAmount > 0) {
    if (playParrySound) {
      playParrySound();
    }

    // 모든 적 카드의 sp를 총 pushAmount만큼 뒤로 밀기
    currentQueue = queue.map((item, idx) => {
      if (idx <= currentQIndex || !item) return item;
      if (item.actor !== 'player') {
        return {
          ...item,
          sp: (item.sp ?? 0) + totalPushAmount
        };
      }
      return item;
    });

    // 아웃 처리: enemyMaxSpeed를 초과한 적 카드 제거
    const maxSpeed = enemyMaxSpeed || 30;
    const filteredQueue: QueueItem[] = [];
    for (const item of currentQueue) {
      if (item && item.actor !== 'player' && (item.sp ?? 0) > maxSpeed) {
        outCards.push(item);
        addLog(`🚫 아웃! "${item.card?.name}" 카드가 타임라인 밖으로 밀려남! (sp: ${item.sp} > ${maxSpeed})`);
      } else {
        filteredQueue.push(item);
      }
    }
    currentQueue = filteredQueue;

    // 밀린 후 sp 기준으로 재정렬 (현재 인덱스 이후만)
    const beforeCurrent = currentQueue.slice(0, currentQIndex + 1);
    const afterCurrent = currentQueue.slice(currentQIndex + 1);

    afterCurrent.sort((a, b) => {
      if ((a.sp ?? 0) !== (b.sp ?? 0)) return (a.sp ?? 0) - (b.sp ?? 0);
      return 0;
    });

    currentQueue = [...beforeCurrent, ...afterCurrent];

    if (parryEvents.length > 1) {
      addLog(`🛡️ 총 ${parryEvents.length}개 패리! 모든 적 카드 +${totalPushAmount} 밀림`);
    }
  }

  return { updatedQueue: currentQueue, parryEvents, updatedParryStates, outCards };
}

/**
 * 턴 종료 시 패리 상태 초기화
 */
export function resetParryState(): null {
  return null;
}
