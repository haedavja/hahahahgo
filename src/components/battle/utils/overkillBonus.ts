/**
 * @file overkillBonus.ts
 * @description 오버킬 보너스 시스템
 *
 * 몬스터 에테르가 0이 된 후 초과 에테르를 플레이어 버프 토큰으로 변환
 * - 은총화 1개 기준(80pt) 이상: 버프 토큰 1개
 * - 은총화 2개 기준(168pt) 이상: 버프 토큰 2개
 * - 그 이상: 기존 토큰 스택 강화
 */

/** 은총화 기본 비용 (grace-system.ts와 동일) */
const GRACE_BASE_COST = 80;
const GRACE_INFLATION = 1.1;

/** 오버킬 보너스로 지급 가능한 버프 토큰 목록 */
const OVERKILL_BUFF_TOKENS = [
  'offense',    // 공세: 공격력 50% 증가 (1회)
  'guard',      // 수세: 방어력 50% 증가 (1회)
  'blur',       // 흐릿함: 회피 50% (1회)
  'strength',   // 힘: 공격력/방어력 +1 (영구)
  'agility',    // 민첩: 카드 시간 -1 (영구)
] as const;

export type OverkillBuffToken = typeof OVERKILL_BUFF_TOKENS[number];

/** 오버킬 보너스 결과 */
export interface OverkillBonusResult {
  /** 지급할 토큰 목록 (토큰 ID와 스택 수) */
  tokens: Array<{ id: OverkillBuffToken; stacks: number }>;
  /** 사용된 오버킬 에테르 */
  usedEther: number;
  /** 로그 메시지 */
  logMessages: string[];
}

/**
 * N슬롯까지 필요한 총 은총 포인트 계산
 */
function graceSlotsToPts(slots: number): number {
  if (slots <= 0) return 0;

  let totalPts = 0;
  let slotCost = GRACE_BASE_COST;

  for (let i = 0; i < slots; i++) {
    totalPts += slotCost;
    slotCost = Math.floor(slotCost * GRACE_INFLATION);
  }

  return totalPts;
}

/**
 * 오버킬 에테르로 획득 가능한 은총화 슬롯 수 계산
 */
function calculateGraceSlots(pts: number): number {
  if (!pts || pts < GRACE_BASE_COST) return 0;

  let totalPts = 0;
  let slotCost = GRACE_BASE_COST;
  let slots = 0;

  while (totalPts + slotCost <= pts) {
    totalPts += slotCost;
    slots++;
    slotCost = Math.floor(slotCost * GRACE_INFLATION);
  }

  return slots;
}

/**
 * 랜덤 버프 토큰 선택
 */
function getRandomBuffToken(): OverkillBuffToken {
  const index = Math.floor(Math.random() * OVERKILL_BUFF_TOKENS.length);
  return OVERKILL_BUFF_TOKENS[index];
}

/**
 * 오버킬 에테르를 버프 토큰으로 변환
 *
 * @param overkillEther - 초과 에테르량
 * @param existingTokens - 기존에 이미 받은 토큰 (강화용, optional)
 * @returns 지급할 토큰 목록과 로그
 */
export function calculateOverkillBonus(
  overkillEther: number,
  existingTokens?: Map<OverkillBuffToken, number>
): OverkillBonusResult {
  const result: OverkillBonusResult = {
    tokens: [],
    usedEther: 0,
    logMessages: []
  };

  if (overkillEther < GRACE_BASE_COST) {
    return result;
  }

  // 은총화 슬롯 수 계산
  const graceSlots = calculateGraceSlots(overkillEther);
  result.usedEther = graceSlotsToPts(graceSlots);

  if (graceSlots === 0) {
    return result;
  }

  result.logMessages.push(`⚡ 오버킬 보너스! (초과 에테르: ${overkillEther}pt)`);

  // 슬롯 수에 따른 토큰 지급
  if (graceSlots === 1) {
    // 1슬롯: 랜덤 버프 토큰 1개
    const token = getRandomBuffToken();
    result.tokens.push({ id: token, stacks: 1 });
    result.logMessages.push(`  └ 🎁 ${getTokenDisplayName(token)} 획득!`);
  } else if (graceSlots === 2) {
    // 2슬롯: 랜덤 버프 토큰 2개 (다른 종류)
    const token1 = getRandomBuffToken();
    let token2 = getRandomBuffToken();
    // 같은 토큰이면 다시 선택 (최대 3회 시도)
    for (let i = 0; i < 3 && token2 === token1; i++) {
      token2 = getRandomBuffToken();
    }

    result.tokens.push({ id: token1, stacks: 1 });
    result.tokens.push({ id: token2, stacks: 1 });
    result.logMessages.push(`  └ 🎁 ${getTokenDisplayName(token1)}, ${getTokenDisplayName(token2)} 획득!`);
  } else {
    // 3슬롯 이상: 2개 토큰 + 추가 슬롯만큼 스택 강화
    const token1 = getRandomBuffToken();
    let token2 = getRandomBuffToken();
    for (let i = 0; i < 3 && token2 === token1; i++) {
      token2 = getRandomBuffToken();
    }

    const extraStacks = graceSlots - 2;
    result.tokens.push({ id: token1, stacks: 1 + Math.floor(extraStacks / 2) });
    result.tokens.push({ id: token2, stacks: 1 + Math.ceil(extraStacks / 2) });

    const totalStacks = result.tokens.reduce((sum, t) => sum + t.stacks, 0);
    result.logMessages.push(`  └ 🎁 ${getTokenDisplayName(token1)} x${result.tokens[0].stacks}, ${getTokenDisplayName(token2)} x${result.tokens[1].stacks} 획득! (총 ${totalStacks}스택)`);
  }

  return result;
}

/**
 * 토큰 표시 이름 가져오기
 */
function getTokenDisplayName(tokenId: OverkillBuffToken): string {
  const names: Record<OverkillBuffToken, string> = {
    offense: '공세',
    guard: '수세',
    blur: '흐릿함',
    strength: '힘',
    agility: '민첩'
  };
  return names[tokenId] || tokenId;
}
