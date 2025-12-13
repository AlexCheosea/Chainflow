/**
 * Walrus Storage Service
 * Handles NFT image generation and storage on Walrus decentralized storage
 */

// Walrus testnet configuration
const WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';

// Map game item names to asset filenames
const ITEM_NAME_TO_ASSET: Record<string, string> = {
  // Common weapons
  'Rusty Sword': 'Wooden Sword.png',
  'Iron Dagger': 'Knife.png',
  'Wooden Club': 'Wooden Staff.png',
  // Uncommon weapons
  'Steel Blade': 'Iron Sword.png',
  'Short Bow': 'Bow.png',
  'Bronze Axe': 'Axe.png',
  // Rare weapons
  'Enchanted Sword': 'Silver Sword.png',
  'Crossbow': 'Bow.png',
  'Flame Dagger': 'Knife.png',
  // Epic weapons
  'Dragon Slayer': 'Golden Sword.png',
  'Thunder Staff': 'Ruby Staff.png',
  'Soul Reaper': 'Axe.png',
  // Legendary weapons
  'Excalibur': 'Golden Sword.png',
  'Chaos Orb': 'Magic Wand.png',
  'Godslayer': 'Golden Sword.png',
  // Common armor
  'Cloth Armor': 'Wooden Shield.png',
  'Wooden Shield': 'Wooden Shield.png',
  'Leather Cap': 'Wooden Shield.png',
  // Uncommon armor
  'Leather Armor': 'Wooden Shield.png',
  'Bronze Shield': 'Iron Shield.png',
  'Iron Helm': 'Iron Shield.png',
  // Rare armor
  'Chain Mail': 'Iron Shield.png',
  'Magic Shield': 'Iron Shield.png',
  'Steel Plate': 'Iron Shield.png',
  // Epic armor
  'Plate Armor': 'Iron Shield.png',
  'Aegis Shield': 'Iron Shield.png',
  'Dragon Scale': 'Iron Shield.png',
  // Legendary armor
  'Godplate': 'Iron Shield.png',
  'Divine Barrier': 'Iron Shield.png',
  'Immortal Cloak': 'Iron Shield.png',
  // Shop items (same mappings with Shop prefix)
  'Shop Steel Blade': 'Iron Sword.png',
  'Shop Leather Armor': 'Wooden Shield.png',
  'Shop Enchanted Sword': 'Silver Sword.png',
  'Shop Chain Mail': 'Iron Shield.png',
  'Shop Dragon Slayer': 'Golden Sword.png',
  'Shop Plate Armor': 'Iron Shield.png',
  'Shop Excalibur': 'Golden Sword.png',
  'Shop Godplate': 'Iron Shield.png',
};

// Rarity colors for overlay text
const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa',
  uncommon: '#00ff00',
  rare: '#0088ff',
  epic: '#aa00ff',
  legendary: '#ffaa00',
};

/**
 * Load an image from the assets folder
 */
async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Generate an NFT image with floor/shop badge overlay
 * @param itemName - The name of the item
 * @param floorNumber - Floor where item was obtained (0 for shop items)
 * @param isShopItem - Whether this is a dev shop item
 * @param rarity - Item rarity for color coding
 * @returns Blob of the generated PNG image
 */
export async function generateNFTImage(
  itemName: string,
  floorNumber: number,
  isShopItem: boolean,
  rarity: string
): Promise<Blob> {
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Fill background with dark gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  // Add rarity border
  const rarityColor = RARITY_COLORS[rarity] || '#aaaaaa';
  ctx.strokeStyle = rarityColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 252);

  // Load and draw the item sprite
  const assetName = ITEM_NAME_TO_ASSET[itemName] || ITEM_NAME_TO_ASSET[itemName.replace('Shop ', '')] || 'Iron Sword.png';
  try {
    const img = await loadImage(`/assets/weapons/${assetName}`);
    // Center the sprite and scale it
    const scale = 3;
    const spriteSize = 32 * scale;
    const x = (256 - spriteSize) / 2;
    const y = (256 - spriteSize) / 2 - 10;
    ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
    ctx.drawImage(img, x, y, spriteSize, spriteSize);
  } catch (error) {
    console.warn('Failed to load item sprite:', assetName, error);
    // Draw placeholder
    ctx.fillStyle = rarityColor;
    ctx.fillRect(78, 68, 100, 100);
  }

  // Add floor or shop badge at bottom
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  
  if (isShopItem) {
    // Shop item: Add "SUI" badge in top-right corner
    ctx.fillStyle = '#0088ff';
    ctx.beginPath();
    ctx.roundRect(180, 10, 66, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('SUI', 213, 30);
    
    // Add "Shop Item" at bottom
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Shop Item', 128, 235);
  } else {
    // Dropped item: Add floor number at bottom
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Floor ${floorNumber}`, 128, 235);
  }

  // Add item name at top
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = rarityColor;
  const displayName = itemName.length > 20 ? itemName.substring(0, 17) + '...' : itemName;
  ctx.fillText(displayName, 128, 25);

  // Convert canvas to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create image blob'));
      }
    }, 'image/png');
  });
}

/**
 * Upload data to Walrus storage
 * @param blob - The data to upload
 * @returns The blob ID for retrieval
 */
export async function uploadToWalrus(blob: Blob): Promise<string> {
  try {
    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/store?epochs=5`, {
      method: 'PUT',
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`Walrus upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Handle both newlyCreated and alreadyCertified responses
    if (result.newlyCreated) {
      return result.newlyCreated.blobObject.blobId;
    } else if (result.alreadyCertified) {
      return result.alreadyCertified.blobId;
    } else {
      throw new Error('Unexpected Walrus response format');
    }
  } catch (error) {
    console.error('Walrus upload error:', error);
    throw error;
  }
}

/**
 * Get the URL to fetch a blob from Walrus
 * @param blobId - The Walrus blob ID
 * @returns The URL to fetch the blob
 */
export function getWalrusUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR_URL}/v1/${blobId}`;
}

/**
 * Fetch data from Walrus storage
 * @param blobId - The Walrus blob ID
 * @returns The blob data
 */
export async function fetchFromWalrus(blobId: string): Promise<Blob> {
  const response = await fetch(getWalrusUrl(blobId));
  
  if (!response.ok) {
    throw new Error(`Walrus fetch failed: ${response.statusText}`);
  }
  
  return response.blob();
}

/**
 * Generate and upload an NFT image to Walrus
 * @param itemName - The name of the item
 * @param floorNumber - Floor where item was obtained (0 for shop items)
 * @param isShopItem - Whether this is a dev shop item
 * @param rarity - Item rarity
 * @returns The Walrus blob ID
 */
export async function generateAndUploadNFTImage(
  itemName: string,
  floorNumber: number,
  isShopItem: boolean,
  rarity: string
): Promise<string> {
  const imageBlob = await generateNFTImage(itemName, floorNumber, isShopItem, rarity);
  const blobId = await uploadToWalrus(imageBlob);
  return blobId;
}
