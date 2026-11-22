import { ENV } from "varlock/env";

const config = {
  web3AuthClientId: ENV.VITE_WEB3AUTH_CLIENT_ID,
  solanaRpcUrl: ENV.VITE_SOLANA_RPC_URL,
  solanaWsUrl: ENV.VITE_SOLANA_WS_URL,
  apiUrl: ENV.VITE_API_URL,
} as const;

export { config as ENV };
