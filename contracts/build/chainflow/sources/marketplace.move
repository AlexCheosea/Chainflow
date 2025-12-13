module chainflow::marketplace {
    use std::string::{Self, String};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::event;
    use chainflow::item::{Self, Item};

    // === Constants ===
    
    /// Developer wallet address for fees and shop sales
    const DEV_WALLET: address = @0x4e3fe4f8b863fb54446c875fab14ab06b6830a678721f4859eaffc592b5efecd;
    
    /// Fee percentage for P2P sales (2% = 200 basis points)
    const FEE_BASIS_POINTS: u64 = 200;
    const BASIS_POINTS_DIVISOR: u64 = 10000;
    
    /// Premade item prices in MIST (1 SUI = 1_000_000_000 MIST)
    const PRICE_UNCOMMON: u64 = 250_000_000;    // 0.25 SUI
    const PRICE_RARE: u64 = 1_000_000_000;       // 1 SUI
    const PRICE_EPIC: u64 = 5_000_000_000;       // 5 SUI
    const PRICE_LEGENDARY: u64 = 20_000_000_000; // 20 SUI

    // === Error Codes ===
    const EInvalidPrice: u64 = 0;
    const ENotOwner: u64 = 1;
    const EListingNotFound: u64 = 2;
    const EInsufficientPayment: u64 = 3;
    const EInvalidRarity: u64 = 4;
    const EInvalidItemType: u64 = 5;

    // === Structs ===

    /// Shared marketplace object
    public struct Marketplace has key {
        id: UID,
        listings: Table<ID, Listing>,
        listing_count: u64,
    }

    /// A listing for an item on sale
    public struct Listing has store {
        item: Item,
        price: u64,
        seller: address,
    }

    // === Events ===

    public struct ItemListed has copy, drop {
        listing_id: ID,
        item_id: ID,
        price: u64,
        seller: address,
    }

    public struct ItemSold has copy, drop {
        listing_id: ID,
        item_id: ID,
        price: u64,
        seller: address,
        buyer: address,
        fee: u64,
    }

    public struct ItemDelisted has copy, drop {
        listing_id: ID,
        item_id: ID,
        seller: address,
    }

    public struct PremadeItemPurchased has copy, drop {
        item_id: ID,
        name: String,
        rarity: String,
        price: u64,
        buyer: address,
    }

    // === Init ===

    fun init(ctx: &mut TxContext) {
        let marketplace = Marketplace {
            id: object::new(ctx),
            listings: table::new(ctx),
            listing_count: 0,
        };
        transfer::share_object(marketplace);
    }

    // === Public Functions ===

    /// List an item for sale
    public entry fun list_item(
        marketplace: &mut Marketplace,
        item: Item,
        price: u64,
        ctx: &mut TxContext,
    ) {
        assert!(price > 0, EInvalidPrice);
        
        let item_id = object::id(&item);
        let seller = tx_context::sender(ctx);
        
        let listing = Listing {
            item,
            price,
            seller,
        };
        
        // Use item_id as the listing key
        table::add(&mut marketplace.listings, item_id, listing);
        marketplace.listing_count = marketplace.listing_count + 1;
        
        event::emit(ItemListed {
            listing_id: item_id,
            item_id,
            price,
            seller,
        });
    }

    /// Buy a listed item (P2P sale with 2% dev fee)
    public entry fun buy_item(
        marketplace: &mut Marketplace,
        item_id: ID,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&marketplace.listings, item_id), EListingNotFound);
        
        let Listing { item, price, seller } = table::remove(&mut marketplace.listings, item_id);
        marketplace.listing_count = marketplace.listing_count - 1;
        
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= price, EInsufficientPayment);
        
        // Calculate fee (2%)
        let fee = (price * FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR;
        let seller_amount = price - fee;
        
        // Split payment: seller gets 98%, dev gets 2%
        let seller_coin = coin::split(&mut payment, seller_amount, ctx);
        let fee_coin = coin::split(&mut payment, fee, ctx);
        
        // Transfer funds
        transfer::public_transfer(seller_coin, seller);
        transfer::public_transfer(fee_coin, DEV_WALLET);
        
        // Return any excess payment
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, tx_context::sender(ctx));
        } else {
            coin::destroy_zero(payment);
        };
        
        let buyer = tx_context::sender(ctx);
        
        event::emit(ItemSold {
            listing_id: item_id,
            item_id,
            price,
            seller,
            buyer,
            fee,
        });
        
        // Transfer item to buyer
        transfer::public_transfer(item, buyer);
    }

    /// Delist an item (only seller can do this)
    public entry fun delist_item(
        marketplace: &mut Marketplace,
        item_id: ID,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&marketplace.listings, item_id), EListingNotFound);
        
        let Listing { item, price: _, seller } = table::remove(&mut marketplace.listings, item_id);
        marketplace.listing_count = marketplace.listing_count - 1;
        
        assert!(seller == tx_context::sender(ctx), ENotOwner);
        
        event::emit(ItemDelisted {
            listing_id: item_id,
            item_id,
            seller,
        });
        
        // Return item to seller
        transfer::public_transfer(item, seller);
    }

    /// Buy a premade item from the dev shop
    /// rarity: 1 = uncommon, 2 = rare, 3 = epic, 4 = legendary
    /// item_type: 1 = weapon, 2 = armor
    public entry fun buy_premade_item(
        rarity: u8,
        item_type: u8,
        mut payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        // Validate inputs
        assert!(rarity >= 1 && rarity <= 4, EInvalidRarity);
        assert!(item_type >= 1 && item_type <= 2, EInvalidItemType);
        
        // Get price based on rarity
        let price = if (rarity == 1) {
            PRICE_UNCOMMON
        } else if (rarity == 2) {
            PRICE_RARE
        } else if (rarity == 3) {
            PRICE_EPIC
        } else {
            PRICE_LEGENDARY
        };
        
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= price, EInsufficientPayment);
        
        // Get item stats and name based on rarity and type
        let (name, rarity_str, attack, defense) = get_premade_stats(rarity, item_type);
        
        // Create description
        let description = if (item_type == 1) {
            string::utf8(b"A powerful weapon from the Shop. Max stats for its rarity.")
        } else {
            string::utf8(b"Premium armor from the Shop. Max stats for its rarity.")
        };
        
        // Create the item
        let item = item::mint_item_internal(
            name,
            rarity_str,
            attack,
            defense,
            description,
            string::utf8(b""), // Walrus blob ID will be set by frontend
            ctx,
        );
        
        let item_id = object::id(&item);
        let buyer = tx_context::sender(ctx);
        
        // Take payment and send to dev wallet
        let payment_coin = coin::split(&mut payment, price, ctx);
        transfer::public_transfer(payment_coin, DEV_WALLET);
        
        // Return any excess
        if (coin::value(&payment) > 0) {
            transfer::public_transfer(payment, buyer);
        } else {
            coin::destroy_zero(payment);
        };
        
        event::emit(PremadeItemPurchased {
            item_id,
            name: item::name(&item),
            rarity: item::rarity(&item),
            price,
            buyer,
        });
        
        // Transfer item to buyer
        transfer::public_transfer(item, buyer);
    }

    // === Helper Functions ===

    /// Get premade item stats based on rarity and type
    /// Returns (name, rarity_string, attack, defense)
    fun get_premade_stats(rarity: u8, item_type: u8): (String, String, u64, u64) {
        let is_weapon = item_type == 1;
        
        if (rarity == 1) {
            // Uncommon: weapon 30/4, armor 4/30
            if (is_weapon) {
                (string::utf8(b"Shop Steel Blade"), string::utf8(b"uncommon"), 30, 4)
            } else {
                (string::utf8(b"Shop Leather Armor"), string::utf8(b"uncommon"), 4, 30)
            }
        } else if (rarity == 2) {
            // Rare: weapon 40/6, armor 6/40
            if (is_weapon) {
                (string::utf8(b"Shop Enchanted Sword"), string::utf8(b"rare"), 40, 6)
            } else {
                (string::utf8(b"Shop Chain Mail"), string::utf8(b"rare"), 6, 40)
            }
        } else if (rarity == 3) {
            // Epic: weapon 50/7, armor 7/50
            if (is_weapon) {
                (string::utf8(b"Shop Dragon Slayer"), string::utf8(b"epic"), 50, 7)
            } else {
                (string::utf8(b"Shop Plate Armor"), string::utf8(b"epic"), 7, 50)
            }
        } else {
            // Legendary: weapon 60/9, armor 9/60
            if (is_weapon) {
                (string::utf8(b"Shop Excalibur"), string::utf8(b"legendary"), 60, 9)
            } else {
                (string::utf8(b"Shop Godplate"), string::utf8(b"legendary"), 9, 60)
            }
        }
    }

    // === View Functions ===

    /// Get the number of active listings
    public fun listing_count(marketplace: &Marketplace): u64 {
        marketplace.listing_count
    }

    /// Check if an item is listed
    public fun is_listed(marketplace: &Marketplace, item_id: ID): bool {
        table::contains(&marketplace.listings, item_id)
    }

    /// Get listing details
    public fun get_listing_price(marketplace: &Marketplace, item_id: ID): u64 {
        let listing = table::borrow(&marketplace.listings, item_id);
        listing.price
    }

    /// Get listing seller
    public fun get_listing_seller(marketplace: &Marketplace, item_id: ID): address {
        let listing = table::borrow(&marketplace.listings, item_id);
        listing.seller
    }
}
