import Phaser from 'phaser';
import { EventBus } from '../EventBus';

export class UIScene extends Phaser.Scene {
  private healthText!: Phaser.GameObjects.Text;
  private healthBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    // Health bar background
    this.add.rectangle(120, 30, 200, 20, 0x333333).setScrollFactor(0);
    
    // Health bar
    this.healthBar = this.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.updateHealthBar(100, 100);

    // Health text
    this.healthText = this.add.text(120, 30, '100/100', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);

    // Listen for player stats updates
    EventBus.on('player-stats-update', this.onPlayerStatsUpdate, this);

    // Listen for player death
    EventBus.on('player-died', this.onPlayerDied, this);

    // Instructions
    this.add.text(400, 580, 'WASD or Arrow Keys to move | Defeat enemies to get NFT items!', {
      fontSize: '12px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);
  }

  private updateHealthBar(health: number, maxHealth: number): void {
    this.healthBar.clear();
    this.healthBar.fillStyle(0x00ff00);
    const width = (health / maxHealth) * 196;
    this.healthBar.fillRect(22, 21, width, 18);
  }

  private onPlayerStatsUpdate(data: { health: number; maxHealth: number }): void {
    this.healthText.setText(`${data.health}/${data.maxHealth}`);
    this.updateHealthBar(data.health, data.maxHealth);
  }

  private onPlayerDied(): void {
    const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
    overlay.setScrollFactor(0);

    this.add.text(400, 250, 'YOU DIED', {
      fontSize: '48px',
      color: '#ff0000',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);

    this.add.text(400, 320, 'Check your wallet for collected NFT items!', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0);

    const restartButton = this.add.text(400, 380, '[ RESTART ]', {
      fontSize: '24px',
      color: '#00ff00',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setInteractive();

    restartButton.on('pointerover', () => restartButton.setColor('#88ff88'));
    restartButton.on('pointerout', () => restartButton.setColor('#00ff00'));
    restartButton.on('pointerdown', () => {
      EventBus.emit('restart-game');
    });
  }

  shutdown(): void {
    EventBus.off('player-stats-update', this.onPlayerStatsUpdate, this);
    EventBus.off('player-died', this.onPlayerDied, this);
  }
}
