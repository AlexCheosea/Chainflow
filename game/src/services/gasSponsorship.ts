import { Transaction } from '@mysten/sui/transactions';
import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

/**
 * Gas Sponsorship Service
 * 
 * For a hackathon demo, there are two approaches:
 * 
 * 1. SHINAMI GAS STATION (Recommended for production)
 *    - Sign up at https://www.shinami.com/gas-station
 *    - Get API key and use their SDK
 *    - Free tier: 10k transactions
 * 
 * 2. CUSTOM SPONSOR (This implementation)
 *    - Uses a funded wallet as sponsor
 *    - Requires a backend server to keep the private key secure
 *    - Good for demos where you control the environment
 * 
 * This file provides a client-side implementation that works with a backend sponsor.
 */

export interface SponsorConfig {
  // Backend endpoint that sponsors transactions
  sponsorEndpoint?: string;
  // For demo: use Shinami API key directly (not recommended for production)
  shinamiApiKey?: string;
}

/**
 * Request gas sponsorship from backend
 */
export async function requestSponsorship(
  tx: Transaction,
  senderAddress: string,
  config: SponsorConfig
): Promise<Transaction> {
  if (config.sponsorEndpoint) {
    // Call backend to sponsor the transaction
    const response = await fetch(config.sponsorEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: tx.serialize(),
        sender: senderAddress,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get sponsorship');
    }

    const { sponsoredTx } = await response.json();
    return Transaction.from(sponsoredTx);
  }

  // If no sponsor endpoint, return original transaction
  // User pays their own gas
  return tx;
}

/**
 * Backend sponsor service implementation
 * This would run on your server, not in the browser
 * 
 * Example usage in a Node.js backend:
 * 
 * ```typescript
 * import express from 'express';
 * import { sponsorTransaction } from './gasSponsorship';
 * 
 * const app = express();
 * 
 * app.post('/sponsor', async (req, res) => {
 *   const { transaction, sender } = req.body;
 *   const sponsored = await sponsorTransaction(transaction, sender);
 *   res.json({ sponsoredTx: sponsored.serialize() });
 * });
 * ```
 */
export async function sponsorTransaction(
  txBytes: Uint8Array,
  senderAddress: string,
  sponsorKeypair: Ed25519Keypair,
  suiClient: SuiClient
): Promise<Transaction> {
  const tx = Transaction.from(txBytes);
  
  // Set the gas owner to the sponsor
  tx.setSender(senderAddress);
  tx.setGasOwner(sponsorKeypair.toSuiAddress());
  
  // Build the transaction with sponsor paying gas
  const builtTx = await tx.build({ client: suiClient });
  
  return Transaction.from(builtTx);
}

/**
 * For Shinami Gas Station integration:
 * 
 * 1. Install: npm install @shinami/clients
 * 
 * 2. Usage:
 * ```typescript
 * import { GasStationClient } from '@shinami/clients';
 * 
 * const gasStation = new GasStationClient(SHINAMI_API_KEY);
 * 
 * // Sponsor a transaction
 * const sponsoredTx = await gasStation.sponsorTransaction(
 *   txBytes,
 *   senderAddress
 * );
 * ```
 * 
 * See: https://docs.shinami.com/docs/gas-station
 */

export const GAS_SPONSORSHIP_INFO = `
╔════════════════════════════════════════════════════════════════╗
║                    GAS SPONSORSHIP OPTIONS                     ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  1. SHINAMI GAS STATION (Easiest for hackathon)                ║
║     • Sign up: https://www.shinami.com/gas-station             ║
║     • Free tier: 10,000 transactions                           ║
║     • Just add API key to config                               ║
║                                                                 ║
║  2. CUSTOM SPONSOR (Requires backend)                          ║
║     • Deploy a simple Express server                           ║
║     • Fund a wallet with testnet SUI                           ║
║     • Server signs gas-only portion of transactions            ║
║                                                                 ║
║  3. USER PAYS GAS (Current default)                            ║
║     • Users get SUI from faucet                                ║
║     • Simple, no backend needed                                ║
║     • Link faucet in UI for easy access                        ║
║                                                                 ║
╚════════════════════════════════════════════════════════════════╝
`;

console.log(GAS_SPONSORSHIP_INFO);
