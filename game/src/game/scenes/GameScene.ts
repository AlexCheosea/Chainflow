import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Item } from '../entities/Item';
import type { ItemData } from '../entities/Item';
import { DungeonGenerator } from '../systems/DungeonGenerator';
import { EventBus, GameState } from '../EventBus';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private items!: Phaser.GameObjects.Group;
  private dungeon!: DungeonGenerator;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private attackKey!: Phaser.Input.Keyboard.Key;
  
  // Floor system
  private currentFloor: number = 1;
  private dropsThisFloor: number = 0;
  private maxDropsPerFloor: number = 2;
  private pendingItems: ItemData[] = [];
  
  // Gate (appears when all enemies defeated)
  private gate: Phaser.Physics.Arcade.Sprite | null = null;
  private gateSpawned: boolean = false;
  
  // Attack system
  private attackCooldown: number = 0;
  private attackCooldownTime: number = 400; // ms between attacks
  private attackRange: number = 70; // Increased attack range

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data?: { floor?: number; pendingItems?: ItemData[] }): void {
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
    
    // Set physics world bounds to match dungeon size
    const dungeonSize = this.dungeon.getDimensions();
    this.physics.world.setBounds(0, 0, dungeonSize.pixelWidth, dungeonSize.pixelHeight);
    
    // Also set camera bounds to match
    this.cameras.main.setBounds(0, 0, dungeonSize.pixelWidth, dungeonSize.pixelHeight);

    // Create groups
    this.enemies = this.add.group();
    this.items = this.add.group();

    // Create player at spawn point
    const spawn = this.dungeon.getSpawnPoint();
    this.player = new Player(this, spawn.x * 32 + 16, spawn.y * 32 + 16);
    
    // Apply stats from equipped inventory items (stored in GameState)
    const bonuses = GameState.initialEquipmentBonus;
    console.log('[GameScene] Applying equipment bonuses from GameState:', bonuses);
    this.player.setBaseStats(bonuses.attack, bonuses.defense);
    console.log('[GameScene] Player stats after setBaseStats:', { attack: this.player.attack, defense: this.player.defense });

    // Spawn enemies in rooms (scaled by floor)
    this.spawnEnemies();

    // Set up input (with null checks)
    if (!this.input.keyboard) {
      console.error('Keyboard input not available');
      return;
    }
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Mouse click to attack
    this.input.on('pointerdown', () => {
      this.performAttack();
    });

    // Set up collisions
    this.physics.add.collider(this.player.sprite, this.dungeon.getWallLayer());
    this.physics.add.collider(this.enemies, this.dungeon.getWallLayer());
    
    // Player-enemy collision (damage from touch, NO damage dealt to enemies)
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
    
    // Emit initial player stats after a short delay to ensure UIScene is ready
    this.time.delayedCall(100, () => {
      EventBus.emit('player-stats-update', {
        health: this.player.health,
        maxHealth: this.player.maxHealth,
        attack: this.player.attack,
        defense: this.player.defense,
        floor: this.currentFloor,
      });
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
    
    // Handle attack input (spacebar)
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      this.performAttack();
    }
    
    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= this.game.loop.delta;
    }

    // Update enemies (chase player)
    this.enemies.getChildren().forEach((enemySprite) => {
      if (!enemySprite || !(enemySprite as Phaser.Physics.Arcade.Sprite).active) return;
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
    
    // Player takes damage from touching enemies (but does NOT deal damage on touch)
    this.player.takeDamage(enemy.attack);

    // Knockback player away from enemy
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

    // Check if player died
    if (this.player.health <= 0) {
      EventBus.emit('player-died', { pendingItems: this.pendingItems });
      this.scene.pause();
    }
  };

  private performAttack(): void {
    // Check cooldown
    if (this.attackCooldown > 0) return;
    
    this.attackCooldown = this.attackCooldownTime;
    
    // Determine attack direction based on player facing or pointer
    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      worldPoint.x,
      worldPoint.y
    );
    
    // Play player attack animation
    this.player.playAttackAnimation(angle);
    
    // Create attack slash visual - originates slightly in front of player
    const offsetDistance = 8; // Small offset from player center
    const slashX = this.player.sprite.x + Math.cos(angle) * offsetDistance;
    const slashY = this.player.sprite.y + Math.sin(angle) * offsetDistance;
    const slash = this.add.sprite(slashX, slashY, 'attack_slash');
    slash.setRotation(angle); // Point in attack direction
    slash.setOrigin(0, 0.5); // Origin at left-center so it extends outward from player
    slash.setAlpha(0.7);
    slash.setScale(this.attackRange / 35); // Scale to match attack range
    
    // Animate slash
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: slash.scale * 1.3,
      duration: 200,
      onComplete: () => slash.destroy(),
    });
    
    // Check for enemies in attack range
    this.enemies.getChildren().forEach((enemySprite) => {
      if (!enemySprite || !(enemySprite as Phaser.Physics.Arcade.Sprite).active) return;
      const enemy = (enemySprite as Phaser.Physics.Arcade.Sprite).getData('ref') as Enemy;
      if (!enemy) return;
      
      const distance = Phaser.Math.Distance.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        enemy.sprite.x,
        enemy.sprite.y
      );
      
      // Check if enemy is within attack range and in the direction of attack
      if (distance < this.attackRange) {
        const enemyAngle = Phaser.Math.Angle.Between(
          this.player.sprite.x,
          this.player.sprite.y,
          enemy.sprite.x,
          enemy.sprite.y
        );
        
        // Check if enemy is within 90 degree arc of attack direction
        const angleDiff = Phaser.Math.Angle.Wrap(enemyAngle - angle);
        if (Math.abs(angleDiff) < Math.PI / 2) {
          // Deal damage to enemy
          enemy.takeDamage(this.player.attack);
          
          // Knockback enemy
          const knockbackForce = 150;
          enemy.sprite.setVelocity(
            Math.cos(enemyAngle) * knockbackForce,
            Math.sin(enemyAngle) * knockbackForce
          );
          
          // Check if enemy died
          if (enemy.health <= 0) {
            this.spawnItemFromEnemy(enemy);
            enemy.destroy();
          }
        }
      }
    });
  }

  private spawnItemFromEnemy(enemy: Enemy): void {
    // Use enemy's drop chance (based on rarity)
    const shouldDrop = Math.random() < enemy.dropChance;
    
    if (shouldDrop && this.dropsThisFloor < this.maxDropsPerFloor) {
      // Use enemy's minimum drop rarity
      const minRarity = enemy.getMinDropRarity() as 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
      const item = new Item(this, enemy.sprite.x, enemy.sprite.y, this.currentFloor, minRarity);
      this.items.add(item.sprite);
      this.dropsThisFloor++;
    }
  }

  private handleItemPickup: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _playerSprite,
    itemSprite
  ) => {
    // Null safety checks
    if (!itemSprite || !(itemSprite as Phaser.Physics.Arcade.Sprite).active) return;
    
    const item = (itemSprite as Phaser.Physics.Arcade.Sprite).getData('ref') as Item;
    if (!item) return;
    
    const itemData = item.getItemData();
    if (!itemData) return;
    
    // DO NOT add item stats to player - picked up items are only collected for minting
    // Player stats come only from equipped inventory items
    
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
    
    // Don't carry player stats - equipment bonuses will be re-applied from GameState
    // This ensures stats stay consistent with equipped items, not accumulated pickups
    
    // Restart scene with next floor
    this.scene.restart({
      floor: nextFloor,
      pendingItems: [], // Clear pending items after minting
    });
  }

  public restartGame(): void {
    this.scene.restart({ floor: 1, pendingItems: [] });
  }
}
