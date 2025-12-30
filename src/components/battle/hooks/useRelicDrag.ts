/**
 * @file useRelicDrag.js
 * @description 상징 드래그 앤 드롭 훅
 *
 * ## 기능
 * - 상징 순서 드래그 재배치
 * - 드래그 시각 피드백
 * - 드롭 영역 하이라이트
 */

import { useRef, useCallback } from 'react';
import type { UseRelicDragParams } from '../../../types/hooks';

/**
 * 상징 드래그 앤 드롭 훅
 * @param {Object} params
 * @param {string[]} params.orderedRelicList - 보유 상징 목록
 * @param {Object} params.actions - 상태 업데이트 액션
 * @returns {{handleRelicDragStart: Function, handleRelicDragOver: Function, handleRelicDrop: Function, handleRelicDragEnd: Function}}
 */
export function useRelicDrag({ orderedRelicList, actions }: UseRelicDragParams) {
  const dragRelicIndexRef = useRef<number | null>(null);

  const handleRelicDragStart = useCallback((idx: number, relicId: string) => (e: React.DragEvent) => {
    dragRelicIndexRef.current = idx;
    actions.setRelicActivated(relicId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      const img = new Image();
      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YQn1fEAAAAASUVORK5CYII=';
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch { /* ignore */ }
  }, [actions]);

  const handleRelicDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleRelicDrop = useCallback((idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragRelicIndexRef.current;
    dragRelicIndexRef.current = null;
    actions.setRelicActivated(null);
    if (from === null || from === idx) return;
    const arr = Array.from(orderedRelicList);
    const [item] = arr.splice(from, 1);
    arr.splice(idx, 0, item);
    actions.setOrderedRelics(arr);
  }, [orderedRelicList, actions]);

  return {
    handleRelicDragStart,
    handleRelicDragOver,
    handleRelicDrop
  };
}
