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
    // Player sprite (green knight shape)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x00aa00);
    playerGraphics.fillRect(8, 4, 16, 24); // Body
    playerGraphics.fillStyle(0x00ff00);
    playerGraphics.fillCircle(16, 8, 6); // Head
    playerGraphics.fillStyle(0x888888);
    playerGraphics.fillRect(24, 10, 6, 3); // Sword
    playerGraphics.generateTexture('player', 32, 32);
    playerGraphics.destroy();

    // Enemy sprite (red slime shape)
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(0xaa0000);
    enemyGraphics.fillEllipse(16, 20, 28, 20); // Body
    enemyGraphics.fillStyle(0xff0000);
    enemyGraphics.fillEllipse(16, 16, 24, 16); // Top
    enemyGraphics.fillStyle(0xffffff);
    enemyGraphics.fillCircle(10, 14, 4); // Left eye
    enemyGraphics.fillCircle(22, 14, 4); // Right eye
    enemyGraphics.fillStyle(0x000000);
    enemyGraphics.fillCircle(12, 14, 2); // Left pupil
    enemyGraphics.fillCircle(24, 14, 2); // Right pupil
    enemyGraphics.generateTexture('enemy', 32, 32);
    enemyGraphics.destroy();

    // Weapon item sprite (sword)
    const weaponGraphics = this.make.graphics({ x: 0, y: 0 });
    weaponGraphics.fillStyle(0x888888);
    weaponGraphics.fillRect(14, 2, 4, 20); // Blade
    weaponGraphics.fillStyle(0xaaaaaa);
    weaponGraphics.fillTriangle(16, 0, 12, 6, 20, 6); // Tip
    weaponGraphics.fillStyle(0x8b4513);
    weaponGraphics.fillRect(12, 22, 8, 6); // Handle
    weaponGraphics.fillStyle(0xffd700);
    weaponGraphics.fillRect(10, 20, 12, 3); // Guard
    weaponGraphics.generateTexture('item_weapon', 32, 32);
    weaponGraphics.destroy();

    // Armor item sprite (shield)
    const armorGraphics = this.make.graphics({ x: 0, y: 0 });
    armorGraphics.fillStyle(0x666666);
    armorGraphics.fillRoundedRect(6, 4, 20, 24, 4); // Shield base
    armorGraphics.fillStyle(0x888888);
    armorGraphics.fillRoundedRect(8, 6, 16, 20, 3); // Shield face
    armorGraphics.fillStyle(0xffd700);
    armorGraphics.fillCircle(16, 16, 5); // Emblem
    armorGraphics.generateTexture('item_armor', 32, 32);
    armorGraphics.destroy();

    // Legacy item sprite (for compatibility)
    const itemGraphics = this.make.graphics({ x: 0, y: 0 });
    itemGraphics.fillStyle(0xffd700);
    itemGraphics.fillTriangle(16, 0, 32, 16, 16, 32);
    itemGraphics.fillTriangle(16, 0, 0, 16, 16, 32);
    itemGraphics.generateTexture('item', 32, 32);
    itemGraphics.destroy();

    // Gate sprite (portal to next floor)
    const gateGraphics = this.make.graphics({ x: 0, y: 0 });
    gateGraphics.fillStyle(0x0044aa);
    gateGraphics.fillEllipse(16, 16, 28, 28);
    gateGraphics.fillStyle(0x0066ff);
    gateGraphics.fillEllipse(16, 16, 22, 22);
    gateGraphics.fillStyle(0x00aaff);
    gateGraphics.fillEllipse(16, 16, 14, 14);
    gateGraphics.fillStyle(0xffffff);
    gateGraphics.fillEllipse(16, 16, 6, 6);
    gateGraphics.generateTexture('gate', 32, 32);
    gateGraphics.destroy();

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
