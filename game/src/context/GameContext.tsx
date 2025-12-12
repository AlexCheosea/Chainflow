import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { fetchOwnedItems, type OwnedItem } from '../services/itemMinting';
import { EventBus } from '../game/EventBus';

export interface EquipmentState {
  weapon: OwnedItem | null;
  armor: OwnedItem | null;
}

interface GameContextType {
  // Game state
  gameStarted: boolean;
  setGameStarted: (started: boolean) => void;
  
  // Inventory
  ownedItems: OwnedItem[];
  loadingItems: boolean;
  refreshInventory: () => Promise<void>;
  
  // Equipment
  equipment: EquipmentState;
  equipItem: (item: OwnedItem) => void;
  unequipItem: (slot: 'weapon' | 'armor') => void;
  
  // Computed stats from equipment
  equipmentBonusAttack: number;
  equipmentBonusDefense: number;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const account = useCurrentAccount();
  
  // Game state
  const [gameStarted, setGameStarted] = useState(false);
  
  // Inventory
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Equipment
  const [equipment, setEquipment] = useState<EquipmentState>({
    weapon: null,
    armor: null,
  });

  // Refresh inventory
  const refreshInventory = useCallback(async () => {
    if (!account?.address) {
      setOwnedItems([]);
      return;
    }
    
    setLoadingItems(true);
    try {
      const items = await fetchOwnedItems(account.address);
      setOwnedItems(items);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoadingItems(false);
    }
  }, [account?.address]);

  // Fetch inventory on wallet connect
  useEffect(() => {
    if (account?.address) {
      refreshInventory();
    } else {
      setOwnedItems([]);
      setEquipment({ weapon: null, armor: null });
    }
  }, [account?.address, refreshInventory]);

  // Determine item slot type based on name
  const getItemSlot = (item: OwnedItem): 'weapon' | 'armor' => {
    const name = item.name.toLowerCase();
    const weaponKeywords = ['sword', 'blade', 'dagger', 'bow', 'staff', 'axe', 'slayer', 'orb', 'crossbow', 'club', 'reaper', 'excalibur', 'godslayer'];
    const isWeapon = weaponKeywords.some(keyword => name.includes(keyword));
    return isWeapon ? 'weapon' : 'armor';
  };

  // Equip an item
  const equipItem = useCallback((item: OwnedItem) => {
    const slot = getItemSlot(item);
    setEquipment(prev => ({
      ...prev,
      [slot]: item,
    }));
    
    // Notify game scene
    EventBus.emit('equipment-changed', { slot, item });
  }, []);

  // Unequip an item
  const unequipItem = useCallback((slot: 'weapon' | 'armor') => {
    setEquipment(prev => ({
      ...prev,
      [slot]: null,
    }));
    
    // Notify game scene
    EventBus.emit('equipment-changed', { slot, item: null });
  }, []);

  // Calculate equipment bonuses
  const equipmentBonusAttack = (equipment.weapon?.attack ?? 0) + (equipment.armor?.attack ?? 0);
  const equipmentBonusDefense = (equipment.weapon?.defense ?? 0) + (equipment.armor?.defense ?? 0);

  const value: GameContextType = {
    gameStarted,
    setGameStarted,
    ownedItems,
    loadingItems,
    refreshInventory,
    equipment,
    equipItem,
    unequipItem,
    equipmentBonusAttack,
    equipmentBonusDefense,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}

// Helper to get item slot type (exported for use in other components)
export function getItemSlotType(item: OwnedItem): 'weapon' | 'armor' {
  const name = item.name.toLowerCase();
  const weaponKeywords = ['sword', 'blade', 'dagger', 'bow', 'staff', 'axe', 'slayer', 'orb', 'crossbow', 'club', 'reaper', 'excalibur', 'godslayer'];
  return weaponKeywords.some(keyword => name.includes(keyword)) ? 'weapon' : 'armor';
}
