import { Transaction } from '@mysten/sui/transactions';
import { CONTRACT_CONFIG, suiClient } from '../config/sui';
import type { ItemData } from '../game/entities/Item';

// Rarity to image URL mapping (placeholder URLs)
const RARITY_IMAGES: Record<string, string> = {
  common: 'https://raw.githubusercontent.com/AlexCheosea/Chainflow/main/assets/items/common.png',
  uncommon: 'https://raw.githubusercontent.com/AlexCheosea/Chainflow/main/assets/items/uncommon.png',
  rare: 'https://raw.githubusercontent.com/AlexCheosea/Chainflow/main/assets/items/rare.png',
  epic: 'https://raw.githubusercontent.com/AlexCheosea/Chainflow/main/assets/items/epic.png',
  legendary: 'https://raw.githubusercontent.com/AlexCheosea/Chainflow/main/assets/items/legendary.png',
};

export interface MintItemParams {
  item: ItemData;
  recipientAddress: string;
}

/**
 * Creates a transaction to mint an item NFT
 */
export function createMintItemTransaction(params: MintItemParams): Transaction {
  const { item, recipientAddress } = params;
  
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${CONTRACT_CONFIG.packageId}::${CONTRACT_CONFIG.module}::${CONTRACT_CONFIG.mintFunction}`,
    arguments: [
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(item.name))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(item.rarity))),
      tx.pure.u64(item.attack),
      tx.pure.u64(item.defense),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(item.description))),
      tx.pure.vector('u8', Array.from(new TextEncoder().encode(RARITY_IMAGES[item.rarity] || RARITY_IMAGES.common))),
      tx.pure.address(recipientAddress),
    ],
  });
  
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
      },
    });

    return objects.data
      .filter((obj) => obj.data?.content?.dataType === 'moveObject')
      .map((obj) => {
        const content = obj.data!.content as { fields: Record<string, unknown> };
        return {
          id: obj.data!.objectId,
          name: content.fields.name as string,
          rarity: content.fields.rarity as string,
          attack: Number(content.fields.attack),
          defense: Number(content.fields.defense),
          description: content.fields.description as string,
          imageUrl: content.fields.image_url as string,
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
