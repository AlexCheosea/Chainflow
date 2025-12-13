import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import './WalletConnect.css';

export function WalletConnect() {
  const account = useCurrentAccount();
  const isConnected = !!account;

  return (
    <div className="wallet-connect">
      <div className="wallet-info">
        <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
        <span className="wallet-label">Wallet:</span>
        {isConnected ? (
          <span className="address">
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </span>
        ) : (
          <span>Not connected</span>
        )}
      </div>
      <ConnectButton>
        {isConnected ? 'DISCONNECT' : 'CONNECT'}
      </ConnectButton>
    </div>
  );
}
