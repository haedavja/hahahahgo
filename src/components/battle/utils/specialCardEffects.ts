/**
 * @file specialCardEffects.ts
 * @description 특수 카드 효과 처리 (브리치, 펜싱, 처형대 등)
 */

import type { Card, HandAction, BreachSelection } from '../../../types';
import { hasSpecial } from './cardSpecialEffects';
import { generateBreachCards, generateFencingCards, generateExecutionSquadCards, type CreationQueueItem } from './cardCreationProcessing';

interface ProcessBreachEffectParams {
  action: HandAction;
  addLog: (msg: string) => void;
  accumulateEther: (card: Card) => void;
  setBreachSelection: (selection: BreachSelection) => void;
  breachSelectionRef: React.MutableRefObject<BreachSelection | null>;
}

interface SpecialEffectResult {
  shouldReturn: boolean;
  creationQueue?: CreationQueueItem[];
}

/**
 * 브리치 효과 처리
 */
export function processBreachEffect({
  action,
  addLog,
  accumulateEther,
  setBreachSelection,
  breachSelectionRef,
}: ProcessBreachEffectParams): SpecialEffectResult {
  if (action.card.special !== 'breach' || action.actor !== 'player') {
    return { shouldReturn: false };
  }

  const { breachCards, breachState } = generateBreachCards(action.sp ?? 0, action.card);

  addLog(`👻 "${action.card.name}" 발동! 카드를 선택하세요.`);
  accumulateEther(action.card);

  breachSelectionRef.current = breachState;
  setBreachSelection(breachState);

  return { shouldReturn: true };
}

interface ProcessFencingEffectParams {
  action: HandAction;
  addLog: (msg: string) => void;
  accumulateEther: (card: Card) => void;
  setBreachSelection: (selection: BreachSelection) => void;
  breachSelectionRef: React.MutableRefObject<BreachSelection | null>;
  creationQueueRef: React.MutableRefObject<CreationQueueItem[]>;
}

/**
 * 펜싱 카드 창조 효과 (벙 데 라므)
 */
export function processFencingEffect({
  action,
  addLog,
  accumulateEther,
  setBreachSelection,
  breachSelectionRef,
  creationQueueRef,
}: ProcessFencingEffectParams): SpecialEffectResult {
  if (!hasSpecial(action.card, 'createFencingCards3') || action.actor !== 'player') {
    return { shouldReturn: false };
  }

  const { creationQueue, firstSelection, success } = generateFencingCards(action.sp ?? 0, action.card);

  if (success && firstSelection) {
    creationQueueRef.current = creationQueue;
    addLog(`👻 "${action.card.name}" 발동! 검격 카드 창조 1/3: 카드를 선택하세요.`);
    accumulateEther(action.card);

    breachSelectionRef.current = firstSelection;
    setBreachSelection(firstSelection);

    return { shouldReturn: true, creationQueue };
  }

  return { shouldReturn: false };
}

interface ProcessExecutionSquadParams {
  action: HandAction;
  addLog: (msg: string) => void;
  accumulateEther: (card: Card) => void;
  setBreachSelection: (selection: BreachSelection) => void;
  breachSelectionRef: React.MutableRefObject<BreachSelection | null>;
  creationQueueRef: React.MutableRefObject<CreationQueueItem[]>;
}

/**
 * 총살 효과 (4x3 총격 카드 창조)
 */
export function processExecutionSquadEffect({
  action,
  addLog,
  accumulateEther,
  setBreachSelection,
  breachSelectionRef,
  creationQueueRef,
}: ProcessExecutionSquadParams): SpecialEffectResult {
  if (!hasSpecial(action.card, 'executionSquad') || action.actor !== 'player') {
    return { shouldReturn: false };
  }

  const { creationQueue, firstSelection, success } = generateExecutionSquadCards(action.sp ?? 0, action.card);

  if (success && firstSelection) {
    creationQueueRef.current = creationQueue;
    addLog(`👻 "${action.card.name}" 발동! 총격 카드 창조 1/4: 카드를 선택하세요.`);
    accumulateEther(action.card);

    breachSelectionRef.current = firstSelection;
    setBreachSelection(firstSelection);

    return { shouldReturn: true, creationQueue };
  }

  return { shouldReturn: false };
}

interface ProcessCreatedCardsParams {
  actionResult: {
    createdCards?: Array<{ flecheChainCount?: number }>;
  };
  action: HandAction;
  addLog: (msg: string) => void;
  setBreachSelection: (selection: BreachSelection) => void;
  breachSelectionRef: React.MutableRefObject<BreachSelection | null>;
}

/**
 * 카드 창조 효과 처리 (플레쉬 연쇄 등)
 */
export function processCreatedCardsEffect({
  actionResult,
  action,
  addLog,
  setBreachSelection,
  breachSelectionRef,
}: ProcessCreatedCardsParams): SpecialEffectResult {
  if (!actionResult.createdCards || actionResult.createdCards.length === 0 || action.actor !== 'player') {
    return { shouldReturn: false };
  }

  const chainCount = actionResult.createdCards[0]?.flecheChainCount || 0;
  const sourceName = action.card.isFromFleche ? `플레쉬 연쇄 ${chainCount}` : action.card.name;
  const isLastChain = chainCount >= 2;
  addLog(`✨ "${sourceName}" 발동!${isLastChain ? ' (마지막 연쇄)' : ''} 카드를 선택하세요.`);

  const breachState = {
    cards: actionResult.createdCards,
    breachSp: action.sp,
    breachCard: { ...action.card, breachSpOffset: 1 },
    sourceCardName: sourceName,
    isLastChain,
  };
  breachSelectionRef.current = breachState as unknown as BreachSelection;
  setBreachSelection(breachState as unknown as BreachSelection);

  return { shouldReturn: true };
}
