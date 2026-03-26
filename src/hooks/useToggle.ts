/**
 * @file useToggle.ts
 * @description 불리언 상태 토글 훅
 *
 * 사용법:
 * const [isOpen, toggle, setIsOpen] = useToggle(false);
 * toggle(); // true
 * toggle(); // false
 * setIsOpen(true); // true
 */

import { useState, useCallback } from 'react';

type UseToggleReturn = [
  boolean,
  () => void,
  (value: boolean) => void
];

export function useToggle(initialValue = false): UseToggleReturn {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  return [value, toggle, setValue];
}

export default useToggle;
