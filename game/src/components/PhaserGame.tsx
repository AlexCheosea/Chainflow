import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../game/config';
import { EventBus } from '../game/EventBus';

interface PhaserGameProps {
  onGameReady?: (game: Phaser.Game) => void;
}

export function PhaserGame({ onGameReady }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && !gameRef.current) {
      // Create game instance
      gameRef.current = new Phaser.Game({
        ...gameConfig,
        parent: containerRef.current,
      });
      
      // Notify parent that game is ready
      if (onGameReady) {
        onGameReady(gameRef.current);
      }
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [onGameReady]);

  useEffect(() => {
    const handleRestart = () => {
      if (gameRef.current) {
        const gameScene = gameRef.current.scene.getScene('GameScene');
        if (gameScene) {
          gameRef.current.scene.stop('UIScene');
          gameRef.current.scene.stop('GameScene');
          gameRef.current.scene.start('GameScene', { floor: 1, pendingItems: [] });
        }
      }
    };

    const handleProceedToNextFloor = () => {
      if (gameRef.current) {
        const gameScene = gameRef.current.scene.getScene('GameScene') as { proceedToNextFloor?: () => void };
        if (gameScene && gameScene.proceedToNextFloor) {
          gameScene.proceedToNextFloor();
        }
      }
    };

    EventBus.on('restart-game', handleRestart);
    EventBus.on('proceed-to-next-floor', handleProceedToNextFloor);

    return () => {
      EventBus.off('restart-game', handleRestart);
      EventBus.off('proceed-to-next-floor', handleProceedToNextFloor);
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      id="game-container"
      style={{
        width: '1000px',
        height: '700px',
        margin: '0 auto',
        border: '2px solid #4a4a6a',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
}
