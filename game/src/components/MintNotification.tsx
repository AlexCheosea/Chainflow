import { useCallback, useState } from 'react';
import type { ItemData } from '../game/entities/Item';
import './MintNotification.css';

interface FloorTransitionProps {
  visible: boolean;
  floor: number;
  pendingItems: ItemData[];
  mintingStatus: 'idle' | 'minting' | 'success' | 'error';
  mintProgress: { current: number; total: number };
  onConfirmMint: (selectedItems: ItemData[]) => void;
  onSkip: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#00ff00',
  rare: '#0088ff',
  epic: '#aa00ff',
  legendary: '#ffaa00',
};

const ITEM_TYPE_ICONS: Record<string, string> = {
  weapon: '⚔️',
  armor: '🛡️',
};

export function FloorTransitionModal({ 
  visible, 
  floor, 
  pendingItems, 
  mintingStatus, 
  mintProgress,
  onConfirmMint, 
  onSkip 
}: FloorTransitionProps) {
  // Track selected items by their index
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  // Reset selection when modal becomes visible with new items
  const toggleItemSelection = useCallback((index: number) => {
    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIndices(new Set(pendingItems.map((_, i) => i)));
  }, [pendingItems]);

  const deselectAll = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const handleMintSelected = useCallback(() => {
    const selectedItems = pendingItems.filter((_, i) => selectedIndices.has(i));
    onConfirmMint(selectedItems);
  }, [pendingItems, selectedIndices, onConfirmMint]);

  const getItemImage = useCallback((item: ItemData) => {
    // Generate a simple SVG preview based on item type and rarity
    const color = RARITY_COLORS[item.rarity] || '#ffffff';
    const isWeapon = item.itemType === 'weapon';
    
    if (isWeapon) {
      // Sword SVG
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <rect x="28" y="4" width="8" height="40" fill="${color}" rx="2"/>
          <polygon points="32,0 24,12 40,12" fill="${color}"/>
          <rect x="20" y="40" width="24" height="6" fill="${color}" rx="2"/>
          <rect x="26" y="46" width="12" height="14" fill="#8b4513" rx="2"/>
          <text x="32" y="58" text-anchor="middle" fill="white" font-size="8">F${item.floorObtained}</text>
        </svg>
      `)}`;
    } else {
      // Shield SVG
      return `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
          <path d="M32 4 L56 16 L56 36 Q56 52 32 60 Q8 52 8 36 L8 16 Z" fill="${color}" stroke="#333" stroke-width="2"/>
          <circle cx="32" cy="32" r="10" fill="#ffd700" opacity="0.7"/>
          <text x="32" y="36" text-anchor="middle" fill="white" font-size="10" font-weight="bold">F${item.floorObtained}</text>
        </svg>
      `)}`;
    }
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div className="floor-transition-overlay">
      <div className="floor-transition-modal">
        <h2 className="floor-title">🌀 Floor {floor} Complete!</h2>
        
        {pendingItems.length > 0 ? (
          <>
            <p className="floor-subtitle">
              You found {pendingItems.length} item{pendingItems.length > 1 ? 's' : ''}! 
              Select items to mint as NFTs.
            </p>
            
            {mintingStatus === 'idle' && (
              <div className="selection-controls">
                <button className="select-btn" onClick={selectAll}>Select All</button>
                <button className="select-btn" onClick={deselectAll}>Deselect All</button>
                <span className="selection-count">
                  {selectedIndices.size} of {pendingItems.length} selected
                </span>
              </div>
            )}
            
            <div className="pending-items-grid">
              {pendingItems.map((item, index) => {
                const isSelected = selectedIndices.has(index);
                return (
                  <div 
                    key={index} 
                    className={`pending-item-card ${isSelected ? 'selected' : ''} ${mintingStatus === 'idle' ? 'selectable' : ''}`}
                    style={{ borderColor: RARITY_COLORS[item.rarity] }}
                    onClick={() => mintingStatus === 'idle' && toggleItemSelection(index)}
                  >
                    {mintingStatus === 'idle' && (
                      <div className={`item-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected ? '✓' : ''}
                      </div>
                    )}
                    <div className="item-preview">
                      <img 
                        src={getItemImage(item)} 
                        alt={item.name}
                        className="item-preview-image"
                      />
                    </div>
                    <div className="item-info">
                      <div 
                        className="item-name-preview"
                        style={{ color: RARITY_COLORS[item.rarity] }}
                      >
                        {ITEM_TYPE_ICONS[item.itemType]} {item.name}
                      </div>
                      <div className="item-rarity">{item.rarity.toUpperCase()}</div>
                      <div className="item-stats-preview">
                        <span className="stat">⚔️ {item.attack}</span>
                        <span className="stat">🛡️ {item.defense}</span>
                      </div>
                      <div className="item-floor">Floor {item.floorObtained}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {mintingStatus === 'idle' && (
              <div className="floor-actions">
                <button 
                  className="mint-confirm-btn" 
                  onClick={handleMintSelected}
                  disabled={selectedIndices.size === 0}
                >
                  ✓ Mint Selected ({selectedIndices.size})
                </button>
                <button className="skip-btn" onClick={onSkip}>
                  Skip (items will not be saved)
                </button>
              </div>
            )}

            {mintingStatus === 'minting' && (
              <div className="minting-progress">
                <div className="spinner"></div>
                <p>Minting NFT {mintProgress.current} of {mintProgress.total}...</p>
              </div>
            )}

            {mintingStatus === 'success' && (
              <div className="mint-success">
                <div className="success-icon">✓</div>
                <p>Items minted successfully!</p>
                <button className="continue-btn" onClick={onSkip}>
                  Continue to Floor {floor + 1}
                </button>
              </div>
            )}

            {mintingStatus === 'error' && (
              <div className="mint-error">
                <div className="error-icon">✗</div>
                <p>Some items failed to mint. Check your wallet connection.</p>
                <div className="floor-actions">
                  <button className="mint-confirm-btn" onClick={handleMintSelected}>
                    Retry
                  </button>
                  <button className="skip-btn" onClick={onSkip}>
                    Continue anyway
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="floor-subtitle">No items found on this floor.</p>
            <div className="floor-actions">
              <button className="continue-btn" onClick={onSkip}>
                Continue to Floor {floor + 1}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
