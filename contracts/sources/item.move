module chainflow::item {
    use std::string::{Self, String};

    /// Represents an in-game item as an NFT
    public struct Item has key, store {
        id: UID,
        name: String,
        rarity: String,
        attack: u64,
        defense: u64,
        description: String,
        // Store additional metadata on-chain
        image_url: String,
        minted_at: u64,
        game_id: String,
    }

    /// Event emitted when an item is minted
    public struct ItemMinted has copy, drop {
        item_id: ID,
        name: String,
        rarity: String,
        owner: address,
    }

    /// Mint a new item NFT and transfer to the player
    public entry fun mint_item(
        name: vector<u8>,
        rarity: vector<u8>,
        attack: u64,
        defense: u64,
        description: vector<u8>,
        image_url: vector<u8>,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let item = Item {
            id: object::new(ctx),
            name: string::utf8(name),
            rarity: string::utf8(rarity),
            attack,
            defense,
            description: string::utf8(description),
            image_url: string::utf8(image_url),
            minted_at: tx_context::epoch(ctx),
            game_id: string::utf8(b"chainflow-roguelike-v1"),
        };

        // Emit event
        sui::event::emit(ItemMinted {
            item_id: object::id(&item),
            name: item.name,
            rarity: item.rarity,
            owner: recipient,
        });

        // Transfer to recipient
        transfer::public_transfer(item, recipient);
    }

    /// Mint item with sponsored gas (called by sponsor)
    public entry fun mint_item_sponsored(
        name: vector<u8>,
        rarity: vector<u8>,
        attack: u64,
        defense: u64,
        description: vector<u8>,
        image_url: vector<u8>,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        // Same as mint_item, but can be called by a sponsor
        mint_item(name, rarity, attack, defense, description, image_url, recipient, ctx);
    }

    // === View Functions ===

    /// Get item name
    public fun name(item: &Item): String {
        item.name
    }

    /// Get item rarity
    public fun rarity(item: &Item): String {
        item.rarity
    }

    /// Get item attack
    public fun attack(item: &Item): u64 {
        item.attack
    }

    /// Get item defense
    public fun defense(item: &Item): u64 {
        item.defense
    }

    /// Get item description
    public fun description(item: &Item): String {
        item.description
    }
}
