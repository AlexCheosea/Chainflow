import { useState, useMemo, useEffect, useCallback } from 'react';
import { useGameContext, getItemSlotType } from '../context/GameContext';
import type { OwnedItem } from '../services/itemMinting';
import './Inventory.css';

const RARITY_ORDER: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

type SortOption = 'attack' | 'defense' | 'rarity';

interface InventoryProps {
  onBack: () => void;
}

// Convert blob to PNG data URL
const blobToPngDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load image'));
    };
    img.src = blobUrl;
  });
};

// Fetch image from Walrus URL
const fetchItemImage = async (imageUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    // Walrus may return octet-stream; coerce to PNG via canvas
    return await blobToPngDataUrl(blob);
  } catch {
    return null;
  }
};

export function Inventory({ onBack }: InventoryProps) {
  const { 
    ownedItems, 
    loadingItems, 
    equipment, 
    equipItem, 
    unequipItem, 
    equipmentBonusAttack, 
    equipmentBonusDefense 
  } = useGameContext();
  
  const [sortBy, setSortBy] = useState<SortOption>('rarity');
  const [itemImages, setItemImages] = useState<Record<string, string>>({});

  // Fetch images for all items
  const loadItemImages = useCallback(async () => {
    const images: Record<string, string> = {};
    await Promise.all(
      ownedItems.map(async (item) => {
        if (item.imageUrl) {
          const dataUrl = await fetchItemImage(item.imageUrl);
          if (dataUrl) {
            images[item.id] = dataUrl;
          }
        }
      })
    );
    setItemImages(images);
  }, [ownedItems]);

  useEffect(() => {
    if (ownedItems.length > 0) {
      loadItemImages();
    }
  }, [ownedItems, loadItemImages]);

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

  return (
    <div className="inv-view">
      <div className="inv-equipment-slots">
        <button className="inv-back-btn" onClick={onBack}>
          ← Back to Menu
        </button>
        <h3>⚙️ Equipment</h3>
        <div className="inv-slots">
          <div className="inv-slot inv-weapon-slot">
            <span className="inv-slot-label">⚔️ Weapon</span>
            {equipment.weapon ? (
              <div 
                className="inv-equipped-item" 
                data-rarity={equipment.weapon.rarity}
              >
                <div className="inv-equipped-info">
                  <span 
                    className="inv-equipped-name"
                    data-rarity={equipment.weapon.rarity}
                  >
                    {equipment.weapon.name}
                  </span>
                  <span className="inv-equipped-stats">
                    ⚔️ +{equipment.weapon.attack}
                  </span>
                </div>
                <button 
                  className="inv-unequip-btn"
                  onClick={() => unequipItem('weapon')}
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="inv-empty-slot">Empty</span>
            )}
          </div>
          
          <div className="inv-slot inv-armor-slot">
            <span className="inv-slot-label">🛡️ Armor</span>
            {equipment.armor ? (
              <div 
                className="inv-equipped-item" 
                data-rarity={equipment.armor.rarity}
              >
                <div className="inv-equipped-info">
                  <span 
                    className="inv-equipped-name"
                    data-rarity={equipment.armor.rarity}
                  >
                    {equipment.armor.name}
                  </span>
                  <span className="inv-equipped-stats">
                    🛡️ +{equipment.armor.defense}
                  </span>
                </div>
                <button 
                  className="inv-unequip-btn"
                  onClick={() => unequipItem('armor')}
                >
                  ✕
                </button>
              </div>
            ) : (
              <span className="inv-empty-slot">Empty</span>
            )}
          </div>
        </div>
        
        <div className="inv-total-stats">
          <span className="inv-stat-label">Equipment Bonus:</span>
          <span className="inv-stat-value">⚔️ +{equipmentBonusAttack}</span>
          <span className="inv-stat-value">🛡️ +{equipmentBonusDefense}</span>
        </div>
      </div>

      <div className="inv-section">
        <div className="inv-header">
          <h3>📦 Your NFT Items</h3>
          <div className="inv-sort-controls">
            <span className="inv-sort-label">Sort by:</span>
            <button 
              className={`inv-sort-btn ${sortBy === 'attack' ? 'active' : ''}`}
              onClick={() => setSortBy('attack')}
            >
              ⚔️ Attack
            </button>
            <button 
              className={`inv-sort-btn ${sortBy === 'defense' ? 'active' : ''}`}
              onClick={() => setSortBy('defense')}
            >
              🛡️ Defense
            </button>
            <button 
              className={`inv-sort-btn ${sortBy === 'rarity' ? 'active' : ''}`}
              onClick={() => setSortBy('rarity')}
            >
              ✨ Rarity
            </button>
          </div>
        </div>
        
        {loadingItems ? (
          <p className="inv-loading-text">Loading items...</p>
        ) : ownedItems.length === 0 ? (
          <p className="inv-no-items">No items yet. Play to collect NFT loot!</p>
        ) : (
          <div className="inv-items-grid">
            {sortedItems.map(item => (
              <div 
                key={item.id} 
                className={`inv-item-card ${isEquipped(item) ? 'equipped' : ''}`}
                data-rarity={item.rarity}
                onClick={() => handleItemClick(item)}
              >
                {itemImages[item.id] ? (
                  <img 
                    src={itemImages[item.id]} 
                    alt={item.name} 
                    className="inv-item-image" 
                  />
                ) : (
                  <div className="inv-item-type-icon">
                    {getItemSlotType(item) === 'weapon' ? '⚔️' : '🛡️'}
                  </div>
                )}
                <div 
                  className="inv-item-rarity"
                  data-rarity={item.rarity}
                >
                  {item.rarity.toUpperCase()}
                </div>
                <div className="inv-item-name">{item.name}</div>
                <div className="inv-item-stats">
                  <span>⚔️ {item.attack}</span>
                  <span>🛡️ {item.defense}</span>
                </div>
                {isEquipped(item) && (
                  <div className="inv-equipped-badge">EQUIPPED</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
