import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useGameContext, getItemSlotType } from '../context/GameContext';
import { WalletConnect } from './WalletConnect';
import { EventBus } from '../game/EventBus';
import type { OwnedItem } from '../services/itemMinting';
import './MainMenu.css';

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#00ff00',
  rare: '#0088ff',
  epic: '#aa00ff',
  legendary: '#ffaa00',
};

export function MainMenu() {
  const account = useCurrentAccount();
  const { 
    setGameStarted, 
    ownedItems, 
    loadingItems, 
    refreshInventory,
    equipment, 
    equipItem, 
    unequipItem, 
    equipmentBonusAttack, 
    equipmentBonusDefense 
  } = useGameContext();
  
  const [showInventory, setShowInventory] = useState(false);

  const isEquipped = (item: OwnedItem) => 
    equipment.weapon?.id === item.id || equipment.armor?.id === item.id;

  const handleItemClick = (item: OwnedItem) => {
    if (isEquipped(item)) {
      unequipItem(getItemSlotType(item));
    } else {
      equipItem(item);
    }
  };

  const handlePlayGame = () => {
    // Emit equipment bonuses to game BEFORE starting
    EventBus.emit('set-equipment-bonus', { attack: equipmentBonusAttack, defense: equipmentBonusDefense });
    setGameStarted(true);
  };

  return (
    <div className="main-menu">
      <div className="menu-content">
        <h1 className="game-title">⚔️ ChainFlow Roguelike</h1>
        <p className="game-subtitle">NFT Loot on Sui Blockchain</p>
        
        <div className="wallet-section">
          <WalletConnect />
        </div>

        {!showInventory ? (
          <div className="menu-buttons">
            <button 
              className="menu-btn play-btn" 
              onClick={handlePlayGame}
            >
              🎮 Play Game
            </button>
            <button 
              className="menu-btn inventory-btn" 
              onClick={() => setShowInventory(true)}
              disabled={!account}
            >
              📦 Inventory & Equipment
            </button>
            <button 
              className="menu-btn marketplace-btn" 
              disabled={true}
            >
              🛒 Marketplace
              <span className="coming-soon-badge">Coming Soon</span>
            </button>
            {!account && (
              <p className="connect-hint">Connect wallet to access inventory</p>
            )}
          </div>
        ) : (
          <div className="inventory-view">
            <button className="back-btn" onClick={() => setShowInventory(false)}>
              ← Back to Menu
            </button>
            
            <div className="equipment-slots">
              <h3>⚙️ Equipment</h3>
              <div className="slots">
                <div className="slot weapon-slot">
                  <span className="slot-label">⚔️ Weapon</span>
                  {equipment.weapon ? (
                    <div 
                      className="equipped-item" 
                      style={{ borderColor: RARITY_COLORS[equipment.weapon.rarity] }}
                    >
                      <div className="equipped-info">
                        <span 
                          className="equipped-name"
                          style={{ color: RARITY_COLORS[equipment.weapon.rarity] }}
                        >
                          {equipment.weapon.name}
                        </span>
                        <span className="equipped-stats">
                          ⚔️ +{equipment.weapon.attack}
                        </span>
                      </div>
                      <button 
                        className="unequip-btn"
                        onClick={() => unequipItem('weapon')}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="empty-slot">Empty</span>
                  )}
                </div>
                
                <div className="slot armor-slot">
                  <span className="slot-label">🛡️ Armor</span>
                  {equipment.armor ? (
                    <div 
                      className="equipped-item" 
                      style={{ borderColor: RARITY_COLORS[equipment.armor.rarity] }}
                    >
                      <div className="equipped-info">
                        <span 
                          className="equipped-name"
                          style={{ color: RARITY_COLORS[equipment.armor.rarity] }}
                        >
                          {equipment.armor.name}
                        </span>
                        <span className="equipped-stats">
                          🛡️ +{equipment.armor.defense}
                        </span>
                      </div>
                      <button 
                        className="unequip-btn"
                        onClick={() => unequipItem('armor')}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span className="empty-slot">Empty</span>
                  )}
                </div>
              </div>
              
              <div className="total-stats">
                <span className="stat-label">Equipment Bonus:</span>
                <span className="stat-value">⚔️ +{equipmentBonusAttack}</span>
                <span className="stat-value">🛡️ +{equipmentBonusDefense}</span>
              </div>
            </div>

            <div className="inventory-section">
              <div className="inventory-header">
                <h3>📦 Your NFT Items</h3>
                <button 
                  className="refresh-btn"
                  onClick={refreshInventory}
                  disabled={loadingItems}
                >
                  {loadingItems ? '...' : '🔄'}
                </button>
              </div>
              
              {loadingItems ? (
                <p className="loading-text">Loading items...</p>
              ) : ownedItems.length === 0 ? (
                <p className="no-items">No items yet. Play to collect NFT loot!</p>
              ) : (
                <div className="items-grid">
                  {ownedItems.map(item => (
                    <div 
                      key={item.id} 
                      className={`item-card ${isEquipped(item) ? 'equipped' : ''}`}
                      style={{ borderColor: RARITY_COLORS[item.rarity] }}
                      onClick={() => handleItemClick(item)}
                    >
                      <div className="item-type-icon">
                        {getItemSlotType(item) === 'weapon' ? '⚔️' : '🛡️'}
                      </div>
                      <div 
                        className="item-rarity"
                        style={{ color: RARITY_COLORS[item.rarity] }}
                      >
                        {item.rarity.toUpperCase()}
                      </div>
                      <div className="item-name">{item.name}</div>
                      <div className="item-stats">
                        <span>⚔️ {item.attack}</span>
                        <span>🛡️ {item.defense}</span>
                      </div>
                      {isEquipped(item) && (
                        <div className="equipped-badge">EQUIPPED</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="menu-footer">
          <a href="https://faucet.testnet.sui.io/" target="_blank" rel="noopener noreferrer">
            Get Testnet SUI
          </a>
          <span>|</span>
          <a href="https://suiscan.xyz/testnet" target="_blank" rel="noopener noreferrer">
            Sui Explorer
          </a>
        </footer>
      </div>
    </div>
  );
}
