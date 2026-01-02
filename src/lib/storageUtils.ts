/**
 * @file storageUtils.ts
 * @description localStorage 래퍼 유틸리티
 *
 * 일관된 에러 처리와 타입 안전성을 제공하는 localStorage 래퍼
 */

/**
 * localStorage에서 값을 안전하게 가져옵니다.
 * @param key - localStorage 키
 * @param fallback - 실패 시 반환할 기본값
 * @returns 저장된 값 또는 기본값
 */
export function getStorageItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return fallback;
    return JSON.parse(item) as T;
  } catch {
    return fallback;
  }
}

/**
 * localStorage에 값을 안전하게 저장합니다.
 * @param key - localStorage 키
 * @param value - 저장할 값
 * @returns 성공 여부
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * localStorage에서 문자열 값을 안전하게 가져옵니다 (JSON 파싱 없음).
 * @param key - localStorage 키
 * @param fallback - 실패 시 반환할 기본값
 * @returns 저장된 문자열 또는 기본값
 */
export function getStorageString(key: string, fallback: string): string {
  try {
    const item = localStorage.getItem(key);
    return item ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * localStorage에 문자열 값을 안전하게 저장합니다 (JSON 직렬화 없음).
 * @param key - localStorage 키
 * @param value - 저장할 문자열
 * @returns 성공 여부
 */
export function setStorageString(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * localStorage에서 키를 안전하게 제거합니다.
 * @param key - localStorage 키
 * @returns 성공 여부
 */
export function removeStorageItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
