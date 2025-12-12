import { useEffect, useMemo } from 'react';
import type { ItemData } from '../game/entities/Item';
import './MintNotification.css';

interface MintNotificationProps {
  item: ItemData | null;
  status: 'pending' | 'success' | 'error' | null;
  txDigest?: string;
  onClose: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#00ff00',
  rare: '#0088ff',
  epic: '#aa00ff',
  legendary: '#ffaa00',
};

export function MintNotification({ item, status, txDigest, onClose }: MintNotificationProps) {
  const visible = useMemo(() => !!(item && status), [item, status]);

  useEffect(() => {
    if (visible && status === 'success') {
      // Auto-close after success
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible, status, onClose]);

  if (!item || !status || !visible) {
    return null;
  }

  return (
    <div className={`mint-notification ${status} ${visible ? 'visible' : ''}`}>
      <div className="notification-content">
        {status === 'pending' && (
          <>
            <div className="spinner"></div>
            <div className="notification-text">
              <div className="title">Minting NFT...</div>
              <div 
                className="item-name"
                style={{ color: RARITY_COLORS[item.rarity] }}
              >
                {item.name}
              </div>
            </div>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <div className="notification-text">
              <div className="title">Item Minted!</div>
              <div 
                className="item-name"
                style={{ color: RARITY_COLORS[item.rarity] }}
              >
                {item.name}
              </div>
              <div className="item-stats">
                ⚔️ {item.attack} | 🛡️ {item.defense}
              </div>
              {txDigest && (
                <a 
                  href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tx-link"
                >
                  View on Explorer →
                </a>
              )}
            </div>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="error-icon">✗</div>
            <div className="notification-text">
              <div className="title">Minting Failed</div>
              <div className="error-message">
                Please try again or check your wallet connection
              </div>
            </div>
          </>
        )}
        
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
    </div>
  );
}
