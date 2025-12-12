import Phaser from 'phaser';

export type EnemyRarity = 'normal' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Rarity stat multipliers (HP, Attack, Speed)
const RARITY_MULTIPLIERS: Record<EnemyRarity, { hp: number; attack: number; speed: number; dropChance: number }> = {
  normal: { hp: 1.0, attack: 1.0, speed: 1.0, dropChance: 0.2 },
  uncommon: { hp: 1.3, attack: 1.2, speed: 1.1, dropChance: 0.35 },
  rare: { hp: 1.6, attack: 1.4, speed: 1.2, dropChance: 0.5 },
  epic: { hp: 2.0, attack: 1.7, speed: 1.3, dropChance: 0.7 },
  legendary: { hp: 3.0, attack: 2.0, speed: 1.5, dropChance: 0.95 },
};

// Spawn weights (lower = rarer)
const RARITY_SPAWN_WEIGHTS: Record<EnemyRarity, number> = {
  normal: 50,
  uncommon: 25,
  rare: 15,
  epic: 8,
  legendary: 2,
};

export class Enemy {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public health: number;
  public maxHealth: number;
  public attack: number;
  public rarity: EnemyRarity;
  public dropChance: number;
  private speed: number;
  private healthBar: Phaser.GameObjects.Graphics;
  private rarityLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number = 1, rarity?: EnemyRarity) {
    // Determine rarity (use provided or roll random)
    this.rarity = rarity ?? Enemy.rollRarity();
    const rarityMult = RARITY_MULTIPLIERS[this.rarity];
    this.dropChance = rarityMult.dropChance;
    
    // Scale stats by floor AND rarity
    const hpMultiplier = Math.pow(1.5, floor - 1) * rarityMult.hp;
    const attackMultiplier = Math.pow(1.3, floor - 1) * rarityMult.attack;
    const speedMultiplier = (1 + (floor - 1) * 0.1) * rarityMult.speed;
    
    this.maxHealth = Math.floor(50 * hpMultiplier);
    this.health = this.maxHealth;
    this.attack = Math.floor(10 * attackMultiplier);
    this.speed = Math.floor(60 * speedMultiplier);
    
    // Use rarity-specific texture
    this.sprite = scene.physics.add.sprite(x, y, `enemy_${this.rarity}`);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setData('ref', this);
    
    // Create health bar
    this.healthBar = scene.add.graphics();
    
    // Add rarity label for non-normal enemies
    const rarityColors: Record<EnemyRarity, string> = {
      normal: '#888888',
      uncommon: '#00ff00',
      rare: '#0088ff',
      epic: '#aa00ff',
      legendary: '#ffaa00',
    };
    
    this.rarityLabel = scene.add.text(x, y - 32, '', {
      fontSize: '10px',
      color: rarityColors[this.rarity],
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    
    if (this.rarity !== 'normal') {
      this.rarityLabel.setText(this.rarity.toUpperCase());
    }
    
    this.updateHealthBar();
  }

  // Roll random rarity based on spawn weights
  static rollRarity(): EnemyRarity {
    const totalWeight = Object.values(RARITY_SPAWN_WEIGHTS).reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;
    
    for (const [rarity, weight] of Object.entries(RARITY_SPAWN_WEIGHTS)) {
      roll -= weight;
      if (roll <= 0) {
        return rarity as EnemyRarity;
      }
    }
    return 'normal';
  }

  // Get minimum rarity for item drops (rarer enemies drop rarer items)
  getMinDropRarity(): string {
    const rarityToItemRarity: Record<EnemyRarity, string> = {
      normal: 'common',
      uncommon: 'common',
      rare: 'uncommon',
      epic: 'rare',
      legendary: 'epic',
    };
    return rarityToItemRarity[this.rarity];
  }

  update(playerX: number, playerY: number): void {
    // Simple chase AI
    const distance = Phaser.Math.Distance.Between(
      this.sprite.x,
      this.sprite.y,
      playerX,
      playerY
    );

    // Only chase if within range
    if (distance < 200 && distance > 20) {
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        playerX,
        playerY
      );
      
      this.sprite.setVelocity(
        Math.cos(angle) * this.speed,
        Math.sin(angle) * this.speed
      );
    } else {
      this.sprite.setVelocity(0, 0);
    }
    
    // Update health bar and label positions
    this.updateHealthBar();
    this.rarityLabel.setPosition(this.sprite.x, this.sprite.y - 32);
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    
    const barWidth = 32;
    const barHeight = 4;
    const x = this.sprite.x - barWidth / 2;
    const y = this.sprite.y - 24;
    
    // Background (red)
    this.healthBar.fillStyle(0x660000);
    this.healthBar.fillRect(x, y, barWidth, barHeight);
    
    // Health (green)
    const healthPercent = this.health / this.maxHealth;
    this.healthBar.fillStyle(healthPercent > 0.3 ? 0x00ff00 : 0xff0000);
    this.healthBar.fillRect(x, y, barWidth * healthPercent, barHeight);
    
    // Border
    this.healthBar.lineStyle(1, 0x000000);
    this.healthBar.strokeRect(x, y, barWidth, barHeight);
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    
    // Flash white
    this.sprite.setTint(0xffffff);
    this.sprite.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });
    
    // Update health bar
    this.updateHealthBar();
  }

  destroy(): void {
    this.healthBar.destroy();
    this.rarityLabel.destroy();
    this.sprite.destroy();
  }
}
