/**
 * eventAnimationProcessing.js
 *
 * 액션 이벤트 애니메이션 및 사운드 처리 시스템
 */

/**
 * 화면 흔들림 효과 트리거
 * @param {number} intensity - 강도 (1=약함, 2=중간, 3=강함)
 */
function triggerScreenShake(intensity = 1) {
  // #root에 적용해서 전체 페이지가 함께 움직이도록 함
  // (.legacy-battle-root에 적용하면 부모 배경이 보여서 압축처럼 보임)
  const root = document.getElementById('root');
  if (root) {
    root.classList.add('screen-shake');
    setTimeout(() => root.classList.remove('screen-shake'), 250);
  }
}

/**
 * 대미지 팝업 생성
 * @param {string} target - 'player' 또는 'enemy'
 * @param {number} value - 대미지 값
 * @param {string} type - 'damage', 'heal', 'block'
 */
function createDamagePopup(target, value, type = 'damage') {
  const popup = document.createElement('div');
  popup.className = `damage-popup ${type === 'damage' && value >= 10 ? 'critical' : ''} ${type}`;
  popup.textContent = type === 'damage' ? `-${value}` : (type === 'heal' ? `+${value}` : `🛡️${value}`);

  // 위치 설정
  if (target === 'enemy') {
    popup.style.right = '350px';
    popup.style.top = '450px';
  } else {
    popup.style.left = '350px';
    popup.style.top = '450px';
  }

  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 800);
}

/**
 * 액션 이벤트 처리: 애니메이션 및 사운드 재생
 * @param {Object} params - 파라미터
 * @param {Array} params.actionEvents - 처리할 액션 이벤트 목록
 * @param {Object} params.action - 현재 액션 (actor 정보 포함)
 * @param {Function} params.addLog - 로그 추가 함수
 * @param {Function} params.playHitSound - 피격 사운드 재생 함수
 * @param {Function} params.playBlockSound - 방어 사운드 재생 함수
 * @param {Object} params.actions - 상태 업데이트 함수 모음
 */
export function processActionEventAnimations({
  actionEvents,
  action,
  addLog,
  playHitSound,
  playBlockSound,
  actions
}) {
  actionEvents.forEach(ev => {
    addLog(ev.msg);

    // 피격 효과 (hit, pierce 타입)
    if ((ev.type === 'hit' || ev.type === 'pierce') && ev.dmg > 0) {
      playHitSound();

      // 대미지 팝업
      const target = ev.actor === 'player' ? 'enemy' : 'player';
      createDamagePopup(target, ev.dmg, 'damage');

      if (ev.actor === 'player') {
        // 플레이어가 공격 -> 적 피격 (화면 흔들림 없음)
        actions.setEnemyHit(true);
        setTimeout(() => actions.setEnemyHit(false), 300);
      } else {
        // 적이 공격 -> 플레이어 피격 (화면 흔들림)
        const shakeIntensity = ev.dmg >= 15 ? 3 : (ev.dmg >= 8 ? 2 : 1);
        triggerScreenShake(shakeIntensity);
        actions.setPlayerHit(true);
        setTimeout(() => actions.setPlayerHit(false), 300);
      }
    }

    // 방어 효과 (defense 타입)
    if (ev.type === 'defense') {
      playBlockSound();

      // 방어력 획득 팝업
      if (ev.block && ev.block > 0) {
        const target = ev.actor === 'player' ? 'player' : 'enemy';
        createDamagePopup(target, ev.block, 'block');
      }

      if (ev.actor === 'player') {
        actions.setPlayerBlockAnim(true);
        setTimeout(() => actions.setPlayerBlockAnim(false), 400);
      } else {
        actions.setEnemyBlockAnim(true);
        setTimeout(() => actions.setEnemyBlockAnim(false), 400);
      }
    }

    // 반격 피해
    if (ev.actor === 'counter') {
      playHitSound();

      // counter는 반대 방향으로 피해가 가므로 타겟을 반대로
      if (action.actor === 'player') {
        // 플레이어가 공격했는데 반격당함 -> 플레이어 피격 (화면 흔들림)
        triggerScreenShake(2);
        createDamagePopup('player', ev.dmg || 0, 'damage');
        actions.setPlayerHit(true);
        setTimeout(() => actions.setPlayerHit(false), 300);
      } else {
        // 적이 공격했는데 반격당함 -> 적 피격 (화면 흔들림 없음)
        createDamagePopup('enemy', ev.dmg || 0, 'damage');
        actions.setEnemyHit(true);
        setTimeout(() => actions.setEnemyHit(false), 300);
      }
    }
  });
}
