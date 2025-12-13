import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { fetchOwnedItems, type OwnedItem } from '../services/itemMinting';
import './Inventory.css';

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

export function Inventory() {
  const account = useCurrentAccount();
  const [items, setItems] = useState<OwnedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('rarity');

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
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
  }, [items, sortBy]);

  const loadItems = useCallback(async () => {
    if (!account?.address) return;
    
    setLoading(true);
    try {
      const ownedItems = await fetchOwnedItems(account.address);
      setItems(ownedItems);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    if (account?.address && isOpen) {
      loadItems();
    }
  }, [account?.address, isOpen, loadItems]);

  if (!account) {
    return null;
  }

  return (
    <div className="inventory-container">
      <button 
        className="inventory-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        📦 Inventory ({items.length})
      </button>
      
      {isOpen && (
        <div className="inventory-panel">
          <div className="inventory-header">
            <h3>Your NFT Items</h3>
            <button onClick={loadItems} disabled={loading}>
              {loading ? '...' : '🔄'}
            </button>
          </div>

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
          
          {items.length === 0 ? (
            <div className="inventory-empty">
              <p>No items yet!</p>
              <p className="hint">Defeat enemies to collect NFT loot</p>
            </div>
          ) : (
            <div className="inventory-grid">
              {sortedItems.map((item) => (
                <div 
                  key={item.id} 
                  className="inventory-item"
                  style={{ borderColor: RARITY_COLORS[item.rarity] }}
                >
                  <div 
                    className="item-rarity"
                    style={{ color: RARITY_COLORS[item.rarity] }}
                  >
                    {item.rarity.toUpperCase()}
                  </div>
                  <div className="item-name">{item.name}</div>
                  <div className="item-stats">
                    <span className="attack">⚔️ {item.attack}</span>
                    <span className="defense">🛡️ {item.defense}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
