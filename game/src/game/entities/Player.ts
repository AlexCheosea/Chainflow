import Phaser from 'phaser';
import type { ItemData } from './Item';

export type Direction = 'up' | 'down' | 'left' | 'right';

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public health: number = 100;
  public maxHealth: number = 100;
  public attack: number = 25;
  public defense: number = 0;
  public facing: Direction = 'down';
  private lastDamageTime: number = 0;
  private damageCooldown: number = 500; // ms between damage ticks
  private isAttacking: boolean = false;
  private currentAnimKey: string = 'idle_down';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Use the idle_down animation texture by default
    this.sprite = scene.physics.add.sprite(x, y, 'player_idle_down');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setData('ref', this);
    const baseFrameSize = 64;
    const scale = 0.8; // increased ~25% from 0.4 -> 0.5
    this.sprite.setScale(scale);
    this.sprite.setOrigin(0.5, 0.5);

    // Set hitbox to match scaled sprite size
    this.sprite.body?.setSize(baseFrameSize * scale, baseFrameSize * scale);
    this.sprite.body?.setOffset(0, 0);
    
    // Start idle animation
    this.sprite.play('idle_down');
  }

  /**
   * Set base stats from equipment bonuses (called on game start)
   */
  setBaseStats(bonusAttack: number, bonusDefense: number): void {
    this.attack = 25 + bonusAttack;
    this.defense = 0 + bonusDefense;
  }

  move(velocityX: number, velocityY: number): void {
    this.sprite.setVelocity(velocityX, velocityY);
    
    // Don't change animation if attacking
    if (this.isAttacking) return;
    
    // Determine target animation
    let animKey: string;
    
    if (velocityX !== 0 || velocityY !== 0) {
      // Only change direction if movement is significantly in one direction
      const absX = Math.abs(velocityX);
      const absY = Math.abs(velocityY);
      
      if (absX > absY * 1.5) {
        this.facing = velocityX > 0 ? 'right' : 'left';
      } else if (absY > absX * 1.5) {
        this.facing = velocityY > 0 ? 'down' : 'up';
      }
      // If movement is diagonal, keep current facing direction
      
      animKey = `run_${this.facing}`;
    } else {
      animKey = `idle_${this.facing}`;
    }
    
    // Only play animation if it's different from current (use cached key)
    if (this.currentAnimKey !== animKey) {
      this.currentAnimKey = animKey;
      this.sprite.play(animKey, true);
    }
  }

  /**
   * Play attack animation in direction of attack
   */
  playAttackAnimation(angle: number): void {
    // Determine direction from angle
    const deg = Phaser.Math.RadToDeg(angle);
    if (deg >= -45 && deg < 45) {
      this.facing = 'right';
    } else if (deg >= 45 && deg < 135) {
      this.facing = 'down';
    } else if (deg >= -135 && deg < -45) {
      this.facing = 'up';
    } else {
      this.facing = 'left';
    }
    
    this.isAttacking = true;
    const animKey = `attack_${this.facing}`;
    this.sprite.play(animKey);
    
    // Reset to idle after animation completes
    this.sprite.once('animationcomplete', () => {
      this.isAttacking = false;
    });
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
    if (this.sprite?.scene?.time) {
      this.sprite.scene.time.delayedCall(100, () => {
        if (this.sprite?.active) {
          this.sprite.clearTint();
        }
      });
    }
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Apply item stats to player (this shouldn't be called anymore, leaving this for reference)
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
