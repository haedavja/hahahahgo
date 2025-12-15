/**
 * battleSimulation.js
 *
 * 전투 시뮬레이션 및 액션 처리 시스템
 */

import { hasTrait } from "./battleUtils";
import { shouldEnemyOverdrive } from "./enemyAI";

/**
 * 전투 액션 적용 (공격/방어)
 * @param {Object} state - 전투 상태 { player, enemy, log }
 * @param {string} actor - 'player' 또는 'enemy'
 * @param {Object} card - 카드 객체
 * @returns {Object} { dealt, taken, events }
 */
export function applyAction(state, actor, card) {
  const A = actor === 'player' ? state.player : state.enemy;
  const B = actor === 'player' ? state.enemy : state.player;
  const events = [];

  if (card.type === 'defense') {
    const prev = A.block || 0;
    const strengthBonus = A.strength || 0;
    const added = (card.block || 0) + strengthBonus;
    const after = prev + added;
    A.def = true; A.block = after;
    if (card.counter !== undefined) { A.counter = card.counter || 0; }
    const who = actor === 'player' ? '플레이어' : '몬스터';
    const msg = prev === 0 ? `${who} • 🛡️ +${added} = ${after}` : `${who} • 🛡️ ${prev} + ${added} = ${after}`;
    events.push({ actor, card: card.name, type: 'defense', msg });
    state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);
    return { dealt: 0, taken: 0, events };
  }

  if (card.type === 'attack') {
    let totalDealt = 0, totalTaken = 0;
    const hits = card.hits || 1;

    for (let i = 0; i < hits; i++) {
      const base = card.damage;
      const strengthBonus = A.strength || 0; // Strength 보너스
      const boost = (A.etherOverdriveActive) ? 2 : 1;
      let dmg = (base + strengthBonus) * boost; // base에 strength 추가 후 boost 적용

      // 분쇄 (crush) 특성: 방어력에 2배 피해
      const crushMultiplier = hasTrait(card, 'crush') ? 2 : 1;

      if (B.def && (B.block || 0) > 0) {
        const beforeBlock = B.block;
        const effectiveDmg = dmg * crushMultiplier; // 분쇄 적용
        if (effectiveDmg < beforeBlock) {
          const remaining = beforeBlock - effectiveDmg;
          B.block = remaining; dmg = 0;
          const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
          const formula = `(방어력 ${beforeBlock} - 공격력 ${base}${boost > 1 ? '×2' : ''}${crushText} = ${remaining})`;
          const msg = `${actor === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 차단 성공 ${formula}`;
          events.push({ actor, card: card.name, type: 'blocked', msg });
          state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);
        } else {
          const blocked = beforeBlock;
          const remained = Math.max(0, effectiveDmg - blocked);
          const crushText = crushMultiplier > 1 ? ' [분쇄×2]' : '';
          const formula = `(방어력 ${blocked} - 공격력 ${base}${boost > 1 ? '×2' : ''}${crushText} = 0)`;
          B.block = 0;
          const vulnMul = (B.vulnMult && B.vulnMult > 1) ? B.vulnMult : 1;
          const finalDmg = Math.floor(remained * vulnMul);
          const beforeHP = B.hp; B.hp = Math.max(0, B.hp - finalDmg);
          const msg = `${actor === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 차단 ${blocked} ${formula}, 관통 ${finalDmg} (체력 ${beforeHP} -> ${B.hp})`;
          events.push({ actor, card: card.name, type: 'pierce', dmg: finalDmg, beforeHP, afterHP: B.hp, msg });
          state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);
          if (B.counter && finalDmg > 0) {
            const beforeAHP = A.hp; A.hp = Math.max(0, A.hp - B.counter); totalTaken += B.counter;
            const cmsg = `${actor === 'player' ? '몬스터 -> 플레이어' : '플레이어 -> 몬스터'} • 반격 ${B.counter} (체력 ${beforeAHP} -> ${A.hp})`;
            events.push({ actor: 'counter', value: B.counter, msg: cmsg });
            state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${cmsg}`);
          }
          totalDealt += finalDmg;
        }
      } else {
        const vulnMul = (B.vulnMult && B.vulnMult > 1) ? B.vulnMult : 1;
        const finalDmg = Math.floor(dmg * vulnMul);
        const beforeHP = B.hp; B.hp = Math.max(0, B.hp - finalDmg);
        const msg = `${actor === 'player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 데미지 ${finalDmg}${boost > 1 ? ' (에테르 폭주×2)' : ''} (체력 ${beforeHP} -> ${B.hp})`;
        events.push({ actor, card: card.name, type: 'hit', dmg: finalDmg, beforeHP, afterHP: B.hp, msg });
        state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${card.name} → ${msg}`);
        if (B.counter && finalDmg > 0) {
          const beforeAHP = A.hp; A.hp = Math.max(0, A.hp - B.counter); totalTaken += B.counter;
          const cmsg = `${actor === 'player' ? '몬스터→플레이어' : '플레이어→몬스터'} • 반격 ${B.counter} (체력 ${beforeAHP} -> ${A.hp})`;
          events.push({ actor: 'counter', value: B.counter, msg: cmsg });
          state.log.push(`${actor === 'player' ? '🔵' : '👾'} ${cmsg}`);
        }
        totalDealt += finalDmg;
      }
    }
    return { dealt: totalDealt, taken: totalTaken, events };
  }

  return { dealt: 0, taken: 0, events };
}

/**
 * 전투 미리보기 시뮬레이션
 * @param {Object} params - 시뮬레이션 파라미터
 * @returns {Object} { pDealt, pTaken, finalPHp, finalEHp, lines }
 */
export function simulatePreview({ player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions, turnNumber = 1 }) {
  if (!fixedOrder || fixedOrder.length === 0) {
    return { pDealt: 0, pTaken: 0, finalPHp: player.hp, finalEHp: enemy.hp, lines: [] };
  }
  const enemyWillOD = shouldEnemyOverdrive(enemyMode, enemyActions, enemy.etherPts, turnNumber);
  const P = { ...player, def: false, block: 0, counter: 0, etherOverdriveActive: !!willOverdrive, strength: player.strength || 0 };
  const E = { ...enemy, def: false, block: 0, counter: 0, etherOverdriveActive: enemyWillOD, strength: enemy.strength || 0 };
  const st = { player: P, enemy: E, log: [] };
  let pDealt = 0, pTaken = 0; const lines = [];
  for (const step of fixedOrder) {
    const { events, dealt } = applyAction(st, step.actor, step.card);
    if (step.actor === 'player') pDealt += dealt; else pTaken += dealt;
    events.forEach(ev => lines.push(ev.msg));
    if (st.player.hp <= 0) break;
  }
  return { pDealt, pTaken, finalPHp: st.player.hp, finalEHp: st.enemy.hp, lines };
}
