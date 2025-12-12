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
import { Inventory } from './components/Inventory';
import { FloorTransitionModal } from './components/MintNotification';
import { networkConfig, DEFAULT_NETWORK } from './config/sui';
import { createMintItemTransaction } from './services/itemMinting';
import type { ItemData } from './game/entities/Item';
import { EventBus } from './game/EventBus';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';

const queryClient = new QueryClient();

function GameApp() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  
  // Floor transition state
  const [showFloorTransition, setShowFloorTransition] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [pendingItems, setPendingItems] = useState<ItemData[]>([]);
  const [mintingStatus, setMintingStatus] = useState<'idle' | 'minting' | 'success' | 'error'>('idle');
  const [mintProgress, setMintProgress] = useState({ current: 0, total: 0 });
  
  // Reference to the Phaser game for calling proceedToNextFloor
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
        setShowFloorTransition(true);
        setMintingStatus('idle');
        setMintProgress({ current: 0, total: data.pendingItems.length });
      }
    };

    EventBus.on('floor-transition', handleFloorTransition);
    EventBus.on('player-died', handlePlayerDied);

    return () => {
      EventBus.off('floor-transition', handleFloorTransition);
      EventBus.off('player-died', handlePlayerDied);
    };
  }, []);

  const handleConfirmMint = useCallback(async () => {
    if (!account?.address || pendingItems.length === 0) {
      return;
    }

    setMintingStatus('minting');
    let successCount = 0;

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setMintProgress({ current: i + 1, total: pendingItems.length });

      try {
        const tx = createMintItemTransaction({
          item,
          recipientAddress: account.address,
        });

        await signAndExecute({ transaction: tx });
        successCount++;
      } catch (error) {
        console.error(`Failed to mint item ${item.name}:`, error);
      }
    }

    if (successCount === pendingItems.length) {
      setMintingStatus('success');
    } else if (successCount > 0) {
      setMintingStatus('success'); // Partial success
    } else {
      setMintingStatus('error');
    }
  }, [account?.address, pendingItems, signAndExecute]);

  const handleSkipOrContinue = useCallback(() => {
    setShowFloorTransition(false);
    setPendingItems([]);
    setMintingStatus('idle');
    
    // Tell the game to proceed to next floor
    EventBus.emit('proceed-to-next-floor');
  }, []);

  const handleGameReady = useCallback((game: Phaser.Game) => {
    gameRef.current = game;
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="title">⚔️ ChainFlow Roguelike</h1>
          <span className="subtitle">NFT Loot on Sui</span>
        </div>
        <div className="header-right">
          <Inventory />
          <WalletConnect />
        </div>
      </header>

      <main className="game-wrapper">
        {!account && (
          <div className="connect-prompt">
            <div className="prompt-content">
              <h2>🎮 Connect Your Wallet</h2>
              <p>Connect a Sui wallet to collect NFT items as you play!</p>
              <p className="hint">You can still play without connecting, but items won't be minted.</p>
            </div>
          </div>
        )}
        
        <PhaserGame onGameReady={handleGameReady} />
      </main>

      <footer className="footer">
        <a 
          href="https://faucet.testnet.sui.io/" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Get Testnet SUI
        </a>
        <span>|</span>
        <a 
          href="https://suiscan.xyz/testnet" 
          target="_blank" 
          rel="noopener noreferrer"
        >
          Sui Explorer
        </a>
        <span>|</span>
        <span className="network-badge">Testnet</span>
      </footer>

      <FloorTransitionModal 
        visible={showFloorTransition}
        floor={currentFloor}
        pendingItems={pendingItems}
        mintingStatus={mintingStatus}
        mintProgress={mintProgress}
        onConfirmMint={handleConfirmMint}
        onSkip={handleSkipOrContinue}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={DEFAULT_NETWORK}>
        <WalletProvider autoConnect>
          <GameApp />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

export default App;
