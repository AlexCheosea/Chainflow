import Phaser from 'phaser';

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public health: number = 100;
  public maxHealth: number = 100;
  private lastDamageTime: number = 0;
  private damageCooldown: number = 500; // ms between damage ticks

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setData('ref', this);
  }

  move(velocityX: number, velocityY: number): void {
    this.sprite.setVelocity(velocityX, velocityY);
  }

  takeDamage(amount: number): void {
    const now = Date.now();
    if (now - this.lastDamageTime < this.damageCooldown) {
      return;
    }
    
    this.lastDamageTime = now;
    this.health = Math.max(0, this.health - amount);
    
    // Flash red
    this.sprite.setTint(0xff0000);
    this.sprite.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
}
