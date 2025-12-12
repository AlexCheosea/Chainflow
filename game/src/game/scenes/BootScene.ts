import Phaser from 'phaser';

// Import player sprite assets
import idleDown from '../../assets/Sprites_Player/IDLE_8_FRAMES_EACH/idle_down.png';
import idleUp from '../../assets/Sprites_Player/IDLE_8_FRAMES_EACH/idle_up.png';
import idleLeft from '../../assets/Sprites_Player/IDLE_8_FRAMES_EACH/idle_left.png';
import idleRight from '../../assets/Sprites_Player/IDLE_8_FRAMES_EACH/idle_right.png';
import runDown from '../../assets/Sprites_Player/RUN_8_FRAMES_EACH/run_down.png';
import runUp from '../../assets/Sprites_Player/RUN_8_FRAMES_EACH/run_up.png';
import runLeft from '../../assets/Sprites_Player/RUN_8_FRAMES_EACH/run_left.png';
import runRight from '../../assets/Sprites_Player/RUN_8_FRAMES_EACH/run_right.png';
import attackDown from '../../assets/Sprites_Player/ATTACK_8_FRAMES_EACH/attack1_down.png';
import attackUp from '../../assets/Sprites_Player/ATTACK_8_FRAMES_EACH/attack1_up.png';
import attackLeft from '../../assets/Sprites_Player/ATTACK_8_FRAMES_EACH/attack1_left.png';
import attackRight from '../../assets/Sprites_Player/ATTACK_8_FRAMES_EACH/attack1_right.png';

// Enemy rarity colors (matching item rarity)
const ENEMY_RARITY_COLORS = {
  normal: { body: 0x888888, accent: 0xaaaaaa },    // Gray - common enemies
  uncommon: { body: 0x00aa00, accent: 0x00ff00 },  // Green
  rare: { body: 0x0066cc, accent: 0x0088ff },      // Blue
  epic: { body: 0x8800aa, accent: 0xaa00ff },      // Purple
  legendary: { body: 0xcc8800, accent: 0xffaa00 }, // Gold
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load player sprite sheets (8 frames each, assuming 64x64 per frame = 512x64 strip)
    this.load.spritesheet('player_idle_down', idleDown, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_idle_up', idleUp, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_idle_left', idleLeft, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_idle_right', idleRight, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_run_down', runDown, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_run_up', runUp, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_run_left', runLeft, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_run_right', runRight, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_attack_down', attackDown, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_attack_up', attackUp, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_attack_left', attackLeft, { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('player_attack_right', attackRight, { frameWidth: 64, frameHeight: 64 });
  }

  create(): void {
    // Create procedural sprites for enemies, items, environment
    this.createPlayerFallback();
    this.createEnemySprites();
    this.createItemSprites();
    this.createEnvironmentSprites();
    
    // Create player animations
    this.createPlayerAnimations();
    
    this.scene.start('GameScene');
  }

  private createPlayerAnimations(): void {
    // Idle animations
    this.anims.create({ key: 'idle_down', frames: this.anims.generateFrameNumbers('player_idle_down', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'idle_up', frames: this.anims.generateFrameNumbers('player_idle_up', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'idle_left', frames: this.anims.generateFrameNumbers('player_idle_left', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'idle_right', frames: this.anims.generateFrameNumbers('player_idle_right', { start: 0, end: 7 }), frameRate: 8, repeat: -1 });
    
    // Run animations
    this.anims.create({ key: 'run_down', frames: this.anims.generateFrameNumbers('player_run_down', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'run_up', frames: this.anims.generateFrameNumbers('player_run_up', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'run_left', frames: this.anims.generateFrameNumbers('player_run_left', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'run_right', frames: this.anims.generateFrameNumbers('player_run_right', { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    
    // Attack animations
    this.anims.create({ key: 'attack_down', frames: this.anims.generateFrameNumbers('player_attack_down', { start: 0, end: 7 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: 'attack_up', frames: this.anims.generateFrameNumbers('player_attack_up', { start: 0, end: 7 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: 'attack_left', frames: this.anims.generateFrameNumbers('player_attack_left', { start: 0, end: 7 }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: 'attack_right', frames: this.anims.generateFrameNumbers('player_attack_right', { start: 0, end: 7 }), frameRate: 16, repeat: 0 });
  }

  private createPlayerFallback(): void {
    // Detailed knight sprite
    const g = this.make.graphics({ x: 0, y: 0 });
    
    // Body armor (silver)
    g.fillStyle(0x666688);
    g.fillRect(10, 12, 12, 14);
    
    // Chainmail texture
    g.fillStyle(0x555577);
    g.fillRect(11, 14, 10, 2);
    g.fillRect(11, 18, 10, 2);
    g.fillRect(11, 22, 10, 2);
    
    // Head/helmet
    g.fillStyle(0x888899);
    g.fillCircle(16, 8, 6);
    
    // Helmet visor
    g.fillStyle(0x222233);
    g.fillRect(12, 6, 8, 3);
    
    // Helmet plume
    g.fillStyle(0xcc0000);
    g.fillRect(14, 0, 4, 4);
    
    // Shield on left arm
    g.fillStyle(0x0066aa);
    g.fillRoundedRect(4, 12, 8, 12, 2);
    g.fillStyle(0xffcc00);
    g.fillCircle(8, 18, 2);
    
    // Sword on right
    g.fillStyle(0xaaaacc);
    g.fillRect(22, 8, 3, 16);
    g.fillStyle(0xccccee);
    g.fillTriangle(23, 6, 21, 10, 26, 10);
    g.fillStyle(0x8b4513);
    g.fillRect(21, 24, 5, 4);
    
    // Legs
    g.fillStyle(0x444466);
    g.fillRect(11, 26, 4, 6);
    g.fillRect(17, 26, 4, 6);
    
    g.generateTexture('player', 32, 32);
    g.destroy();
  }

  private createEnemySprites(): void {
    // Create enemy sprites for each rarity
    for (const [rarity, colors] of Object.entries(ENEMY_RARITY_COLORS)) {
      this.createSlimeEnemy(rarity, colors.body, colors.accent);
    }
    
    // Default enemy texture (normal rarity)
    const g = this.make.graphics({ x: 0, y: 0 });
    this.drawSlime(g, ENEMY_RARITY_COLORS.normal.body, ENEMY_RARITY_COLORS.normal.accent);
    g.generateTexture('enemy', 32, 32);
    g.destroy();
  }

  private createSlimeEnemy(rarity: string, bodyColor: number, accentColor: number): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    this.drawSlime(g, bodyColor, accentColor, rarity === 'legendary' || rarity === 'epic');
    g.generateTexture(`enemy_${rarity}`, 32, 32);
    g.destroy();
  }

  private drawSlime(g: Phaser.GameObjects.Graphics, bodyColor: number, accentColor: number, hasHorns: boolean = false): void {
    // Shadow
    g.fillStyle(0x000000, 0.3);
    g.fillEllipse(16, 30, 24, 6);
    
    // Main body
    g.fillStyle(bodyColor);
    g.fillEllipse(16, 22, 26, 18);
    
    // Top highlight
    g.fillStyle(accentColor);
    g.fillEllipse(16, 18, 20, 12);
    
    // Eyes
    g.fillStyle(0xffffff);
    g.fillCircle(10, 18, 5);
    g.fillCircle(22, 18, 5);
    
    // Pupils (angry look)
    g.fillStyle(0x000000);
    g.fillCircle(12, 18, 2);
    g.fillCircle(24, 18, 2);
    
    // Mouth
    g.fillStyle(0x000000);
    g.fillRect(12, 24, 8, 2);
    
    // Horns for epic/legendary
    if (hasHorns) {
      g.fillStyle(accentColor);
      g.fillTriangle(6, 14, 8, 8, 12, 12);
      g.fillTriangle(26, 14, 24, 8, 20, 12);
    }
  }

  private createItemSprites(): void {
    // Weapon item sprite (sword)
    const weaponGraphics = this.make.graphics({ x: 0, y: 0 });
    weaponGraphics.fillStyle(0x888888);
    weaponGraphics.fillRect(14, 2, 4, 20);
    weaponGraphics.fillStyle(0xaaaaaa);
    weaponGraphics.fillTriangle(16, 0, 12, 6, 20, 6);
    weaponGraphics.fillStyle(0x8b4513);
    weaponGraphics.fillRect(12, 22, 8, 6);
    weaponGraphics.fillStyle(0xffd700);
    weaponGraphics.fillRect(10, 20, 12, 3);
    weaponGraphics.generateTexture('item_weapon', 32, 32);
    weaponGraphics.destroy();

    // Armor item sprite (shield)
    const armorGraphics = this.make.graphics({ x: 0, y: 0 });
    armorGraphics.fillStyle(0x666666);
    armorGraphics.fillRoundedRect(6, 4, 20, 24, 4);
    armorGraphics.fillStyle(0x888888);
    armorGraphics.fillRoundedRect(8, 6, 16, 20, 3);
    armorGraphics.fillStyle(0xffd700);
    armorGraphics.fillCircle(16, 16, 5);
    armorGraphics.generateTexture('item_armor', 32, 32);
    armorGraphics.destroy();

    // Legacy item sprite
    const itemGraphics = this.make.graphics({ x: 0, y: 0 });
    itemGraphics.fillStyle(0xffd700);
    itemGraphics.fillTriangle(16, 0, 32, 16, 16, 32);
    itemGraphics.fillTriangle(16, 0, 0, 16, 16, 32);
    itemGraphics.generateTexture('item', 32, 32);
    itemGraphics.destroy();
  }

  private createEnvironmentSprites(): void {
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
    
    // Attack effect sprite (larger slash arc for 70px range)
    const attackGraphics = this.make.graphics({ x: 0, y: 0 });
    attackGraphics.fillStyle(0xffffff, 0.9);
    // Create a larger arc that matches the attack range
    attackGraphics.slice(32, 32, 30, Phaser.Math.DegToRad(-45), Phaser.Math.DegToRad(45), false);
    attackGraphics.fillPath();
    // Add a stroke for visibility
    attackGraphics.lineStyle(3, 0xaaddff, 0.8);
    attackGraphics.arc(32, 32, 30, Phaser.Math.DegToRad(-45), Phaser.Math.DegToRad(45), false);
    attackGraphics.stroke();
    attackGraphics.generateTexture('attack_slash', 64, 64);
    attackGraphics.destroy();
  }
}
