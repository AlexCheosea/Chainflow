import { useCallback, useState, useEffect, useRef } from 'react';
import { 
  SuiClientProvider, 
  WalletProvider, 
  useCurrentAccount,
  useSignAndExecuteTransaction 
} from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PhaserGame } from './components/PhaserGame';
import { WalletConnect } from './components/WalletConnect';
import { MainMenu } from './components/MainMenu';
import { FloorTransitionModal } from './components/MintNotification';
import { GameProvider, useGameContext } from './context/GameContext';
import { networkConfig, DEFAULT_NETWORK } from './config/sui';
import { createBatchMintTransaction } from './services/itemMinting';
import type { ItemData } from './game/entities/Item';
import { EventBus } from './game/EventBus';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';

const queryClient = new QueryClient();

function GameApp() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { gameStarted, setGameStarted, equipmentBonusAttack, equipmentBonusDefense, refreshInventory } = useGameContext();
  
  // Floor transition state
  const [showFloorTransition, setShowFloorTransition] = useState(false);
  const [showDeathModal, setShowDeathModal] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [pendingItems, setPendingItems] = useState<ItemData[]>([]);
  const [mintingStatus, setMintingStatus] = useState<'idle' | 'minting' | 'success' | 'error'>('idle');
  const [mintProgress, setMintProgress] = useState({ current: 0, total: 0 });
  
  // Reference to the Phaser game
  const gameRef = useRef<Phaser.Game | null>(null);

  // Listen for floor transition events
  useEffect(() => {
    const handleFloorTransition = (data: { floor: number; pendingItems: ItemData[] }) => {
      setCurrentFloor(data.floor);
      setPendingItems(data.pendingItems);
      setShowFloorTransition(true);
      setMintingStatus('idle');
      setMintProgress({ current: 0, total: data.pendingItems.length });
    };

    const handlePlayerDied = (data?: { pendingItems?: ItemData[] }) => {
      if (data?.pendingItems && data.pendingItems.length > 0) {
        setPendingItems(data.pendingItems);
        setCurrentFloor(1);
        setShowFloorTransition(true);
        setMintingStatus('idle');
        setMintProgress({ current: 0, total: data.pendingItems.length });
      } else {
        // No items, show death modal
        setShowDeathModal(true);
      }
    };
    
    const handleBackToMenu = () => {
      setGameStarted(false);
    };

    EventBus.on('floor-transition', handleFloorTransition);
    EventBus.on('player-died', handlePlayerDied);
    EventBus.on('back-to-menu', handleBackToMenu);

    return () => {
      EventBus.off('floor-transition', handleFloorTransition);
      EventBus.off('player-died', handlePlayerDied);
      EventBus.off('back-to-menu', handleBackToMenu);
    };
  }, [setGameStarted]);

  const handleConfirmMint = useCallback(async (selectedItems: ItemData[]) => {
    if (!account?.address || selectedItems.length === 0) {
      return;
    }

    setMintingStatus('minting');
    setMintProgress({ current: 0, total: selectedItems.length });

    try {
      // Create a single batch transaction for all selected items
      const tx = createBatchMintTransaction({
        items: selectedItems,
        recipientAddress: account.address,
      });

      // Single wallet approval for all items
      await signAndExecute({ transaction: tx });
      
      setMintProgress({ current: selectedItems.length, total: selectedItems.length });
      setMintingStatus('success');
      // Refresh inventory to show new items
      refreshInventory();
    } catch (error) {
      console.error('Failed to mint items:', error);
      setMintingStatus('error');
    }
  }, [account?.address, signAndExecute, refreshInventory]);

  const handleSkipOrContinue = useCallback(() => {
    setShowFloorTransition(false);
    setPendingItems([]);
    setMintingStatus('idle');
    
    // Update to next floor and tell the game to proceed
    setCurrentFloor(prev => prev + 1);
    EventBus.emit('proceed-to-next-floor');
  }, []);

  const handleGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game;
    // Equipment bonuses are now emitted from MainMenu when Play is clicked
  }, []);

  // Show main menu if game not started
  if (!gameStarted) {
    return <MainMenu />;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="title">⚔️ ChainFlow Roguelike</h1>
          <span className="subtitle">Floor {currentFloor}</span>
        </div>
        <div className="header-right">
          <button className="menu-btn-small" onClick={() => setGameStarted(false)}>
            Menu
          </button>
          <WalletConnect />
        </div>
      </header>

      <main className="game-wrapper">
        <PhaserGame onGameReady={handleGameReady} />
        <div className="game-tip">WASD / Arrows: Move &nbsp;|&nbsp; Space / Click: Attack &nbsp;|&nbsp; Defeat all enemies to open the gate</div>
      </main>

      <FloorTransitionModal 
        visible={showFloorTransition}
        floor={currentFloor}
        pendingItems={pendingItems}
        mintingStatus={mintingStatus}
        mintProgress={mintProgress}
        onConfirmMint={handleConfirmMint}
        onSkip={handleSkipOrContinue}
      />

      {showDeathModal && (
        <div className="death-modal-overlay">
          <div className="death-modal">
            <h2 className="death-title">You Died</h2>
            <p className="death-subtitle">Better luck next time!</p>
            <button 
              className="death-btn" 
              onClick={() => window.location.reload()}
            >
              Return to Main Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={DEFAULT_NETWORK}>
        <WalletProvider autoConnect>
          <GameProvider>
            <GameApp />
          </GameProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
