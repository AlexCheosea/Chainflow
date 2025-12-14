import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class UIScene extends Phaser.Scene {
  private healthText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;
  private statsText!: Phaser.GameObjects.Text;
  private gateNotification!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(_data?: { floor?: number }): void {
    // Health bar background
    this.add.rectangle(120, 40, 200, 20, 0x333333).setScrollFactor(0);
    
    // Health bar
    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.updateHealthBar(100, 100);

    // Health text
    this.healthText = this.add.text(120, 40, '100/100', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);

    // Attack/Defense stats
    this.statsText = this.add.text(20, 60, '⚔️ 25  🛡️ 0', {
      fontSize: '14px',
      color: '#ffcc00',
      fontFamily: 'monospace',
    }).setScrollFactor(0);

    // Gate notification (hidden initially) - centered at half of game width (1000/2 = 500)
    this.gateNotification = this.add.text(500, 550, '🌀 Gate opened! Find the portal to proceed!', {
      fontSize: '16px',
      color: '#00aaff',
      fontFamily: 'monospace',
      backgroundColor: '#000000aa',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);

    // Listen for player stats updates
    EventBus.on('player-stats-update', this.onPlayerStatsUpdate, this);

    // Listen for player death
    EventBus.on('player-died', this.onPlayerDied, this);

    // Listen for gate spawned
    EventBus.on('gate-spawned', this.onGateSpawned, this);

    // Listen for item collected
    EventBus.on('item-collected', this.onItemCollected, this);

    // Instructions moved to React UI (under the playable window)
  }

  private updateHealthBar(health: number, maxHealth: number): void {
    this.healthBar.clear();
    const healthPercent = health / maxHealth;
    this.healthBar.fillStyle(healthPercent > 0.3 ? 0x00ff00 : 0xff0000);
    const width = (health / maxHealth) * 196;
    this.healthBar.fillRect(22, 31, width, 18);
  }

  private onPlayerStatsUpdate(data: { health: number; maxHealth: number; attack?: number; defense?: number; floor?: number }): void {
    // Guard against null references (can happen during scene transitions)
    if (!this.healthText || !this.healthBar) return;
    
    try {
      this.healthText.setText(`${data.health}/${data.maxHealth}`);
      this.updateHealthBar(data.health, data.maxHealth);
      
      if (data.attack !== undefined && data.defense !== undefined && this.statsText) {
        this.statsText.setText(`⚔️ ${data.attack}  🛡️ ${data.defense}`);
      }
    } catch (error) {
      // Silently catch any errors during UI updates (race conditions with scene destruction)
      console.warn('UIScene update error (likely scene transition):', error);
    }
  }

  private onGateSpawned(data: { floor: number }): void {
    if (!this.gateNotification) return;
    
    try {
      this.gateNotification.setText(`🌀 Gate opened on Floor ${data.floor}! Find the portal!`);
      this.gateNotification.setAlpha(1);
      
      // Fade out after 3 seconds
      this.tweens.add({
        targets: this.gateNotification,
        alpha: 0,
        delay: 3000,
        duration: 1000,
      });
    } catch (error) {
      console.warn('UIScene gate notification error:', error);
    }
  }

  private onItemCollected(item: { name: string; rarity: string; playerX: number; playerY: number }): void {
    // Check if scene is still active
    if (!this.sys || !this.sys.isActive()) return;
    
    try {
      // Show brief item pickup notification above the player
      const rarityColors: Record<string, string> = {
        common: '#aaaaaa',
        uncommon: '#00ff00',
        rare: '#0088ff',
        epic: '#aa00ff',
        legendary: '#ffaa00',
      };
      
      // Position 50px above the player (in world coordinates, not UI)
      const notification = this.add.text(item.playerX, item.playerY - 50, `+ ${item.name}`, {
        fontSize: '16px',
        color: rarityColors[item.rarity] || '#ffffff',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      
      // Float up and fade out
      this.tweens.add({
        targets: notification,
        y: item.playerY - 100,
        alpha: 0,
        duration: 1500,
        onComplete: () => notification.destroy(),
      });
    } catch (error) {
      console.warn('UIScene item collected error:', error);
    }
  }

  private onPlayerDied(_data?: { pendingItems?: unknown[] }): void {
    // Death is now handled by React modal in App.tsx
    // Just stop the UIScene to prevent any further updates
    if (this.sys && this.sys.isActive()) {
      this.scene.stop();
    }
  }

  shutdown(): void {
    EventBus.off('player-stats-update', this.onPlayerStatsUpdate, this);
    EventBus.off('player-died', this.onPlayerDied, this);
    EventBus.off('gate-spawned', this.onGateSpawned, this);
    EventBus.off('item-collected', this.onItemCollected, this);
  }
}
