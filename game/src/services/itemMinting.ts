import { Transaction } from '@mysten/sui/transactions';
import { CONTRACT_CONFIG, suiClient } from '../config/sui';
import type { ItemData } from '../game/entities/Item';
import { generateAndUploadNFTImage, getWalrusUrl } from './walrusStorage';

// Flag to enable/disable Walrus integration (can be toggled during development)
const USE_WALRUS = true;

// Fallback image URL when Walrus is disabled or fails
function getFallbackImageUrl(item: ItemData): string {
  const baseUrl = 'https://raw.githubusercontent.com/AlexCheosea/Chainflow/main/assets/items';
  return `${baseUrl}/${item.itemType}_${item.rarity}.png`;
}

export interface MintItemParams {
  item: ItemData;
  recipientAddress: string;
}

export interface BatchMintParams {
  items: ItemData[];
  recipientAddress: string;
}

/**
 * Creates a transaction to mint an item NFT
 * Note: This is the sync version that uses fallback URLs
 * For Walrus integration, use createMintItemTransactionWithWalrus
 */
export function createMintItemTransaction(params: MintItemParams): Transaction {
  const { item, recipientAddress } = params;
  
  const tx = new Transaction();
  
  // Create a name that includes floor information
  const displayName = `${item.name} (Floor ${item.floorObtained})`;
  
  // Create a detailed description
  const description = `A ${item.rarity} ${item.itemType} found on floor ${item.floorObtained}. ⚔️ Attack: ${item.attack} | 🛡️ Defense: ${item.defense}`;
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::${CONTRACT_CONFIG.mintFunction}`,
    arguments: [
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(displayName))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(item.rarity))),
      tx.pure.u64(item.attack),
      tx.pure.u64(item.defense),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(description))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(getFallbackImageUrl(item)))),
      tx.pure.address(recipientAddress),
    ],
  });
  
  return tx;
}

/**
 * Creates a transaction to mint an item NFT with Walrus image storage
 */
export async function createMintItemTransactionWithWalrus(params: MintItemParams): Promise<Transaction> {
  const { item, recipientAddress } = params;
  
  let imageUrl: string;
  
  if (USE_WALRUS) {
    try {
      // Generate and upload NFT image to Walrus
      const blobId = await generateAndUploadNFTImage(
        item.name,
        item.floorObtained,
        false, // Not a shop item
        item.rarity
      );
      imageUrl = getWalrusUrl(blobId);
    } catch (error) {
      console.warn('Walrus upload failed, using fallback URL:', error);
      imageUrl = getFallbackImageUrl(item);
    }
  } else {
    imageUrl = getFallbackImageUrl(item);
  }
  
  const tx = new Transaction();
  
  const displayName = `${item.name} (Floor ${item.floorObtained})`;
  const description = `A ${item.rarity} ${item.itemType} found on floor ${item.floorObtained}. ⚔️ Attack: ${item.attack} | 🛡️ Defense: ${item.defense}`;
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::${CONTRACT_CONFIG.mintFunction}`,
    arguments: [
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(displayName))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(item.rarity))),
      tx.pure.u64(item.attack),
      tx.pure.u64(item.defense),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(description))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(imageUrl))),
      tx.pure.address(recipientAddress),
    ],
  });
  
  return tx;
}

/**
 * Creates a single transaction to mint multiple item NFTs at once
 * This allows all items to be minted with a single wallet approval
 * Note: This is the sync version that uses fallback URLs
 */
export function createBatchMintTransaction(params: BatchMintParams): Transaction {
  const { items, recipientAddress } = params;
  
  const tx = new Transaction();
  
  // Add a mint call for each item in the batch
  for (const item of items) {
    // Create a name that includes floor information
    const displayName = `${item.name} (Floor ${item.floorObtained})`;
    
    // Create a detailed description
    const description = `A ${item.rarity} ${item.itemType} found on floor ${item.floorObtained}. ⚔️ Attack: ${item.attack} | 🛡️ Defense: ${item.defense}`;
    
    tx.moveCall({
      target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::${CONTRACT_CONFIG.mintFunction}`,
      arguments: [
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(displayName))),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(item.rarity))),
        tx.pure.u64(item.attack),
        tx.pure.u64(item.defense),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(description))),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(getFallbackImageUrl(item)))),
        tx.pure.address(recipientAddress),
      ],
    });
  }
  
  return tx;
}

/**
 * Creates a single transaction to mint multiple item NFTs with Walrus image storage
 * Uploads all images first, then creates the batch transaction
 */
export async function createBatchMintTransactionWithWalrus(params: BatchMintParams): Promise<Transaction> {
  const { items, recipientAddress } = params;
  
  const tx = new Transaction();
  
  console.log('[Minting] Starting batch mint with Walrus, USE_WALRUS =', USE_WALRUS);
  console.log('[Minting] Items to mint:', items.map(i => i.name));
  
  // Upload all images to Walrus in parallel
  const imageUrls = await Promise.all(
    items.map(async (item) => {
      if (USE_WALRUS) {
        try {
          console.log('[Minting] Uploading image for:', item.name);
          const blobId = await generateAndUploadNFTImage(
            item.name,
            item.floorObtained,
            false,
            item.rarity
          );
          const url = getWalrusUrl(blobId);
          console.log('[Minting] ✅ Walrus URL for', item.name, ':', url);
          return url;
        } catch (error) {
          console.error('[Minting] ❌ Walrus upload failed for', item.name, ':', error);
          const fallbackUrl = getFallbackImageUrl(item);
          console.log('[Minting] Using fallback URL:', fallbackUrl);
          return fallbackUrl;
        }
      }
      return getFallbackImageUrl(item);
    })
  );
  
  console.log('[Minting] All image URLs:', imageUrls);
  
  // Add a mint call for each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const imageUrl = imageUrls[i];
    
    const displayName = `${item.name} (Floor ${item.floorObtained})`;
    const description = `A ${item.rarity} ${item.itemType} found on floor ${item.floorObtained}. ⚔️ Attack: ${item.attack} | 🛡️ Defense: ${item.defense}`;
    
    tx.moveCall({
      target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::${CONTRACT_CONFIG.mintFunction}`,
      arguments: [
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(displayName))),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(item.rarity))),
        tx.pure.u64(item.attack),
        tx.pure.u64(item.defense),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(description))),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(imageUrl))),
        tx.pure.address(recipientAddress),
      ],
    });
  }
  
  return tx;
}

/**
 * Fetches all Item NFTs owned by an address
 */
export async function fetchOwnedItems(address: string): Promise<OwnedItem[]> {
  try {
    const objects = await suiClient.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::Item`,
      },
      options: {
        showContent: true,
        showType: true,
        showDisplay: true,
      },
    });

    return objects.data
      .filter((obj) => obj.data?.content?.dataType === 'moveObject')
      .map((obj) => {
        const content = obj.data!.content as { fields: Record<string, unknown> };
        const display = obj.data?.display?.data as Record<string, string> | undefined;
        
        return {
          id: obj.data!.objectId,
          name: (display?.name || content.fields.name) as string,
          rarity: content.fields.rarity as string,
          attack: Number(content.fields.attack),
          defense: Number(content.fields.defense),
          description: (display?.description || content.fields.description) as string,
          imageUrl: (display?.image_url || content.fields.image_url) as string,
        };
      });
  } catch (error) {
    console.error('Error fetching owned items:', error);
    return [];
  }
}

export interface OwnedItem {
  id: string;
  name: string;
  rarity: string;
  attack: number;
  defense: number;
  description: string;
  imageUrl: string;
}
