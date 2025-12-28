/**
 * @file statusEffects.js
 * @description 상태 효과 관리 (버프/디버프)
 *
 * ## 스탯 버프 시스템
 * - 힘(Strength): 공격력/방어력 증가
 * - 민첩(Agility): 카드 선택 가능 수 증가
 * - 통찰(Insight): 적 행동 미리보기
 * - 재생(Regeneration): 매 턴 체력 회복
 */

// =====================
// 버프 적용
// =====================

/**
 * 힘(Strength) 버프 적용
 * @param {Object} actor - 대상
 * @param {number} amount - 힘 수치
 * @param {number} duration - 지속 턴 (0 = 영구)
 * @returns {Object} - 업데이트된 actor
 */
export function applyStrengthBuff(actor: any, amount: any, duration = 0) {
  return {
    ...actor,
    strength: (actor.strength || 0) + amount,
    strengthDuration: duration
  };
}

/**
 * 민첩(Agility) 버프 적용
 */
export function applyAgilityBuff(actor: any, amount: any, duration = 0) {
  return {
    ...actor,
    agility: (actor.agility || 0) + amount,
    agilityDuration: duration
  };
}

/**
 * 통찰(Insight) 버프 적용
 */
export function applyInsightBuff(actor: any, amount: any, duration = 0) {
  return {
    ...actor,
    insight: (actor.insight || 0) + amount,
    insightDuration: duration
  };
}

/**
 * 재생(Regeneration) 버프 적용
 */
export function applyRegenerationBuff(actor: any, amount: any, duration: any) {
  return {
    ...actor,
    regeneration: amount,
    regenerationDuration: duration
  };
}

// =====================
// 디버프 적용
// =====================

/**
 * 취약(Vulnerable) 디버프 적용
 * @param {Object} actor - 대상
 * @param {number} multiplier - 피해 배율 (1.5 = 50% 증가)
 * @param {number} duration - 지속 턴
 * @returns {Object} - 업데이트된 actor
 */
export function applyVulnerableDebuff(actor: any, multiplier: any, duration: any) {
  return {
    ...actor,
    vulnMult: multiplier,
    vulnTurns: duration
  };
}

/**
 * 약화(Weakness) 디버프 적용
 */
export function applyWeaknessDebuff(actor: any, reduction: any, duration: any) {
  return {
    ...actor,
    weakness: reduction,
    weaknessDuration: duration
  };
}

/**
 * 독(Poison) 디버프 적용
 */
export function applyPoisonDebuff(actor: any, damagePerTurn: any, duration: any) {
  return {
    ...actor,
    poison: damagePerTurn,
    poisonDuration: duration
  };
}

/**
 * 기절(Stun) 디버프 적용
 */
export function applyStunDebuff(actor: any, duration: any) {
  return {
    ...actor,
    stunned: true,
    stunDuration: duration
  };
}

/**
 * 장막(Shroud) 버프 적용 (적 전용, 통찰 방해)
 */
export function applyShroudBuff(actor: any, amount: any, duration = 0) {
  return {
    ...actor,
    shroud: (actor.shroud || 0) + amount,
    shroudDuration: duration
  };
}

// =====================
// 턴 종료 시 효과 감소
// =====================

/**
 * 모든 상태 효과의 지속 시간 감소
 * @param {Object} actor - 대상
 * @returns {Object} - 업데이트된 actor
 */
export function decreaseStatusDurations(actor: any) {
  const updated = { ...actor };

  // 힘
  if (updated.strengthDuration > 0) {
    updated.strengthDuration--;
    if (updated.strengthDuration === 0) {
      updated.strength = 0;
    }
  }

  // 민첩
  if (updated.agilityDuration > 0) {
    updated.agilityDuration--;
    if (updated.agilityDuration === 0) {
      updated.agility = 0;
    }
  }

  // 통찰
  if (updated.insightDuration > 0) {
    updated.insightDuration--;
    if (updated.insightDuration === 0) {
      updated.insight = 0;
    }
  }

  // 재생
  if (updated.regenerationDuration > 0) {
    updated.regenerationDuration--;
    if (updated.regenerationDuration === 0) {
      updated.regeneration = 0;
    }
  }

  // 취약
  if (updated.vulnTurns > 0) {
    updated.vulnTurns--;
    if (updated.vulnTurns === 0) {
      updated.vulnMult = 1;
    }
  }

  // 약화
  if (updated.weaknessDuration > 0) {
    updated.weaknessDuration--;
    if (updated.weaknessDuration === 0) {
      updated.weakness = 0;
    }
  }

  // 독
  if (updated.poisonDuration > 0) {
    updated.poisonDuration--;
    if (updated.poisonDuration === 0) {
      updated.poison = 0;
    }
  }

  // 기절
  if (updated.stunDuration > 0) {
    updated.stunDuration--;
    if (updated.stunDuration === 0) {
      updated.stunned = false;
    }
  }

  // 장막
  if (updated.shroudDuration > 0) {
    updated.shroudDuration--;
    if (updated.shroudDuration === 0) {
      updated.shroud = 0;
    }
  }

  return updated;
}

// =====================
// 턴 시작 시 효과 발동
// =====================

/**
 * 재생 효과 발동
 * @param {Object} actor - 대상
 * @returns {Object} - { actor: 업데이트된 actor, healed: 회복량, log: 로그 메시지 }
 */
export function applyRegenerationEffect(actor: any, actorName: any) {
  if (!actor.regeneration || actor.regeneration <= 0) {
    return { actor, healed: 0, log: null };
  }

  const healed = Math.min(actor.regeneration, actor.maxHp - actor.hp);
  const updatedActor = {
    ...actor,
    hp: Math.min(actor.maxHp, actor.hp + healed)
  };

  const log = `${actorName === 'player' ? '플레이어' : '몬스터'} • 재생 ${healed} (체력 ${actor.hp} -> ${updatedActor.hp})`;

  return { actor: updatedActor, healed, log };
}

/**
 * 독 효과 발동
 * @param {Object} actor - 대상
 * @returns {Object} - { actor: 업데이트된 actor, damage: 피해량, log: 로그 메시지 }
 */
export function applyPoisonEffect(actor: any, actorName: any) {
  if (!actor.poison || actor.poison <= 0) {
    return { actor, damage: 0, log: null };
  }

  const damage = actor.poison;
  const updatedActor = {
    ...actor,
    hp: Math.max(0, actor.hp - damage)
  };

  const log = `${actorName === 'player' ? '플레이어' : '몬스터'} • 독 피해 ${damage} (체력 ${actor.hp} -> ${updatedActor.hp})`;

  return { actor: updatedActor, damage, log };
}

// =====================
// 상태 효과 확인
// =====================

/**
 * 기절 상태 확인
 */
export function isStunned(actor: any) {
  return actor.stunned === true && (actor.stunDuration || 0) > 0;
}

/**
 * 취약 상태 확인
 */
export function isVulnerable(actor: any) {
  return (actor.vulnMult && actor.vulnMult > 1) && (actor.vulnTurns || 0) > 0;
}

/**
 * 활성 버프/디버프 목록 반환
 * @param {Object} actor - 대상
 * @returns {Array} - [{ name, value, duration }, ...]
 */
export function getActiveEffects(actor: any) {
  const effects: any[] = [];

  if (actor.strength && actor.strength !== 0) {
    effects.push({
      name: '힘',
      value: actor.strength,
      duration: actor.strengthDuration || 0,
      type: actor.strength > 0 ? 'buff' : 'debuff'
    });
  }

  if (actor.agility && actor.agility !== 0) {
    effects.push({
      name: '민첩',
      value: actor.agility,
      duration: actor.agilityDuration || 0,
      type: actor.agility > 0 ? 'buff' : 'debuff'
    });
  }

  if (actor.insight && actor.insight !== 0) {
    effects.push({
      name: '통찰',
      value: actor.insight,
      duration: actor.insightDuration || 0,
      type: 'buff'
    });
  }

  if (actor.regeneration && actor.regeneration > 0) {
    effects.push({
      name: '재생',
      value: actor.regeneration,
      duration: actor.regenerationDuration || 0,
      type: 'buff'
    });
  }

  if (isVulnerable(actor)) {
    effects.push({
      name: '취약',
      value: `×${actor.vulnMult.toFixed(1)}`,
      duration: actor.vulnTurns,
      type: 'debuff'
    });
  }

  if (actor.weakness && actor.weakness > 0) {
    effects.push({
      name: '약화',
      value: `-${actor.weakness}`,
      duration: actor.weaknessDuration || 0,
      type: 'debuff'
    });
  }

  if (actor.poison && actor.poison > 0) {
    effects.push({
      name: '독',
      value: actor.poison,
      duration: actor.poisonDuration || 0,
      type: 'debuff'
    });
  }

  if (isStunned(actor)) {
    effects.push({
      name: '기절',
      value: null,
      duration: actor.stunDuration,
      type: 'debuff'
    });
  }

  if (actor.shroud && actor.shroud > 0) {
    effects.push({
      name: '장막',
      value: actor.shroud,
      duration: actor.shroudDuration || 0,
      type: 'buff'
    });
  }

  return effects;
}

// =====================
// 상태 효과 초기화
// =====================

/**
 * 모든 상태 효과 제거
 */
export function clearAllEffects(actor: any) {
  return {
    ...actor,
    strength: 0,
    strengthDuration: 0,
    agility: 0,
    agilityDuration: 0,
    insight: 0,
    insightDuration: 0,
    regeneration: 0,
    regenerationDuration: 0,
    vulnMult: 1,
    vulnTurns: 0,
    weakness: 0,
    weaknessDuration: 0,
    poison: 0,
    poisonDuration: 0,
    stunned: false,
    stunDuration: 0,
    shroud: 0,
    shroudDuration: 0
  };
}
