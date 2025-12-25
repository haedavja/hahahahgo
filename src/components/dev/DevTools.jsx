import React, { useState } from 'react';
import { useGameStore } from '../../state/gameStore';
import {
  ResourcesTab,
  MapTab,
  BattleTab,
  RelicsTab,
  ItemsTab,
  EventTab,
  CardsTab
} from './DevToolsTabs';

/**
 * 개발자 도구 오버레이
 * Alt+D로 토글
 */
export function DevTools({ isOpen, onClose, showAllCards, setShowAllCards }) {
  const [activeTab, setActiveTab] = useState('resources');

  const {
    resources,
    map,
    mapRisk,
    activeBattle,
    playerStrength,
    playerAgility,
    playerInsight,
    relics,
    setResources,
    setMapRisk,
    selectNode,
    devClearAllNodes,
    devTeleportToNode,
    devForceWin,
    devForceLose,
    updatePlayerStrength,
    updatePlayerAgility,
    updatePlayerInsight,
    addRelic,
    removeRelic,
    setRelics,
    devOpenRest,
    awakenAtRest,
    closeRest,
    cardUpgrades,
    upgradeCardRarity,
    devDulledLevel,
    setDevDulledLevel,
    devForcedAnomalies,
    setDevForcedAnomalies,
    devTriggerEvent,
    items,
    addItem,
    removeItem,
    devSetItems,
    devForcedCrossroad,
    setDevForcedCrossroad,
    characterBuild,
    updateCharacterBuild,
    addOwnedCard,
    removeOwnedCard,
    clearOwnedCards,
    devAddBattleToken,
    devStartBattle,
  } = useGameStore();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '600px',
      maxHeight: '80vh',
      backgroundColor: '#1e293b',
      border: '2px solid #3b82f6',
      borderRadius: '12px',
      boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
      zIndex: 10000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '16px 20px',
        background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h2 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>
          🛠️ Developer Tools
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
          }}
        >
          ✕
        </button>
      </div>

      {/* 탭 네비게이션 */}
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 12px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #334155',
      }}>
        {[
          { id: 'resources', label: '💰 자원', icon: '💰' },
          { id: 'map', label: '🗺️ 맵', icon: '🗺️' },
          { id: 'battle', label: '⚔️ 전투', icon: '⚔️' },
          { id: 'relics', label: '💎 상징', icon: '💎' },
          { id: 'items', label: '🎒 아이템', icon: '🎒' },
          { id: 'event', label: '🎲 이벤트', icon: '🎲' },
          { id: 'cards', label: '🃏 카드', icon: '🃏' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              background: activeTab === tab.id ? '#3b82f6' : 'transparent',
              border: 'none',
              color: activeTab === tab.id ? '#fff' : '#94a3b8',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      <div style={{
        padding: '20px',
        overflowY: 'auto',
        flex: 1,
        color: '#e2e8f0',
      }}>
        {activeTab === 'resources' && (
          <ResourcesTab
            resources={resources}
            setResources={setResources}
            devOpenRest={devOpenRest}
            awakenAtRest={awakenAtRest}
            closeRest={closeRest}
            cardUpgrades={cardUpgrades}
            upgradeCardRarity={upgradeCardRarity}
          />
        )}
        {activeTab === 'map' && (
          <MapTab
            map={map}
            mapRisk={mapRisk}
            setMapRisk={setMapRisk}
            selectNode={selectNode}
            devClearAllNodes={devClearAllNodes}
            devTeleportToNode={devTeleportToNode}
            devForcedCrossroad={devForcedCrossroad}
            setDevForcedCrossroad={setDevForcedCrossroad}
          />
        )}
        {activeTab === 'battle' && (
          <BattleTab
            activeBattle={activeBattle}
            playerStrength={playerStrength}
            playerAgility={playerAgility}
            playerInsight={playerInsight}
            devDulledLevel={devDulledLevel}
            setDevDulledLevel={setDevDulledLevel}
            devForcedAnomalies={devForcedAnomalies}
            setDevForcedAnomalies={setDevForcedAnomalies}
            devForceWin={devForceWin}
            devForceLose={devForceLose}
            updatePlayerStrength={updatePlayerStrength}
            updatePlayerAgility={updatePlayerAgility}
            updatePlayerInsight={updatePlayerInsight}
            devAddBattleToken={devAddBattleToken}
            devStartBattle={devStartBattle}
          />
        )}
        {activeTab === 'relics' && (
          <RelicsTab
            relics={relics}
            addRelic={addRelic}
            removeRelic={removeRelic}
            setRelics={setRelics}
          />
        )}
        {activeTab === 'items' && (
          <ItemsTab
            items={items}
            addItem={addItem}
            removeItem={removeItem}
            devSetItems={devSetItems}
          />
        )}
        {activeTab === 'event' && (
          <EventTab />
        )}
        {activeTab === 'cards' && (
          <CardsTab
            cardUpgrades={cardUpgrades}
            upgradeCardRarity={upgradeCardRarity}
            characterBuild={characterBuild}
            updateCharacterBuild={updateCharacterBuild}
            addOwnedCard={addOwnedCard}
            removeOwnedCard={removeOwnedCard}
            clearOwnedCards={clearOwnedCards}
            showAllCards={showAllCards}
            setShowAllCards={setShowAllCards}
          />
        )}
      </div>

      {/* 푸터 */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: '#0f172a',
        borderTop: '1px solid #334155',
        fontSize: '0.75rem',
        color: '#64748b',
        textAlign: 'center',
      }}>
        Press <kbd style={{
          padding: '2px 6px',
          background: '#334155',
          borderRadius: '4px',
          color: '#cbd5e1',
        }}>Alt+D</kbd> to toggle
      </div>
    </div>
  );
}
