import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { type OwnedItem } from '../services/itemMinting';
import './Marketplace.css';

const RARITY_ORDER: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

type MySortOption = 'attack' | 'defense' | 'rarity';
type MarketSortOption = 'attack' | 'defense' | 'rarity' | 'price';

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
  const [mySortBy, setMySortBy] = useState<MySortOption>('rarity');
  const [marketSortBy, setMarketSortBy] = useState<MarketSortOption>('rarity');
  const [showListed, setShowListed] = useState<boolean>(true);

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

  const sortedMyListings = useMemo(() => {
    return [...myListings].sort((a, b) => {
      switch (mySortBy) {
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
  }, [myListings, mySortBy]);

  // Get items that aren't listed yet
  const unlistedItems = ownedItems.filter(
    (item) => !listings.some(l => l.itemId === item.id)
  );

  const sortedUnlistedItems = useMemo(() => {
    return [...unlistedItems].sort((a, b) => {
      switch (mySortBy) {
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
  }, [unlistedItems, mySortBy]);

  const sortedOtherListings = useMemo(() => {
    return [...otherListings].sort((a, b) => {
      switch (marketSortBy) {
        case 'attack':
          return b.attack - a.attack;
        case 'defense':
          return b.defense - a.defense;
        case 'rarity':
          return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
        case 'price':
          return a.price - b.price; // ascending price
        default:
          return 0;
      }
    });
  }, [otherListings, marketSortBy]);

  // Format price for player market: round up to nearest 0.001 and show 3 decimals
  const formatPriceRoundUp3 = (price: number): string => {
    const v = Math.ceil(price * 1000) / 1000;
    // Keep up to 3 decimals, but trim unnecessary trailing zeros
    let s = v.toFixed(3);
    s = s.replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '');
    // If the string ends with a lone dot, remove it
    s = s.replace(/\.$/, '');
    return `${s} SUI`;
  };

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

  return (
    <div className="mp-container">
      <div className="mp-header">
        <button className="mp-back-btn" onClick={onBack}>
          ← Back to Menu
        </button>
        <h2>🛒 Marketplace</h2>
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className={`mp-status-message ${transactionStatus}`}>
          {statusMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="mp-tabs">
        <button
          className={`mp-tab-btn ${activeTab === 'my-listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-listings')}
        >
          📦 My Items
        </button>
        <button
          className={`mp-tab-btn ${activeTab === 'shop' ? 'active' : ''}`}
          onClick={() => setActiveTab('shop')}
        >
          🏪 Dev Shop
        </button>
        <button
          className={`mp-tab-btn ${activeTab === 'market' ? 'active' : ''}`}
          onClick={() => setActiveTab('market')}
        >
          🌐 Player Market
        </button>
      </div>

      {/* Tab content */}
      <div className="mp-content">
        {/* My Listings Tab */}
        {activeTab === 'my-listings' && (
          <div className="mp-my-listings-tab">
            <div className="mp-section">
              <h3>Your Items</h3>
                <div className="mp-sort-controls">
                  <span className="mp-sort-label">Sort by:</span>
                  <button 
                    className={`mp-sort-btn ${mySortBy === 'attack' ? 'active' : ''}`}
                    onClick={() => setMySortBy('attack')}
                  >
                    ⚔️ Attack
                  </button>
                  <button 
                    className={`mp-sort-btn ${mySortBy === 'defense' ? 'active' : ''}`}
                    onClick={() => setMySortBy('defense')}
                  >
                    🛡️ Defense
                  </button>
                  <button 
                    className={`mp-sort-btn ${mySortBy === 'rarity' ? 'active' : ''}`}
                    onClick={() => setMySortBy('rarity')}
                  >
                    ✨ Rarity
                  </button>
                  <button
                    className={`mp-sort-btn ${showListed ? 'active' : ''}`}
                    onClick={() => setShowListed(s => !s)}
                    title={showListed ? 'Hide listed items' : 'Show listed items'}
                  >
                    {showListed ? 'Listed: On' : 'Listed: Off'}
                  </button>
                </div>

                {myListings.length === 0 && unlistedItems.length === 0 ? (
                <p className="mp-no-items">No items yet. Play the game to collect loot!</p>
              ) : (
                <div className="mp-items-grid">
                    {/* Listed items */}
                    {showListed && sortedMyListings.map((listing: MarketplaceListing) => (
                    <div
                      key={listing.itemId}
                      className="mp-item-card listed"
                      data-rarity={listing.rarity}
                    >
                      <div className="mp-item-rarity" data-rarity={listing.rarity}>
                        {listing.rarity.toUpperCase()}
                      </div>
                      <div className="mp-item-name">{listing.name}</div>
                      <div className="mp-item-stats">
                        <span>⚔️ {listing.attack}</span>
                        <span>🛡️ {listing.defense}</span>
                      </div>
                      <div className="mp-sell-controls">
                        <div className="mp-listed-price-label">Listed for {formatPrice(listing.price)}</div>
                        <button
                          className="mp-delist-btn"
                          onClick={() => handleDelistItem(listing.itemId)}
                          disabled={transactionStatus === 'pending'}
                        >
                          Delist
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Unlisted items */}
                  {sortedUnlistedItems.map((item: OwnedItem) => (
                    <div
                      key={item.id}
                      className="mp-item-card sellable"
                      data-rarity={item.rarity}
                    >
                      <div className="mp-item-rarity" data-rarity={item.rarity}>
                        {item.rarity.toUpperCase()}
                      </div>
                      <div className="mp-item-name">{item.name}</div>
                      <div className="mp-item-stats">
                        <span>⚔️ {item.attack}</span>
                        <span>🛡️ {item.defense}</span>
                      </div>
                      <div className="mp-sell-controls">
                        <input
                          type="number"
                          placeholder="Price (SUI)"
                          step="0.1"
                          min="0.01"
                          value={listingPrice[item.id] || ''}
                          onChange={(e) => setListingPrice(prev => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        <button
                          className="mp-sell-btn"
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
          <div className="mp-shop-tab">
            <p className="mp-shop-description">
              Premium items with maximum stats! All proceeds go directly to the developers.
            </p>
            <div className="mp-items-grid mp-shop-grid">
              {premadeItems.map((item, index) => (
                <div
                  key={`${item.rarity}-${item.itemType}-${index}`}
                  className="mp-item-card shop-item"
                  data-rarity={item.rarity}
                >
                  <div className="mp-shop-badge">SUI</div>
                  <div className="mp-item-type-icon">
                    {item.itemType === 'weapon' ? '⚔️' : '🛡️'}
                  </div>
                  <div className="mp-item-rarity" data-rarity={item.rarity}>
                    {item.rarity.toUpperCase()}
                  </div>
                  <div className="mp-item-name">{item.name}</div>
                  <div className="mp-item-stats">
                    <span>⚔️ {item.attack}</span>
                    <span>🛡️ {item.defense}</span>
                  </div>
                  <div className="mp-item-description">{item.description}</div>
                  <div className="mp-card-footer">
                    <div className="mp-shop-price">{formatPrice(item.price)}</div>
                    <button
                      className="mp-buy-btn"
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
          <div className="mp-market-tab">
            <p className="mp-market-description">
              Browse items listed by other players. 2% fee on all purchases goes to developers.
            </p>
            <div className="mp-sort-controls">
              <span className="mp-sort-label">Sort by:</span>
              <button 
                className={`mp-sort-btn ${marketSortBy === 'attack' ? 'active' : ''}`}
                onClick={() => setMarketSortBy('attack')}
              >
                ⚔️ Attack
              </button>
              <button 
                className={`mp-sort-btn ${marketSortBy === 'defense' ? 'active' : ''}`}
                onClick={() => setMarketSortBy('defense')}
              >
                🛡️ Defense
              </button>
              <button 
                className={`mp-sort-btn ${marketSortBy === 'rarity' ? 'active' : ''}`}
                onClick={() => setMarketSortBy('rarity')}
              >
                ✨ Rarity
              </button>
              <button 
                className={`mp-sort-btn ${marketSortBy === 'price' ? 'active' : ''}`}
                onClick={() => setMarketSortBy('price')}
              >
                💰 Price
              </button>
            </div>
            {loading ? (
              <p className="mp-loading-text">Loading listings...</p>
            ) : otherListings.length === 0 ? (
              <p className="mp-no-items">No items currently for sale. Check back later!</p>
            ) : (
              <div className="mp-items-grid">
                {sortedOtherListings.map((listing: MarketplaceListing) => (
                  <div
                    key={listing.itemId}
                    className="mp-item-card market-item"
                    data-rarity={listing.rarity}
                  >
                    <div className="mp-item-rarity" data-rarity={listing.rarity}>
                      {listing.rarity.toUpperCase()}
                    </div>
                    <div className="mp-item-name">{listing.name}</div>
                    <div className="mp-item-stats">
                      <span>⚔️ {listing.attack}</span>
                      <span>🛡️ {listing.defense}</span>
                    </div>
                    <div className="mp-price-info">
                      <div className="mp-item-price">{formatPriceRoundUp3(listing.price)}</div>
                      <div className="mp-fee-info">+{formatPriceRoundUp3(calculateFee(listing.price))} fee</div>
                    </div>
                    <div className="mp-seller-info">
                      Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                    </div>
                    <button
                      className="mp-buy-btn"
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
