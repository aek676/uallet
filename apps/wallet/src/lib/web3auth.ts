import {
  CHAIN_NAMESPACES,
  type CustomChainConfig,
  WEB3AUTH_NETWORK,
} from "@web3auth/no-modal";
import type { Web3AuthContextConfig } from "@web3auth/no-modal/react";

import { env } from "#/config/env";

/** The chain of `solanaDevnet`, as Wallet Standard names it. */
export const SOLANA_CHAIN = "solana:devnet";

/**
 * Solana devnet, declared here instead of in the dashboard so the RPC comes
 * from our env. Web3Auth identifies Solana devnet as chain `0x67`.
 */
export const solanaDevnet: CustomChainConfig = {
  chainNamespace: CHAIN_NAMESPACES.SOLANA,
  chainId: "0x67",
  rpcTarget: env.solanaRpcUrl,
  wsTarget: env.solanaWsUrl,
  displayName: "Solana Devnet",
  blockExplorerUrl: "https://explorer.solana.com/?cluster=devnet",
  ticker: "SOL",
  tickerName: "Solana",
  logo: "",
  decimals: 9,
  isTestnet: true,
};

/**
 * MetaMask Embedded Wallets (formerly Web3Auth). We use the "no modal" SDK:
 * the login UI is our own form.
 */
export const web3AuthConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId: env.web3AuthClientId,
    // Sapphire Mainnet doesn't allow localhost origins.
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    chains: [solanaDevnet],
    defaultChainId: solanaDevnet.chainId,
    // Social / email login only: don't look for browser extension wallets.
    multiInjectedProviderDiscovery: false,
    disableAnalytics: true,
  },
};
