import Phaser from 'phaser';

export type ItemType = 'weapon' | 'armor';

export interface ItemData {
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  itemType: ItemType;
  attack: number;
  defense: number;
  description: string;
  floorObtained: number;
}

const WEAPON_NAMES = {
  common: ['Rusty Sword', 'Iron Dagger', 'Wooden Club'],
  uncommon: ['Steel Blade', 'Short Bow', 'Bronze Axe'],
  rare: ['Enchanted Sword', 'Crossbow', 'Flame Dagger'],
  epic: ['Dragon Slayer', 'Thunder Staff', 'Soul Reaper'],
  legendary: ['Excalibur', 'Chaos Orb', 'Godslayer'],
};

const ARMOR_NAMES = {
  common: ['Cloth Armor', 'Wooden Shield', 'Leather Cap'],
  uncommon: ['Leather Armor', 'Bronze Shield', 'Iron Helm'],
  rare: ['Chain Mail', 'Magic Shield', 'Steel Plate'],
  epic: ['Plate Armor', 'Aegis Shield', 'Dragon Scale'],
  legendary: ['Godplate', 'Divine Barrier', 'Immortal Cloak'],
};

const RARITY_WEIGHTS = [
  { rarity: 'common' as const, weight: 50 },
  { rarity: 'uncommon' as const, weight: 30 },
  { rarity: 'rare' as const, weight: 15 },
  { rarity: 'epic' as const, weight: 4 },
  { rarity: 'legendary' as const, weight: 1 },
];

const RARITY_COLORS = {
  common: 0xaaaaaa,
  uncommon: 0x00ff00,
  rare: 0x0088ff,
  epic: 0xaa00ff,
  legendary: 0xffaa00,
};

// Base drop chance (20%) - decreases after each drop
const BASE_DROP_CHANCE = 0.20;
const DROP_CHANCE_DECAY = 0.5; // Each drop reduces chance by 50%

const RARITY_ORDER: ItemData['rarity'][] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export class Item {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private itemData: ItemData;
  private floor: number;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number = 1, minRarity: ItemData['rarity'] = 'common') {
    this.floor = floor;
    this.itemData = this.generateItemData(minRarity);
    
    // Use weapon or armor texture based on type
    const textureKey = this.itemData.itemType === 'weapon' ? 'item_weapon' : 'item_armor';
    this.sprite = scene.physics.add.sprite(x, y, textureKey);
    this.sprite.setData('ref', this);
    this.sprite.setTint(RARITY_COLORS[this.itemData.rarity]);
    
    // Add floating animation
    scene.tweens.add({
      targets: this.sprite,
      y: y - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private generateItemData(minRarity: ItemData['rarity']): ItemData {
    // Roll for rarity (but ensure it's at least minRarity)
    const minIndex = RARITY_ORDER.indexOf(minRarity);
    
    const roll = Math.random() * 100;
    let cumulative = 0;
    let rarity: ItemData['rarity'] = 'common';
    
    for (const { rarity: r, weight } of RARITY_WEIGHTS) {
      cumulative += weight;
      if (roll < cumulative) {
        rarity = r;
        break;
      }
    }
    
    // Ensure minimum rarity
    const rolledIndex = RARITY_ORDER.indexOf(rarity);
    if (rolledIndex < minIndex) {
      rarity = minRarity;
    }

    // Randomly choose weapon or armor
    const itemType: ItemType = Math.random() < 0.5 ? 'weapon' : 'armor';

    // Get random name for rarity and type
    const names = itemType === 'weapon' ? WEAPON_NAMES[rarity] : ARMOR_NAMES[rarity];
    const name = names[Math.floor(Math.random() * names.length)];

    // Generate stats based on rarity - weapons have high attack, armor has high defense
    const rarityMultiplier = {
      common: 1,
      uncommon: 1.5,
      rare: 2,
      epic: 3,
      legendary: 5,
    };

    const multiplier = rarityMultiplier[rarity];
    
    // Weapons: high attack, low defense. Armor: low attack, high defense
    let attack: number, defense: number;
    if (itemType === 'weapon') {
      attack = Math.floor(Phaser.Math.Between(10, 20) * multiplier);
      defense = Math.floor(Phaser.Math.Between(1, 3) * multiplier);
    } else {
      attack = Math.floor(Phaser.Math.Between(1, 3) * multiplier);
      defense = Math.floor(Phaser.Math.Between(10, 20) * multiplier);
    }

    return {
      name,
      rarity,
      itemType,
      attack,
      defense,
      description: `A ${rarity} ${name.toLowerCase()} found on floor ${this.floor}.`,
      floorObtained: this.floor,
    };
  }

  /**
   * Calculate if an item should drop based on current drop count
   * @param dropsThisFloor - Number of items already dropped this floor
   * @param maxDrops - Maximum drops allowed per floor
   * @returns Whether an item should drop
   */
  static shouldDrop(dropsThisFloor: number, maxDrops: number = 2): boolean {
    if (dropsThisFloor >= maxDrops) {
      return false;
    }
    // Each drop reduces chance by decay factor
    const currentChance = BASE_DROP_CHANCE * Math.pow(DROP_CHANCE_DECAY, dropsThisFloor);
    return Math.random() < currentChance;
  }

  getItemData(): ItemData {
    return this.itemData;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
