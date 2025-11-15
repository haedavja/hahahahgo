// 에테르 시스템 유틸리티
// 에테르.md 기반: 칸당 50% 증가, 10칸에서 리셋

const BASE_COST = 100; // 1칸 기본 비용
const INFLATION_RATE = 1.5; // 50% 증가
const MAX_SLOTS = 10; // 최대 칸 수

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

  while (totalPts + slotCost <= pts && slots < MAX_SLOTS) {
    totalPts += slotCost;
    slots++;
    slotCost = Math.floor(slotCost * INFLATION_RATE);
  }

  return slots;
}

/**
 * 슬롯 수를 채우는데 필요한 총 pt 계산
 * @param {number} slots - 슬롯 수
 * @returns {number} - 필요한 총 pt
 */
export function slotsToPts(slots) {
  if (slots <= 0) return 0;

  let totalPts = 0;
  let slotCost = BASE_COST;

  for (let i = 0; i < Math.min(slots, MAX_SLOTS); i++) {
    totalPts += slotCost;
    slotCost = Math.floor(slotCost * INFLATION_RATE);
  }

  return totalPts;
}

/**
 * 현재 슬롯의 진행률 계산 (0-1)
 * @param {number} pts - 에테르 포인트
 * @returns {number} - 현재 슬롯의 채움 비율 (0-1)
 */
export function getSlotProgress(pts) {
  const currentSlots = calculateEtherSlots(pts);
  const currentSlotPts = slotsToPts(currentSlots);
  const nextSlotCost = Math.floor(BASE_COST * Math.pow(INFLATION_RATE, currentSlots));
  const remaining = pts - currentSlotPts;

  return Math.min(1, remaining / nextSlotCost);
}
