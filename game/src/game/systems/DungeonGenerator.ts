import Phaser from 'phaser';

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export class DungeonGenerator {
  private scene: Phaser.Scene;
  private width: number;
  private height: number;
  private map!: Phaser.Tilemaps.Tilemap;
  private wallLayer!: Phaser.Tilemaps.TilemapLayer;
  private floorLayer!: Phaser.Tilemaps.TilemapLayer;
  private rooms: Room[] = [];
  private tiles: number[][] = [];

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.scene = scene;
    this.width = width;
    this.height = height;
  }

  generate(): void {
    // Initialize all tiles as walls
    this.tiles = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(1));

    // Generate rooms
    this.generateRooms();

    // Connect rooms with corridors
    this.connectRooms();

    // Create tilemap
    this.createTilemap();
  }

  private generateRooms(): void {
    const roomCount = Phaser.Math.Between(5, 8);
    const maxAttempts = 100;

    for (let i = 0; i < roomCount; i++) {
      let attempts = 0;
      while (attempts < maxAttempts) {
        const roomWidth = Phaser.Math.Between(4, 8);
        const roomHeight = Phaser.Math.Between(4, 6);
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

    // Add tilesets
    const wallTileset = this.map.addTilesetImage('wall', 'wall', 32, 32)!;
    const floorTileset = this.map.addTilesetImage('floor', 'floor', 32, 32)!;

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

  getRooms(): Room[] {
    return this.rooms;
  }
}
