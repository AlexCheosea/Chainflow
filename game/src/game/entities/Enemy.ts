import Phaser from 'phaser';

export class Enemy {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public health: number;
  public maxHealth: number;
  public attack: number;
  private speed: number;
  private healthBar: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number = 1) {
    // Scale stats exponentially with floor
    const hpMultiplier = Math.pow(1.5, floor - 1);
    const attackMultiplier = Math.pow(1.3, floor - 1);
    const speedMultiplier = 1 + (floor - 1) * 0.1; // 10% speed increase per floor
    
    this.maxHealth = Math.floor(50 * hpMultiplier);
    this.health = this.maxHealth;
    this.attack = Math.floor(10 * attackMultiplier);
    this.speed = Math.floor(60 * speedMultiplier);
    
    this.sprite = scene.physics.add.sprite(x, y, 'enemy');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setData('ref', this);
    
    // Create health bar
    this.healthBar = scene.add.graphics();
    this.updateHealthBar();
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
    
    // Update health bar position
    this.updateHealthBar();
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
    this.sprite.destroy();
  }
}
