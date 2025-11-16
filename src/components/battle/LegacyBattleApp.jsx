import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import "./legacy-battle.css";
import {
  MAX_SPEED,
  BASE_PLAYER_ENERGY,
  MAX_SUBMIT_CARDS,
  ETHER_THRESHOLD,
  CARDS as BASE_PLAYER_CARDS,
  ENEMY_CARDS as BASE_ENEMY_CARDS,
  ENEMIES,
} from "./battleData";
import { calculateEtherSlots, getCurrentSlotPts, getSlotProgress, getNextSlotCost } from "../../lib/etherUtils";

const SPEED_TICKS = Array.from(
  { length: Math.floor(MAX_SPEED / 5) + 1 },
  (_, idx) => idx * 5,
);

// Lucide icons as simple SVG components
const Sword = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2"/>
    </svg>
);

const Shield = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
);

const Heart = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
);

const Zap = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
);

const Flame = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
);

const Clock = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
    </svg>
);

const Skull = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
        <path d="M8 20v2h8v-2M12.5 17l-.5-1-.5 1h1z"/>
        <path d="M16 18a8 8 0 1 0-8 0v2h8v-2z"/>
    </svg>
);

const X = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
);

const ChevronUp = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="18 15 12 9 6 15"/>
    </svg>
);

const ChevronDown = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="6 9 12 15 18 9"/>
    </svg>
);

const Play = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
);

const StepForward = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>
    </svg>
);

const RefreshCw = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
);

const ICON_MAP = {
  sword: Sword,
  shield: Shield,
  flame: Flame,
  heart: Heart,
  zap: Zap,
  clock: Clock,
};
const CARDS = BASE_PLAYER_CARDS.map(card => ({
  ...card,
  icon: ICON_MAP[card.iconKey] || (card.type === 'attack' ? Sword : Shield),
}));
const ENEMY_CARDS = BASE_ENEMY_CARDS.map(card => ({
  ...card,
  icon: ICON_MAP[card.iconKey] || (card.type === 'attack' ? Sword : Shield),
}));

// =====================
// Utilities
// =====================
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

function sortCombinedOrderStablePF(playerCards, enemyCards) {
  const q = []; let ps = 0, es = 0;
  (playerCards||[]).forEach((c, idx) => { ps += c.speedCost; q.push({ actor: 'player', card: c, sp: ps, idx }); });
  (enemyCards||[]).forEach((c, idx) => { es += c.speedCost; q.push({ actor: 'enemy',  card: c, sp: es, idx }); });
  q.sort((a, b) => {
    if (a.sp !== b.sp) return a.sp - b.sp;
    if (a.actor !== b.actor) return a.actor === 'player' ? -1 : 1;
    return a.idx - b.idx;
  });
  return q;
}

// =====================
// Poker combo helpers
// =====================
function detectPokerCombo(cards){
  if(!cards || cards.length < 2) return null;
  const freq = new Map();
  for(const c of cards){ freq.set(c.actionCost, (freq.get(c.actionCost)||0)+1); }
  const counts = Array.from(freq.values());
  const have = (n)=>counts.includes(n);
  const keysByCount = (n)=> new Set(Array.from(freq.entries()).filter(([k,v])=>v===n).map(([k])=>Number(k)));

  const allAttack = cards.every(c=>c.type==='attack');
  const allDefense = cards.every(c=>c.type==='defense');
  const isFlush = (allAttack || allDefense) && cards.length>=4;

  let result = null;
  if(have(5)) result = { name:'파이브카드', bonusKeys: keysByCount(5) };
  else if(have(4)) result = { name:'포카드',   bonusKeys: keysByCount(4) };
  else if(have(3) && have(2)){
    const b = new Set([...keysByCount(3), ...keysByCount(2)]);
    result = { name:'풀하우스', bonusKeys: b };
  }
  else if(isFlush) result = { name:'플러쉬', bonusKeys: null };
  else {
    const pairKeys = keysByCount(2);
    if(pairKeys.size >= 2) result = { name:'투페어',  bonusKeys: pairKeys };
    else if(have(3)) result = { name:'트리플',  bonusKeys: keysByCount(3) };
    else if(have(2)) result = { name:'페어',    bonusKeys: pairKeys };
  }

  // 디버깅: 조합 감지 로그 (반환값 포함)
  console.log('[detectPokerCombo] 결과:', {
    cardCount: cards.length,
    cards: cards.map(c => ({ name: c.name, type: c.type, cost: c.actionCost })),
    freq: Object.fromEntries(freq),
    counts,
    allAttack,
    allDefense,
    isFlush,
    pairCount: keysByCount(2).size,
    '>>> 반환된 조합': result?.name || 'null'
  });

  return result;
}

function applyPokerBonus(cards, combo){
  if(!combo) return cards;
  return cards.map(c=>{
    if(combo.bonusKeys && combo.bonusKeys.has(c.actionCost)){
      if(c.type==='attack') return { ...c, damage:(c.damage||0)+1, _combo: combo.name };
      if(c.type==='defense') return { ...c, block:(c.block||0)+1, _combo: combo.name };
    }
    return c;
  });
}

const ETHER_GAIN_MAP = {
  '페어': 10,
  '투페어': 10,
  '트리플': 20,
  '플러쉬': 30,
  '풀하우스': 40,
  '포카드': 50,
  '파이브카드': 60,
};
const etherSlots = (pts) => calculateEtherSlots(pts || 0); // 인플레이션 적용
function addEther(pts, add){ return (pts||0) + (add||0); }

// =====================
// Combat Logic
// =====================
function applyAction(state, actor, card){
  const A = actor==='player' ? state.player : state.enemy;
  const B = actor==='player' ? state.enemy  : state.player;
  const events = [];

  if(card.type==='defense'){
    const prev = A.block || 0;
    const added = card.block || 0;
    const after = prev + added;
    A.def = true; A.block = after;
    if(card.counter!==undefined){ A.counter = card.counter || 0; }
    const who = actor==='player' ? '플레이어' : '몬스터';
    const msg = prev===0 ? `${who} • 🛡️ +${added} = ${after}` : `${who} • 🛡️ ${prev} + ${added} = ${after}`;
    events.push({ actor, card:card.name, type:'defense', msg });
    state.log.push(`${actor==='player'?'🔵':'👾'} ${card.name} → ${msg}`);
    return { dealt:0, taken:0, events };
  }

  if(card.type==='attack'){
    let totalDealt = 0, totalTaken = 0;
    const hits = card.hits || 1;

    for(let i=0;i<hits;i++){
      const base = card.damage;
      const boost = (A.etherOverdriveActive) ? 2 : 1;
      let dmg = base * boost;

      if(B.def && (B.block||0) > 0){
        const beforeBlock = B.block;
        if(dmg < beforeBlock){
          const remaining = beforeBlock - dmg;
          B.block = remaining; dmg = 0;
          A.vulnMult = 1 + (remaining * 0.5); A.vulnTurns = 1;
          const formula = `(방어력 ${beforeBlock} - 공격력 ${base}${boost>1?'×2':''} = ${remaining})`;
          const msg = `${actor==='player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 차단 성공 ${formula} + 취약 ×${A.vulnMult.toFixed(1)}`;
          events.push({ actor, card:card.name, type:'blocked', msg });
          state.log.push(`${actor==='player'?'🔵':'👾'} ${card.name} → ${msg}`);
        } else {
          const blocked = beforeBlock;
          const remained = Math.max(0, dmg - blocked);
          const formula = `(방어력 ${blocked} - 공격력 ${base}${boost>1?'×2':''} = 0)`;
          B.block = 0;
          const vulnMul = (B.vulnMult && B.vulnMult>1) ? B.vulnMult : 1;
          const finalDmg = Math.floor(remained * vulnMul);
          const beforeHP = B.hp; B.hp = Math.max(0, B.hp - finalDmg);
          const msg = `${actor==='player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 차단 ${blocked} ${formula}, 관통 ${finalDmg} (체력 ${beforeHP} -> ${B.hp})`;
          events.push({ actor, card:card.name, type:'pierce', dmg:finalDmg, beforeHP, afterHP:B.hp, msg });
          state.log.push(`${actor==='player'?'🔵':'👾'} ${card.name} → ${msg}`);
          if(B.counter && finalDmg>0){
            const beforeAHP = A.hp; A.hp = Math.max(0, A.hp - B.counter); totalTaken += B.counter;
            const cmsg = `${actor==='player' ? '몬스터 -> 플레이어' : '플레이어 -> 몬스터'} • 반격 ${B.counter} (체력 ${beforeAHP} -> ${A.hp})`;
            events.push({ actor:'counter', value:B.counter, msg:cmsg });
            state.log.push(`${actor==='player'?'🔵':'👾'} ${cmsg}`);
          }
          totalDealt += finalDmg;
        }
      } else {
        const vulnMul = (B.vulnMult && B.vulnMult>1) ? B.vulnMult : 1;
        const finalDmg = Math.floor(dmg * vulnMul);
        const beforeHP = B.hp; B.hp = Math.max(0, B.hp - finalDmg);
        const msg = `${actor==='player' ? '플레이어 -> 몬스터' : '몬스터 -> 플레이어'} • 데미지 ${finalDmg}${boost>1?' (에테르 폭주×2)':''} (체력 ${beforeHP} -> ${B.hp})`;
        events.push({ actor, card:card.name, type:'hit', dmg:finalDmg, beforeHP, afterHP:B.hp, msg });
        state.log.push(`${actor==='player'?'🔵':'👾'} ${card.name} → ${msg}`);
        if(B.counter && finalDmg>0){
          const beforeAHP = A.hp; A.hp = Math.max(0, A.hp - B.counter); totalTaken += B.counter;
          const cmsg = `${actor==='player'?'몬스터→플레이어':'플레이어→몬스터'} • 반격 ${B.counter} (체력 ${beforeAHP} -> ${A.hp})`;
          events.push({ actor:'counter', value:B.counter, msg:cmsg });
          state.log.push(`${actor==='player'?'🔵':'👾'} ${cmsg}`);
        }
        totalDealt += finalDmg;
      }
    }
    return { dealt: totalDealt, taken: totalTaken, events };
  }

  return { dealt:0, taken:0, events };
}

// AI: 성향 결정 & 행동 생성
function decideEnemyMode(){
  return choice([
    {name:'공격적', key:'aggro',    prefer:'attack'},
    {name:'수비적', key:'turtle',   prefer:'defense'},
    {name:'균형적', key:'balanced', prefer:'mixed'}
  ]);
}

function combosUpTo3(arr){
  const out=[]; const n=arr.length;
  for(let i=0;i<n;i++){
    out.push([arr[i]]);
    for(let j=i+1;j<n;j++){
      out.push([arr[i],arr[j]]);
      for(let k=j+1;k<n;k++) out.push([arr[i],arr[j],arr[k]]);
    }
  }
  return out;
}

function generateEnemyActions(enemy, mode, enemyEtherSlots=0){
  if(!enemy) return [];
  const energyBudget = BASE_PLAYER_ENERGY + (enemyEtherSlots||0);
  const deck = (enemy.deck||[])
    .map(id=>ENEMY_CARDS.find(c=>c.id===id))
    .filter(Boolean);
  if(deck.length===0) return [];

  const half = Math.ceil(energyBudget/2);
  const candidates = combosUpTo3(deck).filter(cards=>{
    const sp = cards.reduce((s,c)=>s+c.speedCost,0);
    const en = cards.reduce((s,c)=>s+c.actionCost,0);
    return sp<=MAX_SPEED && en<=energyBudget;
  });

  function stat(list){
    const atk = list.filter(c=>c.type==='attack').reduce((a,c)=>a+c.actionCost,0);
    const def = list.filter(c=>c.type==='defense').reduce((a,c)=>a+c.actionCost,0);
    const dmg = list.filter(c=>c.type==='attack').reduce((a,c)=>a + (c.damage||0)*(c.hits||1),0);
    const blk = list.filter(c=>c.type==='defense').reduce((a,c)=>a + (c.block||0),0);
    const sp  = list.reduce((a,c)=>a+c.speedCost,0);
    const en  = list.reduce((a,c)=>a+c.actionCost,0);
    return {atk,def,dmg,blk,sp,en};
  }

  function satisfies(m,list){
    const s = stat(list);
    if(m?.key==='aggro') return s.atk >= half;
    if(m?.key==='turtle') return s.def >= half;
    if(m?.key==='balanced') return s.atk === s.def;
    return true;
  }

  function score(m,list){
    const s = stat(list);
    let base=0;
    if(m?.key==='aggro') base = s.atk*100 + s.dmg*10 - s.sp;
    else if(m?.key==='turtle') base = s.def*100 + s.blk*10 - s.sp;
    else base = (s.dmg+s.blk)*10 - s.sp;
    return base;
  }

  const satisfied = candidates.filter(c=>satisfies(mode,c));
  if(satisfied.length>0){
    satisfied.sort((a,b)=>{
      if(a.length!==b.length) return a.length - b.length;
      const sa=score(mode,a), sb=score(mode,b);
      if(sa!==sb) return sb-sa;
      const saStat=stat(a), sbStat=stat(b);
      if(saStat.sp!==sbStat.sp) return saStat.sp - sbStat.sp;
      if(saStat.en!==sbStat.en) return saStat.en - sbStat.en;
      const aKey=a.map(c=>c.id).join(','), bKey=b.map(c=>c.id).join(',');
      return aKey<bKey? -1 : aKey>bKey? 1 : 0;
    });
    return satisfied[0];
  }

  if(candidates.length>0){
    candidates.sort((a,b)=> score(mode,b)-score(mode,a));
    return candidates[0];
  }
  const single = deck
    .filter(c=>c.speedCost<=MAX_SPEED && c.actionCost<=energyBudget)
    .sort((a,b)=> a.speedCost-b.speedCost || a.actionCost-b.actionCost)[0];
  return single ? [single] : [];
}

function shouldEnemyOverdrive(mode, actions, etherPts){
  const slots = etherSlots(etherPts);
  if(slots<=0) return false;
  if(!mode) return false;
  if(mode.key==='aggro') return true;
  if(mode.key==='balanced') return (actions||[]).some(c=>c.type==='attack');
  return false;
}

function simulatePreview({player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions}){
  if(!fixedOrder || fixedOrder.length===0){
    return { pDealt:0, pTaken:0, finalPHp:player.hp, finalEHp:enemy.hp, lines:[] };
  }
  const enemyWillOD = shouldEnemyOverdrive(enemyMode, enemyActions, enemy.etherPts);
  const P = { ...player, def:false, block:0, counter:0, etherOverdriveActive: !!willOverdrive };
  const E = { ...enemy,  def:false, block:0, counter:0, etherOverdriveActive: enemyWillOD };
  const st = { player:P, enemy:E, log:[] };
  let pDealt=0, pTaken=0; const lines=[];
  for(const step of fixedOrder){
    const {events, dealt} = applyAction(st, step.actor, step.card);
    if(step.actor==='player') pDealt += dealt; else pTaken += dealt;
    events.forEach(ev=> lines.push(ev.msg));
    if(st.player.hp<=0 || st.enemy.hp<=0) break;
  }
  return { pDealt, pTaken, finalPHp: st.player.hp, finalEHp: st.enemy.hp, lines };
}

function ExpectedDamagePreview({player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions, phase}){
  const res = useMemo(()=> simulatePreview({player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions}), [player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions]);
  const summaryItems = [
    { icon:"🗡️", label:"플레이어 예상 가한 피해", value: res.pDealt, accent:"text-emerald-300" },
    { icon:"💥", label:"플레이어 피격 피해", value: phase === 'select' ? '?' : res.pTaken, accent:"text-rose-300" },
  ];
  const hpLines = [
    `플레이어 HP ${player.hp} → ${res.finalPHp}`,
    `몬스터 HP ${enemy.hp} → ${res.finalEHp}`,
  ];
  return (
    <div className="expect-board expect-board-vertical">
      <div className="expect-summary-vertical">
        {summaryItems.map((item)=>(
          <div key={item.label} className="expect-item-vertical">
            <span className="expect-icon">{item.icon}</span>
            <div>
              <div className="expect-label">{item.label}</div>
              <div className={`expect-value ${item.accent}`}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {!!res.lines?.length && (
        <div className="expect-log-vertical">
          {res.lines.map((line,idx)=>(
            <div key={idx} style={{fontSize: '13px', color: '#cbd5e1', marginBottom: '6px'}}>
              <span style={{color: '#94a3b8', marginRight: '4px'}}>{idx + 1}.</span>
              {line}
            </div>
          ))}
        </div>
      )}

      <div className="expect-hp-vertical">
        {hpLines.map((line)=>(
          <div key={line}>{line}</div>
        ))}
        {willOverdrive && <span className="expect-tag">기도 미리보기</span>}
      </div>
    </div>
  );
}

function EtherBar({ pts, slots, previewGain=0, color="cyan", label }){
  const safePts = Number.isFinite(pts) ? pts : 0;
  const derivedSlots = Number.isFinite(slots) ? slots : etherSlots(safePts);
  const safeSlots = Number.isFinite(derivedSlots) ? derivedSlots : 0;
  const safePreview = Number.isFinite(previewGain) ? previewGain : 0;

  // 현재 슬롯 내의 pt (각 슬롯 도달시마다 0으로 리셋)
  const currentPts = getCurrentSlotPts(safePts);
  // 다음 슬롯을 채우는데 필요한 총 pt
  const nextSlotCost = getNextSlotCost(safePts);
  // 다음 슬롯까지의 진행률 (0-1)
  const slotProgress = getSlotProgress(safePts);
  // 시각적 바 높이 = 진행률
  const ratio = Math.max(0, Math.min(1, slotProgress));
  const tier = `x${safeSlots}`;

  // 디버깅: 값 확인
  console.log('[EtherBar]', {
    pts,
    safePts,
    currentPts,
    nextSlotCost,
    ratio,
    tier,
    safeSlots
  });

  const borderColor = color === 'red' ? '#ef4444' : '#53d7ff';
  const fillGradient = color === 'red'
    ? 'linear-gradient(180deg, #fca5a5 0%, #dc2626 100%)'
    : 'linear-gradient(180deg, #6affff 0%, #0f7ebd 100%)';
  const textColor = color === 'red' ? '#fca5a5' : '#8fd3ff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '72px', padding: '12px 10px 16px' }}>
      <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', color: '#5fe0ff', letterSpacing: '0.12em' }}>
        {label}
      </div>
      <div style={{
        position: 'relative',
        width: '46px',
        height: '220px',
        margin: '0 auto',
        borderRadius: '30px',
        border: `2px solid ${borderColor}`,
        background: 'rgba(9, 17, 27, 0.95)',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          left: '3px',
          right: '3px',
          bottom: '3px',
          height: `${ratio * 100}%`,
          borderRadius: '24px',
          background: fillGradient
        }} />
      </div>
      <div style={{ textAlign: 'center', color: textColor, fontSize: '13px', marginTop: '8px' }}>
        <div key={`pts-${safePts}`}>{currentPts}/{nextSlotCost}</div>
        <div>{tier}</div>
        {safePreview > 0 && (
          <div style={{ color: '#6ee7b7', fontSize: '11px', marginTop: '4px' }}>
            +{safePreview}pt 예정
          </div>
        )}
      </div>
    </div>
  );
}

// =====================
// Game Component
// =====================
function Game({ initialPlayer, initialEnemy, playerEther=0, onBattleResult }){
  const safeInitialPlayer = initialPlayer || {};
  const safeInitialEnemy = initialEnemy || {};
  const baseEnergy = safeInitialPlayer.energy ?? BASE_PLAYER_ENERGY;
  const startingEther = typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : playerEther;
  const [player, setPlayer] = useState({ hp:safeInitialPlayer.hp ?? 30, maxHp:safeInitialPlayer.maxHp ?? safeInitialPlayer.hp ?? 30, energy:baseEnergy, maxEnergy:baseEnergy, vulnMult:1, vulnTurns:0, block:0, counter:0, etherPts:startingEther ?? 0, etherOverdriveActive:false });
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [enemy, setEnemy] = useState(()=> safeInitialEnemy?.name ? ({ ...safeInitialEnemy, hp: safeInitialEnemy.hp ?? safeInitialEnemy.maxHp ?? 30, maxHp: safeInitialEnemy.maxHp ?? safeInitialEnemy.hp ?? 30, vulnMult:1, vulnTurns:0, block:0, counter:0, etherPts:0, etherOverdriveActive:false }) : null);

  const [phase, setPhase] = useState('select');

  const [hand, setHand] = useState([]);
  const [selected, setSelected] = useState([]);
  const [canRedraw, setCanRedraw] = useState(true);

  const [enemyPlan, setEnemyPlan] = useState({ actions:[], mode:null });
  const [fixedOrder, setFixedOrder] = useState(null);

  const [postCombatOptions, setPostCombatOptions] = useState(null);
  const [log, setLog] = useState(["게임 시작!"]);
  const [actionEvents, setActionEvents] = useState({});

  const [queue, setQueue] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const addLog = useCallback((m) => {
    setLog(p => [...p, m].slice(-200));
  }, []);
  const [willOverdrive, setWillOverdrive] = useState(false);
  const [usedCardIndices, setUsedCardIndices] = useState([]);
  const logEndRef = useRef(null);
  const initialEtherRef = useRef(typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : (playerEther ?? 0));
  const resultSentRef = useRef(false);
  const notifyBattleResult = useCallback((resultType)=>{
    if(!resultType || resultSentRef.current) return;
    const finalEther = player.etherPts;
    const delta = finalEther - (initialEtherRef.current ?? 0);
    onBattleResult?.({
      result: resultType,
      playerEther: finalEther,
      deltaAether: delta
    });
    resultSentRef.current = true;
  }, [player.etherPts, onBattleResult]);
  const handleExitToMap = ()=>{
    const outcome = postCombatOptions?.type || (enemy && enemy.hp<=0 ? 'victory' : (player && player.hp<=0 ? 'defeat' : null));
    if(!outcome) return;
    const sent = notifyBattleResult(outcome);
    if(!sent && typeof window !== 'undefined' && window.top === window){
      window.location.href = '/';
    }
  };

  useEffect(()=>{
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  useEffect(()=>{
    const nextEther = typeof safeInitialPlayer?.etherPts === 'number'
      ? safeInitialPlayer.etherPts
      : (playerEther ?? player.etherPts);
    initialEtherRef.current = nextEther;
    resultSentRef.current = false;
    setPlayer(prev=>({
      ...prev,
      hp: safeInitialPlayer?.hp ?? prev.hp,
      maxHp: safeInitialPlayer?.maxHp ?? prev.maxHp,
      energy: safeInitialPlayer?.energy ?? prev.energy,
      maxEnergy: safeInitialPlayer?.energy ?? prev.maxEnergy,
      etherPts: nextEther
    }));
    setSelected([]);
    setQueue([]);
    setQIndex(0);
    setFixedOrder(null);
    setPostCombatOptions(null);
    setEnemyPlan({ actions:[], mode:null });
    setPhase('select');
    setHand(CARDS.slice(0,8));
    setCanRedraw(true);
    addLog('🌐 전투 데이터 초기화');
  }, [safeInitialPlayer, playerEther, addLog]);

  useEffect(()=>{
    if(!safeInitialEnemy) return;
    const hp = safeInitialEnemy.hp ?? safeInitialEnemy.maxHp ?? enemy?.maxHp ?? 30;
    setEnemy(prev=>({
      ...(prev||{}),
      deck: safeInitialEnemy.deck || prev?.deck || ENEMIES[enemyIndex]?.deck || [],
      name: safeInitialEnemy.name ?? prev?.name ?? '적',
      hp,
      maxHp: safeInitialEnemy.maxHp ?? hp,
      vulnMult:1,
      vulnTurns:0,
      block:0,
      counter:0,
      etherPts:0,
      etherOverdriveActive:false
    }));
    setSelected([]);
    setQueue([]);
    setQIndex(0);
    setFixedOrder(null);
    setPhase('select');
  }, [safeInitialEnemy, enemyIndex]);

  useEffect(()=>{
    if(postCombatOptions?.type){
      notifyBattleResult(postCombatOptions.type);
    }
  }, [postCombatOptions, notifyBattleResult]);

  useEffect(()=>{
    if(!enemy){
      const e = ENEMIES[enemyIndex];
      setEnemy({ ...e, hp:e.hp, maxHp:e.hp, vulnMult:1, vulnTurns:0, block:0, counter:0, etherPts:0, etherOverdriveActive:false });
      setHand(CARDS.slice(0,8));
      setSelected([]);
      setCanRedraw(true);
      addLog('🎴 시작 손패 8장');
    }
  },[]);

  useEffect(()=>{
    if(!enemy || phase!=='select') return;
    setFixedOrder(null);
    setActionEvents({});
    setCanRedraw(true);
    setWillOverdrive(false);
    setPlayer(p=>({ ...p, energy: BASE_PLAYER_ENERGY + etherSlots(p.etherPts), etherOverdriveActive:false }));

    setEnemyPlan(prev=>{
      if(prev.mode){
        return { ...prev, actions:[] };
      } else {
        const mode = decideEnemyMode();
        addLog(`🤖 적 성향 힌트: ${mode.name}`);
        return { actions:[], mode };
      }
    });
  }, [phase, enemy, enemyPlan.mode]);

  useEffect(()=>{
    if(phase==='resolve' && (!queue || queue.length===0) && fixedOrder && fixedOrder.length>0){
      const rebuilt = fixedOrder.map(x=>({ actor:x.actor, card:x.card, sp:x.sp }));
      setQueue(rebuilt); setQIndex(0);
      addLog('🧯 자동 복구: 실행 큐를 다시 생성했습니다');
    }
  }, [phase, queue, fixedOrder]);

  const totalEnergy = useMemo(()=>selected.reduce((s,c)=>s+c.actionCost,0),[selected]);
  const totalSpeed  = useMemo(()=>selected.reduce((s,c)=>s+c.speedCost ,0),[selected]);
  const currentCombo = useMemo(()=>{
    const combo = detectPokerCombo(selected);
    console.log('[currentCombo 업데이트]', {
      selectedCount: selected.length,
      comboName: combo?.name || 'null'
    });
    return combo;
  },[selected]);
  const pendingComboEther = useMemo(()=>{
    if(!currentCombo) return 0;
    return ETHER_GAIN_MAP[currentCombo.name] || 0;
  }, [currentCombo]);

  const toggle = (card)=>{
    if(phase!=='select' && phase!=='respond') return;
    const exists = selected.some(s=>s.id===card.id);
    if(phase==='respond'){
      setSelected(prev=>{
        let next;
        if(exists){ next = prev.filter(s=>!(s.__uid===card.__uid) && !(s.id===card.id && !('__uid' in s))); }
        else {
          if(prev.length >= MAX_SUBMIT_CARDS){ addLog('⚠️ 최대 5장의 카드만 제출할 수 있습니다'); return prev; }
          if(totalSpeed + card.speedCost > MAX_SPEED){ addLog('⚠️ 속도 초과'); return prev; }
          if(totalEnergy + card.actionCost > (BASE_PLAYER_ENERGY + etherSlots(player.etherPts))){ addLog('⚠️ 행동력 부족'); return prev; }
          next = [...prev, { ...card, __uid: Math.random().toString(36).slice(2)}];
        }
        const combo = detectPokerCombo(next);
        const enhanced = applyPokerBonus(next, combo);
        setFixedOrder(sortCombinedOrderStablePF(enhanced, enemyPlan.actions||[]));
        return next;
      });
      return;
    }
    if(exists){ setSelected(selected.filter(s=>s.id!==card.id)); return; }
    if(selected.length >= MAX_SUBMIT_CARDS) return addLog('⚠️ 최대 5장의 카드만 제출할 수 있습니다');
    if(totalSpeed + card.speedCost > MAX_SPEED) return addLog('⚠️ 속도 초과');
    if(totalEnergy + card.actionCost > (BASE_PLAYER_ENERGY + etherSlots(player.etherPts))) return addLog('⚠️ 행동력 부족');
    setSelected([...selected, { ...card, __uid: Math.random().toString(36).slice(2)}]);
  };

  const moveUp = (i)=>{
    if(i===0) return;
    if(phase==='respond'){
      setSelected(prev=>{
        const n=[...prev]; [n[i-1],n[i]]=[n[i],n[i-1]];
        const combo = detectPokerCombo(n);
        const enhanced = applyPokerBonus(n, combo);
        setFixedOrder(sortCombinedOrderStablePF(enhanced, enemyPlan.actions||[]));
        return n;
      });
    } else {
      const n=[...selected]; [n[i-1],n[i]]=[n[i],n[i-1]]; setSelected(n);
    }
  };

  const moveDown = (i)=>{
    if(i===selected.length-1) return;
    if(phase==='respond'){
      setSelected(prev=>{
        const n=[...prev]; [n[i],n[i+1]]=[n[i+1],n[i]];
        const combo = detectPokerCombo(n);
        const enhanced = applyPokerBonus(n, combo);
        setFixedOrder(sortCombinedOrderStablePF(enhanced, enemyPlan.actions||[]));
        return n;
      });
    } else {
      const n=[...selected]; [n[i],n[i+1]]=[n[i+1],n[i]]; setSelected(n);
    }
  };

  const redrawHand = ()=>{
    if(!canRedraw) return addLog('🔒 이미 이번 턴 리드로우 사용됨');
    setHand(CARDS.slice(0,8)); setSelected([]); setCanRedraw(false); addLog('🔄 손패 리드로우 사용');
  };

  const startResolve = ()=>{
    if(phase!=='select') return;
    const actions = generateEnemyActions(enemy, enemyPlan.mode, etherSlots(enemy.etherPts));
    setEnemyPlan(prev=>({ ...prev, actions }));

    const pCombo = detectPokerCombo(selected);
    const enhancedSelected = applyPokerBonus(selected, pCombo);

    const q = sortCombinedOrderStablePF(enhancedSelected, actions);
    setFixedOrder(q);
    addLog(`🤖 적 카드 공개 (대응 단계)`);
    setPhase('respond');
  };

  useEffect(()=>{
    if(phase==='respond' && enemyPlan.actions && enemyPlan.actions.length>0){
      const combo = detectPokerCombo(selected);
      const enhancedSelected = applyPokerBonus(selected, combo);
      const q = sortCombinedOrderStablePF(enhancedSelected, enemyPlan.actions);
      setFixedOrder(q);
    }
  }, [selected, phase, enemyPlan.actions]);

  const beginResolveFromRespond = ()=>{
    if(!fixedOrder) return addLog('오류: 고정된 순서가 없습니다');

    if(fixedOrder.length===0){
      addLog('⚠️ 실행할 행동이 없습니다. 최소 1장 이상을 유지하거나 적이 행동 가능한 상태여야 합니다.');
      return;
    }

    const pComboNow = detectPokerCombo(selected);
    const eComboNow = detectPokerCombo(enemyPlan.actions);
    if(pComboNow && ETHER_GAIN_MAP[pComboNow.name]){
      const gain = ETHER_GAIN_MAP[pComboNow.name];
      setPlayer(p=>({ ...p, etherPts: addEther(p.etherPts, gain) }));
      addLog(`✴️ 에테르 +${gain} (플레이어 족보: ${pComboNow.name})`);
    }
    if(eComboNow && ETHER_GAIN_MAP[eComboNow.name]){
      const gainE = ETHER_GAIN_MAP[eComboNow.name];
      setEnemy(e=>({ ...e, etherPts: addEther(e.etherPts, gainE) }));
      addLog(`☄️ 적 에테르 +${gainE} (적 족보: ${eComboNow.name})`);
    }

    const enemyWillOD = shouldEnemyOverdrive(enemyPlan.mode, enemyPlan.actions, enemy.etherPts) && etherSlots(enemy.etherPts)>0;
    if((phase==='respond' || phase==='select') && willOverdrive && etherSlots(player.etherPts)>0){
      setPlayer(p=>({ ...p, etherPts: p.etherPts - ETHER_THRESHOLD, etherOverdriveActive:true }));
      addLog('✴️ 에테르 폭주 발동! (이 턴 전체 유지)');
    }
    if((phase==='respond' || phase==='select') && enemyWillOD){
      setEnemy(e=>({ ...e, etherPts: e.etherPts - ETHER_THRESHOLD, etherOverdriveActive:true }));
      addLog('☄️ 적 에테르 폭주 발동!');
    }

    const newQ = fixedOrder.map(x=>({ actor:x.actor, card:x.card, sp:x.sp }));
    if(newQ.length===0){
      addLog('⚠️ 큐 생성 실패: 실행할 항목이 없습니다');
      return;
    }
    setQueue(newQ);
    setQIndex(0); setPhase('resolve'); addLog('▶ 진행 시작');
  };

  const stepOnce = ()=>{
    if(qIndex>=queue.length) return;
    const a = queue[qIndex];

    // 카드 사용 이펙트 추가
    if(a.actor === 'player') {
      setUsedCardIndices(prev => [...prev, qIndex]);
      setTimeout(() => {
        setUsedCardIndices(prev => prev.filter(i => i !== qIndex));
      }, 800);
    }

    const P = { ...player, def: player.def||false, block: player.block||0, counter: player.counter||0, vulnMult: player.vulnMult||1 };
    const E = { ...enemy,  def: enemy.def||false,  block: enemy.block||0,  counter: enemy.counter||0,  vulnMult: enemy.vulnMult||1 };
    const tempState = { player:P, enemy:E, log:[] };
    const {events} = applyAction(tempState, a.actor, a.card);

    setPlayer(prev=>({ ...prev, hp:P.hp, def:P.def, block:P.block, counter:P.counter, vulnMult:P.vulnMult||1 }));
    setEnemy(prev=>({  ...prev, hp:E.hp, def:E.def, block:E.block, counter:E.counter, vulnMult:E.vulnMult||1 }));
    setActionEvents(prev=>({ ...prev, [qIndex]: events }));
    events.forEach(ev=> addLog(ev.msg));
    setQIndex(prev=>prev+1);

    if(P.hp<=0){ setPostCombatOptions({ type:'defeat' }); setPhase('post'); return; }
    if(E.hp<=0){ setPostCombatOptions({ type:'victory' }); setPhase('post'); return; }
  };

  const finishTurn = (reason)=>{
    addLog(`턴 종료: ${reason||''}`);
    setPlayer(p=>({ ...p, block:0, def:false, counter:0, vulnMult:1, vulnTurns:0, etherOverdriveActive:false }));
    setEnemy(e=>({ ...e, block:0, def:false, counter:0, vulnMult:1, vulnTurns:0, etherOverdriveActive:false }));
    setSelected([]); setQueue([]); setQIndex(0); setFixedOrder(null); setUsedCardIndices([]);
    setPhase('select');
  };

  const runAll = ()=>{
    if(qIndex>=queue.length) return;
    let P = { ...player, def: player.def||false, block: player.block||0, counter: player.counter||0, vulnMult: player.vulnMult||1 };
    let E = { ...enemy,  def: enemy.def||false,  block: enemy.block||0,  counter: enemy.counter||0,  vulnMult: enemy.vulnMult||1 };
    const tempState = { player:P, enemy:E, log:[] };
    const newEvents = {};

    for(let i=qIndex;i<queue.length;i++){
      const a = queue[i];
      const {events} = applyAction(tempState, a.actor, a.card);
      newEvents[i] = events;
      events.forEach(ev=> addLog(ev.msg));
      if(P.hp<=0){
        setPlayer(prev=>({ ...prev, hp:P.hp, def:P.def, block:P.block, counter:P.counter, vulnMult:P.vulnMult||1 }));
        setEnemy(prev=>({  ...prev, hp:E.hp, def:E.def, block:E.block, counter:E.counter, vulnMult:E.vulnMult||1 }));
        setActionEvents(prev=>({ ...prev, ...newEvents }));
        setQIndex(i+1);
        setPostCombatOptions({ type:'defeat' }); setPhase('post');
        return;
      }
      if(E.hp<=0){
        setPlayer(prev=>({ ...prev, hp:P.hp, def:P.def, block:P.block, counter:P.counter, vulnMult:P.vulnMult||1 }));
        setEnemy(prev=>({  ...prev, hp:E.hp, def:E.def, block:E.block, counter:E.counter, vulnMult:E.vulnMult||1 }));
        setActionEvents(prev=>({ ...prev, ...newEvents }));
        setQIndex(i+1);
        setPostCombatOptions({ type:'victory' }); setPhase('post');
        return;
      }
    }
    setPlayer(prev=>({ ...prev, hp:P.hp, def:P.def, block:P.block, counter:P.counter, vulnMult:P.vulnMult||1 }));
    setEnemy(prev=>({  ...prev, hp:E.hp, def:E.def, block:E.block, counter:E.counter, vulnMult:E.vulnMult||1 }));
    setActionEvents(prev=>({ ...prev, ...newEvents }));
    setQIndex(queue.length);
  };

  const removeSelectedAt = (i)=> setSelected(selected.filter((_,idx)=>idx!==i));

  const playerTimeline = useMemo(()=>{
    if(phase==='select'){
      let ps=0; return selected.map((c,idx)=>{ ps+=c.speedCost; return { actor:'player', card:c, sp:ps, idx }; });
    }
    if(phase==='respond' && fixedOrder) return fixedOrder.filter(x=>x.actor==='player');
    if(phase==='resolve') return queue.filter(x=>x.actor==='player');
    return [];
  }, [phase, selected, fixedOrder, queue]);

  const enemyTimeline = useMemo(()=>{
    if(phase==='select') return [];
    if(phase==='respond' && fixedOrder) return fixedOrder.filter(x=>x.actor==='enemy');
    if(phase==='resolve') return queue.filter(x=>x.actor==='enemy');
    return [];
  }, [phase, fixedOrder, queue]);

  if(!enemy) return <div className="text-white p-4">로딩…</div>;

  const handDisabled = (c)=> (
    selected.length >= MAX_SUBMIT_CARDS ||
    totalSpeed + c.speedCost > MAX_SPEED ||
    totalEnergy + c.actionCost > (BASE_PLAYER_ENERGY + etherSlots(player.etherPts))
  );
  const playerEtherValue = player?.etherPts ?? 0;
  const playerEtherSlots = etherSlots(playerEtherValue);
  const enemyEtherValue = enemy?.etherPts ?? 0;
  const enemyEtherSlots = etherSlots(enemyEtherValue);
  const playerEnergyBudget = BASE_PLAYER_ENERGY + etherSlots(player.etherPts);
  const remainingEnergy = Math.max(0, playerEnergyBudget - totalEnergy);
  const comboPreviewGain = (phase==='select' || phase==='respond') ? pendingComboEther : 0;

  // 적 조합 에테르 미리보기 계산
  const enemyCombo = useMemo(() => detectPokerCombo(enemyPlan.actions || []), [enemyPlan.actions]);
  const enemyComboPreviewGain = useMemo(() => {
    if (!enemyCombo || (phase !== 'respond' && phase !== 'resolve')) return 0;
    return ETHER_GAIN_MAP[enemyCombo.name] || 0;
  }, [enemyCombo, phase]);

  return (
    <div className="legacy-battle-root w-full min-h-screen pb-64">
      {/* 예상 피해량 - 오른쪽 고정 패널 */}
      {(phase==='respond' || phase==='select') && (
        <div className="expect-sidebar-fixed">
          <ExpectedDamagePreview
            player={player}
            enemy={enemy}
            fixedOrder={fixedOrder||playerTimeline}
            willOverdrive={willOverdrive}
            enemyMode={enemyPlan.mode}
            enemyActions={enemyPlan.actions}
            phase={phase}
          />
        </div>
      )}

      {/* 상단 메인 영역 */}
      <div className="w-full px-4" style={{marginRight: (phase==='respond' || phase==='select') ? '340px' : '0'}}>

        {/* Timeline */}
        <div style={{marginBottom: '24px'}}>
          <div className="panel-enhanced timeline-panel">
            <div className="timeline-header">
              <div className="text-white font-bold flex items-center gap-2">
                <Clock size={20} className="text-cyan-400"/>
                타임라인 (누적 속도) — {phase==='select'? '선택' : (phase==='respond'? '대응/예측' : (phase==='resolve' ? '진행' : '결과'))}
              </div>
              <span className="text-xs text-slate-400 ml-2">(동률 시 플레이어 우선)</span>
            </div>

            <div className="timeline-body">
              <div className="timeline-axis">
                {SPEED_TICKS.map((tick)=>(
                  <span key={tick}>{tick}</span>
                ))}
              </div>
              <div className="timeline-lanes">
                <div className="timeline-lane player-lane">
                  {Array.from({length: MAX_SPEED + 1}).map((_,i)=>(
                    <div key={i} className="timeline-gridline" style={{left:`${(i/MAX_SPEED)*100}%`}} />
                  ))}
                  {playerTimeline.map((a,idx)=>{
                    const Icon = a.card.icon || Sword;
                    const sameCount = playerTimeline.filter((q,i)=>i<idx && q.sp===a.sp).length;
                    const offset = sameCount*28;
                    const num = a.card.type==='attack' ? (a.card.damage*(a.card.hits||1)) : (a.card.block || 0);
                    return (
                      <div key={idx}
                           className="timeline-marker marker-player"
                           style={{left:`${(a.sp/MAX_SPEED)*100}%`, top:`${6+offset}px`}}>
                        <Icon size={14} className="text-white"/>
                        <span className="text-white text-xs font-bold">{num>0?num:''}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="timeline-lane enemy-lane">
                  {Array.from({length: MAX_SPEED + 1}).map((_,i)=>(
                    <div key={i} className="timeline-gridline" style={{left:`${(i/MAX_SPEED)*100}%`}} />
                  ))}
                  {enemyTimeline.map((a,idx)=>{
                    const Icon = a.card.icon || Shield;
                    const sameCount = enemyTimeline.filter((q,i)=>i<idx && q.sp===a.sp).length;
                    const offset = sameCount*28;
                    const num = a.card.type==='attack' ? (a.card.damage*(a.card.hits||1)) : (a.card.block || 0);
                    return (
                      <div key={idx}
                           className="timeline-marker marker-enemy"
                           style={{left:`${(a.sp/MAX_SPEED)*100}%`, top:`${6+offset}px`}}>
                        <Icon size={14} className="text-white"/>
                        <span className="text-white text-xs font-bold">{num>0?num:''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="battle-shell">
          <div className="battle-main">
            <div className="entity-panel player-panel">
              <div className="entity-body">
                <EtherBar
                  key={`player-ether-${playerEtherValue}`}
                  pts={playerEtherValue}
                  slots={playerEtherSlots}
                  previewGain={comboPreviewGain}
                  label="ETHER"
                />
                <div>
                  <div className="entity-name" style={{marginBottom: '8px'}}>플레이어</div>
                  <div className="hp-bar-enhanced mb-2" style={{width: '200px'}}>
                    <div className="hp-fill" style={{width: `${(player.hp/player.maxHp)*100}%`}}></div>
                  </div>
                  <div className="text-white font-black text-lg mb-1">❤️ {player.hp}/{player.maxHp}</div>
                  <div className="entity-tags">
                    {player.block>0 && <span className="badge">🛡️ {player.block}</span>}
                    {player.vulnMult>1 && <span className="badge">취약 ×{player.vulnMult.toFixed(1)}</span>}
                    {player.etherOverdriveActive && <span className="badge badge-primary">⚡폭주</span>}
                  </div>
                  <button onClick={()=> (phase==='select' || phase==='respond') && setWillOverdrive(v=>!v)}
                          disabled={!(phase==='select'||phase==='respond') || etherSlots(player.etherPts)<=0}
                          className={`mt-2 btn-enhanced ${willOverdrive? 'btn-primary':''} text-sm`}>
                    🙏 기도 {willOverdrive?'ON':'OFF'}
                  </button>
                </div>
                <div className="character-display">🧙‍♂️</div>
              </div>
            </div>
            <div className="vs-panel">
              <div className="vs-icon">⚔️</div>
              <div className="vs-status">
                {phase==='respond' ? "대응 단계" : phase==='resolve' ? `진행 중 (${qIndex}/${queue?.length || 0})` : "선택 단계"}
              </div>
              <div className="vs-log">
                {log.slice(-6).map((l,i)=>(<div key={i}>{l}</div>))}
              </div>
            </div>
            <div className="entity-panel enemy-panel">
              <div className="entity-body">
                <div>
                  <div className="entity-name text-right" style={{marginBottom: '8px'}}>{enemy.name}</div>
                  <div className="hp-bar-enhanced mb-2" style={{width: '200px'}}>
                    <div className="hp-fill" style={{width: `${(enemy.hp/enemy.maxHp)*100}%`}}></div>
                  </div>
                  <div className="text-white font-black text-lg mb-1 text-right">❤️ {enemy.hp}/{enemy.maxHp}</div>
                  <div className="entity-tags justify-end">
                    {enemy.block>0 && <span className="badge">🛡️ {enemy.block}</span>}
                    {enemy.vulnMult>1 && <span className="badge">취약 ×{enemy.vulnMult.toFixed(1)}</span>}
                    {enemy.etherOverdriveActive && <span className="badge badge-secondary">⚡폭주</span>}
                  </div>
                  <div className="text-slate-400 text-sm mt-1 text-right">적 {enemyIndex+1}/{ENEMIES.length}</div>
                </div>
                <div className="character-display">👹</div>
                <EtherBar
                  key={`enemy-ether-${enemyEtherValue}`}
                  pts={enemyEtherValue}
                  slots={enemyEtherSlots}
                  previewGain={enemyComboPreviewGain}
                  label="ETHER"
                  color="red"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 고정 손패 영역 */}
      {(phase==='select' || phase==='respond' || phase==='resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0)) && (
        <div className="hand-area">
          <div className="hand-area-header">
            <div className="hand-heading">
              <div className="hand-title">손패</div>
              <div className="hand-energy">
                <div className="energy-orb-large">
                  {remainingEnergy}
                </div>
                <div className="hand-meta">
                  <div className="hand-meta-line">남은 에너지</div>
                  <div className="hand-meta-line">
                    속도 {totalSpeed}/{MAX_SPEED} · 선택 {selected.length}/{MAX_SUBMIT_CARDS}
                  </div>
                </div>
              </div>
            </div>

            <div className="hand-combo">
              {(phase==='select' || phase==='respond') && currentCombo && (
                <div className="combo-display">
                  {currentCombo.name}
                  {pendingComboEther > 0 && (
                    <span style={{fontSize: '0.85em', marginLeft: '8px', color: '#6ee7b7'}}>
                      +{pendingComboEther} pt
                    </span>
                  )}
                </div>
              )}
              {phase==='resolve' && (
                <div className="text-white font-black text-xl">⚔️ 전투 진행 중... ({qIndex}/{queue?.length || 0})</div>
              )}
            </div>

            <div className="hand-actions">
              {phase==='select' && (
                <>
                  <button onClick={redrawHand} disabled={!canRedraw} className="btn-enhanced flex items-center gap-2">
                    <RefreshCw size={18}/> 리드로우
                  </button>
                  <button onClick={startResolve} disabled={selected.length===0} className="btn-enhanced btn-primary flex items-center gap-2">
                    <Play size={20}/> 제출
                  </button>
                </>
              )}
              {phase==='respond' && (
                <button onClick={beginResolveFromRespond} className="btn-enhanced btn-success flex items-center gap-2">
                  <Play size={20}/> 진행 시작
                </button>
              )}
              {phase==='resolve' && (
                <>
                  <button onClick={stepOnce} disabled={qIndex>=queue.length} className="btn-enhanced flex items-center gap-2">
                    <StepForward size={18}/> 한 단계
                  </button>
                  <button onClick={runAll} disabled={qIndex>=queue.length} className="btn-enhanced btn-primary">
                    전부 실행
                  </button>
                  {qIndex >= queue.length && (
                    <button onClick={()=>finishTurn('수동 턴 종료')} className="btn-enhanced flex items-center gap-2">
                      ⏭️ 턴 종료
                    </button>
                  )}
                  {postCombatOptions && (
                    <button onClick={handleExitToMap} className="btn-enhanced btn-primary flex items-center gap-2">
                      🗺️ 맵으로 돌아가기
                    </button>
                  )}
                </>
              )}
              {player && player.hp <= 0 && (
                <button onClick={()=>window.location.reload()} className="btn-enhanced flex items-center gap-2">
                  🔄 재시작
                </button>
              )}
            </div>
          </div>

          <div className="hand-flags">
            {enemy && enemy.hp <= 0 && (
              <div className="hand-flag victory">🏆 적 처치!</div>
            )}
            {player && player.hp <= 0 && (
              <div className="hand-flag defeat">💀 패배...</div>
            )}
          </div>

          {phase==='select' && (
            <div className="hand-cards">
              {hand.map((c,idx)=>{
                const Icon=c.icon;
                const selIndex = selected.findIndex(s=>s.id===c.id);
                const sel = selIndex !== -1;
                const disabled = handDisabled(c) && !sel;
                return (
                  <button key={c.id+idx} onClick={()=>toggle(c)} disabled={disabled}
                          className={`game-card-large ${c.type==='attack' ? 'attack' : 'defense'} ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}>
                    <div className="card-cost-corner">{c.actionCost}</div>
                    {sel && <div className="selection-number">{selIndex + 1}</div>}
                    <div className="card-header">
                      <div className="text-white font-black text-sm">{c.name}</div>
                    </div>
                    <div className="card-icon-area">
                      <Icon size={60} className="text-white opacity-80"/>
                    </div>
                    <div className="card-footer">
                      <div className="flex items-center justify-center gap-2 text-white text-sm font-bold">
                        {c.damage && <span className="text-red-300">⚔️{c.damage}{c.hits?`×${c.hits}`:''}</span>}
                        {c.block && <span className="text-blue-300">🛡️{c.block}</span>}
                        {c.counter!==undefined && <span className="text-purple-300">⚡{c.counter}</span>}
                      </div>
                      <div className="text-cyan-300 text-xs mt-1">⏱️{c.speedCost}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {phase==='respond' && fixedOrder && (
            <div className="hand-cards">
              {fixedOrder.filter(a=>a.actor==='player').map((action,idx,arr)=>{
                const c = action.card;
                const Icon = c.icon;
                return (
                  <div key={idx} style={{display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center'}}>
                    <div className={`game-card-large ${c.type==='attack' ? 'attack' : 'defense'}`}>
                      <div className="card-cost-corner">{c.actionCost}</div>
                      <div className="card-header">
                        <div className="text-white font-black text-sm">{c.name}</div>
                      </div>
                      <div className="card-icon-area">
                        <Icon size={60} className="text-white opacity-80"/>
                      </div>
                      <div className="card-footer">
                        <div className="flex items-center justify-center gap-2 text-white text-sm font-bold">
                          {c.damage && <span className="text-red-300">⚔️{c.damage}{c.hits?`×${c.hits}`:''}</span>}
                          {c.block && <span className="text-blue-300">🛡️{c.block}</span>}
                          {c.counter!==undefined && <span className="text-purple-300">⚡{c.counter}</span>}
                        </div>
                        <div className="text-cyan-300 text-xs mt-1">⏱️{c.speedCost}</div>
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: '8px'}}>
                      {idx > 0 && (
                        <button onClick={()=>{
                          const playerActions = fixedOrder.filter(a=>a.actor==='player');
                          const newPlayerActions = [...playerActions];
                          [newPlayerActions[idx-1], newPlayerActions[idx]] = [newPlayerActions[idx], newPlayerActions[idx-1]];
                          const enemyActions = fixedOrder.filter(a=>a.actor==='enemy');
                          setFixedOrder(sortCombinedOrderStablePF(newPlayerActions.map(a=>a.card), enemyActions.map(a=>a.card)));
                        }} className="btn-enhanced text-xs" style={{padding: '4px 12px'}}>
                          ←
                        </button>
                      )}
                      {idx < arr.length - 1 && (
                        <button onClick={()=>{
                          const playerActions = fixedOrder.filter(a=>a.actor==='player');
                          const newPlayerActions = [...playerActions];
                          [newPlayerActions[idx], newPlayerActions[idx+1]] = [newPlayerActions[idx+1], newPlayerActions[idx]];
                          const enemyActions = fixedOrder.filter(a=>a.actor==='enemy');
                          setFixedOrder(sortCombinedOrderStablePF(newPlayerActions.map(a=>a.card), enemyActions.map(a=>a.card)));
                        }} className="btn-enhanced text-xs" style={{padding: '4px 12px'}}>
                          →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {phase==='resolve' && queue && queue.length > 0 && (
            <div className="hand-cards">
              {queue.filter(a => a.actor === 'player').map((a,i)=>{
                const Icon = a.card.icon;
                const globalIndex = queue.findIndex(q => q === a);
                const isUsed = usedCardIndices.includes(globalIndex);
                const isPast = globalIndex < qIndex;
                return (
                  <div key={`resolve-${globalIndex}`}
                       className={`game-card-large ${a.card.type==='attack' ? 'attack' : 'defense'} ${isUsed ? 'card-used' : ''} ${isPast ? 'opacity-30' : ''}`}>
                    <div className="card-cost-corner">{a.card.actionCost}</div>
                    <div className="card-header">
                      <div className="text-white font-black text-sm">{a.card.name}</div>
                    </div>
                    <div className="card-icon-area">
                      <Icon size={60} className="text-white opacity-80"/>
                    </div>
                    <div className="card-footer">
                      <div className="flex items-center justify-center gap-2 text-white text-sm font-bold">
                        {a.card.damage && <span className="text-red-300">⚔️{a.card.damage}{a.card.hits?`×${a.card.hits}`:''}</span>}
                        {a.card.block && <span className="text-blue-300">🛡️{a.card.block}</span>}
                        {a.card.counter!==undefined && <span className="text-purple-300">⚡{a.card.counter}</span>}
                      </div>
                      <div className="text-cyan-300 text-xs mt-1">⏱️{a.card.speedCost}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const LegacyBattleApp = ({ initialPlayer, initialEnemy, playerEther, onBattleResult = () => {} }) => (
  <Game
    initialPlayer={initialPlayer}
    initialEnemy={initialEnemy}
    playerEther={playerEther}
    onBattleResult={onBattleResult}
  />
);

export default LegacyBattleApp;
