import Phaser from 'phaser';

export interface ItemData {
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  attack: number;
  defense: number;
  description: string;
}

const ITEM_NAMES = {
  common: ['Rusty Sword', 'Wooden Shield', 'Cloth Armor', 'Iron Dagger'],
  uncommon: ['Steel Blade', 'Bronze Shield', 'Leather Armor', 'Short Bow'],
  rare: ['Enchanted Sword', 'Magic Shield', 'Chain Mail', 'Crossbow'],
  epic: ['Dragon Slayer', 'Aegis Shield', 'Plate Armor', 'Thunder Staff'],
  legendary: ['Excalibur', 'Divine Barrier', 'Godplate', 'Chaos Orb'],
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

export class Item {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private itemData: ItemData;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.itemData = this.generateItemData();
    
    this.sprite = scene.physics.add.sprite(x, y, 'item');
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

  private generateItemData(): ItemData {
    // Roll for rarity
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

    // Get random name for rarity
    const names = ITEM_NAMES[rarity];
    const name = names[Math.floor(Math.random() * names.length)];

    // Generate stats based on rarity
    const rarityMultiplier = {
      common: 1,
      uncommon: 1.5,
      rare: 2,
      epic: 3,
      legendary: 5,
    };

    const multiplier = rarityMultiplier[rarity];
    const attack = Math.floor(Phaser.Math.Between(5, 15) * multiplier);
    const defense = Math.floor(Phaser.Math.Between(3, 10) * multiplier);

    return {
      name,
      rarity,
      attack,
      defense,
      description: `A ${rarity} ${name.toLowerCase()} with ${attack} attack and ${defense} defense.`,
    };
  }

  getItemData(): ItemData {
    return this.itemData;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
