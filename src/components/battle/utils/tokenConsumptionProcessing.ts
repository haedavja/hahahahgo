/**
 * @file tokenConsumptionProcessing.ts
 * @description 카드 실행 시 토큰 소모 및 화상 피해 처리 유틸리티
 */

import { removeToken, getAllTokens, getTokenStacks, setTokenStacks } from '../../../lib/tokenUtils';
import { getMinFinesse } from '../../../lib/logosEffects';
import type { TokenEntity, TokenInstance } from '../../../types';

interface TokenEffect {
  type: string;
  value?: number;
}

interface RequiredToken {
  id: string;
  stacks: number;
}

interface TokenConsumptionParams {
  actor: 'player' | 'enemy';
  card: { requiredTokens?: RequiredToken[] | null };
  playerState: TokenEntity & { hp: number };
  enemyState: TokenEntity & { hp: number };
  addLog: (msg: string) => void;
}

interface TokenConsumptionResult {
  playerState: TokenEntity & { hp: number };
  updatedTokens: boolean;
}

/**
 * requiredTokens 소모 처리 (카드 실행 전)
 */
export function processRequiredTokenConsumption(params: TokenConsumptionParams): TokenConsumptionResult {
  const { actor, card, playerState, addLog } = params;
  let P = { ...playerState };
  let updatedTokens = false;

  if (actor === 'player' && card.requiredTokens && Array.isArray(card.requiredTokens) && card.requiredTokens.length > 0) {
    for (const req of card.requiredTokens) {
      // 로고스 효과: 배틀 왈츠 Lv1 - 최소 기교 보장
      if (req.id === 'finesse') {
        const minFinesse = getMinFinesse();
        const currentStacks = getTokenStacks(P as TokenEntity, 'finesse');
        const targetStacks = Math.max(minFinesse, currentStacks - req.stacks);
        const actualConsume = currentStacks - targetStacks;

        if (actualConsume > 0) {
          const tokenRemoveResult = removeToken(P as TokenEntity, req.id, 'permanent', actualConsume);
          P = { ...P, tokens: tokenRemoveResult.tokens };
          addLog(`✨ 기교 -${actualConsume} 소모${minFinesse > 0 && actualConsume < req.stacks ? ` (최소 ${minFinesse} 유지)` : ''}`);
          updatedTokens = true;
        } else if (minFinesse > 0) {
          addLog(`✨ 기교: 최소 ${minFinesse} 유지 (소모 없음)`);
        }
      } else {
        const tokenRemoveResult = removeToken(P as TokenEntity, req.id, 'permanent', req.stacks);
        P = { ...P, tokens: tokenRemoveResult.tokens };
        addLog(`✨ ${req.id} -${req.stacks} 소모`);
        updatedTokens = true;
      }
    }
  }

  return { playerState: P, updatedTokens };
}

interface BurnDamageParams {
  actor: 'player' | 'enemy';
  card: { name?: string };
  playerState: TokenEntity & { hp: number };
  enemyState: TokenEntity & { hp: number };
  addLog: (msg: string) => void;
}

interface BurnDamageResult {
  playerState: TokenEntity & { hp: number };
  enemyState: TokenEntity & { hp: number };
  burnEvents: Array<{
    actor: 'player' | 'enemy';
    card: string;
    type: string;
    dmg: number;
    msg: string;
  }>;
}

/**
 * 화상(BURN) 피해 처리: 카드 사용 시마다 피해
 */
export function processBurnDamage(params: BurnDamageParams): BurnDamageResult {
  const { actor, card, playerState, enemyState, addLog } = params;
  let P = { ...playerState };
  let E = { ...enemyState };
  const burnEvents: BurnDamageResult['burnEvents'] = [];

  if (actor === 'player') {
    const playerBurnTokens = (getAllTokens(P as TokenEntity) as unknown as Array<TokenInstance & { effect?: TokenEffect }>)
      .filter((t: TokenInstance & { effect?: TokenEffect }) => t.effect?.type === 'BURN');

    if (playerBurnTokens.length > 0) {
      const burnDamage = playerBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
      P.hp = Math.max(0, P.hp - burnDamage);
      addLog(`🔥 화상: 플레이어 -${burnDamage} HP`);
      burnEvents.push({
        actor: 'player',
        card: String(card.name || ''),
        type: 'burn',
        dmg: burnDamage,
        msg: `🔥 화상: 플레이어 -${burnDamage} HP`
      });
    }
  } else if (actor === 'enemy') {
    const enemyBurnTokens = (getAllTokens(E as TokenEntity) as unknown as Array<TokenInstance & { effect?: TokenEffect }>)
      .filter((t: TokenInstance & { effect?: TokenEffect }) => t.effect?.type === 'BURN');

    if (enemyBurnTokens.length > 0) {
      const burnDamage = enemyBurnTokens.reduce((sum, t) => sum + (t.effect?.value || 3) * (t.stacks || 1), 0);
      E.hp = Math.max(0, E.hp - burnDamage);
      addLog(`🔥 화상: 적 -${burnDamage} HP`);
      burnEvents.push({
        actor: 'enemy',
        card: String(card.name || ''),
        type: 'burn',
        dmg: burnDamage,
        msg: `🔥 화상: 적 -${burnDamage} HP`
      });
    }
  }

  return { playerState: P, enemyState: E, burnEvents };
}

interface BlockPerCardParams {
  actor: 'player' | 'enemy';
  card: { special?: string | string[] };
  playerState: { block?: number; def?: boolean };
  nextTurnEffects: { blockPerCardExecution?: number };
  addLog: (msg: string) => void;
}

interface BlockPerCardResult {
  playerState: { block?: number; def?: boolean };
  applied: boolean;
}

/**
 * blockPerCardExecution: 카드 실행 시 방어력 추가 (노인의 꿈)
 * 단, 이 효과를 발동시킨 카드 자체(blockPerCard5 special 보유)는 제외
 */
export function processBlockPerCardExecution(params: BlockPerCardParams): BlockPerCardResult {
  const { actor, card, playerState, nextTurnEffects, addLog } = params;
  let P = { ...playerState };
  let applied = false;

  if (actor === 'player') {
    const blockPerCard = nextTurnEffects.blockPerCardExecution || 0;
    const cardSpecials = Array.isArray(card.special) ? card.special : (card.special ? [card.special] : []);
    const isBlockPerCardTrigger = cardSpecials.some((s: string) => s.startsWith('blockPerCard'));

    if (blockPerCard > 0 && !isBlockPerCardTrigger) {
      P.block = (P.block || 0) + blockPerCard;
      P.def = true;
      addLog(`🛡️ 노인의 꿈: 카드 실행 시 방어력 +${blockPerCard}`);
      applied = true;
    }
  }

  return { playerState: P, applied };
}
