import Phaser from 'phaser';

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

// Floor-based theme colors for variety
const FLOOR_THEMES = [
  { wall: 0x404040, floor: 0x2a2a4a }, // Default dungeon
  { wall: 0x4a3030, floor: 0x3a2020 }, // Crimson halls
  { wall: 0x304a30, floor: 0x203a20 }, // Emerald caves
  { wall: 0x30304a, floor: 0x20203a }, // Sapphire depths
  { wall: 0x4a4a30, floor: 0x3a3a20 }, // Golden ruins
  { wall: 0x3a3a3a, floor: 0x1a1a2a }, // Shadow realm
];

export class DungeonGenerator {
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private floor: number;
  private map!: Phaser.Tilemaps.Tilemap;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private floorLayer!: Phaser.Tilemaps.TilemapLayer;
  private rooms: Room[] = [];
  private tiles: number[][] = [];

  constructor(scene: Phaser.Scene, baseWidth: number, baseHeight: number, floor: number = 1) {
    this.scene = scene;
    this.floor = floor;
    
    // Scale dungeon size with floor (capped at 45x35)
    this.width = Math.min(45, baseWidth + (floor - 1) * 2);
    this.height = Math.min(35, baseHeight + (floor - 1) * 2);
  }

  generate(): void {
    // Initialize all tiles as walls
    this.tiles = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(1));

    // Generate rooms (more rooms on higher floors)
    this.generateRooms();

    // Connect rooms with corridors
    this.connectRooms();

    // Create tilemap with floor-based theme
    this.createTilemap();
  }

  private generateRooms(): void {
    // Scale room count with floor (5-8 base, up to 12)
    const minRooms = Math.min(5 + Math.floor(this.floor / 2), 8);
    const maxRooms = Math.min(8 + Math.floor(this.floor / 2), 12);
    const roomCount = Phaser.Math.Between(minRooms, maxRooms);
    const maxAttempts = 100;

    for (let i = 0; i < roomCount; i++) {
      let attempts = 0;
      while (attempts < maxAttempts) {
        // Slightly larger rooms on higher floors
        const roomWidth = Phaser.Math.Between(4, 8 + Math.floor(this.floor / 3));
        const roomHeight = Phaser.Math.Between(4, 6 + Math.floor(this.floor / 3));
        const x = Phaser.Math.Between(1, this.width - roomWidth - 1);
        const y = Phaser.Math.Between(1, this.height - roomHeight - 1);

        const newRoom: Room = {
          x,
          y,
          width: roomWidth,
          height: roomHeight,
          centerX: Math.floor(x + roomWidth / 2),
          centerY: Math.floor(y + roomHeight / 2),
        };

        // Check for overlap with existing rooms
        let overlaps = false;
        for (const room of this.rooms) {
          if (this.roomsOverlap(newRoom, room)) {
            overlaps = true;
            break;
          }
        }

        if (!overlaps) {
          this.rooms.push(newRoom);
          this.carveRoom(newRoom);
          break;
        }

        attempts++;
      }
    }
  }

  private roomsOverlap(a: Room, b: Room): boolean {
    return (
      a.x < b.x + b.width + 2 &&
      a.x + a.width + 2 > b.x &&
      a.y < b.y + b.height + 2 &&
      a.y + a.height + 2 > b.y
    );
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        this.tiles[y][x] = 0; // Floor
      }
    }
  }

  private connectRooms(): void {
    for (let i = 1; i < this.rooms.length; i++) {
      const roomA = this.rooms[i - 1];
      const roomB = this.rooms[i];

      // Randomly choose horizontal-first or vertical-first
      if (Math.random() < 0.5) {
        this.carveHorizontalCorridor(roomA.centerX, roomB.centerX, roomA.centerY);
        this.carveVerticalCorridor(roomA.centerY, roomB.centerY, roomB.centerX);
      } else {
        this.carveVerticalCorridor(roomA.centerY, roomB.centerY, roomA.centerX);
        this.carveHorizontalCorridor(roomA.centerX, roomB.centerX, roomB.centerY);
      }
    }
  }

  private carveHorizontalCorridor(x1: number, x2: number, y: number): void {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    for (let x = startX; x <= endX; x++) {
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
        this.tiles[y][x] = 0;
      }
    }
  }

  private carveVerticalCorridor(y1: number, y2: number, x: number): void {
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    for (let y = startY; y <= endY; y++) {
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
        this.tiles[y][x] = 0;
      }
    }
  }

  private createTilemap(): void {
    // Create tilemap data
    const mapData: number[][] = this.tiles;

    // Create tilemap
    this.map = this.scene.make.tilemap({
      data: mapData,
      tileWidth: 32,
      tileHeight: 32,
    });

    // Get floor-based theme
    const theme = FLOOR_THEMES[(this.floor - 1) % FLOOR_THEMES.length];
    
    // Create themed wall texture
    const wallGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    wallGraphics.fillStyle(theme.wall);
    wallGraphics.fillRect(0, 0, 32, 32);
    wallGraphics.lineStyle(1, theme.wall + 0x202020);
    wallGraphics.strokeRect(0, 0, 32, 32);
    wallGraphics.generateTexture(`wall_floor_${this.floor}`, 32, 32);
    wallGraphics.destroy();

    // Create themed floor texture
    const floorGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    floorGraphics.fillStyle(theme.floor);
    floorGraphics.fillRect(0, 0, 32, 32);
    // Add subtle pattern
    floorGraphics.fillStyle(theme.floor + 0x050505);
    if (this.floor % 2 === 0) {
      floorGraphics.fillRect(0, 0, 16, 16);
      floorGraphics.fillRect(16, 16, 16, 16);
    }
    floorGraphics.generateTexture(`floor_floor_${this.floor}`, 32, 32);
    floorGraphics.destroy();

    // Add tilesets
    const wallTileset = this.map.addTilesetImage('wall', `wall_floor_${this.floor}`, 32, 32)!;
    const floorTileset = this.map.addTilesetImage('floor', `floor_floor_${this.floor}`, 32, 32)!;

    // Create floor layer (tile index 0)
    this.floorLayer = this.map.createBlankLayer('floor', floorTileset, 0, 0)!;
    
    // Create wall layer (tile index 1)
    this.wallLayer = this.map.createBlankLayer('walls', wallTileset, 0, 0)!;

    // Place tiles
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.tiles[y][x] === 0) {
          this.floorLayer.putTileAt(0, x, y);
        } else {
          this.wallLayer.putTileAt(0, x, y);
        }
      }
    }

    // Set wall collision
    this.wallLayer.setCollisionByExclusion([-1]);
  }

  getWallLayer(): Phaser.Tilemaps.TilemapLayer {
    return this.wallLayer;
  }

  getSpawnPoint(): { x: number; y: number } {
    // Spawn in the center of the first room
    const firstRoom = this.rooms[0];
    return {
      x: firstRoom.centerX,
      y: firstRoom.centerY,
    };
  }

  /**
   * Get the last room center - used for gate placement
   */
  getLastRoomCenter(): { x: number; y: number } {
    const lastRoom = this.rooms[this.rooms.length - 1];
    return {
      x: lastRoom.centerX,
      y: lastRoom.centerY,
    };
  }

  getRooms(): Room[] {
    return this.rooms;
  }

  getFloor(): number {
    return this.floor;
  }
  
  getDimensions(): { width: number; height: number; pixelWidth: number; pixelHeight: number } {
    return {
      width: this.width,
      height: this.height,
      pixelWidth: this.width * 32,
      pixelHeight: this.height * 32,
    };
  }
}
