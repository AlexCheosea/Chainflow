module chainflow::item {
    use std::string::{Self, String};
    use sui::package;
    use sui::display;

    /// One-Time-Witness for the module
    public struct ITEM has drop {}

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

    /// Initialize Display for Item NFTs
    fun init(otw: ITEM, ctx: &mut TxContext) {
        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"),
            string::utf8(b"project_url"),
            string::utf8(b"creator"),
        ];

        let values = vector[
            // Display name: shows the item name
            string::utf8(b"{name}"),
            // Description with stats
            string::utf8(b"{description}"),
            // Image URL
            string::utf8(b"{image_url}"),
            // Project URL
            string::utf8(b"https://github.com/AlexCheosea/Chainflow"),
            // Creator
            string::utf8(b"ChainFlow Roguelike"),
        ];

        let publisher = package::claim(otw, ctx);
        let mut item_display = display::new_with_fields<Item>(
            &publisher,
            keys,
            values,
            ctx
        );

        // Commit the display
        display::update_version(&mut item_display);

        transfer::public_transfer(publisher, tx_context::sender(ctx));
        transfer::public_transfer(item_display, tx_context::sender(ctx));
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

    /// Internal mint function for marketplace premade items
    /// Returns the Item instead of transferring it
    public(package) fun mint_item_internal(
        name: String,
        rarity: String,
        attack: u64,
        defense: u64,
        description: String,
        image_url: String,
        ctx: &mut TxContext,
    ): Item {
        let item = Item {
            id: object::new(ctx),
            name,
            rarity,
            attack,
            defense,
            description,
            image_url,
            minted_at: tx_context::epoch(ctx),
            game_id: string::utf8(b"chainflow-roguelike-v1"),
        };

        // Emit event
        sui::event::emit(ItemMinted {
            item_id: object::id(&item),
            name: item.name,
            rarity: item.rarity,
            owner: tx_context::sender(ctx),
        });

        item
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
