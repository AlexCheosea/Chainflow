import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Item } from '../entities/Item';
import type { ItemData } from '../entities/Item';
import { DungeonGenerator } from '../systems/DungeonGenerator';
import { EventBus } from '../EventBus';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private items!: Phaser.GameObjects.Group;
  private dungeon!: DungeonGenerator;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  
  // Floor system
  private currentFloor: number = 1;
  private dropsThisFloor: number = 0;
  private maxDropsPerFloor: number = 2;
  private pendingItems: ItemData[] = [];
  
  // Gate (appears when all enemies defeated)
  private gate: Phaser.Physics.Arcade.Sprite | null = null;
  private gateSpawned: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: { floor?: number; pendingItems?: ItemData[]; playerStats?: { attack: number; defense: number } }): void {
    // Initialize or continue floor
    this.currentFloor = data?.floor ?? 1;
    this.pendingItems = data?.pendingItems ?? [];
    this.dropsThisFloor = 0;
    this.gateSpawned = false;
    this.gate = null;
  }

  create(): void {
    // Generate dungeon with floor scaling
    this.dungeon = new DungeonGenerator(this, 25, 19, this.currentFloor);
    this.dungeon.generate();

    // Create groups
    this.enemies = this.add.group();
    this.items = this.add.group();

    // Create player at spawn point
    const spawn = this.dungeon.getSpawnPoint();
    this.player = new Player(this, spawn.x * 32 + 16, spawn.y * 32 + 16);

    // Spawn enemies in rooms (scaled by floor)
    this.spawnEnemies();

    // Set up input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Set up collisions
    this.physics.add.collider(this.player.sprite, this.dungeon.getWallLayer());
    this.physics.add.collider(this.enemies, this.dungeon.getWallLayer());
    
    // Player-enemy collision (combat)
    this.physics.add.overlap(
      this.player.sprite,
      this.enemies,
      this.handlePlayerEnemyCollision,
      undefined,
      this
    );

    // Player-item collision (pickup)
    this.physics.add.overlap(
      this.player.sprite,
      this.items,
      this.handleItemPickup,
      undefined,
      this
    );

    // Start UI scene
    this.scene.launch('UIScene', { floor: this.currentFloor });

    // Camera follows player
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    // Emit initial player stats
    EventBus.emit('player-stats-update', {
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      attack: this.player.attack,
      defense: this.player.defense,
      floor: this.currentFloor,
    });
  }

  update(): void {
    // Handle player movement
    const velocity = { x: 0, y: 0 };
    const speed = 150;

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      velocity.x = -speed;
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      velocity.x = speed;
    }

    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      velocity.y = -speed;
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      velocity.y = speed;
    }

    this.player.move(velocity.x, velocity.y);

    // Update enemies (chase player)
    this.enemies.getChildren().forEach((enemySprite) => {
      const enemy = (enemySprite as Phaser.Physics.Arcade.Sprite).getData('ref') as Enemy;
      if (enemy) {
        enemy.update(this.player.sprite.x, this.player.sprite.y);
      }
    });
    
    // Check if all enemies defeated - spawn gate
    if (!this.gateSpawned && this.enemies.countActive() === 0) {
      this.spawnGate();
    }
  }

  private spawnEnemies(): void {
    const rooms = this.dungeon.getRooms();
    // Skip first room (spawn room)
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      // Scale enemy count with floor (1-3 base, +1 every 2 floors, cap at 5)
      const baseCount = Phaser.Math.Between(1, 3);
      const floorBonus = Math.floor((this.currentFloor - 1) / 2);
      const enemyCount = Math.min(5, baseCount + floorBonus);
      
      for (let j = 0; j < enemyCount; j++) {
        const x = Phaser.Math.Between(room.x + 1, room.x + room.width - 2) * 32 + 16;
        const y = Phaser.Math.Between(room.y + 1, room.y + room.height - 2) * 32 + 16;
        const enemy = new Enemy(this, x, y, this.currentFloor);
        this.enemies.add(enemy.sprite);
      }
    }
  }

  private spawnGate(): void {
    this.gateSpawned = true;
    
    // Spawn gate in the last room
    const lastRoomCenter = this.dungeon.getLastRoomCenter();
    const gateX = lastRoomCenter.x * 32 + 16;
    const gateY = lastRoomCenter.y * 32 + 16;
    
    this.gate = this.physics.add.sprite(gateX, gateY, 'gate');
    
    // Add pulsing animation
    this.tweens.add({
      targets: this.gate,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    
    // Add gate collision
    this.physics.add.overlap(
      this.player.sprite,
      this.gate,
      this.handleGateCollision,
      undefined,
      this
    );
    
    // Notify UI
    EventBus.emit('gate-spawned', { floor: this.currentFloor });
  }

  private handleGateCollision: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = () => {
    if (!this.gate) return;
    
    // Emit floor transition event with pending items for minting
    EventBus.emit('floor-transition', {
      floor: this.currentFloor,
      pendingItems: this.pendingItems,
      playerStats: {
        attack: this.player.attack,
        defense: this.player.defense,
      },
    });
    
    // Disable further gate collisions
    this.gate.destroy();
    this.gate = null;
  };

  private handlePlayerEnemyCollision: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    playerSprite,
    enemySprite
  ) => {
    const enemy = (enemySprite as Phaser.Physics.Arcade.Sprite).getData('ref') as Enemy;
    if (!enemy) return;
    
    // Deal damage: use enemy attack stat, player defense is applied in takeDamage
    this.player.takeDamage(enemy.attack);
    
    // Player deals damage with their attack stat
    enemy.takeDamage(this.player.attack);

    // Knockback
    const playerBody = (playerSprite as Phaser.Physics.Arcade.Sprite).body;
    const enemyBody = (enemySprite as Phaser.Physics.Arcade.Sprite).body;
    
    if (playerBody && enemyBody) {
      const angle = Phaser.Math.Angle.Between(
        enemyBody.position.x,
        enemyBody.position.y,
        playerBody.position.x,
        playerBody.position.y
      );
      
      (playerSprite as Phaser.Physics.Arcade.Sprite).setVelocity(
        Math.cos(angle) * 200,
        Math.sin(angle) * 200
      );
    }

    // Update UI
    EventBus.emit('player-stats-update', {
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      attack: this.player.attack,
      defense: this.player.defense,
      floor: this.currentFloor,
    });

    // Check if enemy died
    if (enemy.health <= 0) {
      this.spawnItem(enemy.sprite.x, enemy.sprite.y);
      enemy.destroy();
    }

    // Check if player died
    if (this.player.health <= 0) {
      EventBus.emit('player-died', { pendingItems: this.pendingItems });
      this.scene.pause();
    }
  };

  private spawnItem(x: number, y: number): void {
    // Use Item.shouldDrop with limited drops per floor
    if (Item.shouldDrop(this.dropsThisFloor, this.maxDropsPerFloor)) {
      const item = new Item(this, x, y, this.currentFloor);
      this.items.add(item.sprite);
      this.dropsThisFloor++;
    }
  }

  private handleItemPickup: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _playerSprite,
    itemSprite
  ) => {
    const item = (itemSprite as Phaser.Physics.Arcade.Sprite).getData('ref') as Item;
    if (!item) return;
    
    const itemData = item.getItemData();
    
    // Apply item stats to player immediately
    this.player.equipItem(itemData);
    
    // Add to pending items for minting on floor transition
    this.pendingItems.push(itemData);
    
    // Update UI
    EventBus.emit('player-stats-update', {
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      attack: this.player.attack,
      defense: this.player.defense,
      floor: this.currentFloor,
    });
    
    // Emit item collected event (for UI notification, not minting yet)
    EventBus.emit('item-collected', itemData);
    
    item.destroy();
  };

  /**
   * Called from App to proceed to next floor after minting confirmation
   */
  public proceedToNextFloor(): void {
    const nextFloor = this.currentFloor + 1;
    
    // Store player stats to carry over
    const playerStats = {
      attack: this.player.attack,
      defense: this.player.defense,
    };
    
    // Restart scene with next floor
    this.scene.restart({
      floor: nextFloor,
      pendingItems: [], // Clear pending items after minting
      playerStats,
    });
  }

  public restartGame(): void {
    this.scene.restart({ floor: 1, pendingItems: [] });
  }
}
