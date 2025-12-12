import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';
import { EventBus } from '../game/EventBus';
import type { ItemData } from '../game/entities/Item';

interface PhaserGameProps {
  onItemPickup: (item: ItemData) => void;
}

export function PhaserGame({ onItemPickup }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      // Create game instance
      gameRef.current = new Phaser.Game({
        ...gameConfig,
        parent: containerRef.current,
      });
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Listen for item pickups
    const handleItemPickup = (item: ItemData) => {
      onItemPickup(item);
    };

    const handleRestart = () => {
      if (gameRef.current) {
        const gameScene = gameRef.current.scene.getScene('GameScene');
        if (gameScene) {
          gameRef.current.scene.stop('UIScene');
          gameRef.current.scene.stop('GameScene');
          gameRef.current.scene.start('GameScene');
        }
      }
    };

    EventBus.on('item-picked-up', handleItemPickup);
    EventBus.on('restart-game', handleRestart);

    return () => {
      EventBus.off('item-picked-up', handleItemPickup);
      EventBus.off('restart-game', handleRestart);
    };
  }, [onItemPickup]);

  return (
    <div 
      ref={containerRef} 
      id="game-container"
      style={{
        width: '800px',
        height: '600px',
        margin: '0 auto',
        border: '2px solid #4a4a6a',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
}
