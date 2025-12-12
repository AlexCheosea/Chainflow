import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create simple colored rectangles as placeholder sprites
    this.createPlaceholderGraphics();
  }

  create(): void {
    this.scene.start('GameScene');
  }

  private createPlaceholderGraphics(): void {
    // Player sprite (green square)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x00ff00);
    playerGraphics.fillRect(0, 0, 32, 32);
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    // Enemy sprite (red square)
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(0xff0000);
    enemyGraphics.fillRect(0, 0, 32, 32);
    enemyGraphics.generateTexture('enemy', 32, 32);
    enemyGraphics.destroy();

    // Item sprite (yellow diamond)
    const itemGraphics = this.make.graphics({ x: 0, y: 0 });
    itemGraphics.fillStyle(0xffd700);
    itemGraphics.fillTriangle(16, 0, 32, 16, 16, 32);
    itemGraphics.fillTriangle(16, 0, 0, 16, 16, 32);
    itemGraphics.generateTexture('item', 32, 32);
    itemGraphics.destroy();

    // Wall tile (dark gray)
    const wallGraphics = this.make.graphics({ x: 0, y: 0 });
    wallGraphics.fillStyle(0x404040);
    wallGraphics.fillRect(0, 0, 32, 32);
    wallGraphics.lineStyle(1, 0x606060);
    wallGraphics.strokeRect(0, 0, 32, 32);
    wallGraphics.generateTexture('wall', 32, 32);
    wallGraphics.destroy();

    // Floor tile (dark blue-gray)
    const floorGraphics = this.make.graphics({ x: 0, y: 0 });
    floorGraphics.fillStyle(0x2a2a4a);
    floorGraphics.fillRect(0, 0, 32, 32);
    floorGraphics.generateTexture('floor', 32, 32);
    floorGraphics.destroy();
  }
}
