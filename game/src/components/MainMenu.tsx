import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useGameContext } from '../context/GameContext';
import { WalletConnect } from './WalletConnect';
import { Marketplace } from './Marketplace';
import { Inventory } from './Inventory';
import { EventBus, GameState } from '../game/EventBus';
import './MainMenu.css';

export function MainMenu() {
  const account = useCurrentAccount();
  const { 
    setGameStarted, 
    equipmentBonusAttack, 
    equipmentBonusDefense,
    gameStarted,
  } = useGameContext();
  
  const [showInventory, setShowInventory] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);

  const handlePlayGame = () => {
    // Store equipment bonuses in GameState for synchronous access by GameScene
    console.log('[MainMenu] Setting equipment bonuses:', { attack: equipmentBonusAttack, defense: equipmentBonusDefense });
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
        
        {/* Show wallet only on the main menu itself, not when Inventory/Marketplace are open or while the game is running */}
        {!showInventory && !showMarketplace && !gameStarted && (
          <div className="wallet-section">
            <WalletConnect />
          </div>
        )}

        {showMarketplace ? (
          <Marketplace onBack={() => setShowMarketplace(false)} />
        ) : showInventory ? (
          <Inventory onBack={() => setShowInventory(false)} />
        ) : (
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
