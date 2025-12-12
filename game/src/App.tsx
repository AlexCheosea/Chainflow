import { useCallback, useState } from 'react';
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
import { MintNotification } from './components/MintNotification';
import { networkConfig, DEFAULT_NETWORK } from './config/sui';
import { createMintItemTransaction } from './services/itemMinting';
import type { ItemData } from './game/entities/Item';
import '@mysten/dapp-kit/dist/index.css';
import './App.css';

const queryClient = new QueryClient();

function GameApp() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  
  const [mintingItem, setMintingItem] = useState<ItemData | null>(null);
  const [mintStatus, setMintStatus] = useState<'pending' | 'success' | 'error' | null>(null);
  const [txDigest, setTxDigest] = useState<string | undefined>();

  const handleItemPickup = useCallback(async (item: ItemData) => {
    if (!account?.address) {
      console.log('No wallet connected, item not minted:', item);
      return;
    }

    setMintingItem(item);
    setMintStatus('pending');
    setTxDigest(undefined);

    try {
      const tx = createMintItemTransaction({
        item,
        recipientAddress: account.address,
      });

      const result = await signAndExecute({
        transaction: tx,
      });

      setMintStatus('success');
      setTxDigest(result.digest);
      console.log('Item minted successfully:', result);
    } catch (error) {
      console.error('Failed to mint item:', error);
      setMintStatus('error');
    }
  }, [account?.address, signAndExecute]);

  const handleNotificationClose = useCallback(() => {
    setMintingItem(null);
    setMintStatus(null);
    setTxDigest(undefined);
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
        
        <PhaserGame onItemPickup={handleItemPickup} />
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

      <MintNotification 
        item={mintingItem}
        status={mintStatus}
        txDigest={txDigest}
        onClose={handleNotificationClose}
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
