import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Item } from '../entities/Item';
import { DungeonGenerator } from '../systems/DungeonGenerator';
import { EventBus } from '../EventBus';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.GameObjects.Group;
  private items!: Phaser.GameObjects.Group;
  private dungeon!: DungeonGenerator;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Generate dungeon
    this.dungeon = new DungeonGenerator(this, 25, 19);
    this.dungeon.generate();

    // Create groups
    this.enemies = this.add.group();
    this.items = this.add.group();

    // Create player at spawn point
    const spawn = this.dungeon.getSpawnPoint();
    this.player = new Player(this, spawn.x * 32 + 16, spawn.y * 32 + 16);

    // Spawn enemies in rooms
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
    this.scene.launch('UIScene');

    // Camera follows player
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    // Emit initial player stats
    EventBus.emit('player-stats-update', {
      health: this.player.health,
      maxHealth: this.player.maxHealth,
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
  }

  private spawnEnemies(): void {
    const rooms = this.dungeon.getRooms();
    // Skip first room (spawn room)
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const enemyCount = Phaser.Math.Between(1, 3);
      for (let j = 0; j < enemyCount; j++) {
        const x = Phaser.Math.Between(room.x + 1, room.x + room.width - 2) * 32 + 16;
        const y = Phaser.Math.Between(room.y + 1, room.y + room.height - 2) * 32 + 16;
        const enemy = new Enemy(this, x, y);
        this.enemies.add(enemy.sprite);
      }
    }
  }

  private handlePlayerEnemyCollision: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    playerSprite,
    enemySprite
  ) => {
    const enemy = (enemySprite as Phaser.Physics.Arcade.Sprite).getData('ref') as Enemy;
    if (!enemy) return;
    
    // Deal damage to both
    this.player.takeDamage(10);
    enemy.takeDamage(25);

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
    });

    // Check if enemy died
    if (enemy.health <= 0) {
      this.spawnItem(enemy.sprite.x, enemy.sprite.y);
      enemy.destroy();
    }

    // Check if player died
    if (this.player.health <= 0) {
      EventBus.emit('player-died');
      this.scene.pause();
    }
  };

  private spawnItem(x: number, y: number): void {
    // 70% chance to drop an item
    if (Math.random() < 0.7) {
      const item = new Item(this, x, y);
      this.items.add(item.sprite);
    }
  }

  private handleItemPickup: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (
    _playerSprite,
    itemSprite
  ) => {
    const item = (itemSprite as Phaser.Physics.Arcade.Sprite).getData('ref') as Item;
    if (!item) return;
    
    // Emit event to mint NFT
    EventBus.emit('item-picked-up', item.getItemData());
    
    item.destroy();
  };

  public restartGame(): void {
    this.scene.restart();
  }
}
