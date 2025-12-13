import { useState, useMemo } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useGameContext, getItemSlotType } from '../context/GameContext';
import { WalletConnect } from './WalletConnect';
import { Marketplace } from './Marketplace';
import { EventBus, GameState } from '../game/EventBus';
import type { OwnedItem } from '../services/itemMinting';
import './MainMenu.css';

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#00ff00',
  rare: '#0088ff',
  epic: '#aa00ff',
  legendary: '#ffaa00',
};

const RARITY_ORDER: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

type SortOption = 'attack' | 'defense' | 'rarity';

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
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rarity');

  const sortedItems = useMemo(() => {
    return [...ownedItems].sort((a, b) => {
      switch (sortBy) {
        case 'attack':
          return b.attack - a.attack;
        case 'defense':
          return b.defense - a.defense;
        case 'rarity':
          return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
        default:
          return 0;
      }
    });
  }, [ownedItems, sortBy]);

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
    // Store equipment bonuses in GameState for synchronous access by GameScene
    console.log('[MainMenu] Setting equipment bonuses:', { attack: equipmentBonusAttack, defense: equipmentBonusDefense });
    console.log('[MainMenu] Current equipment:', equipment);
    GameState.initialEquipmentBonus = { attack: equipmentBonusAttack, defense: equipmentBonusDefense };
    // Also emit event (in case scene is already listening)
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

        {showMarketplace ? (
          <Marketplace onBack={() => setShowMarketplace(false)} />
        ) : !showInventory ? (
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
              onClick={() => setShowMarketplace(true)}
              disabled={!account}
            >
              🛒 Marketplace
            </button>
            {!account && (
              <p className="connect-hint">Connect wallet to access inventory and marketplace</p>
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
                <div className="sort-controls">
                  <span className="sort-label">Sort by:</span>
                  <button 
                    className={`sort-btn ${sortBy === 'attack' ? 'active' : ''}`}
                    onClick={() => setSortBy('attack')}
                  >
                    ⚔️ Attack
                  </button>
                  <button 
                    className={`sort-btn ${sortBy === 'defense' ? 'active' : ''}`}
                    onClick={() => setSortBy('defense')}
                  >
                    🛡️ Defense
                  </button>
                  <button 
                    className={`sort-btn ${sortBy === 'rarity' ? 'active' : ''}`}
                    onClick={() => setSortBy('rarity')}
                  >
                    ✨ Rarity
                  </button>
                </div>
              </div>
              
              {loadingItems ? (
                <p className="loading-text">Loading items...</p>
              ) : ownedItems.length === 0 ? (
                <p className="no-items">No items yet. Play to collect NFT loot!</p>
              ) : (
                <div className="items-grid">
                  {sortedItems.map(item => (
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
