// 에테르 시스템 유틸리티
// 에테르.md 기반: 칸당 50% 증가, 각 칸 도달 시 0pt로 리셋

const BASE_COST = 100; // 1칸 기본 비용
const INFLATION_RATE = 1.1; // 10% 증가
export const MAX_SLOTS = 10; // 시각적 슬롯(색상) 순환 기준

/**
 * 슬롯 수를 채우는데 필요한 총 pt 계산
 * @param {number} slots - 슬롯 수
 * @returns {number} - 필요한 총 pt
 */
export function slotsToPts(slots) {
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
 * @param {number} slot - 슬롯 번호 (0부터 시작)
 * @returns {number} - 해당 슬롯 비용
 */
export function getSlotCost(slot) {
  return Math.floor(BASE_COST * Math.pow(INFLATION_RATE, slot));
}

/**
 * 에테르 pt를 슬롯(칸) 수로 변환
 * @param {number} pts - 에테르 포인트
 * @returns {number} - 슬롯 수 (0-10)
 */
export function calculateEtherSlots(pts) {
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
 * @param {number} totalPts - 총 에테르 포인트
 * @returns {number} - 현재 슬롯 내의 pt
 */
export function getCurrentSlotPts(totalPts) {
  if (!totalPts || totalPts < 0) return 0;

  const currentSlots = calculateEtherSlots(totalPts);
  const completedPts = slotsToPts(currentSlots);
  return totalPts - completedPts;
}

/**
 * 다음 슬롯까지 필요한 pt 계산
 * @param {number} totalPts - 총 에테르 포인트
 * @returns {number} - 다음 슬롯 비용
 */
export function getNextSlotCost(totalPts) {
  const currentSlots = calculateEtherSlots(totalPts);
  return getSlotCost(currentSlots);
}

/**
 * 현재 슬롯의 진행률 계산 (0-1)
 * @param {number} totalPts - 총 에테르 포인트
 * @returns {number} - 현재 슬롯의 채움 비율 (0-1)
 */
export function getSlotProgress(totalPts) {
  const currentPts = getCurrentSlotPts(totalPts);
  const nextCost = getNextSlotCost(totalPts);
  return Math.max(0, Math.min(1, currentPts / nextCost));
}

/**
 * 전체 에테르 바의 비율 계산 (슬롯 + 진행률 포함)
 * @param {number} totalPts - 총 에테르 포인트
 * @returns {number} - 전체 바의 채움 비율 (0-1)
 */
export function getEtherBarRatio(totalPts) {
  const slots = calculateEtherSlots(totalPts);
  const progress = getSlotProgress(totalPts);
  return Math.min(1, (slots + progress) / MAX_SLOTS);
}
