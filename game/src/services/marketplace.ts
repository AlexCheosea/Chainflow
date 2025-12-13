/**
 * Marketplace Service
 * Handles marketplace transactions for listing, buying, and delisting items
 */

import { Transaction } from '@mysten/sui/transactions';
import { suiClient, CONTRACT_CONFIG } from '../config/sui';
// Walrus imports - will be used for NFT image generation
// import { generateAndUploadNFTImage, getWalrusUrl } from './walrusStorage';

// Developer wallet for fees and shop sales
export const DEV_WALLET = '0x4e3fe4f8b863fb54446c875fab14ab06b6830a678721f4859eaffc592b5efecd';

// Marketplace module name
const MARKETPLACE_MODULE = 'marketplace';

// Marketplace shared object ID - UPDATE AFTER DEPLOYMENT
export const MARKETPLACE_OBJECT_ID = '0xf3b9b3e51e12c36b6fd439470398fc722f60ae35dbdacd16dc25e56aeb8bf80f';

// Premade item prices in SUI
export const PREMADE_PRICES = {
  uncommon: 0.25,
  rare: 1,
  epic: 5,
  legendary: 20,
} as const;

// Premade item max stats
export const PREMADE_STATS = {
  uncommon: {
    weapon: { attack: 30, defense: 4 },
    armor: { attack: 4, defense: 30 },
  },
  rare: {
    weapon: { attack: 40, defense: 6 },
    armor: { attack: 6, defense: 40 },
  },
  epic: {
    weapon: { attack: 50, defense: 7 },
    armor: { attack: 7, defense: 50 },
  },
  legendary: {
    weapon: { attack: 60, defense: 9 },
    armor: { attack: 9, defense: 60 },
  },
} as const;

// Premade item names
export const PREMADE_NAMES = {
  uncommon: {
    weapon: 'Shop Steel Blade',
    armor: 'Shop Leather Armor',
  },
  rare: {
    weapon: 'Shop Enchanted Sword',
    armor: 'Shop Chain Mail',
  },
  epic: {
    weapon: 'Shop Dragon Slayer',
    armor: 'Shop Plate Armor',
  },
  legendary: {
    weapon: 'Shop Excalibur',
    armor: 'Shop Godplate',
  },
} as const;

export type Rarity = 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemType = 'weapon' | 'armor';

export interface MarketplaceListing {
  itemId: string;
  name: string;
  rarity: string;
  attack: number;
  defense: number;
  price: number; // In SUI
  seller: string;
  imageUrl: string;
}

export interface PremadeItem {
  rarity: Rarity;
  itemType: ItemType;
  name: string;
  attack: number;
  defense: number;
  price: number;
  description: string;
}

/**
 * Get all premade items available in the shop
 */
export function getPremadeItems(): PremadeItem[] {
  const items: PremadeItem[] = [];
  
  const rarities: Rarity[] = ['uncommon', 'rare', 'epic', 'legendary'];
  const types: ItemType[] = ['weapon', 'armor'];
  
  for (const rarity of rarities) {
    for (const itemType of types) {
      items.push({
        rarity,
        itemType,
        name: PREMADE_NAMES[rarity][itemType],
        attack: PREMADE_STATS[rarity][itemType].attack,
        defense: PREMADE_STATS[rarity][itemType].defense,
        price: PREMADE_PRICES[rarity],
        description: itemType === 'weapon' 
          ? 'A powerful weapon from the Shop. Max stats for its rarity.'
          : 'Premium armor from the Shop. Max stats for its rarity.',
      });
    }
  }
  
  return items;
}

/**
 * Create a transaction to list an item for sale
 */
export function createListingTransaction(
  itemId: string,
  priceInSui: number
): Transaction {
  const tx = new Transaction();
  
  // Convert SUI to MIST (1 SUI = 1_000_000_000 MIST)
  const priceInMist = Math.floor(priceInSui * 1_000_000_000);
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${MARKETPLACE_MODULE}::list_item`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.object(itemId),
      tx.pure.u64(priceInMist),
    ],
  });
  
  return tx;
}

/**
 * Create a transaction to buy a listed item
 */
export function createBuyTransaction(
  itemId: string,
  priceInSui: number
): Transaction {
  const tx = new Transaction();
  
  // Convert SUI to MIST
  const priceInMist = Math.floor(priceInSui * 1_000_000_000);
  
  // Split coins for payment
  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(priceInMist)]);
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${MARKETPLACE_MODULE}::buy_item`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.pure.id(itemId),
      paymentCoin,
    ],
  });
  
  return tx;
}

/**
 * Create a transaction to delist an item
 */
export function createDelistTransaction(itemId: string): Transaction {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${MARKETPLACE_MODULE}::delist_item`,
    arguments: [
      tx.object(MARKETPLACE_OBJECT_ID),
      tx.pure.id(itemId),
    ],
  });
  
  return tx;
}

/**
 * Create a transaction to buy a premade item from the dev shop
 * This also generates and uploads the NFT image to Walrus
 */
export async function createBuyPremadeTransaction(
  rarity: Rarity,
  itemType: ItemType
): Promise<Transaction> {
  const tx = new Transaction();
  
  // Get price and convert to MIST
  const priceInSui = PREMADE_PRICES[rarity];
  const priceInMist = Math.floor(priceInSui * 1_000_000_000);
  
  // Rarity code: 1=uncommon, 2=rare, 3=epic, 4=legendary
  const rarityCode = { uncommon: 1, rare: 2, epic: 3, legendary: 4 }[rarity];
  
  // Item type code: 1=weapon, 2=armor
  const itemTypeCode = itemType === 'weapon' ? 1 : 2;
  
  // Split coins for payment
  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(priceInMist)]);
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${MARKETPLACE_MODULE}::buy_premade_item`,
    arguments: [
      tx.pure.u8(rarityCode),
      tx.pure.u8(itemTypeCode),
      paymentCoin,
    ],
  });
  
  return tx;
}

/**
 * Fetch all active listings from the marketplace
 */
export async function fetchAllListings(): Promise<MarketplaceListing[]> {
  if (!MARKETPLACE_OBJECT_ID) {
    console.warn('Marketplace object ID not set');
    return [];
  }
  
  try {
    // Fetch the marketplace object
    const marketplaceObj = await suiClient.getObject({
      id: MARKETPLACE_OBJECT_ID,
      options: {
        showContent: true,
      },
    });
    
    if (!marketplaceObj.data?.content || marketplaceObj.data.content.dataType !== 'moveObject') {
      return [];
    }
    
    // Get dynamic fields (listings table)
    const dynamicFields = await suiClient.getDynamicFields({
      parentId: MARKETPLACE_OBJECT_ID,
    });
    
    const listings: MarketplaceListing[] = [];
    
    for (const field of dynamicFields.data) {
      try {
        const listingData = await suiClient.getDynamicFieldObject({
          parentId: MARKETPLACE_OBJECT_ID,
          name: field.name,
        });
        
        if (listingData.data?.content && listingData.data.content.dataType === 'moveObject') {
          const fields = listingData.data.content.fields as Record<string, unknown>;
          const item = fields.item as Record<string, unknown>;
          const itemFields = (item as { fields?: Record<string, unknown> })?.fields || item;
          
          listings.push({
            itemId: field.name.value as string,
            name: itemFields.name as string,
            rarity: itemFields.rarity as string,
            attack: Number(itemFields.attack),
            defense: Number(itemFields.defense),
            price: Number(fields.price) / 1_000_000_000, // Convert MIST to SUI
            seller: fields.seller as string,
            imageUrl: itemFields.image_url as string || '',
          });
        }
      } catch (error) {
        console.warn('Failed to fetch listing:', field.name, error);
      }
    }
    
    return listings;
  } catch (error) {
    console.error('Failed to fetch marketplace listings:', error);
    return [];
  }
}

/**
 * Check if a specific item is listed
 */
export async function isItemListed(itemId: string): Promise<boolean> {
  const listings = await fetchAllListings();
  return listings.some(l => l.itemId === itemId);
}

/**
 * Get the 2% fee amount for a given price
 */
export function calculateFee(priceInSui: number): number {
  return priceInSui * 0.02;
}

/**
 * Format price for display
 */
export function formatPrice(priceInSui: number): string {
  if (priceInSui < 1) {
    return `${priceInSui} SUI`;
  }
  return `${priceInSui.toFixed(2)} SUI`;
}
