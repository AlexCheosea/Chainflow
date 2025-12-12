import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import './WalletConnect.css';

export function WalletConnect() {
  const account = useCurrentAccount();

  return (
    <div className="wallet-connect">
      <div className="wallet-info">
        {account ? (
          <div className="connected-info">
            <span className="status-dot connected"></span>
            <span className="address">
              {account.address.slice(0, 6)}...{account.address.slice(-4)}
            </span>
          </div>
        ) : (
          <div className="disconnected-info">
            <span className="status-dot disconnected"></span>
            <span>Not connected</span>
          </div>
        )}
      </div>
      <ConnectButton />
    </div>
  );
}
