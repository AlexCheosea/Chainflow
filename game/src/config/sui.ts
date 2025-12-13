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
  packageId: '0xec1f870c95aee315c6bf3514e7cdc78a6eabd5b9610709311e4d5ee053fbbebc',
  // Module name
  module: 'item',
  // Function to mint items
  mintFunction: 'mint_item',
};
