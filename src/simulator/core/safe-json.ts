/**
 * @file safe-json.ts
 * @description 안전한 JSON 파싱 및 복사 유틸리티
 */

import { getLogger } from './logger';

const log = getLogger('SafeJSON');

/**
 * 안전한 JSON 파싱
 * @param json JSON 문자열
 * @param defaultValue 파싱 실패 시 반환할 기본값
 * @returns 파싱된 객체 또는 기본값
 */
export function safeParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    log.warn('JSON parse error:', error);
    return defaultValue;
  }
}

/**
 * 안전한 JSON 문자열 변환
 * @param value 변환할 객체
 * @param defaultValue 변환 실패 시 반환할 기본값
 * @returns JSON 문자열 또는 기본값
 */
export function safeStringify<T>(value: T, defaultValue = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    log.warn('JSON stringify error:', error);
    return defaultValue;
  }
}

/**
 * 안전한 깊은 복사 (JSON 기반)
 * @param obj 복사할 객체
 * @returns 복사된 객체 또는 null
 */
export function safeDeepClone<T>(obj: T): T | null {
  try {
    return JSON.parse(JSON.stringify(obj)) as T;
  } catch (error) {
    log.warn('Deep clone error:', error);
    return null;
  }
}

/**
 * 안전한 깊은 복사 (기본값 반환)
 * @param obj 복사할 객체
 * @param defaultValue 실패 시 반환할 기본값
 * @returns 복사된 객체 또는 기본값
 */
export function safeDeepCloneWithDefault<T>(obj: T, defaultValue: T): T {
  try {
    return JSON.parse(JSON.stringify(obj)) as T;
  } catch (error) {
    log.warn('Deep clone error:', error);
    return defaultValue;
  }
}
