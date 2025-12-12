import Phaser from 'phaser';

// Global event bus for communication between game and React
export const EventBus = new Phaser.Events.EventEmitter();

// Global game state store for synchronous access (used when events can't work due to timing)
export const GameState = {
  initialEquipmentBonus: {
    attack: 0,
    defense: 0,
  },
};
