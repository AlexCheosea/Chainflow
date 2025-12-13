import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { useGameContext } from '../context/GameContext';
import {
  getPremadeItems,
  fetchAllListings,
  createListingTransaction,
  createBuyTransaction,
  createDelistTransaction,
  createBuyPremadeTransaction,
  calculateFee,
  formatPrice,
  type MarketplaceListing,
  type PremadeItem,
} from '../services/marketplace';
import './Marketplace.css';

// Rarity colors matching the game
const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#00ff00',
  rare: '#0088ff',
  epic: '#aa00ff',
  legendary: '#ffaa00',
};

type TabType = 'my-listings' | 'shop' | 'market';

interface MarketplaceProps {
  onBack: () => void;
}

export function Marketplace({ onBack }: MarketplaceProps) {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { ownedItems, refreshInventory } = useGameContext();
  
  const [activeTab, setActiveTab] = useState<TabType>('shop');
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [listingPrice, setListingPrice] = useState<Record<string, string>>({});
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  // Premade items from the shop
  const premadeItems = getPremadeItems();

  // Fetch marketplace listings
  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const allListings = await fetchAllListings();
      setListings(allListings);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'market' || activeTab === 'my-listings') {
      fetchListings();
    }
  }, [activeTab, fetchListings]);

  // Normalize user address for comparison (handles leading zeros, case differences)
  const normalizedUserAddress = account?.address ? normalizeSuiAddress(account.address) : null;

  // Get user's listings (normalize both addresses for comparison)
  const myListings = listings.filter(l => {
    const normalizedSeller = normalizeSuiAddress(l.seller);
    return normalizedSeller === normalizedUserAddress;
  });
  
  // Get other players' listings
  const otherListings = listings.filter(l => {
    const normalizedSeller = normalizeSuiAddress(l.seller);
    return normalizedSeller !== normalizedUserAddress;
  });

  // Handle listing an item
  const handleListItem = async (itemId: string) => {
    if (!account?.address) return;
    
    const priceStr = listingPrice[itemId];
    const price = parseFloat(priceStr);
    
    if (isNaN(price) || price <= 0) {
      setStatusMessage('Please enter a valid price');
      setTransactionStatus('error');
      return;
    }
    
    setTransactionStatus('pending');
    setStatusMessage('Creating listing...');
    
    try {
      const tx = createListingTransaction(itemId, price);
      await signAndExecute({ transaction: tx });
      
      setTransactionStatus('success');
      setStatusMessage('Item listed successfully!');
      await refreshInventory();
      await fetchListings();
    } catch (error) {
      console.error('Failed to list item:', error);
      setTransactionStatus('error');
      setStatusMessage('Failed to list item');
    }
  };

  // Handle buying a listed item
  const handleBuyItem = async (listing: MarketplaceListing) => {
    if (!account?.address) return;
    
    setTransactionStatus('pending');
    setStatusMessage(`Buying ${listing.name}...`);
    
    try {
      const tx = createBuyTransaction(listing.itemId, listing.price);
      const result = await signAndExecute({ transaction: tx });
      
      // Log full result for debugging
      console.log('Transaction result:', JSON.stringify(result, null, 2));
      
      // Check if transaction was successful
      const effects = result.effects as { status?: { status?: string; error?: string } } | undefined;
      if (effects?.status?.status !== 'success') {
        const errorMsg = effects?.status?.error || '';
        console.error('Transaction failed with error:', errorMsg);
        setTransactionStatus('error');
        
        // Check for various insufficient funds error patterns
        const lowerError = errorMsg.toLowerCase();
        if (lowerError.includes('insufficient') || 
            lowerError.includes('balance') || 
            lowerError.includes('coin') ||
            errorMsg.includes('InsufficientCoinBalance') ||
            errorMsg.includes('InsufficientGas')) {
          setStatusMessage('Insufficient funds to complete purchase');
        } else if (errorMsg) {
          setStatusMessage(errorMsg);
        } else {
          setStatusMessage('Transaction failed - please try again');
        }
        return;
      }
      
      setTransactionStatus('success');
      setStatusMessage('Item purchased successfully!');
      await refreshInventory();
      await fetchListings();
    } catch (error: unknown) {
      console.error('Failed to buy item:', error);
      setTransactionStatus('error');
      const errorStr = String(error).toLowerCase();
      if (errorStr.includes('insufficient') || errorStr.includes('balance') || errorStr.includes('reject')) {
        if (errorStr.includes('reject')) {
          setStatusMessage('Transaction rejected by user');
        } else {
          setStatusMessage('Insufficient funds to complete purchase');
        }
      } else {
        setStatusMessage('Failed to purchase item');
      }
    }
  };

  // Handle delisting an item
  const handleDelistItem = async (itemId: string) => {
    if (!account?.address) return;
    
    setTransactionStatus('pending');
    setStatusMessage('Removing listing...');
    
    try {
      const tx = createDelistTransaction(itemId);
      await signAndExecute({ transaction: tx });
      
      setTransactionStatus('success');
      setStatusMessage('Item delisted successfully! Item will be returned to player inventory after a short delay.');
      await refreshInventory();
      await fetchListings();
    } catch (error) {
      console.error('Failed to delist item:', error);
      setTransactionStatus('error');
      setStatusMessage('Failed to delist item');
    }
  };

  // Handle buying a premade item
  const handleBuyPremade = async (item: PremadeItem) => {
    if (!account?.address) return;
    
    setTransactionStatus('pending');
    setStatusMessage(`Purchasing ${item.name}...`);
    
    try {
      const tx = await createBuyPremadeTransaction(item.rarity, item.itemType);
      const result = await signAndExecute({ transaction: tx });
      
      // Log full result for debugging
      console.log('Transaction result:', JSON.stringify(result, null, 2));
      
      // Check if transaction was successful
      const effects = result.effects as { status?: { status?: string; error?: string } } | undefined;
      if (effects?.status?.status !== 'success') {
        const errorMsg = effects?.status?.error || '';
        console.error('Transaction failed with error:', errorMsg);
        setTransactionStatus('error');
        
        // Check for various insufficient funds error patterns
        const lowerError = errorMsg.toLowerCase();
        if (lowerError.includes('insufficient') || 
            lowerError.includes('balance') || 
            lowerError.includes('coin') ||
            errorMsg.includes('InsufficientCoinBalance') ||
            errorMsg.includes('InsufficientGas')) {
          setStatusMessage('Insufficient funds to complete purchase');
        } else if (errorMsg) {
          setStatusMessage(errorMsg);
        } else {
          setStatusMessage('Transaction failed - please try again');
        }
        return;
      }
      
      setTransactionStatus('success');
      setStatusMessage(`${item.name} purchased successfully!`);
      await refreshInventory();
    } catch (error: unknown) {
      console.error('Failed to buy premade item:', error);
      setTransactionStatus('error');
      const errorStr = String(error).toLowerCase();
      if (errorStr.includes('insufficient') || errorStr.includes('balance') || errorStr.includes('reject')) {
        if (errorStr.includes('reject')) {
          setStatusMessage('Transaction rejected by user');
        } else {
          setStatusMessage('Insufficient funds to complete purchase');
        }
      } else {
        setStatusMessage('Failed to purchase item');
      }
    }
  };

  // Clear status after a delay
  useEffect(() => {
    if (transactionStatus === 'success' || transactionStatus === 'error') {
      const timer = setTimeout(() => {
        setTransactionStatus('idle');
        setStatusMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [transactionStatus]);

  // Get items that aren't listed yet
  const unlistedItems = ownedItems.filter(
    item => !listings.some(l => l.itemId === item.id)
  );

  return (
    <div className="marketplace">
      <div className="marketplace-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to Menu
        </button>
        <h2>🛒 Marketplace</h2>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className={`status-message ${transactionStatus}`}>
          {statusMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="marketplace-tabs">
        <button
          className={`tab-btn ${activeTab === 'my-listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-listings')}
        >
          📦 My Items
        </button>
        <button
          className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          🏪 Dev Shop
        </button>
        <button
          className={`tab-btn ${activeTab === 'market' ? 'active' : ''}`}
          onClick={() => setActiveTab('market')}
        >
          🌐 Player Market
        </button>
      </div>

      {/* Tab content */}
      <div className="marketplace-content">
        {/* My Listings Tab */}
        {activeTab === 'my-listings' && (
          <div className="my-listings-tab">
            <div className="section">
              <h3>Your Items</h3>
              {myListings.length === 0 && unlistedItems.length === 0 ? (
                <p className="no-items">No items yet. Play the game to collect loot!</p>
              ) : (
                <div className="items-grid">
                  {/* Listed items */}
                  {myListings.map(listing => (
                    <div
                      key={listing.itemId}
                      className="item-card listed"
                      style={{ borderColor: RARITY_COLORS[listing.rarity] }}
                    >
                      <div className="listed-badge">FOR SALE</div>
                      <div className="item-rarity" style={{ color: RARITY_COLORS[listing.rarity] }}>
                        {listing.rarity.toUpperCase()}
                      </div>
                      <div className="item-name">{listing.name}</div>
                      <div className="item-stats">
                        <span>⚔️ {listing.attack}</span>
                        <span>🛡️ {listing.defense}</span>
                      </div>
                      <div className="sell-controls">
                        <div className="listed-price-label">Listed for {formatPrice(listing.price)}</div>
                        <button
                          className="delist-btn"
                          onClick={() => handleDelistItem(listing.itemId)}
                          disabled={transactionStatus === 'pending'}
                        >
                          Delist
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Unlisted items */}
                  {unlistedItems.map(item => (
                    <div
                      key={item.id}
                      className="item-card sellable"
                      style={{ borderColor: RARITY_COLORS[item.rarity] }}
                    >
                      <div className="item-rarity" style={{ color: RARITY_COLORS[item.rarity] }}>
                        {item.rarity.toUpperCase()}
                      </div>
                      <div className="item-name">{item.name}</div>
                      <div className="item-stats">
                        <span>⚔️ {item.attack}</span>
                        <span>🛡️ {item.defense}</span>
                      </div>
                      <div className="sell-controls">
                        <input
                          type="number"
                          placeholder="Price (SUI)"
                          step="0.1"
                          min="0.01"
                          value={listingPrice[item.id] || ''}
                          onChange={(e) => setListingPrice(prev => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        <button
                          className="sell-btn"
                          onClick={() => handleListItem(item.id)}
                          disabled={transactionStatus === 'pending' || !listingPrice[item.id]}
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dev Shop Tab */}
        {activeTab === 'shop' && (
          <div className="shop-tab">
            <p className="shop-description">
              Premium items with maximum stats! All proceeds go directly to the developers.
            </p>
            <div className="items-grid shop-grid">
              {premadeItems.map((item, index) => (
                <div
                  key={`${item.rarity}-${item.itemType}-${index}`}
                  className="item-card shop-item"
                  style={{ borderColor: RARITY_COLORS[item.rarity] }}
                >
                  <div className="shop-badge">SUI</div>
                  <div className="item-type-icon">
                    {item.itemType === 'weapon' ? '⚔️' : '🛡️'}
                  </div>
                  <div className="item-rarity" style={{ color: RARITY_COLORS[item.rarity] }}>
                    {item.rarity.toUpperCase()}
                  </div>
                  <div className="item-name">{item.name}</div>
                  <div className="item-stats">
                    <span>⚔️ {item.attack}</span>
                    <span>🛡️ {item.defense}</span>
                  </div>
                  <div className="item-description">{item.description}</div>
                  <div className="card-footer">
                    <div className="shop-price">{formatPrice(item.price)}</div>
                    <button
                      className="buy-btn"
                      onClick={() => handleBuyPremade(item)}
                      disabled={transactionStatus === 'pending' || !account}
                    >
                      {account ? 'Buy Now' : 'Connect Wallet'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player Market Tab */}
        {activeTab === 'market' && (
          <div className="market-tab">
            <p className="market-description">
              Browse items listed by other players. 2% fee on all purchases goes to developers.
            </p>
            {loading ? (
              <p className="loading-text">Loading listings...</p>
            ) : otherListings.length === 0 ? (
              <p className="no-items">No items currently for sale. Check back later!</p>
            ) : (
              <div className="items-grid">
                {otherListings.map(listing => (
                  <div
                    key={listing.itemId}
                    className="item-card market-item"
                    style={{ borderColor: RARITY_COLORS[listing.rarity] }}
                  >
                    <div className="item-rarity" style={{ color: RARITY_COLORS[listing.rarity] }}>
                      {listing.rarity.toUpperCase()}
                    </div>
                    <div className="item-name">{listing.name}</div>
                    <div className="item-stats">
                      <span>⚔️ {listing.attack}</span>
                      <span>🛡️ {listing.defense}</span>
                    </div>
                    <div className="price-info">
                      <div className="item-price">{formatPrice(listing.price)}</div>
                      <div className="fee-info">+{formatPrice(calculateFee(listing.price))} fee</div>
                    </div>
                    <div className="seller-info">
                      Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                    </div>
                    <button
                      className="buy-btn"
                      onClick={() => handleBuyItem(listing)}
                      disabled={transactionStatus === 'pending' || !account}
                    >
                      {account ? 'Buy' : 'Connect Wallet'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
