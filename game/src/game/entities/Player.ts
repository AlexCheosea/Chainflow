import Phaser from 'phaser';
import type { ItemData } from './Item';

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public health: number = 100;
  public maxHealth: number = 100;
  public attack: number = 25;
  public defense: number = 0;
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

  takeDamage(incomingDamage: number): void {
    const now = Date.now();
    if (now - this.lastDamageTime < this.damageCooldown) {
      return;
    }
    
    this.lastDamageTime = now;
    
    // Apply defense: actual damage = incoming damage - defense (minimum 1)
    const actualDamage = Math.max(1, incomingDamage - this.defense);
    this.health = Math.max(0, this.health - actualDamage);
    
    // Flash red
    this.sprite.setTint(0xff0000);
    this.sprite.scene.time.delayedCall(100, () => {
      this.sprite.clearTint();
    });
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Apply item stats to player (called when item is picked up)
   */
  equipItem(item: ItemData): void {
    this.attack += item.attack;
    this.defense += item.defense;
  }

  /**
   * Get current stats for UI display
   */
  getStats(): { health: number; maxHealth: number; attack: number; defense: number } {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      attack: this.attack,
      defense: this.defense,
    };
  }
}
