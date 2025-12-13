import { Transaction } from '@mysten/sui/transactions';
import { CONTRACT_CONFIG, suiClient } from '../config/sui';
import type { ItemData } from '../game/entities/Item';

// Generate image URL based on item type and rarity (placeholder URLs)
function getItemImageUrl(item: ItemData): string {
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
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(getItemImageUrl(item)))),
      tx.pure.address(recipientAddress),
    ],
  });
  
  return tx;
}

/**
 * Creates a single transaction to mint multiple item NFTs at once
 * This allows all items to be minted with a single wallet approval
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
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(getItemImageUrl(item)))),
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
