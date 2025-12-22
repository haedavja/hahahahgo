import { useRef, useCallback } from 'react';

/**
 * 상징 드래그 앤 드롭 훅
 * 상징 순서 재배치를 위한 드래그 이벤트 핸들러 제공
 */
export function useRelicDrag({ orderedRelicList, actions }) {
  const dragRelicIndexRef = useRef(null);

  const handleRelicDragStart = useCallback((idx, relicId) => (e) => {
    dragRelicIndexRef.current = idx;
    actions.setRelicActivated(relicId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      const img = new Image();
      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YQn1fEAAAAASUVORK5CYII=';
      e.dataTransfer.setDragImage(img, 0, 0);
    } catch { }
  }, [actions]);

  const handleRelicDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleRelicDrop = useCallback((idx) => (e) => {
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
