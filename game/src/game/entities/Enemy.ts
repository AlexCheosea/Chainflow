import Phaser from 'phaser';

export class Enemy {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public health: number = 50;
  private speed: number = 60;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'enemy');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setData('ref', this);
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
  }

  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
    
    // Flash white
    this.sprite.setTint(0xffffff);
    this.sprite.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
