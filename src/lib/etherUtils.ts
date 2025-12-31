/**
 * @file etherUtils.ts
 * @description 에테르 슬롯 시스템 유틸리티
 *
 * 에테르(Ether)는 전투에서 카드를 사용할 때 축적되는 자원입니다.
 * 에테르 슬롯이 채워질수록 더 강력한 능력을 발휘할 수 있습니다.
 *
 * ## 슬롯 시스템
 * 에테르 포인트가 누적되면 슬롯이 채워짐
 * 각 슬롯 비용은 이전보다 10% 증가 (인플레이션)
 *
 * ## 비용 공식
 * - 1슬롯: 100pt
 * - 2슬롯: 110pt (총 210pt)
 * - 3슬롯: 121pt (총 331pt)
 * - ...최대 10슬롯
 *
 * ## 에테르 사용 예시
 * - 에테르 오버드라이브: 슬롯이 가득 차면 발동 가능
 * - 상징 효과: 특정 슬롯 수에서 보너스 효과
 * - 승리 조건: 턴 종료 시 슬롯 비교
 *
 * @module etherUtils
 * @see {@link calculateEtherSlots} 슬롯 계산
 * @see {@link getSlotProgress} 진행률 계산
 */

const BASE_COST = 100; // 1칸 기본 비용
const INFLATION_RATE = 1.1; // 10% 증가

/** 시각적 슬롯(색상) 순환 기준 */
export const MAX_SLOTS = 10;

/**
 * 슬롯 수를 채우는데 필요한 총 pt 계산
 *
 * @param slots - 채울 슬롯 수
 * @returns 해당 슬롯을 모두 채우는데 필요한 총 에테르 포인트
 *
 * @example
 * // 3슬롯 채우기
 * slotsToPts(3); // 331 (100 + 110 + 121)
 *
 * @example
 * // 0슬롯
 * slotsToPts(0); // 0
 */
export function slotsToPts(slots: number): number {
  if (slots <= 0) return 0;

  let totalPts = 0;
  let slotCost = BASE_COST;

  for (let i = 0; i < slots; i++) {
    totalPts += slotCost;
    slotCost = Math.floor(slotCost * INFLATION_RATE);
  }

  return totalPts;
}

/**
 * 특정 슬롯을 채우는데 필요한 pt 계산
 * @param slot - 슬롯 번호 (0부터 시작)
 * @returns 해당 슬롯 비용
 */
export function getSlotCost(slot: number): number {
  return Math.floor(BASE_COST * Math.pow(INFLATION_RATE, slot));
}

/**
 * 에테르 pt를 슬롯(칸) 수로 변환
 *
 * 현재 축적된 에테르 포인트로 채워진 슬롯 수를 계산합니다.
 * 부분적으로 채워진 슬롯은 포함되지 않습니다.
 *
 * @param pts - 총 에테르 포인트
 * @returns 완전히 채워진 슬롯 수 (0-10)
 *
 * @example
 * calculateEtherSlots(0);   // 0
 * calculateEtherSlots(99);  // 0 (100pt 미만)
 * calculateEtherSlots(100); // 1
 * calculateEtherSlots(210); // 2
 * calculateEtherSlots(250); // 2 (3슬롯까지 40pt 부족)
 */
export function calculateEtherSlots(pts: number): number {
  if (!pts || pts < BASE_COST) return 0;

  let totalPts = 0;
  let slotCost = BASE_COST;
  let slots = 0;

  while (totalPts + slotCost <= pts) {
    totalPts += slotCost;
    slots++;
    slotCost = Math.floor(slotCost * INFLATION_RATE);
  }

  return slots;
}

/**
 * 현재 슬롯 내의 pt 계산 (슬롯 도달 시마다 0으로 리셋)
 * @param totalPts - 총 에테르 포인트
 * @returns 현재 슬롯 내의 pt
 */
export function getCurrentSlotPts(totalPts: number): number {
  if (!totalPts || totalPts < 0) return 0;

  const currentSlots = calculateEtherSlots(totalPts);
  const completedPts = slotsToPts(currentSlots);
  return totalPts - completedPts;
}

/**
 * 다음 슬롯까지 필요한 pt 계산
 * @param totalPts - 총 에테르 포인트
 * @returns 다음 슬롯 비용
 */
export function getNextSlotCost(totalPts: number): number {
  const currentSlots = calculateEtherSlots(totalPts);
  return getSlotCost(currentSlots);
}

/**
 * 현재 슬롯의 진행률 계산 (0-1)
 * @param totalPts - 총 에테르 포인트
 * @returns 현재 슬롯의 채움 비율 (0-1)
 */
export function getSlotProgress(totalPts: number): number {
  const currentPts = getCurrentSlotPts(totalPts);
  const nextCost = getNextSlotCost(totalPts);
  return Math.max(0, Math.min(1, currentPts / nextCost));
}

/**
 * 전체 에테르 바의 비율 계산 (슬롯 + 진행률 포함)
 * @param totalPts - 총 에테르 포인트
 * @returns 전체 바의 채움 비율 (0-1)
 */
export function getEtherBarRatio(totalPts: number): number {
  const slots = calculateEtherSlots(totalPts);
  const progress = getSlotProgress(totalPts);
  return Math.min(1, (slots + progress) / MAX_SLOTS);
}
