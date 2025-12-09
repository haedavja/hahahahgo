/**
 * formatUtils.js
 *
 * 숫자 포맷팅 유틸리티 함수
 */

/**
 * 숫자를 축약 형식으로 포맷 (K/M/B)
 * @param {number} num - 포맷할 숫자
 * @returns {string} 포맷된 문자열
 * @example
 * formatCompactValue(1234) // "1.23K"
 * formatCompactValue(1234567) // "1.23M"
 * formatCompactValue(1234567890) // "1.23B"
 */
export function formatCompactValue(num) {
  if (!Number.isFinite(num)) return '0';
  const abs = Math.abs(num);
  if (abs >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toLocaleString();
}
