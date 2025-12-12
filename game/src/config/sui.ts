import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { createNetworkConfig } from '@mysten/dapp-kit';

const { networkConfig } = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl('testnet'),
  },
  mainnet: {
    url: getFullnodeUrl('mainnet'),
  },
});

export { networkConfig };

// Default to testnet for hackathon demo
export const DEFAULT_NETWORK = 'testnet';

// Create a client for direct API calls
export const suiClient = new SuiClient({
  url: getFullnodeUrl('testnet'),
});

// Contract configuration - UPDATE THIS AFTER DEPLOYMENT
export const CONTRACT_CONFIG = {
  // Package ID will be set after deploying the Move contract
  packageId: '0xcc105f1cf5f040af1bddec386a39cecdd78e2c6004faf4710a76191f21f5d0fa',
  // Module name
  module: 'item',
  // Function to mint items
  mintFunction: 'mint_item',
};
