import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import "./legacy-battle.css";
import { playHitSound, playBlockSound, playCardSubmitSound, playProceedSound } from "../../lib/soundUtils";
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
import { CharacterSheet } from "../character/CharacterSheet";
import { useGameStore } from "../../state/gameStore";

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

// 에테르 Deflation: 같은 조합을 반복할수록 획득량 감소
// 1번: 100%, 2번: 50%, 3번: 25%, ... 0에 수렴
// deflationMultiplier: 추후 카드/아이템으로 조정 가능 (기본값 0.5)
function applyEtherDeflation(baseGain, comboName, comboUsageCount, deflationMultiplier = 0.5) {
  const usageCount = comboUsageCount[comboName] || 0;
  const multiplier = Math.pow(deflationMultiplier, usageCount);
  return {
    gain: Math.floor(baseGain * multiplier),
    multiplier: multiplier,
    usageCount: usageCount
  };
}

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

function ExpectedDamagePreview({player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions, phase, log, qIndex, queue, stepOnce, runAll, finishTurn, postCombatOptions, handleExitToMap}){
  const res = useMemo(()=> simulatePreview({player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions}), [player, enemy, fixedOrder, willOverdrive, enemyMode, enemyActions]);
  const summaryItems = [
    { icon:"🗡️", label:"예상 타격 피해", value: res.pDealt, accent:"text-emerald-300", hpInfo: `몬스터 HP ${enemy.hp} → ${res.finalEHp}`, hpColor: "#fca5a5" },
    { icon:"💥", label:"예상 피격 피해", value: phase === 'select' ? '?' : res.pTaken, accent:"text-rose-300", hpInfo: `플레이어 HP ${player.hp} → ${res.finalPHp}`, hpColor: "#e2e8f0" },
  ];

  const phaseLabel = phase === 'select' ? '선택 단계' : phase === 'respond' ? '대응 단계' : '진행 단계';

  // 전투 로그 자동 스크롤
  const logContainerRef = useRef(null);
  useEffect(() => {
    if (logContainerRef.current && phase === 'resolve' && log && log.length > 0) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [log, phase]);

  return (
    <div className="expect-board expect-board-vertical" style={{position: 'relative'}}>
      {/* 타이틀 */}
      <div style={{marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid rgba(148, 163, 184, 0.3)'}}>
        <div style={{fontSize: '18px', fontWeight: 'bold', color: '#f8fafc'}}>
          예상 피해량
        </div>
      </div>

      <div className="expect-summary-vertical">
        {summaryItems.map((item)=>(
          <div key={item.label} className="expect-item-vertical">
            <span className="expect-icon">{item.icon}</span>
            <div>
              <div className="expect-label">{item.label}</div>
              <div className={`expect-value ${item.accent}`}>{item.value}</div>
              {item.hpInfo && (
                <div style={{fontSize: '13px', fontWeight: 'bold', color: item.hpColor, marginTop: '4px'}}>
                  {item.hpInfo}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 진행 단계가 아닐 때만 예상 피해량 로그 표시 */}
      {phase !== 'resolve' && !!res.lines?.length && (
        <div style={{marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(148, 163, 184, 0.15)'}}>
          {res.lines.map((line,idx)=>{
            // 몬스터로 시작하는 텍스트 감지
            const startsWithMonster = line.trim().startsWith('몬스터');
            const isPlayerAction = line.includes('플레이어 ->') || line.includes('플레이어→') || line.includes('플레이어 •');
            return (
              <div key={idx} style={{
                fontSize: '13px',
                color: startsWithMonster ? '#fca5a5' : isPlayerAction ? '#60a5fa' : '#cbd5e1',
                marginBottom: '6px'
              }}>
                <span style={{color: '#94a3b8', marginRight: '4px'}}>{idx + 1}.</span>
                {line}
              </div>
            );
          })}
        </div>
      )}

      {/* 진행 단계 전투 로그 */}
      {phase === 'resolve' && log && log.length > 0 && (
        <div style={{marginTop: '20px', paddingTop: '16px', borderTop: '2px solid rgba(148, 163, 184, 0.3)'}}>
          <div style={{fontSize: '15px', fontWeight: 'bold', color: '#f8fafc', marginBottom: '12px'}}>
            🎮 전투 로그
          </div>
          <div ref={logContainerRef} style={{height: '360px', minHeight: '360px', maxHeight: '360px', overflowY: 'auto'}}>
            {log.filter(line => {
              // 불필요한 로그 제거
              if (line.includes('게임 시작') || line.includes('적 성향 힌트')) return false;
              return true;
            }).map((line, i) => {
              // 몬스터로 시작하는 텍스트 감지
              const startsWithMonster = line.trim().startsWith('몬스터') || (line.includes('👾') && line.substring(line.indexOf('👾') + 2).trim().startsWith('몬스터'));
              const isPlayerAction = line.includes('플레이어 ->') || line.includes('플레이어→') || line.includes('플레이어 •');
              return (
                <div key={i} style={{
                  fontSize: '13px',
                  color: startsWithMonster ? '#fca5a5' : isPlayerAction ? '#60a5fa' : '#cbd5e1',
                  marginBottom: '6px',
                  lineHeight: '1.5'
                }} dangerouslySetInnerHTML={{ __html: line }}>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 진행 단계 제어 버튼 (전투 로그 아래, 절대 위치로 고정) */}
      {phase === 'resolve' && (
        <div style={{
          position: 'absolute',
          bottom: '-190px',
          left: '0',
          right: '0',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '16px',
          background: 'rgba(7, 11, 30, 0.98)',
          borderTop: '2px solid rgba(148, 163, 184, 0.3)'
        }}>
          <div style={{fontSize: '18px', fontWeight: 'bold', color: '#f8fafc'}}>
            ⚔️ 전투 진행 중... ({qIndex}/{queue?.length || 0})
          </div>
          <button onClick={stepOnce} disabled={qIndex>=queue.length} className="btn-enhanced flex items-center gap-2">
            <StepForward size={18}/> 한 단계 (E)
          </button>
          <button onClick={runAll} disabled={qIndex>=queue.length} className="btn-enhanced btn-primary">
            전부 실행 (D)
          </button>
          {qIndex >= queue.length && (
            <button onClick={()=>finishTurn('수동 턴 종료')} className="btn-enhanced flex items-center gap-2">
              ⏭️ 턴 종료 (E)
            </button>
          )}
          {postCombatOptions && (
            <button onClick={handleExitToMap} className="btn-enhanced btn-primary flex items-center gap-2">
              🗺️ 맵으로 돌아가기
            </button>
          )}
        </div>
      )}
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
      <div style={{ textAlign: 'center', color: textColor, fontSize: '20px', marginTop: '8px' }}>
        <div key={`pts-${safePts}`}>{currentPts}/{nextSlotCost}</div>
        <div>{tier}</div>
        {safePreview > 0 && (
          <div style={{ color: '#6ee7b7', fontSize: '16px', marginTop: '4px' }}>
            +{safePreview}pt
          </div>
        )}
      </div>
    </div>
  );
}

// =====================
// 캐릭터 빌드 기반 손패 생성
// =====================
function drawCharacterBuildHand(characterBuild) {
  if (!characterBuild) return CARDS.slice(0, 10); // 8장 → 10장

  const { mainSpecials = [], subSpecials = [] } = characterBuild;

  // 주특기 카드는 100% 등장
  const mainCards = mainSpecials
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(Boolean);

  // 보조특기 카드는 각각 50% 확률로 등장
  const subCards = subSpecials
    .map(cardId => CARDS.find(card => card.id === cardId))
    .filter(card => card && Math.random() < 0.5);

  return [...mainCards, ...subCards];
}

// =====================
// Game Component
// =====================
function Game({ initialPlayer, initialEnemy, playerEther=0, onBattleResult }){
  const safeInitialPlayer = initialPlayer || {};
  const safeInitialEnemy = initialEnemy || {};
  const baseEnergy = safeInitialPlayer.energy ?? BASE_PLAYER_ENERGY;
  const startingEther = typeof safeInitialPlayer.etherPts === 'number' ? safeInitialPlayer.etherPts : playerEther;
  const [player, setPlayer] = useState({ hp:safeInitialPlayer.hp ?? 30, maxHp:safeInitialPlayer.maxHp ?? safeInitialPlayer.hp ?? 30, energy:baseEnergy, maxEnergy:baseEnergy, vulnMult:1, vulnTurns:0, block:0, counter:0, etherPts:startingEther ?? 0, etherOverdriveActive:false, comboUsageCount: {} });
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [enemy, setEnemy] = useState(()=> safeInitialEnemy?.name ? ({ ...safeInitialEnemy, hp: safeInitialEnemy.hp ?? safeInitialEnemy.maxHp ?? 30, maxHp: safeInitialEnemy.maxHp ?? safeInitialEnemy.hp ?? 30, vulnMult:1, vulnTurns:0, block:0, counter:0, etherPts:0, etherOverdriveActive:false }) : null);

  const [phase, setPhase] = useState('select');

  const [hand, setHand] = useState([]);
  const [selected, setSelected] = useState([]);
  const [canRedraw, setCanRedraw] = useState(true);
  const [sortType, setSortType] = useState('none'); // none, energy, speed, type

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
  const [isSimplified, setIsSimplified] = useState(false);
  const [usedCardIndices, setUsedCardIndices] = useState([]);
  const [disappearingCards, setDisappearingCards] = useState([]); // 사라지는 중인 카드 인덱스
  const [hiddenCards, setHiddenCards] = useState([]); // 완전히 숨겨진 카드 인덱스
  const [currentTurnCombo, setCurrentTurnCombo] = useState(null); // 이번 턴에 사용한 조합 추적
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [playerHit, setPlayerHit] = useState(false); // 플레이어 피격 애니메이션
  const [enemyHit, setEnemyHit] = useState(false); // 적 피격 애니메이션
  const [playerBlockAnim, setPlayerBlockAnim] = useState(false); // 플레이어 방어 애니메이션
  const [enemyBlockAnim, setEnemyBlockAnim] = useState(false); // 적 방어 애니메이션
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

  const closeCharacterSheet = useCallback(() => {
    setShowCharacterSheet(false);
  }, []);

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
    // 캐릭터 빌드가 있으면 사용, 없으면 기본 8장
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    const initialHand = hasCharacterBuild
      ? drawCharacterBuildHand(currentBuild)
      : CARDS.slice(0, 10); // 8장 → 10장
    setHand(initialHand);
    setCanRedraw(true);
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

  // 페이즈 변경 시 카드 애니메이션 상태 초기화
  useEffect(() => {
    if (phase !== 'resolve') {
      setDisappearingCards([]);
      setHiddenCards([]);
      setUsedCardIndices([]);
    }
  }, [phase]);

  // C 키로 캐릭터 창 열기, Q 키로 간소화, E 키로 제출/한 단계/턴 종료, R 키로 리드로우, 스페이스바로 기원, D 키로 전부 실행
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        e.stopPropagation();
        setShowCharacterSheet((prev) => !prev);
      }
      if ((e.key === "q" || e.key === "Q") && phase === 'select') {
        setIsSimplified((prev) => !prev);
      }
      if ((e.key === "e" || e.key === "E") && (phase === 'select' || phase === 'respond') && selected.length > 0) {
        // startResolve는 아래에서 선언되므로 직접 호출하지 않고 조건만 체크
        const submitBtn = document.querySelector('.submit-button-fixed button');
        if (submitBtn && !submitBtn.disabled) submitBtn.click();
      }
      if ((e.key === "r" || e.key === "R") && phase === 'select') {
        // 리드로우 버튼 클릭
        const redrawBtn = document.querySelector('button:has(.lucide-refresh-cw)');
        if (redrawBtn && !redrawBtn.disabled) redrawBtn.click();
      }
      if (e.key === " " && (phase === 'select' || phase === 'respond')) {
        // 스페이스바로 기원 토글
        e.preventDefault(); // 스페이스바 기본 동작 방지 (스크롤)
        if (etherSlots(player.etherPts) > 0) {
          setWillOverdrive(v => !v);
        }
      }
      if ((e.key === "e" || e.key === "E") && phase === 'resolve') {
        // E키로 한 단계 또는 턴 종료 (진행 단계)
        const buttons = document.querySelectorAll('.expect-sidebar-fixed button');
        const stepButton = Array.from(buttons).find(btn => btn.textContent.includes('한 단계'));
        const finishButton = Array.from(buttons).find(btn => btn.textContent.includes('턴 종료'));

        // 한 단계 버튼이 활성화되어 있으면 한 단계, 아니면 턴 종료
        if (stepButton && !stepButton.disabled) {
          stepButton.click();
        } else if (finishButton && !finishButton.disabled) {
          finishButton.click();
        }
      }
      if ((e.key === "d" || e.key === "D") && phase === 'resolve') {
        // 전부 실행 버튼 클릭
        const buttons = document.querySelectorAll('.expect-sidebar-fixed button');
        const runAllButton = Array.from(buttons).find(btn => btn.textContent.includes('전부 실행'));
        if (runAllButton && !runAllButton.disabled) runAllButton.click();
      }
      if ((e.key === "f" || e.key === "F") && phase === 'select') {
        // F키로 카드 정렬
        cycleSortType();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selected, canRedraw, player.etherPts]); // player.etherPts 추가

  useEffect(()=>{
    if(!enemy){
      const e = ENEMIES[enemyIndex];
      setEnemy({ ...e, hp:e.hp, maxHp:e.hp, vulnMult:1, vulnTurns:0, block:0, counter:0, etherPts:0, etherOverdriveActive:false });
      // 캐릭터 빌드가 있으면 사용, 없으면 기본 8장
      const currentBuild = useGameStore.getState().characterBuild;
      const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
      const initialHand = hasCharacterBuild
        ? drawCharacterBuildHand(currentBuild)
        : CARDS.slice(0, 10); // 8장 → 10장
      setHand(initialHand);
      setSelected([]);
      setCanRedraw(true);
      const handCount = initialHand.length;
      addLog(`🎴 시작 손패 ${handCount}장${hasCharacterBuild ? ' (캐릭터 빌드)' : ''}`);
    }
  },[]);

  useEffect(()=>{
    if(!enemy || phase!=='select') return;
    setFixedOrder(null);
    setActionEvents({});
    setCanRedraw(true);
    setWillOverdrive(false);
    setPlayer(p=>({ ...p, energy: BASE_PLAYER_ENERGY + etherSlots(p.etherPts), etherOverdriveActive:false }));

    // 매 턴 시작 시 새로운 손패 생성 (캐릭터 빌드 적용)
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    const newHand = hasCharacterBuild
      ? drawCharacterBuildHand(currentBuild)
      : CARDS.slice(0, 10); // 8장 → 10장
    setHand(newHand);
    setSelected([]);

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
    if(!currentCombo) return { gain: 0, multiplier: 1, usageCount: 0 };
    const baseGain = ETHER_GAIN_MAP[currentCombo.name] || 0;
    return applyEtherDeflation(baseGain, currentCombo.name, player.comboUsageCount || {});
  }, [currentCombo, player.comboUsageCount]);

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
    // 캐릭터 빌드가 있으면 사용, 없으면 기본 8장
    const currentBuild = useGameStore.getState().characterBuild;
    const hasCharacterBuild = currentBuild && (currentBuild.mainSpecials?.length > 0 || currentBuild.subSpecials?.length > 0);
    const newHand = hasCharacterBuild
      ? drawCharacterBuildHand(currentBuild)
      : CARDS.slice(0, 10); // 8장 → 10장
    setHand(newHand);
    setSelected([]);
    setCanRedraw(false);
    addLog('🔄 손패 리드로우 사용');
  };

  const cycleSortType = () => {
    const sortCycle = ['none', 'energy', 'speed', 'type'];
    const currentIndex = sortCycle.indexOf(sortType);
    const nextIndex = (currentIndex + 1) % sortCycle.length;
    const nextSort = sortCycle[nextIndex];
    setSortType(nextSort);

    const sortLabels = {
      none: '정렬 해제',
      energy: '행동력 기준 정렬',
      speed: '속도 기준 정렬',
      type: '종류별 정렬'
    };
    addLog(`🔀 ${sortLabels[nextSort]}`);
  };

  const getSortedHand = () => {
    if (sortType === 'none') return hand;

    const sorted = [...hand];
    if (sortType === 'energy') {
      sorted.sort((a, b) => a.actionCost - b.actionCost);
    } else if (sortType === 'speed') {
      sorted.sort((a, b) => a.speedCost - b.speedCost);
    } else if (sortType === 'type') {
      // 공격 -> 방어 -> 기타 순서로 정렬
      const typeOrder = { 'attack': 0, 'defense': 1 };
      sorted.sort((a, b) => {
        const aOrder = typeOrder[a.type] ?? 2;
        const bOrder = typeOrder[b.type] ?? 2;
        return aOrder - bOrder;
      });
    }
    return sorted;
  };

  const startResolve = ()=>{
    if(phase!=='select') return;
    const actions = generateEnemyActions(enemy, enemyPlan.mode, etherSlots(enemy.etherPts));
    setEnemyPlan(prev=>({ ...prev, actions }));

    const pCombo = detectPokerCombo(selected);
    const enhancedSelected = applyPokerBonus(selected, pCombo);

    const q = sortCombinedOrderStablePF(enhancedSelected, actions);
    setFixedOrder(q);
    playCardSubmitSound(); // 카드 제출 사운드 재생
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

    const newQ = fixedOrder.map(x=>({ actor:x.actor, card:x.card, sp:x.sp }));
    if(newQ.length===0){
      addLog('⚠️ 큐 생성 실패: 실행할 항목이 없습니다');
      return;
    }
    playProceedSound(); // 진행 버튼 사운드 재생
    setQueue(newQ);
    setQIndex(0);
    setPhase('resolve');
    addLog('▶ 진행 시작');

    // 진행 단계 시작 시 에테르 획득 (Deflation 적용)
    const pComboNow = detectPokerCombo(selected);
    const eComboNow = detectPokerCombo(enemyPlan.actions);
    if(pComboNow && ETHER_GAIN_MAP[pComboNow.name]){
      setCurrentTurnCombo(pComboNow.name); // 이번 턴 조합 저장
      const baseGain = ETHER_GAIN_MAP[pComboNow.name];
      // 먼저 결과 계산 (현재 상태 기준)
      const result = applyEtherDeflation(baseGain, pComboNow.name, player.comboUsageCount || {});
      const multiplierText = result.multiplier < 1 ? ` <span style="color: #ef4444; font-size: 0.8em;">(×${result.multiplier.toFixed(2)})</span>` : '';
      addLog(`✴️ 에테르 +${result.gain} PT ${multiplierText}(플레이어 족보: ${pComboNow.name})`);
      setPlayer(p => {
        const result = applyEtherDeflation(baseGain, pComboNow.name, p.comboUsageCount || {});
        return { ...p, etherPts: addEther(p.etherPts, result.gain) };
      });
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
  };

  const stepOnce = ()=>{
    if(qIndex>=queue.length) return;
    const a = queue[qIndex];

    // 타임라인 애니메이션을 위해 모든 액션에 적용
    setUsedCardIndices(prev => [...prev, qIndex]);
    setTimeout(() => {
      setUsedCardIndices(prev => prev.filter(i => i !== qIndex));
    }, 600); // 타임라인 애니메이션 지속 시간

    // 카드 소멸 이펙트는 플레이어만 적용
    if(a.actor === 'player') {
      setTimeout(() => {
        // 카드가 사용된 후 사라지는 애니메이션 시작
        setDisappearingCards(prev => [...prev, qIndex]);
        setTimeout(() => {
          // 애니메이션 후 완전히 숨김
          setHiddenCards(prev => [...prev, qIndex]);
          setDisappearingCards(prev => prev.filter(i => i !== qIndex));
        }, 600); // 애니메이션 지속 시간
      }, 300); // 사용 효과 후 바로 사라지기 시작
    }

    const P = { ...player, def: player.def||false, block: player.block||0, counter: player.counter||0, vulnMult: player.vulnMult||1 };
    const E = { ...enemy,  def: enemy.def||false,  block: enemy.block||0,  counter: enemy.counter||0,  vulnMult: enemy.vulnMult||1 };
    const tempState = { player:P, enemy:E, log:[] };
    const {events} = applyAction(tempState, a.actor, a.card);

    setPlayer(prev=>({ ...prev, hp:P.hp, def:P.def, block:P.block, counter:P.counter, vulnMult:P.vulnMult||1 }));
    setEnemy(prev=>({  ...prev, hp:E.hp, def:E.def, block:E.block, counter:E.counter, vulnMult:E.vulnMult||1 }));
    setActionEvents(prev=>({ ...prev, [qIndex]: events }));

    // 이벤트 처리: 애니메이션 및 사운드
    events.forEach(ev=> {
      addLog(ev.msg);

      // 피격 효과 (hit, pierce 타입)
      if((ev.type === 'hit' || ev.type === 'pierce') && ev.dmg > 0) {
        playHitSound();
        if(ev.actor === 'player') {
          // 플레이어가 공격 -> 적 피격
          setEnemyHit(true);
          setTimeout(() => setEnemyHit(false), 300);
        } else {
          // 적이 공격 -> 플레이어 피격
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 300);
        }
      }

      // 방어 효과 (defense 타입)
      if(ev.type === 'defense') {
        playBlockSound();
        if(ev.actor === 'player') {
          setPlayerBlockAnim(true);
          setTimeout(() => setPlayerBlockAnim(false), 400);
        } else {
          setEnemyBlockAnim(true);
          setTimeout(() => setEnemyBlockAnim(false), 400);
        }
      }

      // 반격 피해
      if(ev.actor === 'counter') {
        playHitSound();
        // counter는 반대 방향으로 피해가 가므로 타겟을 반대로
        if(a.actor === 'player') {
          setPlayerHit(true);
          setTimeout(() => setPlayerHit(false), 300);
        } else {
          setEnemyHit(true);
          setTimeout(() => setEnemyHit(false), 300);
        }
      }
    });

    setQIndex(prev=>prev+1);

    if(P.hp<=0){ setPostCombatOptions({ type:'defeat' }); setPhase('post'); return; }
    if(E.hp<=0){ setPostCombatOptions({ type:'victory' }); setPhase('post'); return; }
  };

  const finishTurn = (reason)=>{
    addLog(`턴 종료: ${reason||''}`);
    // 턴 종료 시 조합 카운트 증가 (Deflation)
    if(currentTurnCombo){
      setPlayer(p => {
        const newUsageCount = { ...(p.comboUsageCount || {}), [currentTurnCombo]: (p.comboUsageCount?.[currentTurnCombo] || 0) + 1 };
        return { ...p, block:0, def:false, counter:0, vulnMult:1, vulnTurns:0, etherOverdriveActive:false, comboUsageCount: newUsageCount };
      });
      setCurrentTurnCombo(null);
    } else {
      setPlayer(p=>({ ...p, block:0, def:false, counter:0, vulnMult:1, vulnTurns:0, etherOverdriveActive:false }));
    }
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
  const comboPreviewGain = (phase==='select' || phase==='respond') ? pendingComboEther.gain : 0;

  // 적 조합 에테르 미리보기 계산
  const enemyCombo = useMemo(() => detectPokerCombo(enemyPlan.actions || []), [enemyPlan.actions]);
  const enemyComboPreviewGain = useMemo(() => {
    if (!enemyCombo || (phase !== 'respond' && phase !== 'resolve')) return 0;
    return ETHER_GAIN_MAP[enemyCombo.name] || 0;
  }, [enemyCombo, phase]);

  // 적 성향 힌트 추출
  const enemyHint = useMemo(() => {
    const hintLog = log.find(line => line.includes('적 성향 힌트'));
    if (!hintLog) return null;
    const match = hintLog.match(/적 성향 힌트[:\s]*(.+)/);
    return match ? match[1].trim() : null;
  }, [log]);

  return (
    <div className="legacy-battle-root w-full min-h-screen pb-64">
      {/* 예상 피해량 - 오른쪽 고정 패널 */}
      <div className="expect-sidebar-fixed">
        <ExpectedDamagePreview
          player={player}
          enemy={enemy}
          fixedOrder={fixedOrder||playerTimeline}
          willOverdrive={willOverdrive}
          enemyMode={enemyPlan.mode}
          enemyActions={enemyPlan.actions}
          phase={phase}
          log={log}
          qIndex={qIndex}
          queue={queue}
          stepOnce={stepOnce}
          runAll={runAll}
          finishTurn={finishTurn}
          postCombatOptions={postCombatOptions}
          handleExitToMap={handleExitToMap}
        />
      </div>

      {/* 상단 메인 영역 */}
      <div className="w-full px-4" style={{marginRight: '280px', marginLeft: '150px'}}>

        {/* Timeline - 1줄 길게 (화면 가득) */}
        <div style={{marginBottom: '32px'}}>
          <div className="panel-enhanced timeline-panel">
            <div className="timeline-body" style={{marginTop: '0'}}>
              <div className="timeline-axis">
                {[0, 5, 10, 15, 20, 25, 30].map((tick)=>(
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
                    // 타임라인에서 현재 진행 중인 액션인지 확인
                    const globalIndex = phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                    const isActive = usedCardIndices.includes(globalIndex);
                    return (
                      <div key={idx}
                           className={`timeline-marker marker-player ${isActive ? 'timeline-active' : ''}`}
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
                    // 타임라인에서 현재 진행 중인 액션인지 확인
                    const globalIndex = phase === 'resolve' && queue ? queue.findIndex(q => q === a) : -1;
                    const isActive = usedCardIndices.includes(globalIndex);
                    return (
                      <div key={idx}
                           className={`timeline-marker marker-enemy ${isActive ? 'timeline-active' : ''}`}
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

        {/* 플레이어/적 정보 + 중앙 정보 통합 레이아웃 */}
        <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '50px', gap: '120px'}}>
          {/* 왼쪽: 플레이어 */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'center'}}>
            {/* 플레이어 콤보 - 절대 위치로 오른쪽 배치 */}
            {currentCombo && (
              <div className="combo-display" style={{position: 'absolute', top: '-5px', left: '180px', textAlign: 'center'}}>
                <div style={{fontSize: '1.92rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '2px'}}>
                  {currentCombo.name}
                </div>
                {pendingComboEther.gain > 0 && (
                  <div style={{fontSize: '1.92rem', color: '#fbbf24', fontWeight: 'bold'}}>
                    +{pendingComboEther.gain} PT {pendingComboEther.multiplier < 1 && (
                      <span style={{color: '#ef4444', fontSize: '0.624em', marginLeft: '-0.05em'}}>
                        (×{pendingComboEther.multiplier.toFixed(2)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <EtherBar
                key={`player-ether-${playerEtherValue}`}
                pts={playerEtherValue}
                slots={playerEtherSlots}
                previewGain={comboPreviewGain}
                label="ETHER"
              />
              <div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <div className="character-display" style={{fontSize: '64px'}}>🧙‍♂️</div>
                  <div>
                    <div className={playerHit ? 'hit-animation' : ''} style={{color: '#f87171', fontSize: '1.25rem', fontWeight: 'bold'}}>
                      ❤️ {player.hp}/{player.maxHp}
                      {player.block > 0 && <span className={playerBlockAnim ? 'block-animation' : ''} style={{color: '#60a5fa', marginLeft: '8px'}}>🛡️{player.block}</span>}
                    </div>
                    <div className="hp-bar-enhanced mb-1" style={{width: '200px', height: '12px', position: 'relative', overflow: 'hidden'}}>
                      <div className="hp-fill" style={{width: `${(player.hp/player.maxHp)*100}%`}}></div>
                      {player.block > 0 && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: `${Math.min((player.block / player.maxHp) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
                          borderRight: '2px solid #60a5fa'
                        }}></div>
                      )}
                    </div>
                    <div style={{fontSize: '1rem', fontWeight: '600', color: '#7dd3fc', marginTop: '4px'}}>플레이어</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 중앙: 단계 정보 */}
          <div style={{textAlign: 'center', flex: '1', paddingTop: '20px'}}>
            <div style={{fontSize: '36px', fontWeight: 'bold', color: '#f8fafc', textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginBottom: '16px'}}>
              {phase === 'select' ? '선택 단계' : phase === 'respond' ? '대응 단계' : '진행 단계'}
            </div>
            <div style={{fontSize: '1.25rem', fontWeight: '700', color: '#7dd3fc', marginBottom: '12px'}}>
              속도 {totalSpeed}/{MAX_SPEED} · 선택 {selected.length}/{MAX_SUBMIT_CARDS}
            </div>
            {phase==='select' && (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center', alignItems: 'center'}}>
                <button onClick={redrawHand} disabled={!canRedraw} className="btn-enhanced flex items-center gap-2" style={{fontSize: '1rem', padding: '8px 20px', minWidth: '160px'}}>
                  <RefreshCw size={18}/> 리드로우 (R)
                </button>
                <button onClick={()=> (phase==='select' || phase==='respond') && setWillOverdrive(v=>!v)}
                        disabled={!(phase==='select'||phase==='respond') || etherSlots(player.etherPts)<=0}
                        className={`btn-enhanced ${willOverdrive? 'btn-primary':''} flex items-center gap-2`}
                        style={{fontSize: '1rem', padding: '8px 20px', minWidth: '160px'}}>
                  🙏 기원 (Space)
                </button>
              </div>
            )}
          </div>

          {/* 오른쪽: 적 */}
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'center'}}>
            {/* 몬스터 콤보 - 절대 위치로 왼쪽 배치 */}
            {enemyCombo && (
              <div className="combo-display" style={{position: 'absolute', top: '0', right: '180px', textAlign: 'center'}}>
                <div style={{fontSize: '1.5rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '4px'}}>
                  {enemyCombo.name}
                </div>
                {enemyComboPreviewGain > 0 && (
                  <div style={{fontSize: '1.2rem', color: '#fbbf24', fontWeight: 'bold'}}>
                    +{enemyComboPreviewGain} PT {enemyComboPreviewGain < ETHER_GAIN_MAP[enemyCombo.name] && (
                      <span style={{color: '#ef4444', fontSize: '0.8em'}}>
                        (×{(enemyComboPreviewGain / ETHER_GAIN_MAP[enemyCombo.name]).toFixed(2)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
              <div style={{textAlign: 'right'}}>
                <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px'}}>
                  {enemyHint && (
                    <div style={{fontSize: '1rem', color: '#94a3b8', marginBottom: '4px'}}>💡 {enemyHint}</div>
                  )}
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div>
                      <div className={enemyHit ? 'hit-animation' : ''} style={{color: '#f87171', fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'right'}}>
                        {enemy.block > 0 && <span className={enemyBlockAnim ? 'block-animation' : ''} style={{color: '#60a5fa', marginRight: '8px'}}>🛡️{enemy.block}</span>}
                        ❤️ {enemy.hp}/{enemy.maxHp}
                      </div>
                      <div className="hp-bar-enhanced mb-1" style={{width: '200px', height: '12px', position: 'relative', overflow: 'hidden'}}>
                        <div className="hp-fill" style={{width: `${(enemy.hp/enemy.maxHp)*100}%`}}></div>
                        {enemy.block > 0 && (
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${Math.min((enemy.block / enemy.maxHp) * 100, 100)}%`,
                            background: 'linear-gradient(90deg, rgba(96, 165, 250, 0.6), rgba(96, 165, 250, 0.3))',
                            borderRight: '2px solid #60a5fa'
                          }}></div>
                        )}
                      </div>
                      <div style={{fontSize: '1rem', fontWeight: '600', color: '#fca5a5', marginTop: '4px', textAlign: 'right'}}>
                        {enemy.name}
                      </div>
                    </div>
                    <div className="character-display" style={{fontSize: '64px'}}>👹</div>
                  </div>
                </div>
              </div>
              <EtherBar
                key={`enemy-ether-${enemyEtherValue}`}
                pts={enemyEtherValue}
                slots={enemyEtherSlots}
                previewGain={phase === 'resolve' ? 0 : enemyComboPreviewGain}
                label="ETHER"
                color="red"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 독립 활동력 표시 (좌측 하단 고정) */}
      {(phase==='select' || phase==='respond' || phase==='resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0)) && (
        <div className="energy-display-fixed">
          <div className="energy-orb-compact">
            {remainingEnergy}
          </div>
        </div>
      )}

      {/* 제출 버튼 독립 (하단 150px 이동) */}
      {phase==='select' && (
        <div className="submit-button-fixed" style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
          <button onClick={startResolve} disabled={selected.length===0} className="btn-enhanced btn-primary flex items-center gap-2" style={{fontSize: '1.25rem', padding: '9.6px 24px', fontWeight: '700'}}>
            <Play size={22}/> 제출 <span style={{fontSize: '1.4rem', fontWeight: '900'}}>(E)</span>
          </button>
          <button onClick={() => setIsSimplified(prev => !prev)} className={`btn-enhanced ${isSimplified ? 'btn-primary' : ''} flex items-center gap-2`}>
            {isSimplified ? '📋' : '📄'} 간소화 (Q)
          </button>
          <button onClick={cycleSortType} className="btn-enhanced flex items-center gap-2" style={{fontSize: '0.9rem'}}>
            🔀 정렬 ({sortType === 'none' ? '없음' : sortType === 'energy' ? '행동력' : sortType === 'speed' ? '속도' : '종류'}) (F)
          </button>
        </div>
      )}
      {phase==='respond' && (
        <div className="submit-button-fixed">
          <button onClick={beginResolveFromRespond} className="btn-enhanced btn-success flex items-center gap-2" style={{fontSize: '1.25rem', padding: '9.6px 24px', fontWeight: '700'}}>
            <Play size={22}/> 진행 시작 <span style={{fontSize: '1.4rem', fontWeight: '900'}}>(E)</span>
          </button>
        </div>
      )}
      {player && player.hp <= 0 && (
        <div className="submit-button-fixed">
          <button onClick={()=>window.location.reload()} className="btn-enhanced flex items-center gap-2">
            🔄 재시작
          </button>
        </div>
      )}

      {/* 하단 고정 손패 영역 */}
      {(phase==='select' || phase==='respond' || phase==='resolve' || (enemy && enemy.hp <= 0) || (player && player.hp <= 0)) && (
        <div className="hand-area">

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
              {getSortedHand().map((c,idx)=>{
                const Icon=c.icon;
                const selIndex = selected.findIndex(s=>s.id===c.id);
                const sel = selIndex !== -1;
                const disabled = handDisabled(c) && !sel;
                const currentBuild = useGameStore.getState().characterBuild;
                const isMainSpecial = currentBuild?.mainSpecials?.includes(c.id);
                const isSubSpecial = currentBuild?.subSpecials?.includes(c.id);
                const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
                return (
                  <div key={c.id+idx} onClick={()=>!disabled && toggle(c)} style={{display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative'}}>
                    <div className={`game-card-large select-phase-card ${c.type==='attack' ? 'attack' : 'defense'} ${sel ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}>
                      <div className="card-cost-badge-floating" style={{color: costColor, WebkitTextStroke: '1px #000'}}>{c.actionCost}</div>
                      {sel && <div className="selection-number">{selIndex + 1}</div>}
                      <div className="card-stats-sidebar">
                        {c.damage != null && c.damage > 0 && (
                          <div className="card-stat-item attack">
                            ⚔️{c.damage}{c.hits?`×${c.hits}`:''}
                          </div>
                        )}
                        {c.block != null && c.block > 0 && (
                          <div className="card-stat-item defense">
                            🛡️{c.block}
                          </div>
                        )}
                        <div className="card-stat-item speed">
                          ⏱️{c.speedCost}
                        </div>
                      </div>
                      <div className="card-header">
                        <div className="text-white font-black text-sm">{c.name}</div>
                      </div>
                      <div className="card-icon-area">
                        <Icon size={60} className="text-white opacity-80"/>
                        {disabled && (
                          <div className="card-disabled-overlay">
                            <X size={80} className="text-red-500" strokeWidth={4} />
                          </div>
                        )}
                      </div>
                      <div className={`card-footer ${isSimplified ? 'simplified-footer' : ''}`}>
                        {c.description || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {phase==='respond' && fixedOrder && (
            <div className="hand-cards" style={{justifyContent: 'center'}}>
              {fixedOrder.filter(a=>a.actor==='player').map((action,idx,arr)=>{
                const c = action.card;
                const Icon = c.icon;
                const currentBuild = useGameStore.getState().characterBuild;
                const isMainSpecial = currentBuild?.mainSpecials?.includes(c.id);
                const isSubSpecial = currentBuild?.subSpecials?.includes(c.id);
                const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';
                return (
                  <div key={idx} style={{display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', position: 'relative'}}>
                    <div className={`game-card-large respond-phase-card ${c.type==='attack' ? 'attack' : 'defense'}`}>
                      <div className="card-cost-badge-floating" style={{color: costColor, WebkitTextStroke: '1px #000'}}>{c.actionCost}</div>
                      <div className="card-stats-sidebar">
                        {c.damage != null && c.damage > 0 && (
                          <div className="card-stat-item attack">
                            ⚔️{c.damage}{c.hits?`×${c.hits}`:''}
                          </div>
                        )}
                        {c.block != null && c.block > 0 && (
                          <div className="card-stat-item defense">
                            🛡️{c.block}
                          </div>
                        )}
                        <div className="card-stat-item speed">
                          ⏱️{c.speedCost}
                        </div>
                      </div>
                      <div className="card-header">
                        <div className="text-white font-black text-sm">{c.name}</div>
                      </div>
                      <div className="card-icon-area">
                        <Icon size={60} className="text-white opacity-80"/>
                      </div>
                      <div className="card-footer">
                        {c.description || ''}
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
            <div className="hand-cards" style={{justifyContent: 'center'}}>
              {queue.filter(a => a.actor === 'player').map((a,i)=>{
                const Icon = a.card.icon;
                const globalIndex = queue.findIndex(q => q === a);
                const isUsed = usedCardIndices.includes(globalIndex);
                const isDisappearing = disappearingCards.includes(globalIndex);
                const isHidden = hiddenCards.includes(globalIndex);
                const currentBuild = useGameStore.getState().characterBuild;
                const isMainSpecial = currentBuild?.mainSpecials?.includes(a.card.id);
                const isSubSpecial = currentBuild?.subSpecials?.includes(a.card.id);
                const costColor = isMainSpecial ? '#fcd34d' : isSubSpecial ? '#60a5fa' : '#fff';

                // 완전히 숨겨진 카드는 렌더링하지 않음
                if (isHidden) return null;

                return (
                  <div key={`resolve-${globalIndex}`} style={{display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', position: 'relative'}}>
                    <div className={`game-card-large resolve-phase-card ${a.card.type==='attack' ? 'attack' : 'defense'} ${isUsed ? 'card-used' : ''} ${isDisappearing ? 'card-disappearing' : ''}`}>
                      <div className="card-cost-badge-floating" style={{color: costColor, WebkitTextStroke: '1px #000'}}>{a.card.actionCost}</div>
                      <div className="card-stats-sidebar">
                        {a.card.damage != null && a.card.damage > 0 && (
                          <div className="card-stat-item attack">
                            ⚔️{a.card.damage}{a.card.hits?`×${a.card.hits}`:''}
                          </div>
                        )}
                        {a.card.block != null && a.card.block > 0 && (
                          <div className="card-stat-item defense">
                            🛡️{a.card.block}
                          </div>
                        )}
                        {a.card.counter !== undefined && (
                          <div className="card-stat-item counter">
                            ⚡{a.card.counter}
                          </div>
                        )}
                        <div className="card-stat-item speed">
                          ⏱️{a.card.speedCost}
                        </div>
                      </div>
                      <div className="card-header">
                        <div className="text-white font-black text-sm">{a.card.name}</div>
                      </div>
                      <div className="card-icon-area">
                        <Icon size={60} className="text-white opacity-80"/>
                      </div>
                      <div className="card-footer">
                        {a.card.description || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showCharacterSheet && <CharacterSheet onClose={closeCharacterSheet} />}
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
