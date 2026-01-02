/**
 * @file defenseLogic.ts
 * @description 방어 행동 처리 로직
 *
 * combatActions.ts에서 분리됨
 *
 * ## 방어력 계산 공식
 * 최종 방어력 = (카드 기본값 + 힘 보너스 + 성장 보너스) × 교차 배율 + 홀로그램 보너스
 */

import type {
  Card,
  Combatant,
  BattleContext,
  DefenseCard,
  DefenseResult,
  BattleEvent
} from '../../../types';
import { applyTokenEffectsToCard, consumeTokens } from '../../../lib/tokenEffects';
import { addToken } from '../../../lib/tokenUtils';
import { calculateGrowingDefense, hasSpecial } from '../utils/cardSpecialEffects';
import { getCombatTokens } from '../../../lib/logosEffects';
import { isSwordCard } from '../../../lib/ethosEffects';

/**
 * 방어 행동 적용
 * @param actor - 행동 주체 (player 또는 enemy)
 * @param card - 사용한 카드
 * @param actorName - 'player' 또는 'enemy'
 * @param battleContext - 전투 컨텍스트 (special 효과용)
 * @returns { actor: 업데이트된 actor, events: 이벤트 배열, log: 로그 메시지 }
 */
export function applyDefense(
  actor: Combatant,
  card: Card | DefenseCard,
  actorName: 'player' | 'enemy',
  battleContext: BattleContext = {}
): DefenseResult {
  // ignoreStatus 특성이 있으면 토큰 효과 미적용
  // 유령카드도 토큰 효과 적용 (수세 등), 단 토큰 소모는 안 함
  const isGhost = card.isGhost === true;
  const skipTokenEffects = card.ignoreStatus === true;
  const tokenResult = skipTokenEffects
    ? { modifiedCard: card as DefenseCard, consumedTokens: [] }
    : applyTokenEffectsToCard(card, actor, 'defense');
  const modifiedCard = tokenResult.modifiedCard;
  // 유령카드는 토큰 소모 안 함 (원본 카드에서만 소모)
  const consumedTokens = isGhost ? [] : tokenResult.consumedTokens;

  const prev = actor.block || 0;
  // ignoreStrength 특성이 있으면 힘 보너스 무시 (방어자세)
  const strengthBonus = modifiedCard.ignoreStrength ? 0 : (actor.strength || 0);

  // growingDefense 특성: 타임라인이 지날수록 방어력 증가
  const currentSp = battleContext.currentSp || 0;
  const growingDefenseBonus = calculateGrowingDefense(modifiedCard, currentSp);

  // 교차 특성: block_mult 타입일 경우 방어력 배수 적용
  let crossBlockMult = 1;
  let crossBonusText = '';
  const hasCrossTrait = modifiedCard.traits && modifiedCard.traits.includes('cross');
  if (hasCrossTrait && modifiedCard.crossBonus?.type === 'block_mult') {
    const { queue = [], currentQIndex = 0 } = battleContext;
    const oppositeActor = actorName === 'player' ? 'enemy' : 'player';

    const isOverlapping = queue.some((q, idx) => {
      if (q.actor !== oppositeActor) return false;
      if (idx <= currentQIndex) return false;
      const spDiff = Math.abs((q.sp || 0) - currentSp);
      return spDiff < 1;
    });

    if (isOverlapping) {
      crossBlockMult = modifiedCard.crossBonus.value || 2;
      crossBonusText = ` (교차 ${crossBlockMult}배!)`;
    }
  }

  // hologram 특수 효과: 최대 체력만큼 방어력 획득
  let hologramBlock = 0;
  if (hasSpecial(modifiedCard, 'hologram')) {
    hologramBlock = actor.maxHp || actor.hp || 0;
  }

  const baseBlock = hologramBlock > 0
    ? hologramBlock + strengthBonus + growingDefenseBonus
    : ((modifiedCard.block || modifiedCard.defense || 0) + strengthBonus + growingDefenseBonus);
  const added = Math.floor(baseBlock * crossBlockMult);
  const after = prev + added;

  // 소모된 토큰 제거
  let tokenLogs: string[] = [];
  let updatedTokens = actor.tokens;
  if (consumedTokens.length > 0) {
    const consumeResult = consumeTokens(actor, consumedTokens);
    updatedTokens = consumeResult.tokens;
    tokenLogs = consumeResult.logs;
  }

  let updatedActor = {
    ...actor,
    def: true,
    block: after,
    counter: card.counter !== undefined ? (card.counter || 0) : actor.counter,
    tokens: updatedTokens
  };

  // heal5 특수 효과: 체력 5 회복
  let healText = '';
  if (hasSpecial(modifiedCard, 'heal5')) {
    const maxHp = actor.maxHp || actor.hp;
    const healAmount = 5;
    const beforeHp = updatedActor.hp;
    const newHp = Math.min(maxHp, beforeHp + healAmount);
    const actualHeal = newHp - beforeHp;
    if (actualHeal > 0) {
      updatedActor = { ...updatedActor, hp: newHp };
      healText = ` 💚 +${actualHeal} HP`;
    }
  }

  // 로고스 효과: 배틀 왈츠 Lv3 - 검격 방어 시 수세 토큰 획득
  let logosTokenText = '';
  if (actorName === 'player' && isSwordCard(card)) {
    const combatTokens = getCombatTokens();
    if (combatTokens.onDefense) {
      const tokenResult = addToken(updatedActor, combatTokens.onDefense, 1);
      updatedActor = { ...updatedActor, tokens: tokenResult.tokens };
      logosTokenText = ` ✨ ${combatTokens.onDefense} 획득`;
      tokenLogs.push(`배틀 왈츠: 검격 방어! ${combatTokens.onDefense} 획득`);
    }
  }

  // 파토스 효과: onCrossBlock - 교차 시 추가 방어력
  if (actorName === 'player' && battleContext.pathosTurnEffects?.onCrossBlock) {
    const { queue = [], currentQIndex = 0 } = battleContext;
    const isOverlapping = queue.some((q, idx) => {
      if (q.actor !== 'enemy') return false;
      if (idx <= currentQIndex) return false;
      const spDiff = Math.abs((q.sp || 0) - currentSp);
      return spDiff < 1;
    });

    if (isOverlapping) {
      const crossBlockBonus = battleContext.pathosTurnEffects.onCrossBlock;
      updatedActor = { ...updatedActor, block: (updatedActor.block || 0) + crossBlockBonus };
      tokenLogs.push(`⚔️ 교차 방어: +${crossBlockBonus} 방어력`);
    }
  }

  // 파토스 효과: onSwordBlock - 검격 방어 시 추가 방어력
  if (actorName === 'player' && isSwordCard(card) && battleContext.pathosTurnEffects?.onSwordBlock) {
    const swordBlockBonus = battleContext.pathosTurnEffects.onSwordBlock;
    updatedActor = { ...updatedActor, block: (updatedActor.block || 0) + swordBlockBonus };
    tokenLogs.push(`⚔️ 검격 방어: +${swordBlockBonus} 방어력`);
  }

  const enemyName = battleContext.enemyDisplayName || '몬스터';
  const who = actorName === 'player' ? `플레이어(${card.name})` : `${enemyName}(${card.name})`;
  const growingText = growingDefenseBonus > 0 ? ` (+${growingDefenseBonus} 방어자세)` : '';
  const hologramText = hologramBlock > 0 ? ' (최대체력)' : '';
  const blockMsg = added > 0
    ? (prev === 0
        ? `🛡️ +${added}${hologramText}${growingText}${crossBonusText} = ${after}`
        : `🛡️ ${prev} + ${added}${hologramText}${growingText}${crossBonusText} = ${after}`)
    : '🛡️ +0';
  const msg = `${who} • ${blockMsg}${healText}`.trim();

  const event: { actor: 'player' | 'enemy'; card?: string; type?: string; msg: string } = {
    actor: actorName,
    card: card.name,
    type: 'defense',
    msg
  };

  const logMsg = msg;
  const allLogs = tokenLogs.length > 0 ? [logMsg, ...tokenLogs] : [logMsg];

  return {
    actor: updatedActor,
    dealt: 0,
    taken: 0,
    events: [event as BattleEvent],
    log: allLogs.join(' | ')
  };
}
