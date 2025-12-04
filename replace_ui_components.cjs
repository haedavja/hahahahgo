#!/usr/bin/env node
/**
 * LegacyBattleApp.jsx의 3628-4196 라인 교체 스크립트
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'battle', 'LegacyBattleApp.jsx');

// 교체할 새로운 코드
const newCode = `        {/* 플레이어/적 정보 + 중앙 정보 통합 레이아웃 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', marginBottom: '50px', gap: '120px', position: 'relative', marginTop: '40px', paddingRight: '40px' }}>
          <EtherComparisonBar
            battle={battle}
            etherFinalValue={etherFinalValue}
            enemyEtherFinalValue={enemyEtherFinalValue}
            netFinalEther={netFinalEther}
            position="top"
          />

          {/* 왼쪽: 플레이어 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'flex-end', paddingTop: '200px' }}>
            <PlayerEtherBox
              currentCombo={currentCombo}
              battle={battle}
              currentDeflation={currentDeflation}
              etherCalcPhase={etherCalcPhase}
              turnEtherAccumulated={turnEtherAccumulated}
              etherPulse={etherPulse}
              finalComboMultiplier={finalComboMultiplier}
              multiplierPulse={multiplierPulse}
            />
            <PlayerHpBar
              player={player}
              playerHit={playerHit}
              playerBlockAnim={playerBlockAnim}
              playerOverdriveFlash={playerOverdriveFlash}
              effectiveAgility={effectiveAgility}
              dulledLevel={dulledLevel}
            />
          </div>

          <CentralPhaseDisplay
            battle={battle}
            totalSpeed={totalSpeed}
            MAX_SPEED={MAX_SPEED}
            MAX_SUBMIT_CARDS={MAX_SUBMIT_CARDS}
            redrawHand={redrawHand}
            canRedraw={canRedraw}
            startResolve={startResolve}
            playSound={playSound}
            actions={actions}
            willOverdrive={willOverdrive}
            etherSlots={etherSlots}
            player={player}
            beginResolveFromRespond={beginResolveFromRespond}
            rewindToSelect={rewindToSelect}
            rewindUsed={rewindUsed}
            respondSnapshot={respondSnapshot}
            autoProgress={autoProgress}
            etherFinalValue={etherFinalValue}
            enemy={enemy}
            finishTurn={finishTurn}
          />

          <EtherComparisonBar
            battle={battle}
            etherFinalValue={etherFinalValue}
            enemyEtherFinalValue={enemyEtherFinalValue}
            netFinalEther={netFinalEther}
            position="bottom"
          />

          {/* 오른쪽: 적 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', minWidth: '360px', position: 'relative', justifyContent: 'center', paddingTop: '120px' }}>
            {soulShatter && (
              <div className="soul-shatter-banner">
                <div className="soul-shatter-text">영혼파괴!</div>
              </div>
            )}
            <EnemyEtherBox
              enemyCombo={enemyCombo}
              battle={battle}
              insightReveal={insightReveal}
              enemyCurrentDeflation={enemyCurrentDeflation}
              enemyEtherCalcPhase={enemyEtherCalcPhase}
              enemyTurnEtherAccumulated={enemyTurnEtherAccumulated}
              COMBO_MULTIPLIERS={COMBO_MULTIPLIERS}
            />
            <EnemyHpBar
              battle={battle}
              previewDamage={previewDamage}
              dulledLevel={dulledLevel}
              enemy={enemy}
              enemyHit={enemyHit}
              enemyBlockAnim={enemyBlockAnim}
              soulShatter={soulShatter}
              groupedEnemyMembers={groupedEnemyMembers}
              enemyOverdriveFlash={enemyOverdriveFlash}
              enemyEtherValue={enemyEtherValue}
              enemyTransferPulse={enemyTransferPulse}
              enemySoulScale={enemySoulScale}
              formatCompactValue={formatCompactValue}
            />
          </div>
        </div>
      </div>
`;

// 파일 읽기
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// 3628부터 4196까지 교체 (0-indexed이므로 3627부터 4195까지)
const newLines = [
  ...lines.slice(0, 3627),
  newCode,
  ...lines.slice(4196)
];

// 파일 쓰기
fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');

console.log(`✅ Successfully replaced lines 3628-4196 in ${filePath}`);
console.log(`   Original: ${lines.length} lines`);
console.log(`   New: ${newLines.length} lines`);
console.log(`   Reduction: ${lines.length - newLines.length} lines`);
