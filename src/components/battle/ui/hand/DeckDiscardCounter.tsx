/**
 * @file DeckDiscardCounter.tsx
 * @description 덱/무덤 카운터 및 팝업
 */

import { memo, useState, useCallback } from 'react';
import type { FC } from 'react';
import { createPortal } from 'react-dom';
import { CardListPopup } from '../CardPopups';
import { COUNTER_BASE, LAYOUT } from './handStyles';
import { createHoverHandlers } from './handUtils';
import type { Card } from '../../../../types';

interface DeckDiscardCounterProps {
  deck: Card[];
  discardPile: Card[];
}

export const DeckDiscardCounter: FC<DeckDiscardCounterProps> = memo(function DeckDiscardCounter({
  deck,
  discardPile,
}) {
  const [showDeckPopup, setShowDeckPopup] = useState(false);
  const [showDiscardPopup, setShowDiscardPopup] = useState(false);

  const openDeckPopup = useCallback(() => setShowDeckPopup(true), []);
  const closeDeckPopup = useCallback(() => setShowDeckPopup(false), []);
  const openDiscardPopup = useCallback(() => setShowDiscardPopup(true), []);
  const closeDiscardPopup = useCallback(() => setShowDiscardPopup(false), []);

  const deckCount = deck.length;
  const discardCount = discardPile.length;

  return (
    <>
      {/* 덱/무덤 팝업 - Portal로 body에 렌더링 */}
      {showDeckPopup && createPortal(
        <CardListPopup
          title="남은 덱"
          cards={deck}
          onClose={closeDeckPopup}
          icon={String.fromCodePoint(0x1F3B4)}
          bgGradient="linear-gradient(135deg, #3b82f6, #1d4ed8)"
        />,
        document.body
      )}
      {showDiscardPopup && createPortal(
        <CardListPopup
          title="무덤"
          cards={discardPile}
          onClose={closeDiscardPopup}
          icon={String.fromCodePoint(0x1FAA6)}
          bgGradient="linear-gradient(135deg, #6b7280, #374151)"
        />,
        document.body
      )}

      {/* 덱 카운터 */}
      <div
        onClick={openDeckPopup}
        style={{
          ...COUNTER_BASE,
          ...LAYOUT.DECK_COUNTER,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          boxShadow: '0 2px 12px rgba(59, 130, 246, 0.5)',
        }}
        {...createHoverHandlers('rgba(59, 130, 246, 0.5)')}
      >
        <span>{String.fromCodePoint(0x1F3B4)}</span>
        <span>덱: {deckCount}</span>
      </div>

      {/* 무덤 카운터 */}
      <div
        onClick={openDiscardPopup}
        style={{
          ...COUNTER_BASE,
          ...LAYOUT.DISCARD_COUNTER,
          background: 'linear-gradient(135deg, #6b7280, #374151)',
          boxShadow: '0 2px 12px rgba(107, 114, 128, 0.5)',
        }}
        {...createHoverHandlers('rgba(107, 114, 128, 0.5)')}
      >
        <span>{String.fromCodePoint(0x1FAA6)}</span>
        <span>무덤: {discardCount}</span>
      </div>
    </>
  );
});
