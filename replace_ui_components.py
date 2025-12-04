#!/usr/bin/env python3
"""
LegacyBattleApp.jsx의 3628-4196 라인 교체 스크립트
"""

file_path = r'Z:\바이브코딩\memory bank\hahahahgo\src\components\battle\LegacyBattleApp.jsx'

# 교체할 새로운 코드
new_code = """        {/* 플레이어/적 정보 + 중앙 정보 통합 레이아웃 */}
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
"""

# 파일 읽기
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 3628부터 4196까지 교체 (0-indexed이므로 3627부터 4195까지)
# 하지만 line 3628의 주석은 유지하고 3629부터 교체
new_lines = lines[:3627] + [new_code] + lines[4196:]

# 파일 쓰기
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"✅ Successfully replaced lines 3628-4196 in {file_path}")
print(f"   Original: {len(lines)} lines")
print(f"   New: {len(new_lines)} lines")
print(f"   Reduction: {len(lines) - len(new_lines)} lines")
